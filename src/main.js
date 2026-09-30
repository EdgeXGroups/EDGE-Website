import './style.css'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import Lenis from 'lenis'
import { brand, designs, manifesto, pillars, team } from './content.js'
import { imagesFor } from './mockup.js'
import { createHero } from './hero.js'

gsap.registerPlugin(ScrollTrigger, SplitText)

const $ = (s, root = document) => root.querySelector(s)
const $$ = (s, root = document) => [...root.querySelectorAll(s)]
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
const fine = matchMedia('(pointer: fine)').matches
const pad = (n) => String(n).padStart(2, '0')
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

/* ───────── Content → DOM ───────── */

const links = {
  instagram: brand.instagram && { href: `https://instagram.com/${brand.instagram}`, text: `@${brand.instagram}` },
  email: brand.email && { href: `mailto:${brand.email}`, text: brand.email },
  whatsapp: brand.whatsapp && { href: `https://wa.me/${brand.whatsapp}`, text: 'Message us' },
}

function fillBrand() {
  $$('[data-brand]').forEach((el) => (el.textContent = brand[el.dataset.brand] ?? ''))
  $$('[data-link]').forEach((el) => {
    const l = links[el.dataset.link]
    if (!l) return el.closest('li')?.remove()
    el.href = l.href
    const b = $('b', el)
    if (b && !b.textContent) b.textContent = l.text
  })
  $$('[data-if]').forEach((el) => !brand[el.dataset.if] && el.remove())
  $('.year').textContent = new Date().getFullYear()
  $('.drop__count').textContent = pad(designs.length)
}

function buildTapes() {
  const a = ['Edge', brand.drop, 'Out now', 'Story first', 'Small runs', 'Built heavy']
  const b = [brand.tagline, 'Every piece has a story', 'Wear it loud']
  const fill = (el, words) => {
    const set = words.map((w) => `<span>${esc(w)}</span>`).join('')
    el.innerHTML = set.repeat(4)
  }
  fill($('.tape--a .tape__track'), a)
  fill($('.tape--b .tape__track'), b)
}

function buildCards() {
  const track = $('.drop__track')
  track.innerHTML =
    designs
      .map((d, i) => {
        const img = imagesFor(d)[0]
        return `
      <article class="card" style="--card-accent:${d.accent}">
        <a class="card__inner" href="#/drop/${d.slug}" data-cursor="Read story" aria-label="${esc(d.name)} — read the story">
          <div class="card__media"><img src="${img}" alt="${esc(d.name)} ${esc(d.type)}" loading="${i < 2 ? 'eager' : 'lazy'}" /></div>
          <div class="card__top"><span class="card__num">${pad(i + 1)} / ${pad(designs.length)}</span><span class="card__type">${esc(d.type)}</span></div>
          <div class="card__info">
            <span class="display card__name">${esc(d.name)}</span>
            <p class="card__tag">${esc(d.tagline)}</p>
            <span class="card__cta"><i>→</i>Read the story</span>
          </div>
          <span class="card__dim"></span>
        </a>
      </article>`
      })
      .join('') +
    `<div class="drop__end"><p class="mono eyebrow">What’s next</p><p class="display">More<br/><em class="serif">drops</em><br/>soon.</p><a class="btn" href="#contact" data-magnetic><span>Get notified</span></a></div>`
}

function buildManifesto() {
  $('.manifesto__text').innerHTML = manifesto
    .split(/\s+/)
    .map((w) => (w.startsWith('*') ? `<span class="w serif">${esc(w.replace(/\*/g, ''))}</span>` : `<span class="w">${esc(w)}</span>`))
    .join(' ')
  $('.pillars').innerHTML = pillars
    .map(
      (p, i) => `
    <li class="pillar">
      <span class="pillar__n">${pad(i + 1)}</span>
      <h3 class="pillar__t"><span class="line-mask"><span>${esc(p.title)}</span></span></h3>
      <p class="pillar__b">${esc(p.body)}</p>
    </li>`,
    )
    .join('')
}

function buildTeam() {
  $('.team__grid').innerHTML = team
    .map(
      (m) => `
    <article class="member" data-cursor="Hi!">
      <div class="member__photo">${m.photo ? `<img src="${m.photo}" alt="${esc(m.name)}" loading="lazy" />` : `<span class="member__mono" aria-hidden="true">${esc(m.name[0])}</span>`}</div>
      <h3 class="member__name">${esc(m.name)}</h3>
      <p class="mono member__role">${esc(m.role)}</p>
      <p class="member__line">${esc(m.line)}</p>
    </article>`,
    )
    .join('')
}

fillBrand()
buildTapes()
buildCards()
buildManifesto()
buildTeam()

/* ───────── Smooth scroll ───────── */

const lenis = reduced ? null : new Lenis({ lerp: 0.1, autoRaf: false })
if (lenis) {
  lenis.on('scroll', ScrollTrigger.update)
  gsap.ticker.add((t) => lenis.raf(t * 1000))
  gsap.ticker.lagSmoothing(0)
  lenis.stop()
}
const scrollTo = (target) => (lenis ? lenis.scrollTo(target, { duration: 1.4 }) : $(target)?.scrollIntoView({ behavior: 'smooth' }))

// Plain in-page anchors when there's no Lenis (reduced motion)
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]')
  if (!a || a.getAttribute('href').startsWith('#/')) return
  const href = a.getAttribute('href')
  if (href === '#top' || $(href)) {
    e.preventDefault()
    closeMenu()
    scrollTo(href === '#top' ? 0 : href)
  }
})

/* ───────── Hero ───────── */

const hero = createHero($('.hero__gl'), { accent: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() })
if (!hero) document.documentElement.classList.add('no-webgl')

/* ───────── Loader ───────── */

async function runLoader() {
  const count = $('.loader__count')
  const fill = $('.loader__g--fill')
  const p = { v: 0 }
  const render = () => {
    count.textContent = String(Math.round(p.v)).padStart(3, '0')
    fill.style.clipPath = `inset(${100 - p.v}% 0 0 0)`
  }
  const assets = Promise.race([
    Promise.all([document.fonts.ready, hero?.ready].filter(Boolean)),
    new Promise((r) => setTimeout(r, 1800)),
  ])
  await gsap.to(p, { v: 78, duration: reduced ? 0.2 : 1.3, ease: 'power2.inOut', onUpdate: render })
  await assets
  await gsap.to(p, { v: 100, duration: reduced ? 0.1 : 0.45, ease: 'power3.in', onUpdate: render })

  const tl = gsap.timeline()
  tl.to('.loader__inner', { opacity: 0, duration: 0.3 })
    .to('.loader__panel--top', { yPercent: -100, duration: 1.1, ease: 'expo.inOut' }, '<0.1')
    .to('.loader__panel--bottom', { yPercent: 100, duration: 1.1, ease: 'expo.inOut' }, '<')
    .add(() => {
      document.body.classList.remove('is-loading')
      $('.loader').style.display = 'none'
      lenis?.start()
      ScrollTrigger.refresh()
      if (location.hash.startsWith('#/drop/')) route()
    })
  if (hero) tl.to(hero.uniforms.uIntro, { value: 1, duration: 2.4, ease: 'power2.out' }, 0.35)
  else tl.from('.hero__fallback', { opacity: 0, scale: 1.1, duration: 1.4, ease: 'expo.out' }, 0.4)

  const lede = SplitText.create('.hero__lede', { type: 'lines', mask: 'lines' })
  tl.from(lede.lines, { yPercent: 110, duration: 1.2, stagger: 0.08, ease: 'expo.out' }, 0.9)
    .from('.hero__top > *', { y: -20, opacity: 0, stagger: 0.1, duration: 0.8, ease: 'expo.out' }, 1)
    .from('.hero__cta', { scale: 0, rotate: -180, duration: 1.2, ease: 'expo.out' }, 1.1)
    .from('.nav', { yPercent: -100, duration: 1, ease: 'expo.out' }, 1)
}

/* ───────── Nav + menu ───────── */

const burger = $('.nav__burger')
const menu = $('.menu')
function closeMenu() {
  if (!menu.classList.contains('is-open')) return
  menu.classList.remove('is-open')
  menu.setAttribute('aria-hidden', 'true')
  burger.setAttribute('aria-expanded', 'false')
  document.body.classList.remove('menu-open')
  lenis?.start()
}
burger.addEventListener('click', () => {
  const open = !menu.classList.contains('is-open')
  if (!open) return closeMenu()
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

/* ───────── Tapes ───────── */

function initTapes() {
  const tracks = [
    { el: $('.tape--a .tape__track'), dir: -1, x: 0 },
    { el: $('.tape--b .tape__track'), dir: 1, x: 0 },
  ]
  let boost = 0
  lenis?.on('scroll', ({ velocity }) => (boost = Math.min(Math.abs(velocity) * 0.9, 30)))
  gsap.ticker.add((_, dt) => {
    boost *= 0.94
    for (const t of tracks) {
      const half = t.el.scrollWidth / 2
      t.x += t.dir * (0.9 + boost) * (dt / 16)
      if (t.x <= -half) t.x += half
      if (t.x > 0) t.x -= half
      t.el.style.transform = `translate3d(${t.x}px,0,0)`
    }
  })
}

/* ───────── Scroll animations ───────── */

function initScroll() {
  // hero melts as you leave it
  if (hero) {
    ScrollTrigger.create({
      trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true,
      onUpdate: (s) => (hero.uniforms.uScroll.value = s.progress),
    })
  }
  gsap.to('.hero__bottom, .hero__top', { yPercent: -60, opacity: 0, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: '60% top', scrub: true } })

  // headings rise out of masks
  $$('.drop__title, .team__head h2, .d-reveal').forEach((el) => {
    SplitText.create(el, {
      type: 'lines', mask: 'lines', autoSplit: true,
      onSplit: (self) => gsap.from(self.lines, { yPercent: 115, rotate: 3, duration: 1.3, stagger: 0.1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 85%' } }),
    })
  })
  gsap.from('.drop__intro, .drop__head .eyebrow', { y: 30, opacity: 0, duration: 1, stagger: 0.1, ease: 'expo.out', scrollTrigger: { trigger: '.drop__head', start: 'top 80%' } })

  // contact heading
  gsap.from('.contact__line', { yPercent: 100, duration: 1.3, stagger: 0.12, ease: 'expo.out', scrollTrigger: { trigger: '.contact__big', start: 'top 85%' } })
  gsap.from('.contact__form > *, .contact__links li', { y: 30, opacity: 0, duration: 0.9, stagger: 0.05, ease: 'expo.out', scrollTrigger: { trigger: '.contact__grid', start: 'top 85%' } })

  // manifesto lights up word by word
  gsap.to('.manifesto__text .w', {
    opacity: 1, stagger: 0.1, ease: 'none',
    scrollTrigger: { trigger: '.manifesto__text', start: 'top 80%', end: 'bottom 45%', scrub: 0.6 },
  })

  // pillars draw their rule then rise
  $$('.pillar').forEach((el) => {
    const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: 'top 88%' } })
    tl.fromTo(el, { '--draw': 0 }, { '--draw': 1, duration: 1.2, ease: 'expo.inOut' })
      .from($('.pillar__t span span', el), { yPercent: 110, duration: 1.1, ease: 'expo.out' }, 0.3)
      .from([$('.pillar__n', el), $('.pillar__b', el)], { opacity: 0, y: 16, duration: 0.8, stagger: 0.08, ease: 'expo.out' }, 0.45)
  })

  // team
  gsap.from('.member', { y: 80, opacity: 0, duration: 1.2, stagger: 0.1, ease: 'expo.out', scrollTrigger: { trigger: '.team__grid', start: 'top 85%' } })

  // footer wordmark pushes up
  gsap.from('.foot__mark img', { yPercent: 40, scale: 0.9, ease: 'none', scrollTrigger: { trigger: '.foot', start: 'top bottom', end: 'bottom bottom', scrub: true } })

  // tapes swing in
  gsap.from('.tape--a', { rotate: -12, ease: 'none', scrollTrigger: { trigger: '.tapes', start: 'top bottom', end: 'bottom top', scrub: true } })
  gsap.from('.tape--b', { rotate: 12, ease: 'none', scrollTrigger: { trigger: '.tapes', start: 'top bottom', end: 'bottom top', scrub: true } })

  // the drop — two different choreographies
  const mm = gsap.matchMedia()
  mm.add('(min-width: 900px)', () => {
    const track = $('.drop__track')
    const dist = () => track.scrollWidth - innerWidth
    const tween = gsap.to(track, {
      x: () => -dist(), ease: 'none',
      scrollTrigger: { trigger: '.drop__pin', start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 1, invalidateOnRefresh: true, anticipatePin: 1 },
    })
    $$('.card').forEach((card) => {
      gsap.fromTo($('img', card), { xPercent: -8 }, { xPercent: 8, ease: 'none', scrollTrigger: { trigger: card, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true } })
      gsap.from($('.card__name', card), { yPercent: 60, opacity: 0, ease: 'expo.out', duration: 1, scrollTrigger: { trigger: card, containerAnimation: tween, start: 'left 85%' } })
    })
  })
  mm.add('(max-width: 899px)', () => {
    const cards = $$('.card')
    cards.forEach((card, i) => {
      const next = cards[i + 1]
      if (!next) return
      gsap.to($('.card__inner', card), {
        scale: 0.9, rotate: i % 2 ? 1.5 : -1.5, ease: 'none',
        scrollTrigger: { trigger: next, start: 'top bottom', end: 'top top+=70', scrub: true },
      })
      gsap.to($('.card__dim', card), { opacity: 0.6, ease: 'none', scrollTrigger: { trigger: next, start: 'top bottom', end: 'top top+=70', scrub: true } })
    })
    cards.forEach((card) => gsap.from($('.card__name', card), { yPercent: 50, opacity: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: card, start: 'top 70%' } }))
  })
}

/* ───────── Cursor + magnetic ───────── */

function initCursor() {
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
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2
      const dx = e.clientX - cx, dy = e.clientY - cy
      const reach = Math.max(r.width, r.height) * 0.9 + 30
      const inside = Math.hypot(dx, dy) < reach
      gsap.to(el, { x: inside ? dx * 0.3 : 0, y: inside ? dy * 0.3 : 0, duration: 0.6, ease: inside ? 'power3.out' : 'elastic.out(1, 0.4)', overwrite: 'auto' })
    })
  })
}

/* ───────── Contact form (no backend: opens mail app) ───────── */

$('.contact__form').addEventListener('submit', (e) => {
  e.preventDefault()
  const f = e.currentTarget
  let ok = true
  ;['name', 'message'].forEach((n) => {
    const bad = !f[n].value.trim()
    f[n].classList.toggle('is-invalid', bad)
    if (bad) ok = false
  })
  if (!ok) return gsap.fromTo(f, { x: -8 }, { x: 0, duration: 0.6, ease: 'elastic.out(1, 0.3)' })
  const subject = `[EDGE] ${f.topic.value} — ${f.name.value.trim()}`
  location.href = `mailto:${brand.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(f.message.value.trim())}`
})

/* ───────── Design detail (hash router) ───────── */

const detail = $('.detail')
const wipe = $('.detail__wipe')
const scroller = $('.detail__scroller')
const content = $('.detail__content')
let current = null
let pointer = { x: innerWidth / 2, y: innerHeight / 2 }
let pushedByUs = false
addEventListener('pointerdown', (e) => (pointer = { x: e.clientX, y: e.clientY }), { capture: true })

function detailHTML(d) {
  const i = designs.indexOf(d)
  const next = designs[(i + 1) % designs.length]
  const imgs = imagesFor(d)
  const words = d.name.split(' ')
  const mail = links.email && `${links.email.href}?subject=${encodeURIComponent(`[EDGE] ${d.name}`)}&body=${encodeURIComponent(`Hey EDGE — I'd love to know more about ${d.name}.`)}`
  return `
    <div class="d-layout">
      <div class="d-gallery">
        <div class="d-strip">
          ${imgs.map((src, k) => `<figure data-cursor="Zoom"><img src="${src}" alt="${esc(d.name)} — photo ${k + 1}" ${k > 1 ? 'loading="lazy"' : ''}/></figure>`).join('')}
        </div>
        <span class="d-counter mono"><b>01</b> / ${pad(imgs.length)}</span>
        <div class="d-progress">${imgs.map((_, k) => `<i class="${k === 0 ? 'on' : ''}"></i>`).join('')}</div>
        <span class="d-hint mono">Swipe →</span>
      </div>
      <div class="d-info">
        <div class="d-meta mono"><span>No. ${pad(i + 1)} — ${esc(brand.drop)}</span><span>${esc(d.type)}</span></div>
        <h2 class="display d-name">${words.map((w) => `<span class="line-mask"><span>${esc(w)}</span></span>`).join('')}</h2>
        <p class="d-tag">${esc(d.tagline)}</p>
        <div class="d-story">${d.story.map((p) => `<p>${esc(p)}</p>`).join('')}</div>
        <dl class="d-specs mono">${d.details.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
        <div class="d-actions">
          ${mail ? `<a class="btn btn--accent" href="${mail}"><span>Ask about this piece</span></a>` : ''}
          ${links.instagram ? `<a class="btn btn--ghost" href="${links.instagram.href}" target="_blank" rel="noopener"><span>DM on Instagram</span></a>` : ''}
        </div>
      </div>
    </div>
    <a class="d-next" href="#/drop/${next.slug}" style="--n-accent:${next.accent}" data-cursor="Next">
      <span class="mono d-next__label">Next story — ${pad(designs.indexOf(next) + 1)}</span>
      <span class="display d-next__name">${esc(next.name)}</span>
      <span class="d-next__img"><img src="${imagesFor(next)[0]}" alt="" loading="lazy"/></span>
    </a>`
}

function wireDetail() {
  const strip = $('.d-strip', content)
  const figs = $$('figure', strip)
  const bars = $$('.d-progress i', content)
  const counter = $('.d-counter b', content)
  const set = (k) => {
    counter.textContent = pad(k + 1)
    bars.forEach((b, j) => b.classList.toggle('on', j <= k))
  }
  strip.addEventListener('scroll', () => {
    if (strip.scrollWidth <= strip.clientWidth) return
    set(Math.round(strip.scrollLeft / strip.clientWidth))
  }, { passive: true })
  // desktop: images are stacked vertically inside the overlay scroller
  const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && set(figs.indexOf(e.target))), { root: scroller, threshold: 0.55 })
  figs.forEach((f) => io.observe(f))
  figs.forEach((f) => f.addEventListener('click', () => openLightbox($('img', f).src)))
  $('.d-hint', content) && gsap.fromTo($('.d-hint', content), { x: 0 }, { x: 10, repeat: -1, yoyo: true, duration: 0.8, ease: 'sine.inOut' })
}

function revealDetail() {
  const tl = gsap.timeline()
  tl.from($$('.d-name .line-mask > span', content), { yPercent: 110, duration: 1.2, stagger: 0.08, ease: 'expo.out' })
    .from($$('.d-strip img', content), { scale: 1.25, duration: 1.6, ease: 'expo.out' }, 0)
    .from($$('.d-meta, .d-tag, .d-story p, .d-specs, .d-actions', content), { y: 30, opacity: 0, duration: 1, stagger: 0.06, ease: 'expo.out' }, 0.15)
    .from('.detail__close', { scale: 0, rotate: -90, duration: 0.8, ease: 'back.out(2)' }, 0.2)
}

let busy = false
async function openDesign(d) {
  if (busy) return
  busy = true
  const first = !current
  current = d
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
  current = null
  busy = false
}

function route() {
  if (document.body.classList.contains('is-loading')) return
  const m = location.hash.match(/^#\/drop\/([\w-]+)/)
  const d = m && designs.find((x) => x.slug === m[1])
  if (d && d !== current) openDesign(d)
  else if (!d && current) closeDesign()
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
$('.detail__close').addEventListener('click', () => {
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

/* ───────── Boot ───────── */

initTapes()
initCursor()
initScroll()
runLoader()
