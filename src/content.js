/*
 * ─────────────────────────────────────────────────────────────
 *  EDGE — SITE CONTENT
 *  Everything the site says lives here. Edit this file only.
 * ─────────────────────────────────────────────────────────────
 *
 *  DESIGNS are listed newest first. The home page shows the ones
 *  marked `featured: true` (max 3) — or the first 3 if none are
 *  marked. The first featured design also stars in the spotlight
 *  scene. Every design is listed on the Archive page.
 *
 *  PHOTOS: put raw files in /design, register them in
 *  scripts/process-designs.py and run:
 *      python scripts/process-designs.py
 *  That writes /public/designs/<slug>/front.webp + back.webp.
 *  A design with no `images` gets a drawn placeholder mockup.
 *
 *  Stories marked DRAFT are placeholders — rewrite them in your
 *  own words.
 */

export const brand = {
  name: 'EDGE',
  drop: 'Drop 01',
  dropDate: 'Autumn 2026',
  tagline: 'Built for the ones who live near the edge.',
  email: 'hello@edge.studio',          // ← replace
  instagram: 'edge.studio',            // ← handle without @
  whatsapp: '',                        // ← e.g. '919999999999' (country code, no +). Empty = hidden
  city: 'India',
}

export const designs = [
  {
    slug: 'rising',
    name: 'Rising',
    type: 'Fleece Zip Jacket',
    category: 'Originals',
    featured: true,
    tagline: 'Out of the fire, louder than before.',
    accent: '#E4572E',
    story: [ // DRAFT
      'Made for Rajendra Prasad Hall of Residence. A phoenix was the obvious idea — so we spent weeks trying to make it anything but obvious.',
      'On the back, the bird tears through RISING in hand-cut letters, a red sun behind it and a volcanic peak below. On the front, just the crest, small over the heart — so you know before anyone else does.',
    ],
    details: [['Garment', 'Fleece zip-up, stand collar'], ['Colour', 'Oat'], ['Print', 'Crest front, full back'], ['Edition', 'Limited run']],
    images: ['/designs/rising/front.webp', '/designs/rising/back.webp'],
  },
  {
    slug: 'never-retreat',
    name: 'Never Retreat',
    type: 'Oversized Tee',
    category: 'Anime',
    featured: true,
    tagline: 'Nothing happened.',
    accent: '#9BB38A',
    story: [ // DRAFT
      'The sword runs down the front like a spine, and next to it four characters: 永不退縮 — never retreat, never shrink back.',
      'The back is half shadow, half swordsman. One eye closed. Printed tone-on-tone on sage, so it only really hits when the light catches it.',
    ],
    details: [['Fit', 'Oversized'], ['Colour', 'Sage'], ['Print', 'Front & back'], ['Edition', 'Limited run']],
    images: ['/designs/never-retreat/front.webp', '/designs/never-retreat/back.webp'],
  },
  {
    slug: '70-kms',
    name: '70 KMs Ain’t Enough',
    type: 'Oversized Tee',
    category: 'Originals',
    featured: true,
    tagline: 'For the one who walks toward the mountains anyway.',
    accent: '#7FA3D1',
    story: [ // DRAFT
      'There’s a famous clip of a single penguin leaving the colony and walking toward the mountains — seventy kilometres inland, towards nothing. Everyone calls it lost. We think it had somewhere to be.',
      'On the front, just the penguin and its footprints, walking off toward the hem. On the back, the road it takes — ink-brush strokes stretching toward the peaks.',
    ],
    details: [['Fit', 'Oversized'], ['Colour', 'White'], ['Print', 'Front & back'], ['Edition', 'Limited run']],
    images: ['/designs/70-kms/front.webp', '/designs/70-kms/back.webp'],
  },
  {
    slug: 'dragon-drift',
    name: 'Dragon Drift',
    type: 'Oversized Tee',
    category: 'Motorsport',
    tagline: 'Tyre smoke with a pulse.',
    accent: '#D7263D',
    story: [ // DRAFT
      'A love letter to JDM night runs. Clean badge on the chest, and on the back a dragon rising out of the tyre smoke, coiling around a car mid-slide.',
      'Drawn in heavy ink and finished with bold kanji — the whole back reads like a poster peeled off a garage wall.',
    ],
    details: [['Fit', 'Oversized'], ['Colour', 'Cream'], ['Print', 'Front & back'], ['Edition', 'Limited run']],
    images: ['/designs/dragon-drift/front.webp', '/designs/dragon-drift/back.webp'],
  },
  {
    slug: 'saiyan-at-rest',
    name: 'Saiyan at Rest',
    type: 'Oversized Tee',
    category: 'Anime',
    tagline: 'Even the strongest sit down sometimes.',
    accent: '#F28C28',
    story: [ // DRAFT
      'Across the chest: a single manga panel of eyes that have already decided. On the back: the same fighter, sitting in the rubble, catching his breath.',
      'Laid out like a page from a manga volume — panels, credits, tiny type — because that’s how most of us first met him.',
    ],
    details: [['Fit', 'Oversized'], ['Colour', 'White'], ['Print', 'Front & back'], ['Edition', 'Limited run']],
    images: ['/designs/saiyan-at-rest/front.webp', '/designs/saiyan-at-rest/back.webp'],
  },
  {
    slug: 'wanna-be-yours',
    name: 'I Wanna Be Yours',
    type: 'Oversized Tee',
    category: 'Music',
    tagline: 'Secrets I have held in my heart.',
    accent: '#E8C39E',
    story: [ // DRAFT
      'The song everyone has sent to someone at 2 a.m. On the front, the title and its soundwave, quiet. On the back, a silhouette made entirely out of the lyrics.',
      'For the ones who say it with a playlist instead of out loud.',
    ],
    details: [['Fit', 'Oversized'], ['Colour', 'Black'], ['Print', 'Front & back'], ['Edition', 'Limited run']],
    images: ['/designs/wanna-be-yours/front.webp', '/designs/wanna-be-yours/back.webp'],
  },
  {
    slug: 'inner-peace',
    name: 'Inner Peace',
    type: 'Oversized Tee',
    category: 'Anime',
    tagline: 'Big face up front. Kung fu in the back.',
    accent: '#8CC084',
    story: [ // DRAFT
      'The front is pure joke — a giant, slightly unimpressed face that fills the whole chest. The back is the opposite: a dragon and a warrior, drawn in one calm brushstroke.',
      'Wear it to be funny. Get asked about the back.',
    ],
    details: [['Fit', 'Oversized'], ['Colour', 'White'], ['Print', 'Front & back'], ['Edition', 'Limited run']],
    images: ['/designs/inner-peace/front.webp', '/designs/inner-peace/back.webp'],
  },
  {
    slug: 'quattro',
    name: 'Quattro',
    type: 'Oversized Tee',
    category: 'Motorsport',
    tagline: 'Snow, gravel, four wheels, no fear.',
    accent: '#E9C46A',
    story: [ // DRAFT
      'The car that changed rallying, flying off the chest on puppet strings. On the back, a full editorial spread — the legend, the specs, the car sliding through snow.',
      'Printed in a single ink on butter-yellow, like a page from an old motorsport annual.',
    ],
    details: [['Fit', 'Oversized'], ['Colour', 'Butter'], ['Print', 'Front & back'], ['Edition', 'Limited run']],
    images: ['/designs/quattro/front.webp', '/designs/quattro/back.webp'],
  },
]

export const featured = (() => {
  const picked = designs.filter((d) => d.featured).slice(0, 3)
  return picked.length ? picked : designs.slice(0, 3)
})()

// Wrap a word in *asterisks* to set it in the italic accent serif.
export const manifesto =
  'We don’t make basics. Every piece starts as a *story,* gets argued over, redrawn, and only ships when it *means* something. Small runs. *Real* stories. No filler.'

export const pillars = [
  {
    title: 'Story first',
    body: 'Every design begins as a written story — a moment, a place, a feeling. The graphic comes second. You can read every one of them on this site.',
  },
  {
    title: 'Small drops',
    body: 'We print in limited runs. When a design is gone, it’s gone. No endless restocks, no warehouses of unsold stock.',
  },
  {
    title: 'Built heavy',
    body: 'Heavyweight cotton, dense prints, reinforced seams. Clothes meant to survive years of being your favourite.',
  },
  {
    title: 'Made by us',
    body: 'A small team that designs, tests and packs everything themselves. When you message us, you’re talking to the people who made it.',
  },
]

export const team = [
  // Add `photo: '/team/name.jpg'` to show a real portrait.
  { name: 'Founder Name', role: 'Founder & Creative Direction', line: 'Turns 3 a.m. thoughts into prints.' },
  { name: 'Team Member', role: 'Design', line: 'Draws everything twice. Keeps the second one.' },
  { name: 'Team Member', role: 'Production', line: 'Knows every GSM by touch.' },
  { name: 'Team Member', role: 'Photography', line: 'Shoots at golden hour or not at all.' },
]
