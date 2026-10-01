import './style.css'
import './pages.css'
import { designs } from './content.js'
import { $, esc, links, fillBrand, lenis, initCursor, riseLines, pageEnter, gsap, ScrollTrigger } from './shared.js'

// Topics: every design by name, plus the general ones.
// /contact.html?design=<slug> (from "Ask about this piece") pre-selects that design.
const form = $('.contact__form')
const general = ['Custom run — hall, club or team', 'Collab', 'Just saying hi']
form.topic.innerHTML =
  `<optgroup label="A design">${designs.map((d) => `<option value="${esc(d.name)}" data-slug="${d.slug}">${esc(d.name)}</option>`).join('')}</optgroup>` +
  `<optgroup label="Something else">${general.map((g) => `<option>${esc(g)}</option>`).join('')}</optgroup>`

const asked = new URLSearchParams(location.search).get('design')
const preset = asked && [...form.topic.options].find((o) => o.dataset.slug === asked)
if (preset) {
  preset.selected = true
  form.message.placeholder = `What would you like to know about ${preset.value}?`
} else {
  form.topic.value = 'Just saying hi'
}

form.addEventListener('submit', (e) => {
  e.preventDefault()
  let ok = true
  ;['name', 'message'].forEach((n) => {
    const bad = !form[n].value.trim()
    form[n].classList.toggle('is-invalid', bad)
    if (bad) ok = false
  })
  if (!ok) return gsap.fromTo(form, { x: -8 }, { x: 0, duration: 0.6, ease: 'elastic.out(1, 0.3)' })
  const subject = `[EDGE] ${form.topic.value} — ${form.name.value.trim()}`
  location.href = `${links.email.href}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(form.message.value.trim())}`
})

fillBrand()
initCursor()

riseLines('.sub__title', { immediate: true, delay: 0.25 })
gsap.from('.sub__head .eyebrow, .sub__intro', { y: 30, opacity: 0, duration: 1, stagger: 0.08, ease: 'expo.out', delay: 0.4 })
gsap.from('.contact__form > *, .contact__alt, .contact__links li', { y: 30, opacity: 0, duration: 0.9, stagger: 0.05, ease: 'expo.out', delay: 0.6 })
gsap.from('.foot__mark img, .foot__info li', { y: 30, opacity: 0, duration: 1, stagger: 0.06, ease: 'expo.out', scrollTrigger: { trigger: '.foot', start: 'top 92%' } })

pageEnter()
document.fonts.ready.then(() => ScrollTrigger.refresh())
lenis?.start()
