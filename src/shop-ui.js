// Shop UI shared by every page: nav icons (account · wishlist · bag), the bag
// drawer, the sign-in sheet and the wishlist hearts. Imported once by shared.js.
import './shop.css'
import { designs, brand } from './content.js'
import { priceHTML, money, shippingRules, sizesOf, lineProblem, MAX_QTY } from './commerce.js'
import { onBag, summary, setQty, remove, add, count } from './cart.js'
import { onUser, onWishlist, wishlist, toggleWish, signIn, user } from './account.js'
import { imagesFor } from './mockup.js'
import { track } from './analytics.js'

const $ = (s, r = document) => r.querySelector(s)
const $$ = (s, r = document) => [...r.querySelectorAll(s)]
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

// shared.js hands us Lenis so open sheets can stop the page scrolling underneath
let lock = { stop() {}, start() {} }
export const setScrollLock = (l) => (lock = l)

const ICON = {
  user: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
  heart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5s-8-4.9-8-11A4.5 4.5 0 0 1 12 6.6 4.5 4.5 0 0 1 20 9.5c0 6.1-8 11-8 11z"/></svg>',
  bag: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8h14l-1 13H6L5 8z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/></svg>',
  google: '<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>',
}

/* ───────── nav icons ───────── */

const right = $('.nav__right')
right?.insertAdjacentHTML('afterbegin', `
  <a class="nav__icon nav__acct" href="/account.html" aria-label="Your account">${ICON.user}<i class="nav__dot" hidden></i></a>
  <a class="nav__icon nav__wish" href="/account.html#wishlist" aria-label="Wishlist">${ICON.heart}</a>
  <button class="nav__icon nav__bag" type="button" aria-label="Bag">${ICON.bag}<b class="nav__count" hidden></b></button>`)
$('.menu__foot')?.insertAdjacentHTML('afterbegin', '<a href="/account.html" class="menu__acct">Account</a>')

onUser((u) => {
  $$('.nav__dot').forEach((d) => (d.hidden = !u))
  const m = $('.menu__acct')
  if (m) m.textContent = u ? 'Account' : 'Sign in'
})

/* ───────── sheets: bag drawer + sign-in ───────── */

document.body.insertAdjacentHTML('beforeend', `
  <aside class="bag" aria-hidden="true" role="dialog" aria-modal="true" aria-label="Your bag">
    <div class="bag__bg" data-close></div>
    <div class="bag__panel">
      <header class="bag__head"><p class="mono">Your bag <sup class="bag__n"></sup></p><button class="bag__x" aria-label="Close bag" data-close>×</button></header>
      <div class="bag__ship mono"></div>
      <div class="bag__body" data-lenis-prevent><ul class="bag__list"></ul>
        <div class="bag__empty"><p class="display">Nothing <em class="serif">here</em> yet.</p><a class="btn" href="/collection.html"><span>Browse the collection</span></a></div>
      </div>
      <footer class="bag__foot">
        <div class="bag__row"><span>Subtotal</span><b class="bag__sub"></b></div>
        <div class="bag__row"><span>Shipping</span><b class="bag__shipfee"></b></div>
        <div class="bag__row bag__row--total"><span>Total</span><b class="bag__total"></b></div>
        <a class="btn bag__checkout" href="/checkout.html"><span>Checkout</span></a>
        <p class="mono bag__fine">Taxes included · Secure payment by Razorpay</p>
      </footer>
    </div>
  </aside>
  <div class="signin" aria-hidden="true" role="dialog" aria-modal="true" aria-labelledby="signin-title">
    <div class="signin__bg" data-close></div>
    <div class="signin__card">
      <button class="signin__x" aria-label="Close" data-close>×</button>
      <img src="/brand/edge-mark.png" alt="" />
      <h2 class="display" id="signin-title">Sign <em class="serif">in</em></h2>
      <p class="signin__why"></p>
      <button class="signin__google" type="button">${ICON.google}<span>Continue with Google</span></button>
      <p class="mono signin__fine">No password to remember. We only use your name and email.</p>
    </div>
  </div>`)

const bag = $('.bag')
const signin = $('.signin')
let openSheet = null
function show(el) {
  if (openSheet && openSheet !== el) hide(openSheet, true)
  openSheet = el
  el.classList.add('is-open')
  el.setAttribute('aria-hidden', 'false')
  document.documentElement.classList.add('sheet-open')
  lock.stop()
  setTimeout(() => $('[data-close].bag__x, .signin__google', el)?.focus({ preventScroll: true }), 50)
}
function hide(el, swapping) {
  el.classList.remove('is-open')
  el.setAttribute('aria-hidden', 'true')
  if (openSheet === el) openSheet = null
  if (!swapping) {
    document.documentElement.classList.remove('sheet-open')
    if (!document.body.classList.contains('is-locked')) lock.start()
  }
}
for (const el of [bag, signin]) el.addEventListener('click', (e) => e.target.closest('[data-close]') && hide(el))
addEventListener('keydown', (e) => e.key === 'Escape' && openSheet && hide(openSheet))

export const openBag = () => { renderBag(); show(bag) }
$('.nav__bag')?.addEventListener('click', openBag)

export function openSignIn(why = 'Save designs to your wishlist, keep your bag on every device and see your orders.') {
  $('.signin__why', signin).textContent = why
  show(signin)
}
$('.signin__google').addEventListener('click', async (e) => {
  e.currentTarget.disabled = true
  $('span', e.currentTarget).textContent = 'Opening Google…'
  try { await signIn() } catch (err) {
    e.currentTarget.disabled = false
    $('span', e.currentTarget).textContent = 'Continue with Google'
    $('.signin__why', signin).textContent = `Couldn’t start sign-in: ${err.message}`
  }
})
// the account icon opens the sheet for guests instead of an empty account page
$('.nav__acct')?.addEventListener('click', (e) => { if (!user) { e.preventDefault(); openSignIn() } })
$('.nav__wish')?.addEventListener('click', (e) => { if (!user) { e.preventDefault(); openSignIn('Sign in to see the designs you’ve saved.') } })

/* ───────── bag contents ───────── */

function renderBag() {
  const s = summary()
  const n = count()
  $('.bag__n', bag).textContent = n || ''
  $('.bag__list', bag).innerHTML = s.lines.map((l) => {
    const d = l.design
    return `<li class="bag__item${l.problem ? ' is-off' : ''}" data-slug="${esc(l.slug)}" data-size="${esc(l.size)}">
      <a class="bag__img" href="/collection.html#/drop/${esc(l.slug)}" style="--m-accent:${d?.accent || '#333'}">${d ? `<img src="${imagesFor(d)[0]}" alt="" />` : ''}</a>
      <div class="bag__info">
        <a class="bag__name" href="/collection.html#/drop/${esc(l.slug)}">${esc(d?.name || l.slug)}</a>
        <span class="mono bag__meta">${l.size ? `Size ${esc(l.size)}` : esc(d?.type || '')}</span>
        ${l.problem ? `<span class="mono bag__problem">${esc(l.problem)}</span>` : priceHTML(d, 'bag__price')}
        <div class="bag__qty">
          <button type="button" data-q="-1" aria-label="One less">−</button><span aria-live="polite">${l.qty}</span><button type="button" data-q="1" aria-label="One more" ${l.qty >= MAX_QTY || l.problem ? 'disabled' : ''}>+</button>
          <button type="button" class="mono bag__rm" data-rm>Remove</button>
        </div>
      </div>
    </li>`
  }).join('')
  bag.classList.toggle('is-empty', !s.lines.length)
  $('.bag__sub', bag).textContent = money(s.subtotal)
  $('.bag__shipfee', bag).textContent = s.ok.length ? (s.shipping ? money(s.shipping) : 'Free') : '—'
  $('.bag__total', bag).textContent = money(s.total)
  const checkout = $('.bag__checkout', bag)
  checkout.classList.toggle('is-disabled', !s.ok.length)
  checkout.setAttribute('aria-disabled', !s.ok.length)
  // free-shipping nudge
  const { freeAbove } = shippingRules(brand)
  const ship = $('.bag__ship', bag)
  if (freeAbove != null && s.ok.length) {
    const left = freeAbove - s.subtotal
    ship.innerHTML = `<span>${left > 0 ? `Add ${money(left)} more for free shipping` : 'You’ve got free shipping'}</span><i style="--p:${Math.min(1, s.subtotal / freeAbove)}"></i>`
    ship.hidden = false
  } else ship.hidden = true
}
bag.addEventListener('click', (e) => {
  const li = e.target.closest('.bag__item')
  if (!li) return
  const { slug, size } = li.dataset
  const q = e.target.closest('[data-q]')
  if (q) { const cur = summary().lines.find((l) => l.slug === slug && l.size === size); setQty(slug, size, cur.qty + +q.dataset.q) }
  if (e.target.closest('[data-rm]')) { remove(slug, size); track('remove_from_bag', { slug, size }) }
  if (e.target.closest('a')) hide(bag)
})
$('.bag__checkout', bag).addEventListener('click', (e) => { if (e.currentTarget.classList.contains('is-disabled')) e.preventDefault() })

// nav count + drawer follow the bag (registered once the drawer exists)
onBag(() => {
  const n = count()
  $$('.nav__count').forEach((b) => { b.hidden = !n; b.textContent = n })
  $('.nav__bag')?.setAttribute('aria-label', n ? `Bag, ${n} item${n === 1 ? '' : 's'}` : 'Bag')
  renderBag()
})

/* ───────── wishlist hearts ───────── */

export const heartHTML = (slug, cls = '') =>
  `<button type="button" class="heart ${cls}" data-wish="${esc(slug)}" aria-pressed="${wishlist.has(slug)}" aria-label="Save to wishlist">${ICON.heart}</button>`
export function paintHearts(root = document) {
  $$('[data-wish]', root).forEach((b) => {
    const on = wishlist.has(b.dataset.wish)
    b.setAttribute('aria-pressed', on)
    b.setAttribute('aria-label', on ? 'Remove from wishlist' : 'Save to wishlist')
  })
}
onWishlist(() => paintHearts())
// capture phase: hearts sit inside card links — the link mustn't open
document.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-wish]')
  if (!b) return
  e.preventDefault()
  e.stopPropagation()
  const ok = await toggleWish(b.dataset.wish)
  if (!ok) return openSignIn('Sign in to save designs to your wishlist.')
  track(wishlist.has(b.dataset.wish) ? 'wishlist_add' : 'wishlist_remove', { slug: b.dataset.wish })
  b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop')
}, true)

/* ───────── "Add to bag" on a design's story ───────── */

export function wireBuy(root, d) {
  const btn = $('.d-addbag', root)
  if (!btn) return
  const needsSize = sizesOf(d).length > 0
  const label = $('span', btn)
  btn.addEventListener('click', () => {
    const size = $('input[name="size"]:checked', root)?.value || ''
    if (needsSize && !size) {
      const list = $('.d-sizes', root)
      list.classList.remove('is-asking'); void list.offsetWidth; list.classList.add('is-asking')
      $('.d-sizes__head .mono', root).textContent = 'Pick a size first'
      return
    }
    if (lineProblem(d, size)) return
    add(d.slug, size, 1)
    track('add_to_bag', { slug: d.slug, size, price: d.price })
    label.textContent = 'Added ✓'
    btn.classList.add('is-added')
    setTimeout(() => { label.textContent = 'Add to bag'; btn.classList.remove('is-added') }, 1600)
    openBag()
  })
  root.addEventListener('change', (e) => {
    if (e.target.name === 'size') $('.d-sizes__head .mono', root).textContent = 'Select size'
  })
}

