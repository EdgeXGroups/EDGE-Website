// Server-side shop helpers for the Netlify functions. Everything money-related is
// worked out here from the database — the browser only says *what* it wants.
//
// Environment variables (Netlify → Site configuration → Environment variables):
//   SUPABASE_SERVICE_ROLE_KEY  Supabase secret key (sb_secret_… or the legacy service_role JWT)
//   RAZORPAY_KEY_ID            rzp_test_… / rzp_live_…
//   RAZORPAY_KEY_SECRET
//   RAZORPAY_WEBHOOK_SECRET    the secret you type when creating the webhook in Razorpay
import { createHmac, timingSafeEqual } from 'node:crypto'
import { SUPABASE_URL, SUPABASE_KEY } from '../../src/supabase.config.js'
import { lineProblem, priceNum, sizesOf, shippingFor, MAX_QTY } from '../../src/commerce.js'
import { PostHog } from 'posthog-node'
import { POSTHOG_KEY, POSTHOG_HOST } from '../../src/analytics.config.js'

// Server crashes → PostHog Error tracking, next to the browser errors.
// A short-lived client per call: functions freeze once they respond, so flush first.
export async function reportError(err, props = {}) {
  if (!POSTHOG_KEY) return
  try {
    const ph = new PostHog(POSTHOG_KEY, { host: POSTHOG_HOST, flushAt: 1, flushInterval: 0 })
    ph.captureException(err instanceof Error ? err : new Error(String(err)), 'edge-server', { ...props, source: 'netlify-function', $process_person_profile: false })
    await ph.shutdown(3000)
  } catch {}
}

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status }
}

// which copy of the site answered, and whether it can see its settings (counts + yes/no only)
let diag = ''
const setDiag = (context) => {
  diag = `deploy=${context?.deploy?.id || '?'}; ctx=${context?.deploy?.context || '?'}; env=${Object.keys(process.env).length}; svc=${rawEnv('SUPABASE_SERVICE_ROLE_KEY') ? 'yes' : 'no'}`
}
export const json = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', 'x-edge-diag': diag } })

// wrap a handler: POST only, JSON in, errors out as { error }
export const handler = (fn) => async (req, context) => {
  setDiag(context)
  if (req.method !== 'POST') return json(405, { error: 'POST only' })
  try {
    return json(200, await fn(req))
  } catch (err) {
    if (!(err instanceof HttpError)) console.error(err)
    // real crashes and setup problems (5xx) are worth knowing about; a customer typo (4xx) isn't
    if (!(err instanceof HttpError) || err.status >= 500) await reportError(err, { function: context?.function?.name || new URL(req.url).pathname, status: err.status || 500 })
    return json(err.status || 500, { error: err instanceof HttpError ? err.message : 'Something went wrong on our side. You have not been charged.' })
  }
}

// Netlify's own reader first (Functions 2.0), then process.env
export const rawEnv = (name) => globalThis.Netlify?.env?.get?.(name) ?? process.env[name] ?? ''
// which server settings this function can see — names and yes/no only, never values
export const envReport = () => ['SUPABASE_SERVICE_ROLE_KEY', 'RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'RAZORPAY_WEBHOOK_SECRET', 'POSTHOG_PERSONAL_API_KEY', 'POSTHOG_PROJECT_ID']
  .map((n) => `${n} ${rawEnv(n) ? '✓' : '✗'}`).join(' · ') + ` [${diag}]`

function env(name) {
  // pasted values often pick up a space, a line break or quotes — none of them belong in a key
  const v = String(rawEnv(name)).trim().replace(/^["']|["']$/g, '')
  if (!v) throw new HttpError(503, `Checkout isn’t switched on yet (${name} is missing on the server).`)
  return v
}

/* ───────── Supabase (service role: bypasses RLS) ───────── */

export async function db(path, { method = 'GET', body, prefer } = {}) {
  const key = env('SUPABASE_SERVICE_ROLE_KEY')
  const headers = { apikey: key, 'content-type': 'application/json', ...(prefer ? { prefer } : {}) }
  if (!key.startsWith('sb_')) headers.authorization = `Bearer ${key}` // legacy JWT keys go in both headers
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
  const text = await res.text()
  if (!res.ok) {
    console.error(`Supabase ${method} ${path} → ${res.status} ${text}`)
    let msg = text
    try { msg = JSON.parse(text).message || text } catch {}
    if (res.status === 401 || res.status === 403) throw new HttpError(503, 'Checkout setup problem: Supabase rejected the server key. Check SUPABASE_SERVICE_ROLE_KEY in Netlify (the secret key, sb_secret_…), then redeploy.')
    if (/PGRST205|does not exist|Could not find the table/i.test(text)) throw new HttpError(503, 'Checkout setup problem: the orders tables are missing — run supabase/migrations/0006_accounts_orders.sql.')
    throw new HttpError(500, `Couldn’t save your order (database ${res.status}: ${String(msg).slice(0, 160)}). You have not been charged.`)
  }
  return text ? JSON.parse(text) : null
}

// the signed-in customer, from their Supabase access token (or null for guests)
export async function userFrom(req) {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  if (!token) return null
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: SUPABASE_KEY, authorization: `Bearer ${token}` } })
  return res.ok ? res.json() : null
}

/* ───────── Pricing ───────── */

// [{slug, size, qty}] → priced lines + totals, straight from the database
export async function priceBag(items) {
  if (!Array.isArray(items) || !items.length) throw new HttpError(400, 'Your bag is empty.')
  if (items.length > 30) throw new HttpError(400, 'That’s a lot of pieces — message us for a bulk order.')
  const slugs = [...new Set(items.map((i) => String(i.slug || '')))]
  if (slugs.some((s) => !/^[a-z0-9][a-z0-9-]*$/.test(s))) throw new HttpError(400, 'Unknown design in your bag.')
  const [designs, settings] = await Promise.all([
    db(`designs?select=slug,name,price,sizes,stock,images,published&slug=in.(${slugs.join(',')})`),
    db('settings?select=brand&id=eq.1'),
  ])
  const lines = items.map((i) => {
    const d = designs.find((x) => x.slug === i.slug && x.published)
    const size = String(i.size || '')
    const qty = Math.floor(Number(i.qty))
    const problem = lineProblem(d, size)
    if (problem) throw new HttpError(409, `${d?.name || 'A design'}: ${problem.toLowerCase()}. Update your bag and try again.`)
    if (!(qty >= 1 && qty <= MAX_QTY)) throw new HttpError(400, `${d.name}: quantity must be 1–${MAX_QTY}.`)
    return { slug: d.slug, name: d.name, size: sizesOf(d).length ? size : '', qty, price: priceNum(d), image: (d.images || []).find(Boolean) || null }
  })
  const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0)
  const shipping = shippingFor(subtotal, settings?.[0]?.brand || {})
  return { lines, subtotal, shipping, total: subtotal + shipping }
}

/* ───────── Customer details ───────── */

const clean = (v, max = 120) => String(v ?? '').trim().replace(/\s+/g, ' ').slice(0, max)
export function checkCustomer({ contact = {}, address = {} } = {}) {
  const email = clean(contact.email, 200).toLowerCase()
  const phone = clean(contact.phone).replace(/[\s-]/g, '').replace(/^(\+91|0)/, '')
  const a = {
    name: clean(address.name), phone, line1: clean(address.line1, 200), line2: clean(address.line2, 200),
    city: clean(address.city), state: clean(address.state), pincode: clean(address.pincode).replace(/\s/g, ''),
  }
  const bad = (msg) => { throw new HttpError(400, msg) }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) bad('Enter a valid email.')
  if (!/^[6-9]\d{9}$/.test(phone)) bad('Enter a 10-digit Indian mobile number.')
  if (!a.name) bad('Enter the name for delivery.')
  if (!a.line1) bad('Enter the delivery address.')
  if (!a.city || !a.state) bad('Enter the city and state.')
  if (!/^[1-9]\d{5}$/.test(a.pincode)) bad('Enter a valid 6-digit PIN code.')
  return { email, phone, name: a.name, address: a }
}

/* ───────── Razorpay ───────── */

export const razorpayKeyId = () => env('RAZORPAY_KEY_ID')

export async function razorpay(path, body) {
  const auth = Buffer.from(`${env('RAZORPAY_KEY_ID')}:${env('RAZORPAY_KEY_SECRET')}`).toString('base64')
  const res = await fetch(`https://api.razorpay.com/v1/${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { authorization: `Basic ${auth}`, 'content-type': 'application/json' },
    body: body && JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    console.error(`Razorpay ${path} → ${res.status} ${JSON.stringify(data)}`)
    if (res.status === 401) throw new HttpError(503, 'Checkout setup problem: Razorpay rejected the API keys. In Netlify, RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be the same pair (both test, the current secret, no spaces) — then redeploy.')
    throw new HttpError(502, `Razorpay couldn’t start the payment (${data?.error?.description || res.status}). You have not been charged.`)
  }
  return data
}

const hmac = (secret, text) => createHmac('sha256', secret).update(text).digest('hex')
const same = (a, b) => typeof a === 'string' && typeof b === 'string' && a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b))

// the checkout's handler signature: HMAC(order_id|payment_id, key secret)
export const paymentSignatureOk = (orderId, paymentId, signature) => same(hmac(env('RAZORPAY_KEY_SECRET'), `${orderId}|${paymentId}`), signature)
// webhooks: HMAC(raw body, webhook secret)
export const webhookSignatureOk = (rawBody, signature) => same(hmac(env('RAZORPAY_WEBHOOK_SECRET'), rawBody), signature)

// pending/failed → paid (idempotent; a paid order is never touched twice)
export async function markPaid(razorpayOrderId, paymentId) {
  const now = new Date().toISOString()
  const rows = await db(`orders?razorpay_order_id=eq.${encodeURIComponent(razorpayOrderId)}&status=in.(pending,failed)`, {
    method: 'PATCH', prefer: 'return=representation',
    body: { status: 'paid', razorpay_payment_id: paymentId, paid_at: now, updated_at: now },
  })
  const order = rows[0] || (await db(`orders?select=id,number,user_id,status&razorpay_order_id=eq.${encodeURIComponent(razorpayOrderId)}`))[0]
  // a paid order empties the customer's synced bag
  if (rows[0]?.user_id) await db(`cart_items?user_id=eq.${rows[0].user_id}`, { method: 'DELETE' })
  return order
}
