import './style.css'
import './pages.css'
import { brand, designs, featured, manifesto, pillars } from './content.js'
import { createHero } from './hero.js'
import { createSpotlight } from './spotlight.js'
import { createShowroom3D } from './showroom3d.js'
import { frontBack } from './mockup.js'
import { priceHTML } from './commerce.js'
import { Color } from 'three'
import {
  $, $$, reduced, pad, esc, fillBrand, lenis, scrollTo,
  initCursor, startRouter, riseLines, arrivedFromSite, pageEnter, gsap, ScrollTrigger, SplitText,
} from './shared.js'

/* ───────── Content → DOM ───────── */

function buildTapes() {
  const a = ['Edge', brand.drop, 'Out now', 'Story first', 'Small runs', 'Built heavy']
  const b = [brand.tagline, 'Every piece has a story', 'Wear it loud']
  const fill = (el, words) => (el.innerHTML = words.map((w) => `<span>${esc(w)}</span>`).join('').repeat(4))
  fill($('.tape--a .tape__track'), a)
  fill($('.tape--b .tape__track'), b)
}

function buildMore() {
  const rest = designs.filter((d) => !featured.includes(d))
  if (!rest.length) return $('.more').remove()
  $('.more').innerHTML = `
    <a class="drop__end" href="/collection.html" data-cursor="Collection">
      <span class="mono eyebrow">The collection</span>
      <span class="display drop__end-title">+${pad(rest.length)}<br/><em class="serif">more</em><br/>designs</span>
      <span class="drop__end-stack">${rest.slice(0, 3).map((d) => `<span style="--m-accent:${d.accent}"><img src="${d.images?.[0] || ''}" alt="" loading="lazy"/></span>`).join('')}</span>
      <span class="btn"><span>View all ${pad(designs.length)} →</span></span>
    </a>`
}

function buildManifesto() {
  $('.manifesto__text').innerHTML = manifesto
    .split(/\s+/)
    .map((w) => (w.startsWith('*') ? `<span class="w serif">${esc(w.replace(/\*/g, ''))}</span>` : `<span class="w">${esc(w)}</span>`))
    .join(' ')
  $('.pillars').innerHTML = pillars
    .map((p, i) => `
    <li class="pillar">
      <span class="pillar__n">${pad(i + 1)}</span>
      <h3 class="pillar__t"><span class="line-mask"><span>${esc(p.title)}</span></span></h3>
      <p class="pillar__b">${esc(p.body)}</p>
    </li>`)
    .join('')
}

function buildSpotlight() {
  $('.spot__stage').innerHTML = featured
    .map((d) => {
      const [front, back] = frontBack(d)
      return `
      <div class="spot__slot" style="--m-accent:${d.accent}" role="button" tabindex="-1" aria-label="${esc(d.name)}">
        <div class="spot__bob"><div class="spot__piece">
          <img class="spot__img spot__img--front" src="${front}" alt="${esc(d.name)} — front" />
          ${back ? `<img class="spot__img spot__img--back" src="${back}" alt="${esc(d.name)} — back" />` : ''}
          <img class="spot__reflect" src="${front}" alt="" aria-hidden="true" />
        </div></div>
      </div>`
    })
    .join('')
  setCaption(featured[0])
}

function setCaption(d) {
  $('.spot').style.setProperty('--s-accent', d.accent)
  $('.spot__num').textContent = `No. ${pad(designs.indexOf(d) + 1)} — ${d.category || brand.drop}`
  $('.spot__name').textContent = d.name
  $('.spot__tag').textContent = d.tagline
  $('.spot__price').innerHTML = priceHTML(d)
  $('.spot__cta').href = `#/drop/${d.slug}`
}

fillBrand()
buildTapes()
buildSpotlight()
buildMore()
buildManifesto()
lenis?.stop()

/* ───────── WebGL ───────── */

const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()
const hero = createHero($('.hero__gl'), { accent })
if (!hero) document.documentElement.classList.add('no-webgl')
const spot = createSpotlight($('.spot__gl'), { accent: featured[0].accent })

/* ───────── Loader ───────── */

async function runLoader() {
  // Coming back from the archive: skip the countdown, keep the reveal.
  let seen = false
  try { seen = sessionStorage.getItem('edge-seen') === '1'; sessionStorage.setItem('edge-seen', '1') } catch {}
  const quick = seen || arrivedFromSite || reduced

  if (!quick) {
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
    await gsap.to(p, { v: 78, duration: 1.3, ease: 'power2.inOut', onUpdate: render })
    await assets
    await gsap.to(p, { v: 100, duration: 0.45, ease: 'power3.in', onUpdate: render })
  } else {
    $('.loader__inner').style.opacity = 0
    await Promise.race([hero?.ready, new Promise((r) => setTimeout(r, 600))])
  }

  const tl = gsap.timeline()
  if (arrivedFromSite) {
    gsap.set('.loader', { display: 'none' })
    pageEnter()
  } else {
    tl.to('.loader__inner', { opacity: 0, duration: 0.3 })
      .to('.loader__panel--top', { yPercent: -100, duration: 1.1, ease: 'expo.inOut' }, '<0.1')
      .to('.loader__panel--bottom', { yPercent: 100, duration: 1.1, ease: 'expo.inOut' }, '<')
  }
  tl.add(() => {
    document.body.classList.remove('is-loading')
    $('.loader').style.display = 'none'
    lenis?.start()
    ScrollTrigger.refresh()
    // arrived as /#team etc. from the other page
    if (location.hash && !location.hash.startsWith('#/') && $(location.hash)) scrollTo(location.hash, { immediate: true })
    startRouter()
  })
  if (hero) tl.to(hero.uniforms.uIntro, { value: 1, duration: 2.4, ease: 'power2.out' }, 0.35)
  else tl.from('.hero__fallback', { opacity: 0, scale: 1.1, duration: 1.4, ease: 'expo.out' }, 0.4)

  // masks get room for descenders (the g in "edge"), and are removed once the lines are in
  const lede = SplitText.create('.hero__lede', { type: 'lines', mask: 'lines' })
  lede.masks.forEach((m) => Object.assign(m.style, { padding: '0.12em 0.1em 0.28em', margin: '-0.12em -0.1em -0.28em' }))
  tl.from(lede.lines, { yPercent: 110, duration: 1.2, stagger: 0.08, ease: 'expo.out', onComplete: () => lede.revert() }, 0.9)
    .from('.hero__cta', { scale: 0, rotate: -180, duration: 1.2, ease: 'expo.out' }, 1.1)
    .fromTo('.nav, .navshop', { yPercent: -100 }, { yPercent: 0, duration: 1, ease: 'expo.out', clearProps: 'transform' }, 1)
    .from('.hero__shop', { y: 20, opacity: 0, duration: 1, ease: 'expo.out' }, 1.15)
}

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

/* ───────── Showroom: three pieces on the glass, one in the light ───────── */

function initSpotlight() {
  const sec = $('.spot')
  const n = featured.length
  const mix = (a, b, k) => a + (b - a) * k
  // scroll-driven state, 0 → 1
  const state = { center: 0, sides: 0, lit: 0, turn: 0 }
  let centre = 0

  const slots = $$('.spot__slot').map((el, i) => ({
    el, d: featured[i], x: 0, s: 1, side: 0,
    front: $('.spot__img--front', el), back: $('.spot__img--back', el), reflect: $('.spot__reflect', el), showingBack: false,
  }))
  // -1 left, 0 centre, 1 right
  const roleOf = (i) => (n === 1 ? 0 : ((i - centre + n + 1) % n) - 1)
  const target = (role) => {
    const desktop = innerWidth >= 900
    const off = desktop ? Math.min(innerWidth * 0.3, 460) : innerWidth * 0.42
    return role === 0 ? { x: 0, s: 1, side: 0 } : { x: role * off, s: desktop ? 0.62 : 0.5, side: 1 }
  }

  function apply(sl) {
    const k = sl.side
    const y = (1 - state.center) * 70 * (1 - k)
    sl.el.style.transform = `translate3d(calc(-50% + ${sl.x}px), ${y}px, 0) scale(${sl.s})`
    sl.el.style.opacity = mix(state.center, state.sides, k)
    sl.el.style.zIndex = k < 0.5 ? 3 : 1
    sl.el.style.setProperty('--lit', state.lit * mix(1, 0.2, k))
    // the turn: front squeezes to an edge, back opens out — a turntable in 2D
    const t = sl.back ? state.turn * (1 - k) : 0
    const f = Math.max(0.001, 1 - 2 * t), b = Math.max(0.001, 2 * t - 1)
    sl.front.style.transform = `scaleX(${t < 0.5 ? f : 0.001})`
    if (sl.back) sl.back.style.transform = `scaleX(${t < 0.5 ? 0.001 : b})`
    const back = t >= 0.5
    if (back !== sl.showingBack) { sl.showingBack = back; sl.reflect.src = (back ? sl.back : sl.front).src }
    sl.reflect.style.transform = `scaleY(-1) scaleX(${t < 0.5 ? f : b})`
  }
  // the 3D garments follow exactly the same state as these (now invisible) tap targets
  let show3d = null
  const push = () => {
    if (!show3d) return
    slots.forEach((sl) => (sl.turn = state.turn * (1 - sl.side)))
    show3d.sync(slots, state, $('.spot__piece').offsetHeight)
  }
  const applyAll = () => { slots.forEach(apply); push() }
  function place(animate) {
    slots.forEach((sl, i) => {
      const role = roleOf(i)
      sl.el.dataset.role = role
      sl.el.dataset.cursor = role === 0 ? (show3d ? 'Drag · tap' : 'Read story') : 'Bring forward'
      const to = target(role)
      if (animate) gsap.to(sl, { ...to, duration: reduced ? 0.01 : 1, ease: 'expo.inOut', overwrite: true, onUpdate: () => { apply(sl); push() } })
      else { Object.assign(sl, to); apply(sl) }
    })
  }
  place(false)
  addEventListener('resize', () => place(false))

  // swap: dir +1 brings the right-hand piece into the light, -1 the left
  function swap(dir) {
    if (n < 2) return
    const leaving = slots[centre]
    centre = (centre + dir + n) % n
    gsap.to(leaving, { spin: 0, duration: 1, ease: 'expo.inOut', onUpdate: push }) // hand-turned piece faces front again
    place(true)
    const d = featured[centre]
    gsap.timeline()
      .to('.spot__caption > *', { opacity: 0, y: -12, duration: 0.3, stagger: 0.03, ease: 'power2.in' })
      .add(() => setCaption(d))
      .fromTo('.spot__caption > *', { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.05, ease: 'expo.out' })
    if (spot) {
      const c = new Color(d.accent)
      gsap.to(spot.uniforms.uAccent.value, { r: c.r, g: c.g, b: c.b, duration: 1, ease: 'power2.inOut' })
      // a quick flare of light as the new piece steps in
      gsap.fromTo(spot.uniforms.uPulse, { value: 1 }, { value: 0, duration: 1.2, ease: 'power2.out' })
    }
  }

  // tap a side piece to bring it forward, tap the lit one to read its story
  let dragged = false
  slots.forEach((sl, i) => sl.el.addEventListener('click', () => {
    if (dragged || !sec.classList.contains('is-live')) return
    const role = roleOf(i)
    if (role === 0) $('.spot__cta').click()
    else swap(role)
  }))
  $('.spot__prev').addEventListener('click', () => swap(-1))
  $('.spot__next').addEventListener('click', () => swap(1))
  // drag the lit piece to turn it by hand; swipe anywhere else to swap
  let sx = null
  let spinning = null // { x, last, t, v } while turning the centre piece
  slots.forEach((sl) => (sl.spin = 0))
  sec.addEventListener('pointerdown', (e) => {
    dragged = false
    if (!sec.classList.contains('is-live')) return
    const onCentre = e.target.closest('.spot__slot') === slots[centre].el
    if (onCentre && show3d) {
      gsap.killTweensOf(slots[centre], 'spin')
      spinning = { x: e.clientX, last: e.clientX, t: performance.now(), v: 0 }
      slots[centre].el.setPointerCapture?.(e.pointerId)
    } else sx = e.clientX
  })
  sec.addEventListener('pointermove', (e) => {
    if (!spinning) return
    const now = performance.now()
    const dx = e.clientX - spinning.last
    slots[centre].spin += dx * 0.012
    spinning.v = (dx * 0.012) / Math.max(1, now - spinning.t) * 16 // radians per frame
    spinning.last = e.clientX
    spinning.t = now
    if (Math.abs(e.clientX - spinning.x) > 6) dragged = true
    push()
  })
  const endSpin = () => {
    if (!spinning) return
    const sl = slots[centre]
    const v = spinning.v
    spinning = null
    // a little momentum after letting go
    gsap.to(sl, { spin: sl.spin + v * 22, duration: 1.1, ease: 'power3.out', onUpdate: push })
    setTimeout(() => (dragged = false), 50)
  }
  sec.addEventListener('pointerup', (e) => {
    if (spinning) return endSpin()
    if (sx === null || !sec.classList.contains('is-live')) return
    const dx = e.clientX - sx
    sx = null
    if (Math.abs(dx) > 45) { dragged = true; swap(dx < 0 ? 1 : -1); setTimeout(() => (dragged = false), 50) }
  })
  sec.addEventListener('pointercancel', endSpin)
  addEventListener('keydown', (e) => {
    if (!sec.classList.contains('is-live') || document.body.classList.contains('is-locked')) return
    const r = sec.getBoundingClientRect()
    if (r.top > innerHeight * 0.5 || r.bottom < innerHeight * 0.5) return
    if (e.key === 'ArrowRight') swap(1)
    if (e.key === 'ArrowLeft') swap(-1)
  })

  // keep the shader's rim line in sync with the CSS --rim (64% phone / 80% desktop)
  const layout = () => {
    if (!spot) return
    const desktop = innerWidth >= 900
    spot.uniforms.uRimY.value = desktop ? -0.3 : -0.14
    spot.uniforms.uApY.value = desktop ? 0.34 : 0.36
    show3d?.setRim(desktop ? 0.8 : 0.64)
    push()
  }
  layout()
  if (spot) {
    createShowroom3D(spot, featured)
      .then((s3) => { show3d = s3; spot.add(s3); sec.classList.add('is-3d'); layout(); place(false) })
      .catch((err) => console.warn('3D showroom unavailable, using photos', err))
  }
  addEventListener('resize', layout)

  // one timeline, 0 → 1, drives the shader, the pieces and the turn
  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    onUpdate: () => {
      applyAll()
      sec.classList.toggle('is-live', state.sides > 0.6)
      $('.spot__turn').classList.toggle('is-done', state.turn > 0.98)
    },
  })
  if (spot) tl.to(spot.uniforms.uT, { value: 1, duration: 1 }, 0)
  tl.fromTo('.spot__intro', { opacity: 1, y: 0 }, { opacity: 0, y: -40, duration: 0.1 }, 0.06)
    .to(state, { center: 1, lit: 1, duration: 0.16, ease: 'power2.out' }, 0.5)
    .to(state, { sides: 1, duration: 0.12, ease: 'power2.out' }, 0.6)
    .fromTo('.spot__caption, .spot__controls', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.1, ease: 'power2.out' }, 0.62)
    .to(state, { turn: 1, duration: 0.2, ease: 'power1.inOut' }, 0.74)
    .to({}, { duration: 0.06 }) // hold before unpinning

  ScrollTrigger.create({
    trigger: sec, start: 'top top', end: () => '+=' + innerHeight * (reduced ? 1 : 4),
    pin: true, scrub: reduced ? true : 0.8, animation: tl, anticipatePin: 1, invalidateOnRefresh: true,
    onUpdate: (s) => ($('.spot__progress i').style.transform = `scaleX(${s.progress})`),
  })
  // pieces breathe gently once on stage
  if (!reduced) $$('.spot__bob').forEach((b, i) => gsap.to(b, { y: -10, duration: 2.6, delay: i * 0.4, ease: 'sine.inOut', yoyo: true, repeat: -1 }))
}

/* ───────── Scroll animations ───────── */

function initScroll() {
  if (hero) {
    ScrollTrigger.create({
      trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true,
      onUpdate: (s) => (hero.uniforms.uScroll.value = s.progress),
    })
  }
  // animate the pieces, not .hero__bottom: a transformed parent would stop the tagline's blend from reaching the logo
  gsap.to('.hero__lede, .hero__shop, .hero__cta', { y: -90, opacity: 0, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: '60% top', scrub: true } })

  gsap.from('.drop__title .line-mask > *', { yPercent: 115, rotate: 3, duration: 1.3, stagger: 0.12, ease: 'expo.out', scrollTrigger: { trigger: '.drop__title', start: 'top 85%' } })


  gsap.to('.manifesto__text .w', {
    opacity: 1, stagger: 0.1, ease: 'none',
    scrollTrigger: { trigger: '.manifesto__text', start: 'top 80%', end: 'bottom 45%', scrub: 0.6 },
  })
  $$('.pillar').forEach((el) => {
    gsap.timeline({ scrollTrigger: { trigger: el, start: 'top 88%' } })
      .fromTo(el, { '--draw': 0 }, { '--draw': 1, duration: 1.2, ease: 'expo.inOut' })
      .from($('.pillar__t span span', el), { yPercent: 110, duration: 1.1, ease: 'expo.out' }, 0.3)
      .from([$('.pillar__n', el), $('.pillar__b', el)], { opacity: 0, y: 16, duration: 0.8, stagger: 0.08, ease: 'expo.out' }, 0.45)
  })

  gsap.from('.foot__mark img, .foot__info li', { y: 30, opacity: 0, duration: 1, stagger: 0.06, ease: 'expo.out', scrollTrigger: { trigger: '.foot', start: 'top 92%' } })
  // the tapes sit on the seam between hero and showroom; they swing as that seam crosses the screen
  // (a smaller swing on phones so the two never cross on the narrow screen)
  const seam = { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
  const wide = matchMedia('(min-width: 900px)').matches
  gsap.fromTo('.tape--a', { rotate: -3.5 }, { rotate: wide ? -9 : -5, ease: 'none', scrollTrigger: seam })
  gsap.fromTo('.tape--b', { rotate: 3 }, { rotate: wide ? 8 : 4.5, ease: 'none', scrollTrigger: { ...seam } })

}

/* ───────── Boot ───────── */

initTapes()
initCursor()
initSpotlight()
initScroll()
runLoader()
