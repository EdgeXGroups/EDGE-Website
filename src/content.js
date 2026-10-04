// The site's content: what's in Supabase (edited at /admin), on top of the
// built-in defaults in content.defaults.js. If Supabase can't be reached in
// time — or has no designs yet — the defaults are used, so the site never breaks.
//
// One request to the site_content() database function (see supabase/migrations),
// made with plain fetch so public pages don't load the Supabase library.
// Top-level await: every module importing this waits for the content.
import * as defaults from './content.defaults.js'
import { SUPABASE_URL, SUPABASE_KEY } from './supabase.config.js'

async function loadRemote() {
  if (typeof fetch === 'undefined') return null
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 3000)
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/site_content`, {
      headers: { apikey: SUPABASE_KEY, accept: 'application/json' },
      signal: ctrl.signal,
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

const remote = await loadRemote()
const live = remote?.designs?.length ? remote : null

// Everything from the database is cleaned once, here, before any page draws it:
// colours must be colours, image links must be web addresses, handles and numbers
// only carry the characters they should. Even a hijacked admin account then can't
// slip code into the pages through these fields.
const COLOR = /^#[0-9a-f]{3,8}$/i
const SAFE_URL = /^(https:\/\/|\/)[^\s"'<>()\\`]*$/
const color = (c, fallback) => (COLOR.test(String(c || '')) ? c : fallback)
const url = (u) => (u && SAFE_URL.test(String(u)) ? u : '')
const only = (v, re) => String(v ?? '').replace(re, '')

function cleanDesign(d) {
  return {
    ...d,
    accent: color(d.accent, '#ff4a1c'),
    garment: d.garment ? color(d.garment, '#f4f4f2') : d.garment,
    images: (d.images || []).map(url),
    prints: d.prints ? { front: url(d.prints.front), back: url(d.prints.back) } : d.prints,
  }
}
function cleanBrand(b) {
  return {
    ...b,
    instagram: only(b.instagram, /[^A-Za-z0-9._]/g),
    whatsapp: only(b.whatsapp, /\D/g),
    phone: only(b.phone, /[^\d+ ()X-]/g),
    email: /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/.test(b.email || '') ? b.email : '',
  }
}

export const brand = cleanBrand({ ...defaults.brand, ...(remote?.brand || {}) })
export const designs = (live ? live.designs : defaults.designs).map(cleanDesign)
export const team = (remote?.team?.length ? remote.team : defaults.team).map((m) => ({ ...m, photo: url(m.photo), instagram: only(m.instagram, /[^A-Za-z0-9._]/g) }))
export const sizeCharts = remote?.size_charts || []
export const { manifesto, pillars, process } = defaults

// The showroom: three slugs chosen in the admin, else designs marked `featured`, else the first three.
export const featured = (() => {
  const bySlug = (s) => designs.find((d) => d.slug === s)
  const picked = (live?.showroom || []).map(bySlug).filter(Boolean)
  if (picked.length) return picked.slice(0, 3)
  const flagged = designs.filter((d) => d.featured)
  return (flagged.length ? flagged : designs).slice(0, 3)
})()

export { defaults }
