// The bag. Lives in the browser for everyone (guest checkout), and is mirrored to
// Supabase for signed-in customers so it follows them between phone and laptop.
import { designs, brand } from './content.js'
import { priceNum, shippingFor, lineProblem, MAX_QTY } from './commerce.js'
import { onUser, supabase, user } from './account.js'

const KEY = 'edge-bag'
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || [] } catch { return [] } }
let items = load().filter((i) => i && i.slug && i.qty > 0)

const watchers = new Set()
export function onBag(fn) { watchers.add(fn); fn(items) }
function changed({ sync = true } = {}) {
  try { localStorage.setItem(KEY, JSON.stringify(items)) } catch {}
  watchers.forEach((fn) => fn(items))
  if (sync) push()
}
// another tab changed the bag
addEventListener('storage', (e) => { if (e.key === KEY) { items = load(); watchers.forEach((fn) => fn(items)) } })

const same = (a, slug, size) => a.slug === slug && (a.size || '') === (size || '')
export const bagItems = () => items
export const count = () => items.reduce((n, i) => n + i.qty, 0)

export function add(slug, size = '', qty = 1) {
  const hit = items.find((i) => same(i, slug, size))
  if (hit) hit.qty = Math.min(MAX_QTY, hit.qty + qty)
  else items.unshift({ slug, size: size || '', qty: Math.min(MAX_QTY, qty) })
  changed()
}
export function setQty(slug, size, qty) {
  if (qty < 1) return remove(slug, size)
  const hit = items.find((i) => same(i, slug, size))
  if (hit) { hit.qty = Math.min(MAX_QTY, qty); changed() }
}
export function remove(slug, size) { items = items.filter((i) => !same(i, slug, size)); changed() }
export function clear() { items = []; changed() }

// the bag, priced with what the site knows (the server prices it again at checkout)
export function summary() {
  const lines = items.map((i) => {
    const d = designs.find((x) => x.slug === i.slug)
    return { ...i, design: d, problem: lineProblem(d, i.size), price: d ? priceNum(d) : null }
  })
  const ok = lines.filter((l) => !l.problem)
  const subtotal = ok.reduce((s, l) => s + l.price * l.qty, 0)
  const shipping = shippingFor(subtotal, brand)
  return { lines, ok, subtotal, shipping, total: subtotal + shipping }
}

/* ───────── sync for signed-in customers ───────── */

let timer = null
function push() {
  if (!user) return
  clearTimeout(timer)
  timer = setTimeout(async () => {
    const sb = await supabase()
    await sb.from('cart_items').delete().eq('user_id', user.id)
    if (items.length) await sb.from('cart_items').insert(items.map((i) => ({ slug: i.slug, size: i.size || '', qty: i.qty })))
  }, 500)
}

// on sign-in: merge what's in this browser with what they left on another device
onUser(async (u) => {
  if (!u) return
  const { data, error } = await (await supabase()).from('cart_items').select('slug,size,qty')
  if (error) return
  for (const r of data || []) {
    const hit = items.find((i) => same(i, r.slug, r.size))
    if (hit) hit.qty = Math.max(hit.qty, r.qty)
    else items.push({ slug: r.slug, size: r.size || '', qty: r.qty })
  }
  changed()
})
