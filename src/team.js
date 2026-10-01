import './style.css'
import './pages.css'
import { team, process } from './content.js'
import { $, $$, pad, esc, fillBrand, lenis, initCursor, riseLines, pageEnter, gsap, ScrollTrigger } from './shared.js'

$('.crew').innerHTML = team
  .map((m, i) => `
  <article class="member crew__card" data-cursor="Hi!">
    <div class="member__photo">${m.photo ? `<img src="${m.photo}" alt="${esc(m.name)}" loading="lazy" />` : `<span class="member__mono" aria-hidden="true">${esc(m.name[0])}</span>`}
      <span class="crew__n mono">${pad(i + 1)}</span>
    </div>
    <h2 class="member__name">${esc(m.name)}</h2>
    <p class="mono member__role">${esc(m.role)}</p>
    <p class="member__line">${esc(m.line)}</p>
    ${m.instagram ? `<a class="mono crew__ig" href="https://instagram.com/${esc(m.instagram)}" target="_blank" rel="noopener">@${esc(m.instagram)} ↗</a>` : ''}
  </article>`)
  .join('')

$('.crew__notes').innerHTML = process
  .map((p, i) => `
  <li class="pillar">
    <span class="pillar__n">${pad(i + 1)}</span>
    <h3 class="pillar__t"><span class="line-mask"><span>${esc(p.title)}</span></span></h3>
    <p class="pillar__b">${esc(p.body)}</p>
  </li>`)
  .join('')

fillBrand()
initCursor()

riseLines('.sub__title', { immediate: true, delay: 0.25 })
gsap.from('.sub__head .eyebrow, .sub__intro', { y: 30, opacity: 0, duration: 1, stagger: 0.08, ease: 'expo.out', delay: 0.4 })
ScrollTrigger.batch('.crew__card', {
  start: 'top 90%', once: true,
  onEnter: (els) => gsap.fromTo(els, { y: 80, opacity: 0 }, { y: 0, opacity: 1, duration: 1.2, stagger: 0.1, ease: 'expo.out' }),
})
$$('.pillar').forEach((el) => {
  gsap.timeline({ scrollTrigger: { trigger: el, start: 'top 88%' } })
    .fromTo(el, { '--draw': 0 }, { '--draw': 1, duration: 1.2, ease: 'expo.inOut' })
    .from($('.pillar__t span span', el), { yPercent: 110, duration: 1.1, ease: 'expo.out' }, 0.3)
    .from([$('.pillar__n', el), $('.pillar__b', el)], { opacity: 0, y: 16, duration: 0.8, stagger: 0.08, ease: 'expo.out' }, 0.45)
})
gsap.from('.foot__mark img', { yPercent: 40, scale: 0.9, ease: 'none', scrollTrigger: { trigger: '.foot', start: 'top bottom', end: 'bottom bottom', scrub: true } })

pageEnter()
document.fonts.ready.then(() => ScrollTrigger.refresh())
lenis?.start()
