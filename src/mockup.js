// Placeholder garment mockups, drawn as SVG so the site looks finished
// before real photography exists. Swapped out automatically once a
// design has `images` in content.js.

const W = 800
const H = 1000

function shapes(type) {
  const t = type.toLowerCase()
  const long = t.includes('long') || t.includes('hoodie')
  const hood = t.includes('hoodie')
  const path = long
    ? 'M300,160 Q400,215 500,160 L640,210 L730,760 L650,780 L590,400 L590,890 Q400,915 210,890 L210,400 L150,780 L70,760 L160,210 Z'
    : 'M300,160 Q400,215 500,160 L640,210 L720,380 L610,420 L590,350 L590,890 Q400,915 210,890 L210,350 L190,420 L80,380 L160,210 Z'
  return { path, hood }
}

function motif(kind, accent, ink, scale = 1) {
  const s = scale
  switch (kind) {
    case 'bloom': {
      let petals = ''
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * 360
        petals += `<ellipse cx="0" cy="-52" rx="24" ry="52" transform="rotate(${a})" fill="${accent}" opacity="${0.55 + (i % 2) * 0.35}"/>`
      }
      let staticLines = ''
      for (let i = 0; i < 26; i++) {
        const y = -110 + i * 8.5
        const w = 60 + ((i * 53) % 140)
        const x = -120 + ((i * 37) % 70)
        staticLines += `<rect x="${x}" y="${y}" width="${w}" height="2.2" fill="${ink}" opacity="${0.18 + ((i * 7) % 5) / 10}"/>`
      }
      return `<g transform="scale(${s})">${staticLines}${petals}<circle r="20" fill="${ink}"/><circle r="9" fill="${accent}"/></g>`
    }
    case 'fault': {
      const pts = '-40,-150 -10,-95 -46,-40 6,10 -20,62 30,118 8,170'
      return `<g transform="scale(${s})">
        <rect x="-120" y="-160" width="240" height="330" fill="none" stroke="${ink}" stroke-width="2" opacity=".35"/>
        <polyline points="${pts}" fill="none" stroke="${accent}" stroke-width="9" stroke-linejoin="bevel"/>
        <polyline points="${pts}" fill="none" stroke="${ink}" stroke-width="2" transform="translate(9,4)" opacity=".6"/>
        <text x="-112" y="190" font-family="monospace" font-size="15" fill="${ink}" opacity=".7" letter-spacing="3">22.3149°N 87.3105°E</text>
      </g>`
    }
    case 'orbit': {
      return `<g transform="scale(${s})">
        <defs><path id="ring" d="M-120,0 a120,120 0 1,1 240,0 a120,120 0 1,1 -240,0"/></defs>
        <circle r="62" fill="${accent}"/>
        <ellipse rx="150" ry="34" fill="none" stroke="${ink}" stroke-width="5" transform="rotate(-18)"/>
        <text font-family="monospace" font-size="15" letter-spacing="5" fill="${ink}"><textPath href="#ring">CLOSE ENOUGH TO SEE HOME · FAR ENOUGH TO MISS IT ·</textPath></text>
      </g>`
    }
    default: {
      let arcs = ''
      for (let i = 1; i <= 5; i++) {
        arcs += `<path d="M${-i * 26},0 a${i * 26},${i * 26} 0 0,1 ${i * 52},0" fill="none" stroke="${i % 2 ? accent : ink}" stroke-width="7"/>`
      }
      let dots = ''
      for (let x = 0; x < 9; x++)
        for (let y = 0; y < 4; y++)
          dots += `<circle cx="${-104 + x * 26}" cy="${40 + y * 22}" r="${(x + y) % 3 === 0 ? 5 : 2.5}" fill="${ink}" opacity=".75"/>`
      return `<g transform="scale(${s})"><circle cy="-2" r="10" fill="${accent}"/>${arcs}${dots}</g>`
    }
  }
}

function isLight(hex) {
  const n = parseInt(hex.slice(1), 16)
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
  return r * 0.299 + g * 0.587 + b * 0.114 > 150
}

export function mockup(design, view = 'front') {
  const { base, accent, motif: kind, type, name } = design
  const ink = isLight(base) ? '#0b0b0b' : '#efece6'
  const { path, hood } = shapes(type)
  const bgA = view === 'flat' ? accent : '#161616'
  const bgB = view === 'flat' ? shade(accent, -0.45) : '#070707'

  const defs = `
    <defs>
      <radialGradient id="bg" cx="50%" cy="38%" r="75%">
        <stop offset="0" stop-color="${bgA}"/><stop offset="1" stop-color="${bgB}"/>
      </radialGradient>
      <radialGradient id="glow" cx="50%" cy="45%" r="50%">
        <stop offset="0" stop-color="${accent}" stop-opacity=".28"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="fold" x1="0" x2="1">
        <stop offset="0" stop-color="#000" stop-opacity=".35"/>
        <stop offset=".22" stop-color="#fff" stop-opacity=".06"/>
        <stop offset=".5" stop-color="#000" stop-opacity=".05"/>
        <stop offset=".78" stop-color="#fff" stop-opacity=".05"/>
        <stop offset="1" stop-color="#000" stop-opacity=".4"/>
      </linearGradient>
      <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 .5 0 0 0 0 .5 0 0 0 0 .5 0 0 0 .22 0"/><feComposite in2="SourceGraphic" operator="in"/></filter>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="30" stdDeviation="30" flood-color="#000" flood-opacity=".6"/></filter>
    </defs>`

  const garment = (graphic) => `
    <g filter="url(#shadow)">
      ${hood ? `<path d="M300,165 Q300,70 400,60 Q500,70 500,165 Q400,230 300,165Z" fill="${shade(base, -0.12)}"/>` : ''}
      <path d="${path}" fill="${base}"/>
    </g>
    <path d="${path}" fill="url(#fold)"/>
    <path d="${path}" fill="${base}" filter="url(#grain)"/>
    <path d="M318,168 Q400,222 482,168" fill="none" stroke="${shade(base, isLight(base) ? -0.15 : 0.12)}" stroke-width="12" stroke-linecap="round"/>
    ${hood ? `<path d="M285,640 L515,640 L545,790 L255,790Z" fill="none" stroke="${shade(base, isLight(base) ? -0.12 : 0.1)}" stroke-width="3"/>` : ''}
    ${graphic}`

  let body
  if (view === 'front') {
    body = garment(`<g transform="translate(400,${hood ? 400 : 430})">${motif(kind, accent, ink, 0.9)}</g>`)
  } else if (view === 'back') {
    body = garment(`
      <g transform="translate(400,500)">${motif(kind, accent, ink, 1.35)}</g>
      <text x="400" y="290" text-anchor="middle" font-family="Archivo, sans-serif" font-weight="900" font-size="44" letter-spacing="10" fill="${ink}">EDGE</text>
      <text x="400" y="770" text-anchor="middle" font-family="monospace" font-size="16" letter-spacing="6" fill="${ink}" opacity=".7">${name.toUpperCase()} — 01</text>`)
  } else if (view === 'detail') {
    body = `<rect width="${W}" height="${H}" fill="${base}"/>
      <rect width="${W}" height="${H}" fill="${base}" filter="url(#grain)"/>
      <g transform="translate(400,500)">${motif(kind, accent, ink, 3.1)}</g>
      <rect width="${W}" height="${H}" fill="url(#fold)" opacity=".6"/>`
  } else {
    body = `<g transform="rotate(-9 400 500) translate(0,20)">${garment(`<g transform="translate(400,430)">${motif(kind, accent, ink, 0.9)}</g>`)}</g>`
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">${defs}
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    ${view === 'detail' ? '' : `<rect width="${W}" height="${H}" fill="url(#glow)"/>`}
    ${body}
    <text x="32" y="${H - 30}" font-family="monospace" font-size="14" letter-spacing="3" fill="${view === 'flat' ? '#000' : '#fff'}" opacity=".35">MOCKUP · ${view.toUpperCase()}</text>
  </svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

export function imagesFor(design) {
  if (design.images && design.images.length) return design.images
  return ['front', 'back', 'detail', 'flat'].map((v) => mockup(design, v))
}

export function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16)
  const f = (c) => Math.max(0, Math.min(255, Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt)))
  const r = f((n >> 16) & 255), g = f((n >> 8) & 255), b = f(n & 255)
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)
}
