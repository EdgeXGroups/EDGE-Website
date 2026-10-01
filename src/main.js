import './style.css'
import './pages.css'
import { brand, designs, featured, manifesto, pillars } from './content.js'
import { createHero } from './hero.js'
import { createSpotlight } from './spotlight.js'
import {
  $, $$, reduced, fine, pad, esc, links, fillBrand, mediaHTML, lenis, scrollTo,
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

function buildCards() {
  const more = designs.length - featured.length
  $('.drop__track').innerHTML =
    featured
      .map((d, i) => `
      <article class="card" style="--card-accent:${d.accent}">
        <a class="card__inner" href="#/drop/${d.slug}" data-cursor="Read story" aria-label="${esc(d.name)} — read the story">
          <div class="card__media">${mediaHTML(d, { eager: i < 2 })}</div>
          <div class="card__top"><span class="card__num">${pad(designs.indexOf(d) + 1)} / ${pad(designs.length)}</span><span class="card__type">${esc(d.type)}</span></div>
          <div class="card__info">
            <span class="display card__name">${esc(d.name)}</span>
            <p class="card__tag">${esc(d.tagline)}</p>
            <span class="card__cta"><i>→</i>Read the story</span>
          </div>
          <span class="card__dim"></span>
        </a>
      </article>`)
      .join('') +
    `<a class="drop__end" href="/collection.html" data-cursor="Collection">
      <span class="mono eyebrow">The collection</span>
      <span class="display drop__end-title">+${pad(more)}<br/><em class="serif">more</em><br/>designs</span>
      <span class="drop__end-stack">${designs.filter((d) => !featured.includes(d)).slice(0, 3).map((d) => `<span style="--m-accent:${d.accent}"><img src="${d.images?.[0] || ''}" alt="" loading="lazy"/></span>`).join('')}</span>
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
  const d = featured[0]
  const [front, back] = d.images?.length ? d.images : []
  $('.spot').style.setProperty('--s-accent', d.accent)
  $('.spot__piece').innerHTML = front
    ? `<img class="spot__img" src="${front}" alt="${esc(d.name)} — front" />
       ${back ? `<img class="spot__img spot__img--back" src="${back}" alt="${esc(d.name)} — back" />` : ''}
       <img class="spot__reflect" src="${front}" alt="" aria-hidden="true" />`
    : ''
  $('.spot__num').textContent = `No. ${pad(designs.indexOf(d) + 1)} — ${d.category || brand.drop}`
  $('.spot__name').textContent = d.name
  $('.spot__tag').textContent = d.tagline
  $('.spot__cta').href = `#/drop/${d.slug}`
}

fillBrand()
buildTapes()
buildSpotlight()
buildCards()
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

  const lede = SplitText.create('.hero__lede', { type: 'lines', mask: 'lines' })
  tl.from(lede.lines, { yPercent: 110, duration: 1.2, stagger: 0.08, ease: 'expo.out' }, 0.9)
    .from('.hero__cta', { scale: 0, rotate: -180, duration: 1.2, ease: 'expo.out' }, 1.1)
    .fromTo('.nav', { yPercent: -100 }, { yPercent: 0, duration: 1, ease: 'expo.out', clearProps: 'transform' }, 1)
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

/* ───────── Spotlight ───────── */

function initSpotlight() {
  const sec = $('.spot')
  // keep the shader's rim line in sync with the CSS --rim (72% phone / 80% desktop)
  const layout = () => {
    if (!spot) return
    const desktop = innerWidth >= 900
    spot.uniforms.uRimY.value = desktop ? -0.3 : -0.22
    spot.uniforms.uApY.value = desktop ? 0.34 : 0.36
  }
  layout()
  addEventListener('resize', layout)
  const tl = gsap.timeline({ defaults: { ease: 'none' } })
  const piece = $('.spot__piece')
  const back = $('.spot__img--back')
  // one timeline, 0 → 1, drives both the shader and the DOM
  if (spot) tl.to(spot.uniforms.uT, { value: 1, duration: 1 }, 0)
  tl.fromTo('.spot__intro', { opacity: 1, y: 0 }, { opacity: 0, y: -40, duration: 0.1 }, 0.06)
    .fromTo(piece, { opacity: 0, y: 60, scale: 0.92, '--lit': 0 }, { opacity: 1, y: 0, scale: 1, '--lit': 1, duration: 0.18, ease: 'power2.out' }, 0.5)
    .fromTo('.spot__caption > *', { opacity: 0, y: 30 }, { opacity: 1, y: 0, stagger: 0.02, duration: 0.1, ease: 'power2.out' }, 0.62)
  if (back) tl.fromTo(back, { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.12, ease: 'power2.inOut' }, 0.8)
  tl.to({}, { duration: 0.08 }) // hold before unpinning

  ScrollTrigger.create({
    trigger: sec, start: 'top top', end: () => '+=' + innerHeight * (reduced ? 1 : 3.2),
    pin: true, scrub: reduced ? true : 0.8, animation: tl, anticipatePin: 1, invalidateOnRefresh: true,
    onUpdate: (s) => $('.spot__progress i').style.transform = `scaleX(${s.progress})`,
  })
  // subtle floating once on stage
  if (!reduced) gsap.to('.spot__float', { y: -10, duration: 2.6, ease: 'sine.inOut', yoyo: true, repeat: -1 })
}

/* ───────── Scroll animations ───────── */

function initScroll() {
  if (hero) {
    ScrollTrigger.create({
      trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true,
      onUpdate: (s) => (hero.uniforms.uScroll.value = s.progress),
    })
  }
  gsap.to('.hero__bottom', { yPercent: -60, opacity: 0, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: '60% top', scrub: true } })

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

  gsap.from('.foot__mark img', { yPercent: 40, scale: 0.9, ease: 'none', scrollTrigger: { trigger: '.foot', start: 'top bottom', end: 'bottom bottom', scrub: true } })
  gsap.from('.tape--a', { rotate: -12, ease: 'none', scrollTrigger: { trigger: '.tapes', start: 'top bottom', end: 'bottom top', scrub: true } })
  gsap.from('.tape--b', { rotate: 12, ease: 'none', scrollTrigger: { trigger: '.tapes', start: 'top bottom', end: 'bottom top', scrub: true } })

  const mm = gsap.matchMedia()
  mm.add('(min-width: 900px)', () => {
    const track = $('.drop__track')
    const dist = () => Math.max(0, track.scrollWidth - innerWidth)
    const tween = gsap.to(track, {
      x: () => -dist(), ease: 'none',
      scrollTrigger: { trigger: '.drop__pin', start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 1, invalidateOnRefresh: true, anticipatePin: 1 },
    })
    $$('.card').forEach((card) => {
      gsap.fromTo($('.media', card), { xPercent: -5 }, { xPercent: 5, ease: 'none', scrollTrigger: { trigger: card, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true } })
      gsap.from($('.card__name', card), { yPercent: 60, opacity: 0, ease: 'expo.out', duration: 1, scrollTrigger: { trigger: card, containerAnimation: tween, start: 'left 85%' } })
    })
  })
  mm.add('(max-width: 899px)', () => {
    const cards = $$('.card')
    cards.forEach((card, i) => {
      const next = cards[i + 1]
      // on touch, the back of the tee wipes in once the card settles
      const back = $('.media__img--back', card)
      if (back) gsap.fromTo(back, { clipPath: 'circle(0% at 50% 100%)' }, { clipPath: 'circle(150% at 50% 100%)', duration: 1.1, ease: 'expo.inOut', scrollTrigger: { trigger: card, start: 'top 20%', toggleActions: 'play none none reverse' } })
      gsap.from($('.card__name', card), { yPercent: 50, opacity: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: card, start: 'top 70%' } })
      if (!next) return
      const st = { trigger: next, start: 'top bottom', end: 'top top+=70', scrub: true }
      gsap.to($('.card__inner', card), { scale: 0.9, rotate: i % 2 ? 1.5 : -1.5, ease: 'none', scrollTrigger: st })
      gsap.to($('.card__dim', card), { opacity: 0.6, ease: 'none', scrollTrigger: { ...st } })
    })
  })
}

/* ───────── Boot ───────── */

initTapes()
initCursor()
initSpotlight()
initScroll()
runLoader()
