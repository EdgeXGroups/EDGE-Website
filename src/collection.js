import './style.css'
import './pages.css'
import { Flip } from 'gsap/Flip'
import { designs } from './content.js'
import { imagesFor } from './mockup.js'
import {
  $, $$, fine, reduced, pad, esc, fillBrand, mediaHTML, lenis, initCursor, startRouter, riseLines, pageEnter,
  gsap, ScrollTrigger,
} from './shared.js'
import { SIZES, money, priceNum, offOf, buyable, tagsOf, sizesOf, priceHTML, badgeHTML } from './commerce.js'

gsap.registerPlugin(Flip)

const grid = $('.archive__grid')
const cats = ['All', ...new Set(designs.map((d) => d.category).filter(Boolean))]
const order = new Map(designs.map((d, i) => [d, i]))

$('.chips').innerHTML = cats
  .map((c) => {
    const n = c === 'All' ? designs.length : designs.filter((d) => d.category === c).length
    return `<button class="chip${c === 'All' ? ' is-on' : ''}" data-cat="${esc(c)}" aria-pressed="${c === 'All'}">${esc(c)}<sup>${pad(n)}</sup></button>`
  })
  .join('')

grid.innerHTML = designs
  .map((d, i) => `
  <a class="item${buyable(d) ? '' : ' is-out'}" href="#/drop/${d.slug}" data-slug="${d.slug}" data-cursor="Read story" style="--m-accent:${d.accent}" aria-label="${esc(d.name)} — read the story">
    <div class="item__media">${mediaHTML(d, { eager: i < 4 })}${badgeHTML(d)}</div>
    <div class="item__meta">
      <span class="item__num mono">${pad(i + 1)}</span>
      <span class="item__name">${esc(d.name)}</span>
      <span class="item__cat mono">${esc(d.category || '')}</span>
      <span class="item__type mono">${esc(d.type)}</span>
      ${priceHTML(d, 'item__price')}
      <span class="item__arrow" aria-hidden="true">→</span>
    </div>
  </a>`)
  .join('')

fillBrand()

/* ───────── Sort + filter ───────── */

const SORTS = {
  recommended: ['Recommended', (a, b) => order.get(a) - order.get(b)],
  new: ['What’s new', (a, b) => tagsOf(b).includes('new') - tagsOf(a).includes('new') || String(b.created_at || '').localeCompare(String(a.created_at || '')) || order.get(a) - order.get(b)],
  popular: ['Popularity', (a, b) => tagsOf(b).includes('bestseller') - tagsOf(a).includes('bestseller') || order.get(a) - order.get(b)],
  discount: ['Better discount', (a, b) => offOf(b) - offOf(a) || order.get(a) - order.get(b)],
  price_desc: ['Price: high to low', (a, b) => (priceNum(b) ?? -1) - (priceNum(a) ?? -1)],
  price_asc: ['Price: low to high', (a, b) => (priceNum(a) ?? Infinity) - (priceNum(b) ?? Infinity)],
}
const BUCKETS = [[0, 499], [500, 999], [1000, 1499], [1500, 1999], [2000, Infinity]]
const bucketLabel = ([lo, hi]) => (lo === 0 ? `Under ${money(hi + 1)}` : hi === Infinity ? `${money(lo)} and above` : `${money(lo)} – ${money(hi)}`)
const ONLY = { bestseller: 'Bestsellers', new: 'New in', sale: 'On sale' }

// the filter groups; options no design has are never offered
const GROUPS = [
  { key: 'only', title: 'Show only', options: () => Object.entries(ONLY), test: (d, v) => (v === 'sale' ? offOf(d) > 0 : tagsOf(d).includes(v)) },
  { key: 'type', title: 'Type', options: () => [...new Set(designs.map((d) => d.type).filter(Boolean))].map((t) => [t, t]), test: (d, v) => d.type === v, min: 2 },
  { key: 'size', title: 'Size', options: () => SIZES.map((s) => [s, s]), test: (d, v) => sizesOf(d).includes(v), chips: true },
  { key: 'price', title: 'Price', options: () => BUCKETS.map((b, i) => [String(i), bucketLabel(b)]), test: (d, v) => { const p = priceNum(d), [lo, hi] = BUCKETS[v]; return p != null && p >= lo && p <= hi } },
  { key: 'off', title: 'Discount', single: true, options: () => [10, 25, 40, 50].map((n) => [String(n), `${n}% and above`]), test: (d, v) => offOf(d) >= +v },
  { key: 'stock', title: 'Availability', options: () => [['in', 'Hide sold out']], test: (d) => buyable(d) },
]

const state = { cat: 'All', sort: 'recommended', f: Object.fromEntries(GROUPS.map((g) => [g.key, new Set()])) }

// a design passes when it's in the category and, in every group with something ticked, matches any ticked option
const passes = (d, skip) => (state.cat === 'All' || d.category === state.cat) &&
  GROUPS.every((g) => g.key === skip || !state.f[g.key].size || [...state.f[g.key]].some((v) => g.test(d, v)))
// sold-out pieces always sink to the end
const visible = () => designs.filter((d) => passes(d)).sort((a, b) => buyable(b) - buyable(a) || SORTS[state.sort][1](a, b))
const activeCount = () => GROUPS.reduce((n, g) => n + state.f[g.key].size, 0)

/* sort menu */
const sortList = $('.sortlist')
sortList.innerHTML = Object.entries(SORTS).map(([k, [l]]) => `<label class="sortopt"><input type="radio" name="sort" value="${k}" ${k === state.sort ? 'checked' : ''}/><span>${l}</span></label>`).join('')
sortList.addEventListener('change', (e) => { state.sort = e.target.value; closeSheets(); update() })

/* filter drawer */
const groupsEl = $('.fgroups')
function renderGroups() {
  groupsEl.innerHTML = GROUPS.map((g) => {
    const opts = g.options()
      .map(([v, l]) => ({ v, l, n: designs.filter((d) => passes(d, g.key) && g.test(d, v)).length, on: state.f[g.key].has(v) }))
      .filter((o) => o.on || designs.some((d) => g.test(d, o.v)))
    if (opts.length < (g.min || 1)) return ''
    return `<fieldset class="fgroup${g.chips ? ' fgroup--chips' : ''}"><legend class="mono">${g.title}</legend>
      ${opts.map((o) => `<label class="fopt${o.n || o.on ? '' : ' is-empty'}"><input type="${g.single ? 'radio' : 'checkbox'}" name="f-${g.key}" value="${esc(o.v)}" ${o.on ? 'checked' : ''}/><span>${esc(o.l)}</span>${g.chips ? '' : `<small>${o.n}</small>`}</label>`).join('')}
    </fieldset>`
  }).join('') || '<p class="archive__intro">Filters show up here once designs have prices, sizes and badges (set in the admin).</p>'
}
groupsEl.addEventListener('click', (e) => {
  // the discount radios untick when tapped again
  const input = e.target.closest('input[type=radio]')
  if (input && state.f[input.name.slice(2)].has(input.value)) { e.preventDefault(); state.f[input.name.slice(2)].clear(); update() }
})
groupsEl.addEventListener('change', (e) => {
  const set = state.f[e.target.name.slice(2)]
  if (e.target.type === 'radio') set.clear()
  e.target.checked ? set.add(e.target.value) : set.delete(e.target.value)
  update()
})

/* sheets */
const bg = $('.sheetbg')
const sheets = { sort: $('.psheet--sort'), filter: $('.psheet--filter') }
const sortBtn = $('.tool--sort')
function openSheet(name) {
  closeSheets(true)
  const el = sheets[name]
  if (name === 'filter') renderGroups()
  bg.hidden = false
  bg.dataset.for = name
  el.hidden = false
  if (name === 'sort' && innerWidth >= 900) {
    const r = sortBtn.getBoundingClientRect()
    Object.assign(el.style, { top: `${r.bottom + 8}px`, right: `${innerWidth - r.right}px` })
  } else el.style.top = el.style.right = ''
  sortBtn.setAttribute('aria-expanded', name === 'sort')
  requestAnimationFrame(() => { bg.classList.add('is-on'); el.classList.add('is-on') })
  if (name === 'filter' || innerWidth < 900) lenis?.stop()
}
function closeSheets(instant) {
  sortBtn.setAttribute('aria-expanded', 'false')
  for (const el of [bg, ...Object.values(sheets)]) {
    if (el.hidden) continue
    el.classList.remove('is-on')
    if (instant) el.hidden = true
    else setTimeout(() => !el.classList.contains('is-on') && (el.hidden = true), 400)
  }
  lenis?.start()
}
sortBtn.addEventListener('click', () => (sheets.sort.hidden ? openSheet('sort') : closeSheets()))
$('.tool--filter').addEventListener('click', () => openSheet('filter'))
$$('[data-open]').forEach((b) => b.addEventListener('click', () => openSheet(b.dataset.open)))
bg.addEventListener('click', () => closeSheets())
$('.psheet__x').addEventListener('click', () => closeSheets())
$('.psheet__apply').addEventListener('click', () => { closeSheets(); toGrid() })
addEventListener('keydown', (e) => e.key === 'Escape' && closeSheets())
function toGrid() {
  const y = $('.archive__grid').getBoundingClientRect().top + scrollY - 160
  if (scrollY > y) lenis ? lenis.scrollTo(y) : scrollTo(0, y)
}

/* clear + pills */
function clearAll() { GROUPS.forEach((g) => state.f[g.key].clear()); setCat('All', true); update() }
$$('[data-clear]').forEach((b) => b.addEventListener('click', clearAll))
const pills = $('.pills')
pills.addEventListener('click', (e) => {
  const p = e.target.closest('[data-pill]')
  if (!p) return
  if (p.dataset.pill === 'all') return clearAll()
  if (p.dataset.pill === 'cat') setCat('All', true)
  else state.f[p.dataset.pill].delete(p.dataset.v)
  update()
})
function renderPills() {
  const label = (g, v) => (g.key === 'size' ? `Size ${v}` : g.options().find(([x]) => x === v)?.[1] || v)
  const list = [
    ...(state.cat !== 'All' ? [['cat', '', state.cat]] : []),
    ...GROUPS.flatMap((g) => [...state.f[g.key]].map((v) => [g.key, v, label(g, v)])),
  ]
  pills.innerHTML = list.map(([k, v, l]) => `<button class="pill" data-pill="${k}" data-v="${esc(v)}" aria-label="Remove ${esc(l)}">${esc(l)}<i aria-hidden="true">×</i></button>`).join('') +
    (list.length > 1 ? '<button class="pill pill--clear" data-pill="all">Clear all</button>' : '')
}

/* categories */
function setCat(cat, silent) {
  state.cat = cat
  $$('.chip').forEach((c) => { const on = c.dataset.cat === cat; c.classList.toggle('is-on', on); c.setAttribute('aria-pressed', on) })
  if (!silent) update()
}
$('.chips').addEventListener('click', (e) => {
  const btn = e.target.closest('.chip')
  if (btn && !btn.classList.contains('is-on')) setCat(btn.dataset.cat)
})

/* apply: the grid animates into its new order (Flip) */
const items = $$('.item')
const bySlug = new Map(items.map((it) => [it.dataset.slug, it]))
function flip(change) {
  // finish any pending scroll-in reveals first so they can't fight the Flip
  gsap.killTweensOf(items)
  gsap.set(items, { clearProps: 'opacity,transform,clipPath' })
  const st = Flip.getState(items, { props: 'opacity' })
  change()
  Flip.from(st, {
    duration: reduced ? 0 : 0.8, ease: 'expo.inOut', scale: true, absolute: true, nested: true,
    onEnter: (els) => gsap.fromTo(els, { opacity: 0, scale: 0.85 }, { opacity: 1, scale: 1, duration: 0.6, ease: 'expo.out' }),
    onLeave: (els) => gsap.to(els, { opacity: 0, scale: 0.85, duration: 0.4 }),
    onComplete: () => ScrollTrigger.refresh(),
  })
}

let first = true
function update() {
  const shown = visible()
  const keep = new Set(shown)
  const apply = () => {
    shown.forEach((d) => { const it = bySlug.get(d.slug); it.hidden = false; grid.appendChild(it) })
    designs.filter((d) => !keep.has(d)).forEach((d) => { const it = bySlug.get(d.slug); it.hidden = true; grid.appendChild(it) })
  }
  first ? apply() : flip(apply)
  first = false

  const n = activeCount()
  $$('[data-sort-label]').forEach((el) => (el.textContent = SORTS[state.sort][0]))
  $$('[data-fcount]').forEach((el) => (el.textContent = n || ''))
  $('[data-fsum]').textContent = n ? `${n} applied` : 'All designs'
  $('.tool--filter').classList.toggle('is-on', n > 0)
  $('.tool--sort').classList.toggle('is-on', state.sort !== 'recommended')
  $('.archive__count').textContent = shown.length === designs.length ? `${designs.length} designs` : `Showing ${shown.length} of ${designs.length}`
  $('.archive__empty').hidden = shown.length > 0
  $('.psheet__apply span').textContent = shown.length ? `Show ${shown.length} design${shown.length === 1 ? '' : 's'}` : 'No matches'
  $$('.sortlist input').forEach((r) => (r.checked = r.value === state.sort))
  if (!sheets.filter.hidden) renderGroups()
  renderPills()
  saveURL()
}

/* the filters live in the address, so a filtered view can be shared */
function saveURL() {
  const q = new URLSearchParams()
  if (state.cat !== 'All') q.set('cat', state.cat)
  if (state.sort !== 'recommended') q.set('sort', state.sort)
  GROUPS.forEach((g) => state.f[g.key].size && q.set(g.key, [...state.f[g.key]].join(',')))
  const s = q.toString()
  history.replaceState(history.state, '', `${location.pathname}${s ? `?${s}` : ''}${location.hash}`)
}
{
  const q = new URLSearchParams(location.search)
  if (cats.includes(q.get('cat'))) setCat(q.get('cat'), true)
  if (SORTS[q.get('sort')]) state.sort = q.get('sort')
  GROUPS.forEach((g) => (q.get(g.key) || '').split(',').filter(Boolean).forEach((v) => state.f[g.key].add(v)))
}
update()

/* layout switch */
$('.views').addEventListener('click', (e) => {
  const btn = e.target.closest('.views__btn')
  if (!btn || btn.classList.contains('is-on')) return
  $$('.views__btn').forEach((b) => { b.classList.toggle('is-on', b === btn); b.setAttribute('aria-pressed', b === btn) })
  flip(() => (grid.dataset.view = btn.dataset.view))
  try { localStorage.setItem('edge-view', btn.dataset.view) } catch {}
})
try {
  const saved = localStorage.getItem('edge-view')
  if (saved === 'list') $('.views__btn[data-view="list"]').click()
} catch {}

/* ───────── Index view: image follows the cursor ───────── */

if (fine) {
  const float = $('.archive__float')
  const img = $('img', float)
  const xTo = gsap.quickTo(float, 'x', { duration: 0.6, ease: 'power3' })
  const yTo = gsap.quickTo(float, 'y', { duration: 0.6, ease: 'power3' })
  const rTo = gsap.quickTo(float, 'rotate', { duration: 0.8, ease: 'power3' })
  let lastX = 0
  addEventListener('pointermove', (e) => {
    xTo(e.clientX); yTo(e.clientY)
    rTo(Math.max(-12, Math.min(12, (e.clientX - lastX) * 0.6)))
    lastX = e.clientX
  })
  grid.addEventListener('pointerover', (e) => {
    const it = e.target.closest('.item')
    if (grid.dataset.view !== 'list' || !it) return
    const d = designs.find((x) => it.getAttribute('href').endsWith('/' + x.slug))
    img.src = imagesFor(d)[0]
    float.style.setProperty('--m-accent', d.accent)
    float.classList.add('is-on')
  })
  grid.addEventListener('pointerleave', () => float.classList.remove('is-on'))
}

/* ───────── Intro + scroll ───────── */

initCursor()
riseLines('.archive__title', { immediate: true, delay: 0.25 })
gsap.from('.archive__head .eyebrow, .archive__intro, .archive__bar', { y: 30, opacity: 0, duration: 1, stagger: 0.08, ease: 'expo.out', delay: 0.4 })
ScrollTrigger.batch(items, {
  start: 'top 92%', once: true,
  onEnter: (els) => gsap.fromTo(els, { y: 70, opacity: 0, clipPath: 'inset(20% 0% 0% 0%)' }, { y: 0, opacity: 1, clipPath: 'inset(0% 0% 0% 0%)', duration: 1.1, stagger: 0.08, ease: 'expo.out', overwrite: true }),
})
gsap.from('.foot__mark img, .foot__info li', { y: 30, opacity: 0, duration: 1, stagger: 0.06, ease: 'expo.out', scrollTrigger: { trigger: '.foot', start: 'top 92%' } })

pageEnter()
document.fonts.ready.then(() => ScrollTrigger.refresh())
lenis?.start()
startRouter()
