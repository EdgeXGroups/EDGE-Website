// Cookie / storage consent. Two kinds of storage on this site:
//   essential  — sign-in session, your bag, checkout details you typed: always on, the shop needs them
//   analytics  — PostHog (page views, time on site, heatmaps, recordings): only after "Accept"
// The choice is remembered on this device; "Cookie settings" in the footer reopens it.

const KEY = 'edge-consent'
const VERSION = 1

function read() {
  try {
    const c = JSON.parse(localStorage.getItem(KEY))
    return c?.v === VERSION ? c : null
  } catch { return null }
}

let choice = read()
const watchers = new Set()
export const analyticsAllowed = () => choice?.analytics === true
export const hasChosen = () => !!choice
export function onConsent(fn) { watchers.add(fn); fn(choice) }

function save(analytics) {
  choice = { v: VERSION, analytics, at: new Date().toISOString() }
  try { localStorage.setItem(KEY, JSON.stringify(choice)) } catch {}
  watchers.forEach((fn) => fn(choice))
  hide()
}

/* ───────── banner ───────── */

let el = null
function build() {
  document.body.insertAdjacentHTML('beforeend', `
    <aside class="consent" role="dialog" aria-live="polite" aria-label="Cookie settings" hidden>
      <p class="consent__title display">Cookies, <em class="serif">briefly.</em></p>
      <p class="consent__text">We keep what the shop needs to work — your sign-in and your bag. With your OK we also use analytics (PostHog) to see which designs people like and fix what's broken. No ads, and we never sell your data. <a href="/privacy.html">Privacy policy</a></p>
      <div class="consent__btns">
        <button class="consent__btn consent__btn--yes" type="button" data-consent="yes">Accept</button>
        <button class="consent__btn" type="button" data-consent="no">Essential only</button>
      </div>
    </aside>`)
  el = document.querySelector('.consent')
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-consent]')
    if (b) save(b.dataset.consent === 'yes')
  })
}
export function showConsent() {
  if (!el) build()
  el.hidden = false
  requestAnimationFrame(() => el.classList.add('is-on'))
}
function hide() {
  if (!el) return
  el.classList.remove('is-on')
  setTimeout(() => (el.hidden = true), 450)
}

// footer link (built by chrome.js) reopens it
document.addEventListener('click', (e) => {
  if (e.target.closest('[data-cookie-settings]')) { e.preventDefault(); showConsent() }
})
// first visit: ask after a moment, once the intro has had its say
if (!choice) setTimeout(showConsent, 2200)
