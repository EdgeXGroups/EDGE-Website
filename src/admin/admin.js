// /admin — edit designs, showroom, contact details and team.
// Data lives in Supabase (tables designs / settings / team, images in the
// "media" storage bucket). Sign-in is a Supabase account that's listed in
// public.admins; row-level security enforces that on the server.
// Every save publishes straight away; images are processed in the browser.
import './admin.css'
import { createClient } from '@supabase/supabase-js'
import * as D from '../content.defaults.js'
import { SUPABASE_URL, SUPABASE_KEY } from '../supabase.config.js'
import { loadImage, splitMockup, singleView, alignPrint, garmentColour, portrait, toWebp } from './process.js'

const $ = (s, r = document) => r.querySelector(s)
const $$ = (s, r = document) => [...r.querySelectorAll(s)]
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
const slugify = (s) => String(s).toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-').replace(/-+/g, '-').slice(0, 48) || 'design'
const app = $('#app')

/* ───────── Supabase ───────── */

const db = createClient(SUPABASE_URL, SUPABASE_KEY)
const MEDIA = `${SUPABASE_URL}/storage/v1/object/public/media/`

// friendlier wording for the errors people will actually hit
function explain(err) {
  const m = err?.message || String(err)
  if (/row-level security|permission denied|violates.*policy/i.test(m)) return 'This account isn’t allowed to edit the site.'
  if (/Invalid login credentials/i.test(m)) return 'Wrong email or password.'
  if (/relation .* does not exist|Could not find the (table|function)/i.test(m)) return 'The database isn’t set up yet — run supabase/migrations/0001_site_content.sql.'
  if (/Failed to fetch|NetworkError/i.test(m)) return 'No connection — check your internet and try again.'
  return m
}
const must = ({ data, error }) => { if (error) throw new Error(explain(error)); return data }

async function upload(blob, name) {
  const ext = (blob.type.split('/')[1] || 'webp').replace('jpeg', 'jpg')
  const path = `${name}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}.${ext}`
  must(await db.storage.from('media').upload(path, blob, { contentType: blob.type, cacheControl: '31536000', upsert: false }))
  return db.storage.from('media').getPublicUrl(path).data.publicUrl
}
// only our own uploads are removed — built-in images in /public are left alone
const removeMedia = (url) => (url?.startsWith(MEDIA) ? db.storage.from('media').remove([decodeURIComponent(url.slice(MEDIA.length))]).catch(() => {}) : null)

let toastTimer
function toast(msg, err = false) {
  const t = $('.toast')
  t.textContent = msg
  t.classList.toggle('is-err', err)
  t.classList.add('is-on')
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => t.classList.remove('is-on'), err ? 5000 : 2400)
}

/* ───────── Data ───────── */

let data = null
let starter = false // true while Supabase is empty and we're showing the built-in content
async function loadData() {
  const [d, t, s] = await Promise.all([
    db.from('designs').select('*').order('position'),
    db.from('team').select('*').order('position'),
    db.from('settings').select('*').eq('id', 1).maybeSingle(),
  ])
  const rows = must(d)
  starter = rows.length === 0
  if (starter) {
    data = {
      brand: { ...D.brand },
      designs: structuredClone(D.designs).map(({ featured, ...x }) => x),
      team: structuredClone(D.team),
      showroom: D.featured.map((x) => x.slug),
    }
  } else {
    const settings = must(s)
    data = {
      brand: { ...D.brand, ...(settings?.brand || {}) },
      designs: rows,
      team: must(t),
      showroom: settings?.showroom || [],
    }
  }
}

// Write everything (it's a handful of rows) — simplest way to keep order, showroom and team in sync.
async function publish(msg = 'Published — live on the site') {
  const now = new Date().toISOString()
  const designs = data.designs.map((x, i) => ({
    slug: x.slug, position: i, name: x.name, type: x.type || null, category: x.category || null, tagline: x.tagline || null,
    accent: x.accent || '#ff4a1c', garment: x.garment || null, model: x.model === 'card' ? 'card' : 'tee',
    story: x.story || [], details: x.details || [], images: x.images || [], prints: x.prints || null,
    published: x.published !== false, updated_at: now,
  }))
  const team = data.team.map((m, i) => ({
    id: (m.id ||= crypto.randomUUID()), position: i, name: m.name, role: m.role || null, line: m.line || null,
    photo: m.photo || null, instagram: m.instagram || null,
  }))
  if (designs.length) must(await db.from('designs').upsert(designs))
  must(await db.from('settings').upsert({ id: 1, brand: data.brand, showroom: data.showroom.filter(Boolean), updated_at: now }))
  if (team.length) must(await db.from('team').upsert(team))
  // people removed in the Team tab
  const keep = team.map((m) => m.id)
  must(await (keep.length ? db.from('team').delete().not('id', 'in', `(${keep.join(',')})`) : db.from('team').delete().not('id', 'is', null)))
  starter = false
  toast(msg)
}
const deleteDesignRow = async (slug) => must(await db.from('designs').delete().eq('slug', slug))

/* ───────── Login ───────── */

async function logout() {
  await db.auth.signOut()
  renderLogin()
}

function loginShell(inner) {
  app.innerHTML = `<div class="login"><img src="/brand/edge-mark.png" alt="EDGE" /><h1>Edge <em>admin</em></h1>${inner}</div>`
}

function renderLogin(error = '', note = '') {
  loginShell(`
    <form data-form="login">
      <label class="f"><span>Email</span><input type="email" name="email" autocomplete="username" required autofocus /></label>
      <label class="f"><span>Password</span><input type="password" name="password" autocomplete="current-password" required /></label>
      <button class="b b--primary" type="submit">Sign in</button>
      <button class="b" type="button" data-act="forgot">Forgot password?</button>
      <p class="err">${esc(error)}</p>${note ? `<p class="muted">${esc(note)}</p>` : ''}
    </form>`)
  const form = $('form', app)
  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const btn = $('button[type=submit]', form)
    btn.disabled = true
    const { error: err } = await db.auth.signInWithPassword({ email: form.email.value.trim(), password: form.password.value })
    if (err) return renderLogin(explain(err))
    start().catch((x) => renderLogin(explain(x)))
  })
  $('[data-act="forgot"]', form).addEventListener('click', async () => {
    const email = form.email.value.trim()
    if (!email) return renderLogin('Type your email first, then press “Forgot password?”.')
    const { error: err } = await db.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/admin` })
    renderLogin(err ? explain(err) : '', err ? '' : 'If that email has an account, a reset link is on its way.')
  })
}

// arriving from the reset email: choose a new password
function renderNewPassword(error = '') {
  loginShell(`
    <form>
      <label class="f"><span>New password</span><input type="password" name="password" autocomplete="new-password" minlength="8" required autofocus /></label>
      <button class="b b--primary" type="submit">Save new password</button>
      <p class="err">${esc(error)}</p>
    </form>`)
  $('form', app).addEventListener('submit', async (e) => {
    e.preventDefault()
    const { error: err } = await db.auth.updateUser({ password: e.target.password.value })
    if (err) return renderNewPassword(explain(err))
    toast('Password changed')
    start()
  })
}

/* ───────── Shell ───────── */

let tab = 'designs'
const TABS = [['designs', 'Designs'], ['showroom', 'Showroom'], ['contact', 'Contact'], ['team', 'Team']]

function renderShell() {
  app.innerHTML = `
    <header class="top">
      <div class="top__row">
        <div class="top__brand"><img src="/brand/edge-mark.png" alt="" />Admin</div>
        <div class="top__actions">
          <a class="b b--sm" href="/" target="_blank" rel="noopener">View site ↗</a>
          <button class="b b--sm" data-act="logout">Log out</button>
        </div>
      </div>
      <nav class="tabs" role="tablist">${TABS.map(([k, l]) => `<button role="tab" data-tab="${k}" aria-selected="${k === tab}">${l}</button>`).join('')}</nav>
    </header>
    <main class="wrap"></main>`
  $('[data-act="logout"]').addEventListener('click', logout)
  $$('[data-tab]').forEach((b) => b.addEventListener('click', () => { tab = b.dataset.tab; renderShell() }))
  ;({ designs: renderDesigns, showroom: renderShowroom, contact: renderContact, team: renderTeam })[tab]($('main.wrap'))
}

/* ───────── Designs ───────── */

function renderDesigns(main) {
  main.innerHTML = `
    <div class="head">
      <div><h2>Designs</h2><p>Everything listed here appears on the Collection page, in this order (newest first). Changes go live as soon as you save.</p></div>
      <button class="b b--primary" data-act="new">+ New design</button>
    </div>
    ${starter ? `<div class="card"><p><b>The database is empty</b> — these are the designs built into the site. Copy them into Supabase to start editing.</p><div><button class="b b--primary" data-act="import">Copy into Supabase</button></div></div>` : ''}
    <div class="list">
      ${data.designs.map((d, i) => `
        <div class="row" data-i="${i}">
          <div class="thumb" style="--a:${esc(d.accent)}">${d.images?.[0] ? `<img src="${esc(d.images[0])}" alt="" loading="lazy" />` : ''}</div>
          <div>
            <div class="row__name">${esc(d.name)}${data.showroom.includes(d.slug) ? '<span class="badge">Showroom</span>' : ''}</div>
            <div class="row__meta">${esc(d.type || '')}${d.category ? ` · ${esc(d.category)}` : ''}${d.prints ? ' · print artwork' : ''}</div>
          </div>
          <div class="row__btns">
            <button class="b b--sm icon" data-act="up" aria-label="Move up" ${i === 0 ? 'disabled' : ''}>↑</button>
            <button class="b b--sm icon" data-act="down" aria-label="Move down" ${i === data.designs.length - 1 ? 'disabled' : ''}>↓</button>
            <button class="b b--sm" data-act="edit">Edit</button>
            <button class="b b--sm b--danger" data-act="delete">Delete</button>
          </div>
        </div>`).join('')}
    </div>`
  $('[data-act="new"]', main).addEventListener('click', () => openEditor(null))
  $('[data-act="import"]', main)?.addEventListener('click', async (e) => {
    e.currentTarget.disabled = true
    try { await publish('Built-in designs copied into Supabase'); renderShell() } catch (err) { toast(err.message, true); e.currentTarget.disabled = false }
  })
  $$('.row', main).forEach((row) => {
    const i = +row.dataset.i
    row.addEventListener('click', async (e) => {
      const act = e.target.closest('[data-act]')?.dataset.act
      if (!act) return
      if (act === 'edit') return openEditor(i)
      if (act === 'up' || act === 'down') {
        const j = act === 'up' ? i - 1 : i + 1
        ;[data.designs[i], data.designs[j]] = [data.designs[j], data.designs[i]]
        renderShell()
        try { await publish('Order saved') } catch (err) { toast(err.message, true) }
      }
      if (act === 'delete') {
        const d = data.designs[i]
        if (!confirm(`Delete “${d.name}”? It disappears from the site straight away. This can't be undone.`)) return
        data.designs.splice(i, 1)
        data.showroom = data.showroom.filter((s) => s !== d.slug)
        renderShell()
        try {
          if (!starter) await deleteDesignRow(d.slug)
          await publish(`Deleted ${d.name}`)
          ;[...(d.images || []), d.prints?.front, d.prints?.back].forEach(removeMedia)
        } catch (err) { toast(err.message, true) }
      }
    })
  })
}

const TYPES = ['Oversized Tee', 'Boxy Tee', 'Regular Tee', 'Long Sleeve', 'Hoodie', 'Sweatshirt', 'Fleece Zip Jacket', 'Cap', 'Tote Bag']

function openEditor(index) {
  const isNew = index === null
  const d = isNew
    ? { name: '', slug: '', type: 'Oversized Tee', category: '', tagline: '', accent: '#ff4a1c', model: 'tee', garment: '#f4f4f2', story: [], details: [['Fit', 'Oversized'], ['Print', 'Front & back'], ['Edition', 'Limited run']], images: [] }
    : structuredClone(data.designs[index])
  // processed images waiting to be uploaded
  const pending = { front: null, back: null, printFront: null, printBack: null }
  let mock = null
  const cats = [...new Set(data.designs.map((x) => x.category).filter(Boolean))]

  const sheet = document.createElement('div')
  sheet.className = 'sheet'
  sheet.innerHTML = `
    <div class="sheet__bar">
      <h3>${isNew ? 'New design' : `Edit · ${esc(d.name)}`}</h3>
      <div class="top__actions"><button class="b b--sm" data-act="cancel">Cancel</button><button class="b b--sm b--primary" data-act="save">Save & publish</button></div>
    </div>
    <main class="wrap">
      <section class="card">
        <div><h3 class="mono">1 · Images</h3></div>
        <div class="seg" role="radiogroup">
          <label><input type="radio" name="mode" value="mockup" checked />One mockup (front + back)</label>
          <label><input type="radio" name="mode" value="separate" />Separate front & back</label>
        </div>
        <div data-mode="mockup">
          <label class="drop"><input type="file" accept="image/png,image/jpeg,image/webp" data-in="mockup" /><b>Drop the mockup here</b><span class="muted">PNG or JPG with the front on the left and the back on the right — like the Figma mockups. Plain black or grey backgrounds are removed automatically.</span></label>
        </div>
        <div data-mode="separate" hidden class="grid2">
          <label class="drop"><input type="file" accept="image/*" data-in="front" /><b>Front</b><span class="muted">Already cut out, or on a plain background</span></label>
          <label class="drop"><input type="file" accept="image/*" data-in="back" /><b>Back</b><span class="muted">Optional</span></label>
        </div>
        <label class="drop" data-print><input type="file" accept="image/svg+xml,image/png" data-in="print" /><b>Print artwork for the 3D showroom (optional)</b><span class="muted">The Figma export of just the print layer (SVG or PNG), from the same mockup. Upload the mockup first — it's used to line the print up.</span></label>
        <p class="status" data-status></p>
        <div class="previews" data-previews></div>
      </section>

      <section class="card">
        <h3 class="mono">2 · Details</h3>
        <div class="grid2">
          <label class="f"><span>Name</span><input name="name" value="${esc(d.name)}" required /></label>
          <label class="f"><span>Link name</span><input name="slug" value="${esc(d.slug)}" ${isNew ? '' : 'readonly'} /><small>${isNew ? 'Filled in from the name. Used in the web address.' : 'Fixed once created, so shared links keep working.'}</small></label>
          <label class="f"><span>Type</span><input name="type" list="types" value="${esc(d.type)}" /></label>
          <label class="f"><span>Category</span><input name="category" list="cats" value="${esc(d.category)}" placeholder="e.g. Originals, Anime, Motorsport" /></label>
        </div>
        <datalist id="types">${TYPES.map((t) => `<option value="${t}">`).join('')}</datalist>
        <datalist id="cats">${cats.map((c) => `<option value="${esc(c)}">`).join('')}</datalist>
        <label class="f"><span>One-line tagline</span><input name="tagline" value="${esc(d.tagline)}" /></label>
        <label class="f"><span>The story</span><textarea name="story" rows="7">${esc((d.story || []).join('\n\n'))}</textarea><small>Leave an empty line between paragraphs.</small></label>
        <label class="f"><span>Details</span><textarea name="details" rows="4">${esc((d.details || []).map(([k, v]) => `${k}: ${v}`).join('\n'))}</textarea><small>One per line, like “Fit: Oversized”.</small></label>
      </section>

      <section class="card">
        <h3 class="mono">3 · Look</h3>
        <div class="grid2">
          <label class="f"><span>Accent colour</span><input type="color" name="accent" value="${esc(d.accent)}" /><small>Used for the glow, buttons and the beam in the showroom.</small></label>
          <label class="f"><span>Fabric colour</span><input type="color" name="garment" value="${esc(d.garment || '#f4f4f2')}" /><small>Picked from the mockup automatically.</small></label>
        </div>
        <div class="f"><span>In the 3D showroom, show it as</span>
          <div class="seg">
            <label><input type="radio" name="model" value="tee" ${d.model !== 'card' ? 'checked' : ''} />3D t-shirt</label>
            <label><input type="radio" name="model" value="card" ${d.model === 'card' ? 'checked' : ''} />Photo (hoodies, jackets…)</label>
          </div>
        </div>
      </section>
    </main>`
  document.body.appendChild(sheet)
  document.body.style.overflow = 'hidden'
  const f = (n) => sheet.querySelector(`[name="${n}"]`)
  const status = $('[data-status]', sheet)
  const setStatus = (msg, busy = false) => { status.textContent = msg; status.classList.toggle('is-busy', busy) }

  function previews() {
    const tile = (src, label, print) => src ? `<div class="pv ${print ? 'pv--print' : ''}"><div class="thumb" style="--a:${esc(f('accent').value)}"><img src="${src}" alt="" /></div><span class="mono muted">${label}</span></div>` : ''
    const url = (c, fallback) => (c ? c.toDataURL('image/webp', 0.6) : fallback)
    $('[data-previews]', sheet).innerHTML =
      tile(url(pending.front, d.images?.[0]), 'Front') + tile(url(pending.back, d.images?.[1]), 'Back') +
      tile(url(pending.printFront, d.prints?.front), 'Print · front', true) + tile(url(pending.printBack, d.prints?.back), 'Print · back', true)
  }
  previews()

  // name → slug
  f('name').addEventListener('input', () => { if (isNew) f('slug').value = slugify(f('name').value) })
  // image mode
  $$('[name="mode"]', sheet).forEach((r) => r.addEventListener('change', () => {
    $$('[data-mode]', sheet).forEach((el) => (el.hidden = el.dataset.mode !== r.value))
  }))
  $$('.drop', sheet).forEach((drop) => {
    drop.addEventListener('dragover', () => drop.classList.add('is-over'))
    ;['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, () => drop.classList.remove('is-over')))
  })

  sheet.addEventListener('change', async (e) => {
    const input = e.target.closest('[data-in]')
    if (!input?.files?.[0]) return
    const file = input.files[0]
    const which = input.dataset.in
    setStatus('Processing image…', true)
    await new Promise((r) => setTimeout(r, 30)) // let the spinner paint
    try {
      const img = await loadImage(file)
      if (which === 'mockup') {
        mock = splitMockup(img)
        pending.front = mock.front.canvas
        pending.back = mock.back.canvas
        f('garment').value = garmentColour(pending.front)
        setStatus('Mockup split into front and back, background removed.')
      } else if (which === 'front' || which === 'back') {
        pending[which] = singleView(img)
        if (which === 'front') f('garment').value = garmentColour(pending.front)
        setStatus(`${which === 'front' ? 'Front' : 'Back'} ready.`)
      } else if (which === 'print') {
        if (!mock) throw new Error('Upload the mockup first — the print is lined up against it.')
        const out = alignPrint(mock, img)
        pending.printFront = out.front
        pending.printBack = out.back
        setStatus('Print lined up with the mockup.')
      }
      previews()
    } catch (err) {
      setStatus('')
      toast(err.message, true)
    }
    input.value = ''
  })

  const close = () => { sheet.remove(); document.body.style.overflow = '' }
  $('[data-act="cancel"]', sheet).addEventListener('click', close)
  $('[data-act="save"]', sheet).addEventListener('click', async (e) => {
    const btn = e.currentTarget
    const name = f('name').value.trim()
    if (!name) return toast('Give the design a name', true)
    let slug = isNew ? slugify(f('slug').value || name) : d.slug
    if (isNew) { let n = 2; const base = slug; while (data.designs.some((x) => x.slug === slug)) slug = `${base}-${n++}` }
    if (isNew && !pending.front) return toast('Add the images first', true)
    btn.disabled = true
    setStatus('Uploading…', true)
    try {
      const old = { images: [...(d.images || [])], prints: d.prints ? { ...d.prints } : null }
      const up = async (c, label, q) => upload(await toWebp(c, q), `designs/${slug}/${label}`)
      if (pending.front) d.images = [await up(pending.front, 'front', 0.86), ...(d.images?.slice(1) || [])]
      if (pending.back) d.images = [d.images[0], await up(pending.back, 'back', 0.86)]
      if (pending.printFront) d.prints = { front: await up(pending.printFront, 'print-front', 0.9), back: await up(pending.printBack, 'print-back', 0.9) }
      Object.assign(d, {
        name, slug,
        type: f('type').value.trim(),
        category: f('category').value.trim(),
        tagline: f('tagline').value.trim(),
        story: f('story').value.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean),
        details: f('details').value.split('\n').map((l) => l.split(':')).filter((p) => p.length > 1 && p[0].trim()).map(([k, ...v]) => [k.trim(), v.join(':').trim()]),
        accent: f('accent').value,
        garment: f('garment').value,
        model: sheet.querySelector('[name="model"]:checked').value,
      })
      if (isNew) data.designs.unshift(d)
      else data.designs[index] = d
      await publish(isNew ? `${name} added — live on the site` : `${name} saved`)
      // clean up replaced uploads
      if (pending.front) removeMedia(old.images[0])
      if (pending.back) removeMedia(old.images[1])
      if (pending.printFront && old.prints) { removeMedia(old.prints.front); removeMedia(old.prints.back) }
      close()
      renderShell()
    } catch (err) {
      setStatus('')
      toast(err.message, true)
      btn.disabled = false
    }
  })
}

/* ───────── Showroom ───────── */

function renderShowroom(main) {
  const opts = (sel) => `<option value="">— Empty —</option>` + data.designs.map((d) => `<option value="${esc(d.slug)}" ${d.slug === sel ? 'selected' : ''}>${esc(d.name)}</option>`).join('')
  main.innerHTML = `
    <div class="head"><div><h2>Showroom</h2><p>The three pieces on the glass on the home page. The first one is in the light when the page opens.</p></div>
      <button class="b b--primary" data-act="save">Save & publish</button></div>
    <div class="slots">
      ${[0, 1, 2].map((i) => {
        const d = data.designs.find((x) => x.slug === data.showroom[i])
        return `<div class="slot"><span class="mono muted">${['1 · In the light', '2 · Right', '3 · Left'][i]}</span>
          <div class="thumb" style="--a:${esc(d?.accent)}">${d?.images?.[0] ? `<img src="${esc(d.images[0])}" alt="" />` : ''}</div>
          <select data-slot="${i}">${opts(data.showroom[i])}</select></div>`
      }).join('')}
    </div>`
  $$('[data-slot]', main).forEach((s) => s.addEventListener('change', () => {
    data.showroom[+s.dataset.slot] = s.value
    data.showroom = data.showroom.slice(0, 3)
    renderShowroom(main)
  }))
  $('[data-act="save"]', main).addEventListener('click', async () => {
    const picked = data.showroom.filter(Boolean)
    if (new Set(picked).size !== picked.length) return toast('Pick three different designs', true)
    data.showroom = picked
    try { await publish('Showroom updated') } catch (err) { toast(err.message, true) }
  })
}

/* ───────── Contact ───────── */

const BRAND_FIELDS = [
  ['instagram', 'Instagram handle', 'Without the @, e.g. edge.studio'],
  ['email', 'Email', ''],
  ['phone', 'Phone', 'Shown in the footer; tap-to-call on phones'],
  ['whatsapp', 'WhatsApp number', 'Country code + number, digits only (e.g. 919876543210). Leave empty to hide'],
  ['location', 'Location', 'Shown in the footer, e.g. Kharagpur, India'],
  ['tagline', 'Tagline', 'The line on the home page'],
  ['drop', 'Current drop name', 'e.g. Drop 01'],
  ['dropDate', 'Season', 'e.g. Autumn 2026'],
]

function renderContact(main) {
  main.innerHTML = `
    <div class="head"><div><h2>Contact & brand</h2><p>Shown in the footer, on the Contact page and around the site. Leave a field empty to hide it.</p></div></div>
    <form class="card">
      <div class="grid2">${BRAND_FIELDS.map(([k, label, hint]) => `<label class="f"><span>${label}</span><input name="${k}" value="${esc(data.brand[k])}" />${hint ? `<small>${hint}</small>` : ''}</label>`).join('')}</div>
      <div><button class="b b--primary" type="submit">Save & publish</button></div>
    </form>`
  $('form', main).addEventListener('submit', async (e) => {
    e.preventDefault()
    for (const [k] of BRAND_FIELDS) data.brand[k] = e.target[k].value.trim().replace(k === 'instagram' ? /^@/ : /$^/, '')
    data.brand.city = data.brand.location
    try { await publish('Contact details saved') } catch (err) { toast(err.message, true) }
  })
}

/* ───────── Team ───────── */

function renderTeam(main) {
  main.innerHTML = `
    <div class="head"><div><h2>Team</h2><p>The people on the Team page, in this order.</p></div>
      <div class="top__actions"><button class="b" data-act="add">+ Add person</button><button class="b b--primary" data-act="save">Save & publish</button></div></div>
    <div class="list">${data.team.map((m, i) => `
      <div class="card member" data-i="${i}">
        <label class="thumb" style="cursor:pointer" title="Change photo">${m.photo ? `<img src="${esc(m.photo)}" alt="" style="object-fit:cover" />` : `<span>${esc((m.name || '?')[0])}</span>`}<input type="file" accept="image/*" data-photo hidden /></label>
        <div class="grid2">
          <label class="f"><span>Name</span><input data-k="name" value="${esc(m.name)}" /></label>
          <label class="f"><span>Role</span><input data-k="role" value="${esc(m.role)}" /></label>
          <label class="f"><span>One line about them</span><input data-k="line" value="${esc(m.line)}" /></label>
          <label class="f"><span>Instagram (optional)</span><input data-k="instagram" value="${esc(m.instagram)}" /></label>
          <div class="row__btns" style="justify-content:start">
            <button class="b b--sm icon" data-act="up" ${i === 0 ? 'disabled' : ''}>↑</button>
            <button class="b b--sm icon" data-act="down" ${i === data.team.length - 1 ? 'disabled' : ''}>↓</button>
            <button class="b b--sm b--danger" data-act="remove">Remove</button>
          </div>
        </div>
      </div>`).join('')}</div>`
  const sync = () => $$('.member', main).forEach((el) => {
    const m = data.team[+el.dataset.i]
    $$('[data-k]', el).forEach((inp) => (m[inp.dataset.k] = inp.value.trim().replace(inp.dataset.k === 'instagram' ? /^@/ : /$^/, '')))
  })
  $('[data-act="add"]', main).addEventListener('click', () => { sync(); data.team.push({ id: crypto.randomUUID(), name: '', role: '', line: '' }); renderTeam(main) })
  $('[data-act="save"]', main).addEventListener('click', async () => {
    sync()
    data.team = data.team.filter((m) => m.name)
    try { await publish('Team saved'); renderTeam(main) } catch (err) { toast(err.message, true) }
  })
  $$('.member', main).forEach((el) => {
    const i = +el.dataset.i
    el.addEventListener('click', (e) => {
      const act = e.target.closest('[data-act]')?.dataset.act
      if (!act) return
      sync()
      if (act === 'remove') { removeMedia(data.team[i].photo); data.team.splice(i, 1) }
      if (act === 'up' || act === 'down') { const j = act === 'up' ? i - 1 : i + 1; [data.team[i], data.team[j]] = [data.team[j], data.team[i]] }
      renderTeam(main)
    })
    $('[data-photo]', el).addEventListener('change', async (e) => {
      const file = e.target.files[0]
      if (!file) return
      try {
        toast('Uploading photo…')
        const url = await upload(await toWebp(portrait(await loadImage(file)), 0.85), `team/${slugify(data.team[i].name || 'person')}`)
        sync()
        removeMedia(data.team[i].photo)
        data.team[i].photo = url
        renderTeam(main)
        toast('Photo added — press Save & publish')
      } catch (err) { toast(err.message, true) }
    })
  })
}

/* ───────── Boot ───────── */

async function start() {
  app.innerHTML = '<div class="login"><p class="mono muted">Loading…</p></div>'
  const { data: { user } } = await db.auth.getUser()
  if (!user) return renderLogin()
  const me = await db.from('admins').select('user_id').eq('user_id', user.id).maybeSingle()
  if (me.error) throw new Error(explain(me.error))
  if (!me.data) {
    await db.auth.signOut()
    return renderLogin(`${user.email} isn’t an admin. Ask whoever runs the Supabase project to add it.`)
  }
  await loadData()
  renderShell()
}

let recovering = false
db.auth.onAuthStateChange((event) => {
  if (event === 'PASSWORD_RECOVERY') { recovering = true; renderNewPassword() }
})
db.auth.getSession().then(({ data: { session } }) => {
  if (recovering) return
  if (session) start().catch((err) => renderLogin(explain(err)))
  else renderLogin()
})
