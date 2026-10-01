// The site's content: what the admin page saved (GET /api/content), on top
// of the built-in defaults in content.defaults.js. If the API can't be
// reached in time, the defaults are used so the site never breaks.
//
// Top-level await: every module importing this waits for the content.
import * as defaults from './content.defaults.js'

async function loadRemote() {
  if (typeof fetch === 'undefined') return null
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 2500)
  try {
    const res = await fetch('/api/content', { signal: ctrl.signal, cache: 'no-store' })
    if (!res.ok || !(res.headers.get('content-type') || '').includes('json')) return null
    return await res.json()
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

const remote = await loadRemote()

export const brand = { ...defaults.brand, ...(remote?.brand || {}) }
export const designs = remote?.designs?.length ? remote.designs : defaults.designs
export const team = remote?.team || defaults.team
export const { manifesto, pillars, process } = defaults

// The showroom: three slugs chosen in the admin, else designs marked `featured`, else the first three.
export const featured = (() => {
  const bySlug = (s) => designs.find((d) => d.slug === s)
  const picked = (remote?.showroom || []).map(bySlug).filter(Boolean)
  if (picked.length) return picked.slice(0, 3)
  const flagged = designs.filter((d) => d.featured)
  return (flagged.length ? flagged : designs).slice(0, 3)
})()

export { defaults }
