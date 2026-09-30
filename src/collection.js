import './style.css'
import './pages.css'
import { Flip } from 'gsap/Flip'
import { designs } from './content.js'
import { imagesFor } from './mockup.js'
import {
  $, $$, fine, reduced, pad, esc, fillBrand, mediaHTML, lenis, initCursor, startRouter, riseLines, pageEnter,
  gsap, ScrollTrigger,
} from './shared.js'

gsap.registerPlugin(Flip)

const grid = $('.archive__grid')
const cats = ['All', ...new Set(designs.map((d) => d.category).filter(Boolean))]

$('.chips').innerHTML = cats
  .map((c) => {
    const n = c === 'All' ? designs.length : designs.filter((d) => d.category === c).length
    return `<button class="chip${c === 'All' ? ' is-on' : ''}" data-cat="${esc(c)}" aria-pressed="${c === 'All'}">${esc(c)}<sup>${pad(n)}</sup></button>`
  })
  .join('')

grid.innerHTML = designs
  .map((d, i) => `
  <a class="item" href="#/drop/${d.slug}" data-cat="${esc(d.category || '')}" data-cursor="Read story" style="--m-accent:${d.accent}" aria-label="${esc(d.name)} — read the story">
    <div class="item__media">${mediaHTML(d, { eager: i < 4 })}</div>
    <div class="item__meta">
      <span class="item__num mono">${pad(i + 1)}</span>
      <span class="item__name">${esc(d.name)}</span>
      <span class="item__cat mono">${esc(d.category || '')}</span>
      <span class="item__type mono">${esc(d.type)}</span>
      <span class="item__arrow" aria-hidden="true">→</span>
    </div>
  </a>`)
  .join('')

fillBrand()

/* ───────── Filter + view switch (animated with Flip) ───────── */

const items = $$('.item')
function flip(change) {
  // finish any pending scroll-in reveals first so they can't fight the Flip
  gsap.killTweensOf(items)
  gsap.set(items, { clearProps: 'opacity,transform,clipPath' })
  const state = Flip.getState(items, { props: 'opacity' })
  change()
  Flip.from(state, {
    duration: reduced ? 0 : 0.8, ease: 'expo.inOut', scale: true, absolute: true, nested: true,
    onEnter: (els) => gsap.fromTo(els, { opacity: 0, scale: 0.85 }, { opacity: 1, scale: 1, duration: 0.6, ease: 'expo.out' }),
    onLeave: (els) => gsap.to(els, { opacity: 0, scale: 0.85, duration: 0.4 }),
    onComplete: () => ScrollTrigger.refresh(),
  })
}

$('.chips').addEventListener('click', (e) => {
  const btn = e.target.closest('.chip')
  if (!btn || btn.classList.contains('is-on')) return
  $$('.chip').forEach((c) => { c.classList.toggle('is-on', c === btn); c.setAttribute('aria-pressed', c === btn) })
  const cat = btn.dataset.cat
  flip(() => items.forEach((it) => (it.hidden = cat !== 'All' && it.dataset.cat !== cat)))
})

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
gsap.from('.foot__mark img', { yPercent: 40, scale: 0.9, ease: 'none', scrollTrigger: { trigger: '.foot', start: 'top bottom', end: 'bottom bottom', scrub: true } })

pageEnter()
document.fonts.ready.then(() => ScrollTrigger.refresh())
lenis?.start()
startRouter()
