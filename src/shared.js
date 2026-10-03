// Everything both pages (home + archive) share: smooth scroll, nav/menu,
// cursor, page transitions, the design-story overlay and the lightbox.
import './chrome.js' // must run before anything below queries the nav
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import Lenis from 'lenis'
import { brand, designs, sizeCharts } from './content.js'
import { imagesFor, frontBack, galleryFor } from './mockup.js'
import { heartHTML, paintHearts, wireBuy, setScrollLock } from './shop-ui.js'
import { track } from './analytics.js'
import { SIZES, TAGS, STOCK, chartFor, priceHTML, priceNum, stockOf, buyable, tagsOf, sizesOf, badgeHTML } from './commerce.js'

gsap.registerPlugin(ScrollTrigger, SplitText)

export const $ = (s, root = document) => root.querySelector(s)
export const $$ = (s, root = document) => [...root.querySelectorAll(s)]
export const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
export const fine = matchMedia('(pointer: fine)').matches
export const pad = (n) => String(n).padStart(2, '0')
export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

export const links = {
  instagram: brand.instagram && { href: `https://instagram.com/${brand.instagram}`, text: `@${brand.instagram}` },
  email: brand.email && { href: `mailto:${brand.email}`, text: brand.email },
  whatsapp: brand.whatsapp && { href: `https://wa.me/${brand.whatsapp}`, text: 'Message us' },
}

export function fillBrand() {
  $$('[data-brand]').forEach((el) => (el.textContent = brand[el.dataset.brand] ?? ''))
  $$('[data-link]').forEach((el) => {
    const l = links[el.dataset.link]
    if (!l) return el.closest('li')?.remove()
    el.href = l.href
    const b = $('b', el)
    if (b && !b.textContent) b.textContent = l.text
  })
  $$('[data-if]').forEach((el) => !brand[el.dataset.if] && el.remove())
  $$('.year').forEach((el) => (el.textContent = new Date().getFullYear()))
  $$('[data-count="designs"]').forEach((el) => (el.textContent = pad(designs.length)))
}

/* ───────── Cards ───────── */

// Front image, plus the back revealed on hover (or on scroll for touch).

export function mediaHTML(d, { eager = false } = {}) {
  const [front, back] = frontBack(d)
  return `
    <div class="media" style="--m-accent:${d.accent}">
      <img class="media__img" src="${front}" alt="${esc(d.name)} — front" ${eager ? '' : 'loading="lazy"'} />
      ${back ? `<img class="media__img media__img--back" src="${back}" alt="${esc(d.name)} — back" loading="lazy" />` : ''}
    </div>`
}

/* ───────── Smooth scroll ───────── */

export const lenis = reduced ? null : new Lenis({ lerp: 0.1, autoRaf: false })
if (lenis) {
  lenis.on('scroll', ScrollTrigger.update)
  gsap.ticker.add((t) => lenis.raf(t * 1000))
  gsap.ticker.lagSmoothing(0)
}
setScrollLock({ stop: () => lenis?.stop(), start: () => lenis?.start() })
export const scrollTo = (target, opts = {}) =>
  lenis ? lenis.scrollTo(target, { duration: 1.4, ...opts }) : (target === 0 ? scrollTo0() : $(target)?.scrollIntoView({ behavior: opts.immediate ? 'auto' : 'smooth' }))
const scrollTo0 = () => window.scrollTo({ top: 0, behavior: 'smooth' })

/* ───────── Page transitions ───────── */

const wipeEl = document.createElement('div')
wipeEl.className = 'page-wipe'
wipeEl.innerHTML = '<img src="/brand/edge-mark.png" alt="" />'
document.body.appendChild(wipeEl)
let arrivedViaWipe = false
try { arrivedViaWipe = sessionStorage.getItem('edge-wipe') === '1'; sessionStorage.removeItem('edge-wipe') } catch {}
if (arrivedViaWipe) gsap.set(wipeEl, { clipPath: 'inset(0% 0% 0% 0%)' })

export function pageEnter() {
  if (!arrivedViaWipe) return Promise.resolve()
  return gsap.to(wipeEl, { clipPath: 'inset(0% 0% 100% 0%)', duration: 1, ease: 'expo.inOut', delay: 0.1 })
}
export const arrivedFromSite = arrivedViaWipe

function leaveTo(href) {
  try { sessionStorage.setItem('edge-wipe', '1') } catch {}
  gsap.fromTo(wipeEl, { clipPath: 'inset(100% 0% 0% 0%)' }, {
    clipPath: 'inset(0% 0% 0% 0%)', duration: reduced ? 0.01 : 0.8, ease: 'expo.inOut',
    onComplete: () => (location.href = href),
  })
}
// bfcache: coming back with the browser button must not show a covered page
addEventListener('pageshow', (e) => e.persisted && gsap.set(wipeEl, { clipPath: 'inset(0% 0% 100% 0%)' }))

/* ───────── Links ───────── */

document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href]')
  if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || a.target === '_blank') return
  const href = a.getAttribute('href')
  if (href.startsWith('#/')) return // story overlay — handled below
  if (href.startsWith('#')) {
    if (href === '#top' || $(href)) {
      e.preventDefault()
      closeMenu()
      scrollTo(href === '#top' ? 0 : href)
    }
    return
  }
  const url = new URL(a.href, location.href)
  if (url.origin !== location.origin) return
  if (url.pathname === location.pathname && url.hash) {
    // e.g. "/#team" while already on home
    const t = $(url.hash)
    if (t) { e.preventDefault(); closeMenu(); scrollTo(url.hash) }
    return
  }
  e.preventDefault()
  closeMenu()
  leaveTo(a.href)
})

/* ───────── Nav + menu ───────── */

const burger = $('.nav__burger')
const menu = $('.menu')
export function closeMenu() {
  if (!menu?.classList.contains('is-open')) return
  menu.classList.remove('is-open')
  menu.setAttribute('aria-hidden', 'true')
  burger.setAttribute('aria-expanded', 'false')
  document.body.classList.remove('menu-open')
  lenis?.start()
}
burger?.addEventListener('click', () => {
  if (menu.classList.contains('is-open')) return closeMenu()
  menu.classList.add('is-open')
  menu.setAttribute('aria-hidden', 'false')
  burger.setAttribute('aria-expanded', 'true')
  document.body.classList.add('menu-open')
  lenis?.stop()
})

let lastY = 0
const nav = $('.nav')
function onScrollNav(y) {
  if (y > innerHeight * 0.6 && y > lastY + 4) nav.classList.add('is-hidden')
  else if (y < lastY - 4 || y < 80) nav.classList.remove('is-hidden')
  lastY = y
}
if (lenis) lenis.on('scroll', ({ scroll }) => onScrollNav(scroll))
else addEventListener('scroll', () => onScrollNav(scrollY), { passive: true })

/* ───────── Cursor + magnetic ───────── */

export function initCursor() {
  if (!fine) return
  const c = $('.cursor')
  const label = $('.cursor__label')
  const xTo = gsap.quickTo(c, 'x', { duration: 0.35, ease: 'power3' })
  const yTo = gsap.quickTo(c, 'y', { duration: 0.35, ease: 'power3' })
  addEventListener('pointermove', (e) => { xTo(e.clientX); yTo(e.clientY) })
  document.addEventListener('pointerover', (e) => {
    const big = e.target.closest('[data-cursor]')
    const link = e.target.closest('a, button, input, textarea, select')
    c.classList.toggle('is-big', !!big)
    c.classList.toggle('is-link', !big && !!link)
    if (big) label.textContent = big.dataset.cursor
  })
  document.addEventListener('pointerleave', () => gsap.to(c, { opacity: 0 }))
  document.addEventListener('pointerenter', () => gsap.to(c, { opacity: 1 }))

  document.addEventListener('pointermove', (e) => {
    $$('[data-magnetic]').forEach((el) => {
      const r = el.getBoundingClientRect()
      const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2)
      const inside = Math.hypot(dx, dy) < Math.max(r.width, r.height) * 0.9 + 30
      gsap.to(el, { x: inside ? dx * 0.3 : 0, y: inside ? dy * 0.3 : 0, duration: 0.6, ease: inside ? 'power3.out' : 'elastic.out(1, 0.4)', overwrite: 'auto' })
    })
  })
}

/* ───────── Design story overlay (#/drop/<slug>) ───────── */

const detail = $('.detail')
const wipe = $('.detail__wipe')
const scroller = $('.detail__scroller')
const content = $('.detail__content')
let current = null
let pointer = { x: innerWidth / 2, y: innerHeight / 2 }
let pushedByUs = false
let routerReady = false
addEventListener('pointerdown', (e) => (pointer = { x: e.clientX, y: e.clientY }), { capture: true })

function detailHTML(d) {
  const i = designs.indexOf(d)
  const imgs = galleryFor(d)
  const words = d.name.split(' ')
  // every other design, starting with the one after this
  const others = [...designs.slice(i + 1), ...designs.slice(0, i)]
  const stock = stockOf(d)
  const sizes = sizesOf(d)
  const chart = chartFor(d, sizeCharts)
  const canBuy = buyable(d) && priceNum(d) != null
  const askLabel = stock === 'sold_out' ? 'Ask about a restock' : stock === 'coming_soon' ? 'Tell me when it drops' : 'Ask to order'
  const badges = [...(stock !== 'in_stock' ? [[stock, STOCK[stock]]] : []), ...tagsOf(d).map((t) => [t, TAGS[t]])]
  const note = { few_left: 'Only a few left — don’t sleep on it.', sold_out: 'Sold out. Ask us — if enough of you do, it comes back.', coming_soon: 'Coming soon. Ask and we’ll tell you the moment it drops.' }[stock]
  return `
    <div class="d-layout">
      <div class="d-gallery" style="--m-accent:${d.accent}">
        <div class="d-strip">
          ${imgs.map(({ src, label }, k) => `<figure data-cursor="Zoom"><img src="${src}" alt="${esc(d.name)} — ${label || 'photo ' + (k + 1)}" ${k > 1 ? 'loading="lazy"' : ''}/><figcaption class="mono">${label}</figcaption></figure>`).join('')}
        </div>
        <span class="d-counter mono"><b>01</b> / ${pad(imgs.length)}</span>
        <div class="d-progress">${imgs.map((_, k) => `<i class="${k === 0 ? 'on' : ''}"></i>`).join('')}</div>
        ${imgs.length > 1 ? `<button class="d-arrow d-arrow--prev" aria-label="Previous photo" disabled>←</button><button class="d-arrow d-arrow--next" aria-label="Next photo">→</button><span class="d-hint mono">Swipe →</span>` : ''}
      </div>
      <div class="d-info">
        <div class="d-meta mono"><span>No. ${pad(i + 1)} — ${esc(d.category || brand.drop)}</span><span>${esc(d.type)}</span></div>
        <h2 class="display d-name">${words.map((w) => `<span class="line-mask"><span>${esc(w)}</span></span>`).join('')}</h2>
        <p class="d-tag">${esc(d.tagline)}</p>
        <div class="d-buy">
          ${badges.length ? `<div class="d-badges">${badges.map(([k, l]) => `<span class="badge badge--${k}">${l}</span>`).join('')}</div>` : ''}
          ${priceNum(d) != null ? `<div class="d-price">${priceHTML(d)}<span class="mono d-price__tax">Inclusive of all taxes</span></div>` : ''}
          ${note ? `<p class="d-note d-note--${stock}">${note}</p>` : ''}
          ${sizes.length && buyable(d) ? `
          <div class="d-sizes">
            <div class="d-sizes__head"><span class="mono">Select size</span>${chart ? '<button class="mono d-guide__open" type="button" aria-expanded="false">Size guide</button>' : ''}</div>
            <div class="d-sizes__list" role="radiogroup" aria-label="Size">${SIZES.map((s) => `<label class="d-size${sizes.includes(s) ? '' : ' is-out'}"><input type="radio" name="size" value="${s}" ${sizes.includes(s) ? '' : 'disabled'}/><span>${s}</span></label>`).join('')}</div>
            ${chart ? `<div class="d-guide" hidden>
              <table class="mono"><caption>${esc(chart.name)} · ${chart.unit === 'cm' ? 'cm' : 'inches'}</caption>
                <thead><tr><th>Size</th>${chart.columns.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead>
                <tbody>${chart.rows.map((r) => `<tr class="${sizes.includes(r[0]) ? '' : 'is-out'}">${[r[0], ...chart.columns.map((_, k) => r[k + 1] ?? '')].map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody>
              </table>${chart.note ? `<p class="mono">${esc(chart.note)}</p>` : ''}</div>` : ''}
          </div>` : ''}
          ${canBuy ? `
          <div class="d-actions d-actions--buy">
            <button class="btn btn--accent d-addbag" type="button"><span>Add to bag</span></button>
            ${heartHTML(d.slug, 'heart--big')}
          </div>
          <a class="mono d-asklink d-ask" href="/contact.html?design=${d.slug}">Questions about this piece? Ask us →</a>` : `
          <div class="d-actions d-actions--buy">
            <a class="btn btn--accent d-ask" href="/contact.html?design=${d.slug}" data-label="${askLabel}"><span>${askLabel}</span></a>
            ${heartHTML(d.slug, 'heart--big')}
          </div>
          ${links.instagram ? `<a class="mono d-asklink" href="${links.instagram.href}" target="_blank" rel="noopener">Or DM us on Instagram →</a>` : ''}`}
        </div>
        <div class="d-story">${d.story.map((p) => `<p>${esc(p)}</p>`).join('')}</div>
        <dl class="d-specs mono">${d.details.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
      </div>
    </div>
    ${others.length ? `<nav class="d-more" aria-label="More designs">
      <div class="d-more__head">
        <span class="mono d-more__label">More designs · ${pad(others.length)}</span>
      </div>
      <div class="d-more__strip" data-lenis-prevent>
        ${others.map((x) => `<a class="d-more__card" href="#/drop/${x.slug}" style="--m-accent:${x.accent}" data-cursor="Open">
          <span class="d-more__img"><img src="${imagesFor(x)[0]}" alt="" loading="lazy"/>${badgeHTML(x)}</span>
          <span class="display d-more__name">${esc(x.name)}</span>
          ${priceHTML(x, 'd-more__price')}
        </a>`).join('')}
      </div>
    </nav>` : ''}`
}

let slideKeys = null
addEventListener('keydown', (e) => { if (current && !e.target.closest?.('input, textarea')) slideKeys?.(e) })

function wireDetail() {
  const strip = $('.d-strip', content)
  const figs = $$('figure', strip)
  const bars = $$('.d-progress i', content)
  const counter = $('.d-counter b', content)
  const prev = $('.d-arrow--prev', content)
  const next = $('.d-arrow--next', content)
  let at = 0
  const set = (k) => {
    at = k
    counter.textContent = pad(k + 1)
    bars.forEach((b, j) => b.classList.toggle('on', j <= k))
    if (prev) { prev.disabled = k === 0; next.disabled = k === figs.length - 1 }
  }
  strip.addEventListener('scroll', () => set(Math.round(strip.scrollLeft / strip.clientWidth)), { passive: true })
  // slides: arrows, and ← → keys while the story is open
  const go = (k) => strip.scrollTo({ left: Math.max(0, Math.min(figs.length - 1, k)) * strip.clientWidth, behavior: reduced ? 'auto' : 'smooth' })
  prev?.addEventListener('click', () => go(at - 1))
  next?.addEventListener('click', () => go(at + 1))
  slideKeys = (e) => { if (e.key === 'ArrowLeft') go(at - 1); else if (e.key === 'ArrowRight') go(at + 1) }
  figs.forEach((f) => f.addEventListener('click', () => openLightbox($('img', f).src)))
  const hint = $('.d-hint', content)
  if (hint) gsap.fromTo(hint, { x: 0 }, { x: 10, repeat: -1, yoyo: true, duration: 0.8, ease: 'sine.inOut' })
  // size: carried into the contact form, so the message already says what they want
  const ask = $('.d-ask', content)
  $('.d-sizes__list', content)?.addEventListener('change', (e) => {
    const u = new URL(ask.href)
    u.searchParams.set('size', e.target.value)
    ask.href = u.pathname + u.search
    if (ask.dataset.label) $('span', ask).textContent = `${ask.dataset.label} · ${e.target.value}`
  })
  const guideBtn = $('.d-guide__open', content)
  guideBtn?.addEventListener('click', () => {
    const g = $('.d-guide', content)
    g.hidden = !g.hidden
    guideBtn.setAttribute('aria-expanded', !g.hidden)
  })
  // long words (ENOUGH, RETREAT…) shrink the title until they fit the column
  const name = $('.d-name', content)
  const widest = Math.max(...$$('.line-mask > span', name).map((s) => s.getBoundingClientRect().width))
  if (widest > name.clientWidth) name.style.fontSize = `${(parseFloat(getComputedStyle(name).fontSize) * name.clientWidth) / widest * 0.97}px`
}

function revealDetail() {
  gsap.timeline()
    .from($$('.d-name .line-mask > span', content), { yPercent: 110, duration: 1.2, stagger: 0.08, ease: 'expo.out' })
    .from($$('.d-strip img', content), { scale: 1.2, duration: 1.6, ease: 'expo.out' }, 0)
    .from($$('.d-meta, .d-tag, .d-story p, .d-specs, .d-actions', content), { y: 30, opacity: 0, duration: 1, stagger: 0.06, ease: 'expo.out' }, 0.15)
    .from('.detail__close', { scale: 0, rotate: -90, duration: 0.8, ease: 'back.out(2)' }, 0.2)
}

let busy = false
// how long each story stays open → "avg time on a design" in Insights
let viewStart = 0
function endView(beacon) {
  if (!current || !viewStart) return
  const seconds = Math.min(1800, Math.round((performance.now() - viewStart) / 1000))
  track('design_closed', { slug: current.slug, seconds }, beacon ? { transport: 'sendBeacon' } : undefined)
  viewStart = 0
}
addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') endView(true)
  else if (current && !viewStart) viewStart = performance.now() // came back to the tab: start a fresh stint
})

async function openDesign(d) {
  if (busy) return
  busy = true
  const first = !current
  endView()
  current = d
  viewStart = performance.now()
  track('design_viewed', { slug: d.slug, name: d.name, price: priceNum(d) })
  detail.style.setProperty('--d-accent', d.accent)
  closeMenu()
  if (first) {
    lenis?.stop()
    document.body.classList.add('is-locked')
    detail.classList.add('is-open')
    detail.setAttribute('aria-hidden', 'false')
    const at = `${pointer.x}px ${pointer.y}px`
    await gsap.fromTo(wipe, { clipPath: `circle(0% at ${at})` }, { clipPath: `circle(150% at ${at})`, duration: reduced ? 0.01 : 0.9, ease: 'expo.inOut' })
  } else {
    await gsap.fromTo(wipe, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.8, ease: 'expo.inOut' })
  }
  content.innerHTML = detailHTML(d)
  scroller.scrollTop = 0
  gsap.set(scroller, { opacity: 1 })
  wireDetail()
  wireBuy(content, d)
  paintHearts(content)
  gsap.set(wipe, { clipPath: 'inset(0% 0% 0% 0%)' })
  gsap.to(wipe, { clipPath: 'inset(0% 0% 100% 0%)', duration: reduced ? 0.01 : 0.9, ease: 'expo.inOut' })
  revealDetail()
  $('.detail__close').focus({ preventScroll: true })
  busy = false
}

async function closeDesign() {
  if (!current || busy) return
  busy = true
  await gsap.fromTo(wipe, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: reduced ? 0.01 : 0.75, ease: 'expo.inOut' })
  gsap.set(scroller, { opacity: 0 })
  content.innerHTML = ''
  await gsap.to(wipe, { clipPath: 'inset(0% 0% 100% 0%)', duration: reduced ? 0.01 : 0.75, ease: 'expo.inOut' })
  detail.classList.remove('is-open')
  detail.setAttribute('aria-hidden', 'true')
  document.body.classList.remove('is-locked')
  lenis?.start()
  endView()
  current = null
  busy = false
}

function route() {
  if (!routerReady) return
  const m = location.hash.match(/^#\/drop\/([\w-]+)/)
  const d = m && designs.find((x) => x.slug === m[1])
  if (d && d !== current) openDesign(d)
  else if (!d && current) closeDesign()
}
// Pages call this once their intro is done, so a shared link opens straight into the story.
export function startRouter() {
  routerReady = true
  route()
}
addEventListener('hashchange', route)
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#/drop/"]')
  if (!a) return
  e.preventDefault()
  const href = a.getAttribute('href')
  if (location.hash === href) return
  if (current) history.replaceState(null, '', href)
  else { history.pushState(null, '', href); pushedByUs = true }
  route()
})
$('.detail__close')?.addEventListener('click', () => {
  if (pushedByUs) { pushedByUs = false; history.back() }
  else { history.replaceState(null, '', location.pathname + location.search); route() }
})
addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return
  if (lightbox.classList.contains('is-open')) return closeLightbox()
  if (current) $('.detail__close').click()
  else closeMenu()
})

/* ───────── Lightbox ───────── */

const lightbox = $('.lightbox')
function openLightbox(src) {
  $('img', lightbox).src = src
  lightbox.classList.add('is-open')
  lightbox.setAttribute('aria-hidden', 'false')
  gsap.fromTo($('img', lightbox), { scale: 0.92, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.6, ease: 'expo.out' })
}
function closeLightbox() {
  lightbox.classList.remove('is-open')
  lightbox.setAttribute('aria-hidden', 'true')
}
lightbox.addEventListener('click', closeLightbox)

/* ───────── Reveal helpers ───────── */

// The masks get padding (cancelled by negative margin) so italic serif words
// — tall ascenders, deep descenders, slanted overhang — aren't cut off, and
// the split is undone once the reveal has played.
export function riseLines(selector, opts = {}) {
  $$(selector).forEach((el) => {
    let done = false
    SplitText.create(el, {
      type: 'lines', mask: 'lines', autoSplit: true,
      onSplit: (self) => {
        if (done) return self.revert()
        self.masks.forEach((m) => Object.assign(m.style, { padding: '0.2em 0.12em 0.3em', margin: '-0.2em -0.12em -0.3em' }))
        return gsap.from(self.lines, {
          yPercent: 115, rotate: 3, duration: 1.3, stagger: 0.1, ease: 'expo.out',
          ...(opts.immediate ? { delay: opts.delay || 0 } : { scrollTrigger: { trigger: el, start: 'top 85%' } }),
          onComplete: () => { done = true; self.revert() },
        })
      },
    })
  })
}

/* ───────── Headings that fit ───────── */

// Big display headings are sized in vw; a single long word (CANCELLATIONS, RETREAT…)
// can still be wider than a phone. Shrink just those headings until the word fits.
const FIT = '.sub__title, .archive__title, .team__head h2, .archive__cta .display, .co__done .display, .co__empty .display, .acct__empty .display, .archive__empty .display, .card__name, .drop__end-title'
export function fitHeadings(root = document) {
  for (const el of root.querySelectorAll(FIT)) {
    el.style.fontSize = ''
    for (let i = 0; i < 3 && el.clientWidth && el.scrollWidth > el.clientWidth + 1; i++) {
      el.style.fontSize = `${(parseFloat(getComputedStyle(el).fontSize) * el.clientWidth) / el.scrollWidth * 0.98}px`
    }
  }
}
fitHeadings()
document.fonts?.ready.then(() => fitHeadings())
let fitTimer
addEventListener('resize', () => { clearTimeout(fitTimer); fitTimer = setTimeout(() => fitHeadings(), 150) })

export { gsap, ScrollTrigger, SplitText }
