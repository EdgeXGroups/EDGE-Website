import './style.css'
import './pages.css'
import { $, $$, esc, fillBrand, lenis, initCursor, pageEnter, riseLines, gsap } from './shared.js'
import { summary, onBag, clear } from './cart.js'
import { user, onUser, ready, accessToken, supabase } from './account.js'
import { money, priceHTML } from './commerce.js'
import { openSignIn, openBag } from './shop-ui.js'
import { imagesFor } from './mockup.js'
import { track } from './analytics.js'
import { TURNSTILE_SITE_KEY } from './turnstile.config.js'

const STATES = ['Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chandigarh', 'Chhattisgarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal']
const REMEMBER = 'edge-checkout' // this browser's last contact + address, to save retyping

const co = $('.co')
const form = $('.co__form')
const errorEl = $('.co__error')
const payBtn = $('.co__pay')
form.state.innerHTML = '<option value="">Choose…</option>' + STATES.map((s) => `<option>${s}</option>`).join('')
let paying = false

/* ───────── summary ───────── */

function renderSummary() {
  if (paying) return
  const s = summary()
  co.dataset.state = s.ok.length ? 'form' : 'empty'
  $('.co__empty').hidden = !!s.ok.length || !$('.co__done').hidden
  co.hidden = !s.ok.length || !$('.co__done').hidden
  $('.co__items').innerHTML = s.lines.map((l) => `
    <li class="co__item${l.problem ? ' is-off' : ''}">
      <span class="co__img" style="--m-accent:${l.design?.accent || '#333'}">${l.design ? `<img src="${imagesFor(l.design)[0]}" alt="" />` : ''}<b>${l.qty}</b></span>
      <span class="co__iname">${esc(l.design?.name || l.slug)}<small class="mono">${l.size ? `Size ${esc(l.size)}` : ''}${l.problem ? ` · ${esc(l.problem)} — not included` : ''}</small></span>
      <span class="co__iprice">${l.problem ? '' : money(l.price * l.qty)}</span>
    </li>`).join('')
  $('[data-sub]').textContent = money(s.subtotal)
  $('[data-ship]').textContent = s.shipping ? money(s.shipping) : 'Free'
  $('[data-total]').textContent = money(s.total)
  $('span', payBtn).textContent = `Pay ${money(s.total)}`
  $('[data-shipnote]').textContent = s.lines.length > s.ok.length ? 'Unavailable pieces stay in your bag but aren’t charged.' : 'Taxes included. Ships in 3–7 days.'
}
onBag(renderSummary)
$('[data-editbag]').addEventListener('click', openBag)

/* ───────── who's paying ───────── */

let saved = []
const fill = (o = {}) => Object.entries(o).forEach(([k, v]) => { if (form[k] && v != null && !form[k].value) form[k].value = v })
try { fill(JSON.parse(localStorage.getItem(REMEMBER)) || {}) } catch {}

onUser(async (u) => {
  $$('[data-guest]').forEach((el) => (el.hidden = !!u))
  $$('[data-member]').forEach((el) => (el.hidden = !u))
  if (!u) return
  $('[data-email]').textContent = u.email
  if (!form.email.value) form.email.value = u.email || ''
  if (!form.name.value) form.name.value = u.user_metadata?.full_name || ''
  const { data } = await (await supabase()).from('addresses').select('*').order('created_at', { ascending: false })
  saved = data || []
  const box = $('.co__saved')
  box.hidden = !saved.length
  box.innerHTML = saved.map((a, i) => `<label class="co__addr"><input type="radio" name="saved" value="${i}" /><span><b>${esc(a.name)}</b> ${esc(a.line1)}${a.line2 ? `, ${esc(a.line2)}` : ''}, ${esc(a.city)}, ${esc(a.state)} ${esc(a.pincode)}<small class="mono">${esc(a.phone)}</small></span></label>`).join('') +
    '<label class="co__addr"><input type="radio" name="saved" value="new" checked /><span>Use a new address</span></label>'
})
$('.co__saved').addEventListener('change', (e) => {
  const a = saved[e.target.value]
  const fields = ['name', 'line1', 'line2', 'city', 'state', 'pincode']
  fields.forEach((k) => (form[k].value = a ? a[k] || '' : ''))
  if (a) form.phone.value = a.phone
  $('.co__check').hidden = !!a
})
$('[data-signin]').addEventListener('click', () => openSignIn('Sign in to use your saved addresses and keep this order in your account.'))

/* ───────── validation ───────── */

const RULES = {
  email: [(v) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v), 'Enter a valid email'],
  phone: [(v) => /^[6-9]\d{9}$/.test(v.replace(/[\s-]/g, '').replace(/^(\+91|0)/, '')), 'Enter a 10-digit mobile number'],
  name: [(v) => v.length > 1, 'Enter the name for delivery'],
  line1: [(v) => v.length > 3, 'Enter the house / street'],
  city: [(v) => v.length > 1, 'Enter the city'],
  pincode: [(v) => /^[1-9]\d{5}$/.test(v), 'Enter a 6-digit PIN code'],
  state: [(v) => !!v, 'Choose the state'],
}
function validate() {
  let first = null
  for (const [k, [ok, msg]] of Object.entries(RULES)) {
    const el = form[k]
    const bad = !ok(el.value.trim())
    el.closest('.co__f').classList.toggle('is-bad', bad)
    el.closest('.co__f').dataset.msg = bad ? msg : ''
    if (bad && !first) first = el
  }
  first?.focus()
  return !first
}
form.addEventListener('input', (e) => e.target.closest('.co__f')?.classList.remove('is-bad'))

/* ───────── bot check (Cloudflare Turnstile, invisible) ───────── */

let botToken = null
let botWidget = null
if (TURNSTILE_SITE_KEY) {
  window.onEdgeTurnstile = () => {
    botWidget = window.turnstile.render('.co__bot', {
      sitekey: TURNSTILE_SITE_KEY,
      appearance: 'interaction-only', // invisible unless Cloudflare wants a click
      action: 'checkout',
      callback: (t) => (botToken = t),
      'expired-callback': () => (botToken = null),
      'error-callback': () => (botToken = null),
    })
  }
  const s = document.createElement('script')
  s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onEdgeTurnstile'
  s.async = true
  document.head.appendChild(s)
}
const freshBotToken = () => { if (botWidget != null) { window.turnstile.reset(botWidget); botToken = null } }

/* ───────── pay ───────── */

const loadRazorpay = () => window.Razorpay ? Promise.resolve() : new Promise((res, rej) => {
  const s = document.createElement('script')
  s.src = 'https://checkout.razorpay.com/v1/checkout.js'
  s.onload = res
  s.onerror = () => rej(new Error('Couldn’t load the payment window. Check your connection and try again.'))
  document.head.appendChild(s)
})

async function api(path, body) {
  const token = await accessToken()
  const res = await fetch(`/api/${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  })
  if (res.status === 404) throw new Error('Checkout only works on the live site (it needs the Netlify functions).')
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Something went wrong. You have not been charged.')
  return data
}

const setBusy = (on, text) => {
  payBtn.disabled = on
  $('span', payBtn).textContent = text || `Pay ${money(summary().total)}`
}
const fail = (msg) => { errorEl.textContent = msg; setBusy(false); paying = false; renderSummary() }

form.addEventListener('submit', async (e) => {
  e.preventDefault()
  errorEl.textContent = ''
  if (!validate()) return
  const s = summary()
  if (!s.ok.length) return
  const v = (k) => form[k].value.trim()
  const contact = { email: v('email'), phone: v('phone') }
  const address = { name: v('name'), phone: v('phone'), line1: v('line1'), line2: v('line2'), city: v('city'), state: v('state'), pincode: v('pincode') }
  try { localStorage.setItem(REMEMBER, JSON.stringify({ ...contact, ...address })) } catch {}

  paying = true
  track('checkout_started', { total: s.total, items: s.ok.reduce((n, l) => n + l.qty, 0) })
  setBusy(true, 'Preparing payment…')
  let order
  try {
    ;[order] = await Promise.all([
      api('create-order', { items: s.ok.map(({ slug, size, qty }) => ({ slug, size, qty })), contact, address, turnstile: botToken }),
      loadRazorpay(),
    ])
  } catch (err) { freshBotToken(); return fail(err.message) }
  freshBotToken() // each token works once

  // remember a new address for signed-in customers (best effort)
  if (user && form.save.checked && !$('.co__check').hidden) {
    supabase().then((sb) => sb.from('addresses').insert({ ...address, phone: order.customer.phone })).catch(() => {})
  }

  const rzp = new window.Razorpay({
    key: order.keyId,
    order_id: order.razorpayOrderId,
    amount: order.amount,
    currency: order.currency,
    name: 'EDGE',
    description: `Order ${order.number}`,
    image: `${location.origin}/brand/edge-mark.png`,
    prefill: { name: order.customer.name, email: order.customer.email, contact: `+91${order.customer.phone}` },
    notes: { edge_order: order.number },
    theme: { color: '#ff4a1c' },
    // UPI first (most Indian buyers pay that way); cards, netbanking, wallets follow.
    // Razorpay only shows methods that are switched on for the account.
    config: {
      display: {
        blocks: { upi: { name: 'Pay with UPI', instruments: [{ method: 'upi' }] } },
        sequence: ['block.upi'],
        preferences: { show_default_blocks: true },
      },
    },
    // redirect mode: the bank/OTP step opens in this tab, not a pop-up a browser can block,
    // and Razorpay brings the customer back through /api/razorpay-callback
    redirect: true,
    callback_url: `${location.origin}/api/razorpay-callback`,
    handler: async (resp) => {
      setBusy(true, 'Confirming payment…')
      try {
        const done = await api('verify-payment', resp)
        success(done.number, order.customer.phone)
      } catch (err) {
        fail(`${err.message} (Order ${order.number})`)
      }
    },
    modal: { ondismiss: () => fail('Payment cancelled — your bag is still here.') },
  })
  rzp.on('payment.failed', (r) => fail(`Payment failed: ${r.error?.description || 'please try another method.'}`))
  setBusy(true, 'Waiting for payment…')
  rzp.open()
})

function success(number, phone) {
  track('order_paid', { number, total: summary().total })
  clear()
  paying = false
  co.hidden = true
  $('.co__empty').hidden = true
  const done = $('.co__done')
  done.hidden = false
  $('[data-number]', done).textContent = number
  $('[data-phone]', done).textContent = phone
  $$('[data-member]', done).forEach((el) => (el.hidden = !user))
  scrollTo(0, 0)
  gsap.from(done.children, { y: 30, opacity: 0, duration: 1, stagger: 0.07, ease: 'expo.out' })
  gsap.from('.co__tick', { scale: 0, rotate: -90, duration: 0.9, ease: 'back.out(2)' })
}

/* ───────── page ───────── */

fillBrand()
initCursor()
riseLines('.sub__title', { immediate: true, delay: 0.2 })
ready.then(renderSummary)

// back from Razorpay (redirect mode): ?paid=EDGE-1001 or ?failed=reason
{
  const q = new URLSearchParams(location.search)
  if (q.has('paid') || q.has('failed')) {
    history.replaceState(history.state, '', location.pathname)
    if (q.has('paid')) {
      let phone = ''
      try { phone = JSON.parse(localStorage.getItem(REMEMBER))?.phone || '' } catch {}
      ready.then(() => success(q.get('paid'), phone.replace(/\D/g, '').slice(-10)))
    } else {
      errorEl.textContent = `${q.get('failed')} Your bag is still here — try again or pick another method.`
      form.scrollIntoView({ block: 'end' })
    }
  }
}
pageEnter()
lenis?.start()
