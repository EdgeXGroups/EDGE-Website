// EDGE content API (Netlify Function + Netlify Blobs)
//
//   GET    /api/content          public — the site's editable content (404 until first save)
//   POST   /api/login            { password } → { token }   (password = ADMIN_PASSWORD env var)
//   PUT    /api/content          admin — replace the content JSON
//   POST   /api/upload?name=…    admin — raw image body → { url: '/media/…' }
//   DELETE /api/upload?url=…     admin — remove an uploaded image
//
// Set ADMIN_PASSWORD (and optionally ADMIN_SECRET) in Netlify → Site configuration → Environment variables.
import { getStore } from '@netlify/blobs'
import { purgeCache } from '@netlify/functions'

const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', ...headers } })

const enc = new TextEncoder()
const b64url = (buf) => Buffer.from(buf).toString('base64url')

async function hmacKey() {
  const secret = process.env.ADMIN_SECRET || `edge:${process.env.ADMIN_PASSWORD || ''}`
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])
}
async function sign(payload) {
  const body = b64url(enc.encode(JSON.stringify(payload)))
  const sig = b64url(await crypto.subtle.sign('HMAC', await hmacKey(), enc.encode(body)))
  return `${body}.${sig}`
}
async function verify(req) {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  const [body, sig] = token.split('.')
  if (!body || !sig) return false
  const ok = await crypto.subtle.verify('HMAC', await hmacKey(), Buffer.from(sig, 'base64url'), enc.encode(body))
  if (!ok) return false
  try { return JSON.parse(Buffer.from(body, 'base64url').toString()).exp > Date.now() } catch { return false }
}
function sameString(a, b) {
  const x = enc.encode(a), y = enc.encode(b)
  let diff = x.length ^ y.length
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] || 0) ^ (y[i] || 0)
  return diff === 0
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const TYPES = { 'image/webp': 'webp', 'image/png': 'png', 'image/jpeg': 'jpg' }

export default async (req) => {
  const url = new URL(req.url)
  // just the word after /api/ (netlify dev's pretty-URL handling can tack on .html, .htm, /index.html…)
  const route = (url.pathname.match(/^\/api\/([a-z]+)/) || [])[1] || ''
  const site = getStore({ name: 'site', consistency: 'strong' })
  const media = getStore({ name: 'media', consistency: 'strong' })

  if (route === 'content' && req.method === 'GET') {
    const data = await site.get('content', { type: 'json' })
    // browsers always revalidate; Netlify's CDN keeps a copy until the next save purges it
    const cdn = { 'cache-control': 'public, max-age=0, must-revalidate', 'netlify-cdn-cache-control': 'public, durable, s-maxage=31536000', 'netlify-cache-tag': 'content' }
    if (!data) return json({ empty: true }, 404, cdn)
    return json(data, 200, cdn)
  }

  if (route === 'login' && req.method === 'POST') {
    const expected = process.env.ADMIN_PASSWORD
    if (!expected) return json({ error: 'ADMIN_PASSWORD is not set on the server.' }, 500)
    const { password = '' } = await req.json().catch(() => ({}))
    if (!sameString(String(password), expected)) {
      await sleep(900) // slow down guessing
      return json({ error: 'Wrong password' }, 401)
    }
    return json({ token: await sign({ exp: Date.now() + 12 * 3600 * 1000 }) })
  }

  if (!(await verify(req))) return json({ error: 'Not signed in' }, 401)

  if (route === 'content' && req.method === 'PUT') {
    const text = await req.text()
    if (text.length > 1_000_000) return json({ error: 'Content too large' }, 413)
    let data
    try { data = JSON.parse(text) } catch { return json({ error: 'Invalid JSON' }, 400) }
    if (!data || !Array.isArray(data.designs) || typeof data.brand !== 'object') return json({ error: 'Missing designs or brand' }, 400)
    data.updatedAt = new Date().toISOString()
    await site.setJSON('content', data)
    try { await purgeCache({ tags: ['content'] }) } catch { /* not available in local dev */ }
    return json({ ok: true, updatedAt: data.updatedAt })
  }

  if (route === 'upload' && req.method === 'POST') {
    const type = (req.headers.get('content-type') || '').split(';')[0]
    const ext = TYPES[type]
    if (!ext) return json({ error: 'Only WebP, PNG or JPEG' }, 415)
    const buf = await req.arrayBuffer()
    if (buf.byteLength > 5_500_000) return json({ error: 'Image too large (max 5.5 MB)' }, 413)
    const name = (url.searchParams.get('name') || 'image').toLowerCase().replace(/[^a-z0-9/_-]+/g, '-').replace(/^[-/]+|[-/]+$/g, '').slice(0, 80)
    const key = `${name}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}.${ext}`
    await media.set(key, buf, { metadata: { type } })
    return json({ url: `/media/${key}` })
  }

  if (route === 'upload' && req.method === 'DELETE') {
    const target = url.searchParams.get('url') || ''
    if (!target.startsWith('/media/')) return json({ ok: true }) // built-in images are left alone
    await media.delete(target.slice('/media/'.length))
    return json({ ok: true })
  }

  return json({ error: 'Not found' }, 404)
}

export const config = { path: '/api/*' }
