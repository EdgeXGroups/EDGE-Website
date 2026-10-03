// Shop bits shared by every page: prices and discounts, badges, sizes, stock.
// A design may carry (all optional — set in /admin):
//   price  selling price in ₹        mrp    original price, shown struck through when higher
//   tags   ['bestseller','new','limited']
//   sizes  sizes in stock, e.g. ['S','M','L']     stock  'in_stock' | 'few_left' | 'sold_out' | 'coming_soon'

export const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
export const TAGS = { bestseller: 'Bestseller', new: 'New', limited: 'Limited' }
export const STOCK = { in_stock: 'In stock', few_left: 'Few left', sold_out: 'Sold out', coming_soon: 'Coming soon' }

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
const num = (v) => (v == null || v === '' || isNaN(v) ? null : +v)
export const money = (v) => inr.format(v)

export const priceNum = (d) => num(d.price)
export const priceOf = (d) => (priceNum(d) == null ? '' : money(priceNum(d)))
// the struck-through price, only when it's really higher than the selling price
export const mrpNum = (d) => { const p = priceNum(d), m = num(d.mrp); return p != null && m != null && m > p ? m : null }
export const offOf = (d) => { const m = mrpNum(d); return m ? Math.round((1 - priceNum(d) / m) * 100) : 0 }

export const stockOf = (d) => (STOCK[d.stock] ? d.stock : 'in_stock')
export const buyable = (d) => !['sold_out', 'coming_soon'].includes(stockOf(d))
export const tagsOf = (d) => (d.tags || []).filter((t) => TAGS[t])
export const sizesOf = (d) => SIZES.filter((s) => (d.sizes || []).includes(s))

// ₹799 ₹1,299 38% off
export function priceHTML(d, cls = '') {
  if (priceNum(d) == null) return ''
  const m = mrpNum(d)
  return `<span class="pr ${cls}"><b class="pr__now">${priceOf(d)}</b>${m ? `<s class="pr__was" aria-label="was ${money(m)}">${money(m)}</s><em class="pr__off">${offOf(d)}% off</em>` : ''}</span>`
}

// the one badge a card shows: availability first, then the shop's own tags
export function badgeOf(d) {
  const s = stockOf(d)
  if (s === 'sold_out' || s === 'coming_soon') return { key: s, label: STOCK[s] }
  const t = tagsOf(d)[0]
  if (t) return { key: t, label: TAGS[t] }
  if (s === 'few_left') return { key: s, label: STOCK[s] }
  return null
}
export const badgeHTML = (d) => { const b = badgeOf(d); return b ? `<span class="badge badge--${b.key}">${b.label}</span>` : '' }

// the size chart a design points at (charts are saved by name in the admin)
export const chartFor = (d, charts) => (d.size_chart && charts.find((c) => c.name === d.size_chart)) || null

// Shipping: a flat fee, free from a threshold (both set in Admin → Contact & shop).
// Unset → ₹79, free from ₹999. Cleared in the admin → no fee / never free.
export function shippingRules(brand = {}) {
  return {
    fee: brand.shippingFee === undefined ? 79 : num(brand.shippingFee) ?? 0,
    freeAbove: brand.freeShippingAbove === undefined ? 999 : num(brand.freeShippingAbove),
  }
}
export function shippingFor(subtotal, brand) {
  const { fee, freeAbove } = shippingRules(brand)
  if (subtotal <= 0) return 0
  return freeAbove != null && subtotal >= freeAbove ? 0 : fee
}

// Why a bag line can't be bought right now ('' = it can). Used by the bag and, again, by the server.
export function lineProblem(d, size) {
  if (!d) return 'No longer available'
  if (!buyable(d)) return stockOf(d) === 'coming_soon' ? 'Coming soon' : 'Sold out'
  if (priceNum(d) == null) return 'Not on sale yet'
  const sizes = sizesOf(d)
  if (sizes.length && !sizes.includes(size)) return size ? `Size ${size} sold out` : 'Pick a size'
  return ''
}
export const MAX_QTY = 10
