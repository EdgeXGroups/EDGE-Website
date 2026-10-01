// Builds the parts every page shares — nav, mobile menu, footer, story overlay
// and lightbox — so the four pages can't drift apart. Each page only needs
// <body data-page="…"> and a <main id="top">.
import { brand, designs } from './content.js'

const page = document.body.dataset.page || 'home'
const home = page === 'home'

// [label, href, page it belongs to]
const LINKS = [
  ['Drop', home ? '#drop' : '/#drop', null],
  ['Collection', '/collection.html', 'collection'],
  ['Why Edge', home ? '#different' : '/#different', null],
  ['Team', '/team.html', 'team'],
  ['Contact', '/contact.html', 'contact'],
]
const current = (p) => (p === page ? ' aria-current="page"' : '')
const status = {
  home: `<span class="dot"></span>${brand.drop}&nbsp;— live`,
  collection: `<span class="dot"></span>Collection — ${String(designs.length).padStart(2, '0')}&nbsp;designs`,
  team: '<span class="dot"></span>The team',
  contact: '<span class="dot"></span>We read everything',
}

const before = `
  <header class="nav">
    <a href="${home ? '#top' : '/'}" class="nav__logo" aria-label="EDGE — home"><img src="/brand/edge-mark.png" alt="" /></a>
    <div class="nav__status">${status[page] || ''}</div>
    <nav class="nav__links" aria-label="Primary">
      ${LINKS.map(([l, h, p]) => `<a href="${h}" data-magnetic${current(p)}>${l}</a>`).join('')}
    </nav>
    <div class="nav__right">
      ${page === 'collection' ? '' : '<a href="/collection.html" class="nav__shop">Collection<i>→</i></a>'}
      <button class="nav__burger" aria-label="Open menu" aria-expanded="false"><span></span><span></span></button>
    </div>
  </header>
  <div class="menu" aria-hidden="true">
    <nav class="menu__links">
      ${LINKS.map(([l, h, p], i) => `<a href="${h}"${current(p)}><i>0${i + 1}</i><span>${l}</span></a>`).join('')}
    </nav>
    <div class="menu__foot">
      <a data-link="instagram" target="_blank" rel="noopener">Instagram ↗</a>
      <a data-link="email">Email ↗</a>
    </div>
  </div>`

// Footer contact details — each row only shows when it's filled in content.js
const digits = (brand.phone || '').replace(/[^\d+]/g, '')
const rows = [
  brand.instagram && ['Instagram', `<a href="https://instagram.com/${brand.instagram}" target="_blank" rel="noopener">@${brand.instagram}</a>`],
  brand.email && ['Email', `<a href="mailto:${brand.email}">${brand.email}</a>`],
  brand.location && ['Location', `<span>${brand.location}</span>`],
  brand.phone && ['Phone', digits.length >= 10 ? `<a href="tel:${digits}">${brand.phone}</a>` : `<span>${brand.phone}</span>`],
].filter(Boolean)
const info = rows.map(([k, v]) => `<li><span class="mono">${k}</span>${v}</li>`).join('')

const after = `
  <footer class="foot">
    <div class="foot__main">
      <a href="${home ? '#top' : '/'}" class="foot__mark" aria-label="EDGE — home"><img src="/brand/edge-wordmark.png" alt="EDGE" /></a>
      <ul class="foot__info">${info}</ul>
    </div>
    <div class="foot__row mono">
      <span>© <span class="year"></span> EDGE</span>
      <a class="foot__credit" href="https://sketchfab.com/3d-models/fish-t-shirt-b2bf0e93920f42618fb0255e137a61c9" target="_blank" rel="noopener">3D tee: “fish t-shirt” by Gleb Gubkin, CC BY 4.0 (modified)</a>
      <a href="#top" data-magnetic>Back to top ↑</a>
    </div>
  </footer>
  <div class="detail" aria-hidden="true" role="dialog" aria-modal="true" aria-label="Design details">
    <div class="detail__wipe"></div>
    <div class="detail__scroller" data-lenis-prevent>
      <button class="detail__close" aria-label="Close" data-magnetic><span></span><span></span></button>
      <div class="detail__content"></div>
    </div>
  </div>
  <div class="lightbox" aria-hidden="true">
    <img alt="" />
    <button class="lightbox__close mono" aria-label="Close image">Close ✕</button>
  </div>`

const main = document.querySelector('main')
main.insertAdjacentHTML('beforebegin', before)
main.insertAdjacentHTML('afterend', after)
