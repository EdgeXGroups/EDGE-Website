// Image processing for /admin — runs in the browser.
// Same steps as scripts/process-designs.py and scripts/process-prints.py:
//   mockup (front | back side by side) → two cut-out 1200×1500 WebP frames
//   Figma print export (SVG/PNG) → lined up on the mockup → two 2400×3000 prints

export const FRAME = { w: 1200, h: 1500 }

export function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Couldn't read ${file.name}`))
    img.src = url
  })
}

function canvas(w, h) {
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h))
  return c
}
const ctx = (c) => c.getContext('2d', { willReadFrequently: true })

export function toCanvas(img, scale = 1) {
  const w = (img.naturalWidth || img.width) * scale, h = (img.naturalHeight || img.height) * scale
  const c = canvas(w, h)
  const g = ctx(c)
  g.imageSmoothingQuality = 'high'
  g.drawImage(img, 0, 0, c.width, c.height)
  return c
}

export function crop(src, x, y, w, h) {
  const c = canvas(w, h)
  ctx(c).drawImage(src, x, y, w, h, 0, 0, w, h)
  return c
}

/** Remove a plain studio background (black or light grey) by flood-filling from the edges,
 *  then keep only the biggest shape so stray specks around the frame disappear. */
export function cutOut(c) {
  const { width: W, height: H } = c
  const g = ctx(c)
  const im = g.getImageData(0, 0, W, H)
  const p = im.data
  const N = W * H
  // already transparent? leave it
  const corners = [0, W - 1, (H - 1) * W, N - 1]
  if (corners.some((i) => p[i * 4 + 3] < 10)) return c
  const lumAt = (i) => (p[i * 4] + p[i * 4 + 1] + p[i * 4 + 2]) / 3
  const dark = corners.reduce((s, i) => s + lumAt(i), 0) / 4 < 60
  const cand = new Uint8Array(N)
  for (let i = 0; i < N; i++) {
    const r = p[i * 4], gg = p[i * 4 + 1], b = p[i * 4 + 2]
    const l = (r + gg + b) / 3, sat = Math.max(r, gg, b) - Math.min(r, gg, b)
    cand[i] = dark ? (l < 22 ? 1 : 0) : (l > 150 && sat < 16 ? 1 : 0)
  }
  const bg = new Uint8Array(N)
  const stack = new Int32Array(N)
  let sp = 0
  const push = (i) => { if (cand[i] && !bg[i]) { bg[i] = 1; stack[sp++] = i } }
  for (let x = 0; x < W; x++) { push(x); push((H - 1) * W + x) }
  for (let y = 0; y < H; y++) { push(y * W); push(y * W + W - 1) }
  while (sp) {
    const i = stack[--sp], x = i % W
    if (x > 0) push(i - 1)
    if (x < W - 1) push(i + 1)
    if (i >= W) push(i - W)
    if (i < N - W) push(i + W)
  }
  // biggest remaining shape
  const label = new Int32Array(N)
  let best = 0, bestSize = 0, next = 0
  for (let s = 0; s < N; s++) {
    if (bg[s] || label[s]) continue
    next++
    let size = 0
    sp = 0; stack[sp++] = s; label[s] = next
    while (sp) {
      const i = stack[--sp], x = i % W
      size++
      const nb = [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, i - W, i + W]
      for (const j of nb) if (j >= 0 && j < N && !bg[j] && !label[j]) { label[j] = next; stack[sp++] = j }
    }
    if (size > bestSize) { bestSize = size; best = next }
  }
  for (let i = 0; i < N; i++) if (bg[i] || label[i] !== best) p[i * 4 + 3] = 0
  g.putImageData(im, 0, 0)
  return c
}

export function alphaBox(c, threshold = 12) {
  const { width: W, height: H } = c
  const p = ctx(c).getImageData(0, 0, W, H).data
  let x0 = W, y0 = H, x1 = -1, y1 = -1
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (p[(y * W + x) * 4 + 3] > threshold) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y }
  }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 }
}

/** Fit the shape inside a 4:5 frame at 90 %, centred — exactly like the existing design images. */
export function frameFit(src, box, scale = 1) {
  const W = FRAME.w * scale, H = FRAME.h * scale
  const k = Math.min((W * 0.9) / box.w, (H * 0.9) / box.h)
  const c = canvas(W, H)
  const g = ctx(c)
  g.imageSmoothingQuality = 'high'
  const dw = box.w * k, dh = box.h * k
  g.drawImage(src, box.x, box.y, box.w, box.h, (W - dw) / 2, (H - dh) / 2, dw, dh)
  return { canvas: c, k, ox: (W - dw) / 2, oy: (H - dh) / 2 }
}

/** Mockup with front on the left half and back on the right → { front, back } canvases (1200×1500). */
export function splitMockup(img) {
  const full = toCanvas(img)
  const half = Math.floor(full.width / 2)
  const out = {}
  for (const [view, x] of [['front', 0], ['back', half]]) {
    const c = cutOut(crop(full, x, 0, view === 'front' ? half : full.width - half, full.height))
    const box = alphaBox(c)
    if (!box) throw new Error(`No ${view} found in the mockup`)
    out[view] = { ...frameFit(c, box), box, offsetX: x }
  }
  out.full = full
  return out
}

/** One already-cut image (front or back alone) → 1200×1500 frame. */
export function singleView(img) {
  const c = cutOut(toCanvas(img))
  const box = alphaBox(c)
  if (!box) throw new Error('Image looks empty')
  return frameFit(c, box).canvas
}

function inkBox(c, x0, x1) {
  const { width: W, height: H } = c
  const p = ctx(c).getImageData(0, 0, W, H).data
  let a = W, b = H, cc = -1, d = -1
  for (let y = 0; y < H; y++) for (let x = x0; x < x1; x++) {
    const i = (y * W + x) * 4
    if (p[i + 3] > 200 && p[i] + p[i + 1] + p[i + 2] < 330) { if (x < a) a = x; if (x > cc) cc = x; if (y < b) b = y; if (y > d) d = y }
  }
  if (cc < 0) throw new Error('No dark artwork found to line the print up with')
  return [a, b, cc, d]
}

/** Line a Figma print export up with its mockup (by matching the dark ink on both shirts), then
 *  render front and back prints at 2× the frame size. SVGs are drawn as vectors, so they stay sharp. */
export function alignPrint(mock, printImg) {
  const full = mock.full
  const sheet = toCanvas(printImg)
  const mh = Math.floor(full.width / 2), ph = Math.floor(sheet.width / 2)
  const pairs = [[inkBox(full, 0, mh), inkBox(sheet, 0, ph)], [inkBox(full, mh, full.width), inkBox(sheet, ph, sheet.width)]]
  const k = pairs.reduce((s, [m, p]) => s + (m[2] - m[0]) / (p[2] - p[0]), 0) / 2
  const dx = pairs.reduce((s, [m, p]) => s + (m[0] - p[0] * k), 0) / 2
  const dy = pairs.reduce((s, [m, p]) => s + (m[1] - p[1] * k), 0) / 2
  const SCALE = 2
  const out = {}
  for (const view of ['front', 'back']) {
    const v = mock[view]
    const fk = v.k * SCALE
    const c = canvas(FRAME.w * SCALE, FRAME.h * SCALE)
    const g = ctx(c)
    g.imageSmoothingQuality = 'high'
    g.beginPath(); g.rect(v.ox * SCALE, v.oy * SCALE, v.box.w * fk, v.box.h * fk); g.clip()
    // print → mockup composite → this half → frame
    const sx = (dx - v.offsetX - v.box.x) * fk + v.ox * SCALE
    const sy = (dy - v.box.y) * fk + v.oy * SCALE
    g.drawImage(printImg, sx, sy, (printImg.naturalWidth || printImg.width) * k * fk, (printImg.naturalHeight || printImg.height) * k * fk)
    out[view] = c
  }
  return out
}

/** Fabric colour: median of a band across the upper chest of the front frame. */
export function garmentColour(frontCanvas) {
  const box = alphaBox(frontCanvas)
  const x0 = Math.round(box.x + box.w * 0.3), x1 = Math.round(box.x + box.w * 0.42)
  const y0 = Math.round(box.y + box.h * 0.12), y1 = Math.round(box.y + box.h * 0.2)
  const p = ctx(frontCanvas).getImageData(x0, y0, x1 - x0, y1 - y0).data
  const ch = [[], [], []]
  for (let i = 0; i < p.length; i += 4) if (p[i + 3] > 250) for (let k = 0; k < 3; k++) ch[k].push(p[i + k])
  const med = (a) => (a.sort((m, n) => m - n)[a.length >> 1] ?? 220)
  return '#' + ch.map((a) => med(a).toString(16).padStart(2, '0')).join('')
}

/** Square-ish portrait for the team page, max 900px wide. */
export function portrait(img) {
  const s = Math.min(1, 900 / (img.naturalWidth || img.width))
  return toCanvas(img, s)
}

/** Extra photos for a design: used as they are, longest side at most 1800px. */
export function photo(img) {
  const w = img.naturalWidth || img.width, h = img.naturalHeight || img.height
  return toCanvas(img, Math.min(1, 1800 / Math.max(w, h)))
}

export const toWebp = (c, quality = 0.88) =>
  new Promise((resolve) => c.toBlob((b) => resolve(b), 'image/webp', quality))
