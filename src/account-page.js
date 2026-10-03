import './style.css'
import './pages.css'
import { designs } from './content.js'
import { $, $$, esc, fillBrand, lenis, initCursor, pageEnter, startRouter, gsap, fitHeadings } from './shared.js'
import { onUser, onWishlist, wishlist, ready, signIn, signOut, supabase, firstName, user } from './account.js'
import { money, priceHTML, badgeHTML } from './commerce.js'
import { heartHTML, paintHearts } from './shop-ui.js'
import { imagesFor } from './mockup.js'

const out = $('.acct--out')
const inn = $('.acct--in')
const STATUS = { paid: 'Confirmed', shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled' }
const date = (iso) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

/* ───────── tabs ───────── */

function setTab(name) {
  $$('[data-tab]').forEach((b) => b.setAttribute('aria-selected', b.dataset.tab === name))
  $$('[data-panel]').forEach((p) => (p.hidden = p.dataset.panel !== name))
}
$('.acct__tabs').addEventListener('click', (e) => {
  const b = e.target.closest('[data-tab]')
  if (!b) return
  setTab(b.dataset.tab)
  history.replaceState(history.state, '', `#${b.dataset.tab}`)
})
const fromHash = () => ['orders', 'wishlist', 'addresses'].includes(location.hash.slice(1)) && setTab(location.hash.slice(1))
fromHash()
addEventListener('hashchange', fromHash)

/* ───────── orders ───────── */

async function renderOrders() {
  const panel = $('[data-panel="orders"]')
  panel.innerHTML = '<p class="mono acct__muted">Loading your orders…</p>'
  const { data, error } = await (await supabase()).from('orders')
    .select('number,status,items,subtotal,shipping,total,address,created_at')
    .in('status', ['paid', 'shipped', 'delivered', 'cancelled'])
    .order('created_at', { ascending: false })
  if (error) { panel.innerHTML = `<p class="acct__muted">Couldn’t load orders: ${esc(error.message)}</p>`; return }
  if (!data.length) {
    panel.innerHTML = `<div class="acct__empty"><p class="display">No orders <em class="serif">yet.</em></p><a class="btn" href="/collection.html"><span>Find your first piece</span></a></div>`
    return
  }
  panel.innerHTML = data.map((o) => `
    <details class="order">
      <summary>
        <span class="order__thumbs">${o.items.slice(0, 3).map((i) => `<img src="${esc(i.image || '')}" alt="" />`).join('')}</span>
        <span class="order__main"><b>${esc(o.number)}</b><small class="mono">${date(o.created_at)} · ${o.items.reduce((n, i) => n + i.qty, 0)} item${o.items.length === 1 && o.items[0].qty === 1 ? '' : 's'}</small></span>
        <span class="order__status order__status--${o.status} mono">${STATUS[o.status] || o.status}</span>
        <span class="order__total">${money(o.total)}</span>
      </summary>
      <div class="order__body">
        <ul>${o.items.map((i) => `<li><span>${esc(i.name)}${i.size ? ` <small class="mono">· ${esc(i.size)}</small>` : ''} × ${i.qty}</span><b>${money(i.price * i.qty)}</b></li>`).join('')}
          <li class="order__sum"><span>Shipping</span><b>${o.shipping ? money(o.shipping) : 'Free'}</b></li>
          <li class="order__sum order__sum--total"><span>Total</span><b>${money(o.total)}</b></li></ul>
        <p class="mono acct__muted">Delivering to ${esc(o.address.name)}, ${esc(o.address.line1)}${o.address.line2 ? `, ${esc(o.address.line2)}` : ''}, ${esc(o.address.city)}, ${esc(o.address.state)} ${esc(o.address.pincode)}</p>
        <a class="mono co__link" href="/contact.html">Need help with this order?</a>
      </div>
    </details>`).join('')
}

/* ───────── wishlist ───────── */

function renderWishlist() {
  const panel = $('[data-panel="wishlist"]')
  const list = [...wishlist].map((s) => designs.find((d) => d.slug === s)).filter(Boolean)
  $('[data-wcount]').textContent = list.length || ''
  if (!list.length) {
    panel.innerHTML = `<div class="acct__empty"><p class="display">Nothing <em class="serif">saved.</em></p><p class="acct__muted">Tap the heart on any design to keep it here.</p><a class="btn" href="/collection.html"><span>Browse the collection</span></a></div>`
    return
  }
  panel.innerHTML = `<div class="wgrid">${list.map((d) => `
    <a class="wcard" href="#/drop/${d.slug}" style="--m-accent:${d.accent}" data-cursor="Open">
      <span class="wcard__img"><img src="${imagesFor(d)[0]}" alt="" loading="lazy" />${badgeHTML(d)}${heartHTML(d.slug, 'heart--card')}</span>
      <span class="wcard__name">${esc(d.name)}</span>
      ${priceHTML(d, 'wcard__price')}
    </a>`).join('')}</div>`
  paintHearts(panel)
}
onWishlist(() => renderWishlist())

/* ───────── addresses ───────── */

async function renderAddresses() {
  const panel = $('[data-panel="addresses"]')
  const { data } = await (await supabase()).from('addresses').select('*').order('created_at', { ascending: false })
  panel.innerHTML = data?.length
    ? `<ul class="addrs">${data.map((a) => `<li><p><b>${esc(a.name)}</b><br />${esc(a.line1)}${a.line2 ? `, ${esc(a.line2)}` : ''}<br />${esc(a.city)}, ${esc(a.state)} ${esc(a.pincode)}<br /><span class="mono">${esc(a.phone)}</span></p><button class="mono co__link" data-del="${a.id}">Delete</button></li>`).join('')}</ul>`
    : '<p class="acct__muted">No saved addresses. Tick “Save this address” at checkout and it’ll appear here.</p>'
}
$('[data-panel="addresses"]').addEventListener('click', async (e) => {
  const id = e.target.closest('[data-del]')?.dataset.del
  if (!id || !confirm('Delete this address?')) return
  await (await supabase()).from('addresses').delete().eq('id', id)
  renderAddresses()
})

/* ───────── signed in / out ───────── */

// wait until we know who it is, so a signed-in visitor never sees the sign-in card flash
let settled = false
function apply(u) {
  out.hidden = !!u
  inn.hidden = !u
  $('[data-title]').innerHTML = u ? `Hi, <em class="serif">${esc(firstName(u))}.</em>` : 'Your <em class="serif">account.</em>'
  $('[data-hello]').textContent = u ? u.email : 'Your account'
  fitHeadings()
  if (u) { renderOrders(); renderAddresses(); renderWishlist() }
}
onUser((u) => settled && apply(u))
ready.then(() => { settled = true; apply(user) })
$('[data-signin]').addEventListener('click', async (e) => {
  e.currentTarget.disabled = true
  try { await signIn() } catch { e.currentTarget.disabled = false }
})
$('[data-signout]').addEventListener('click', async () => { await signOut(); location.href = '/' })

/* ───────── page ───────── */

fillBrand()
initCursor()
// (no SplitText on the title: it changes once we know who's signed in)
gsap.from('.sub__head > *', { y: 30, opacity: 0, duration: 1, stagger: 0.08, ease: 'expo.out', delay: 0.2 })
pageEnter()
lenis?.start()
startRouter()
