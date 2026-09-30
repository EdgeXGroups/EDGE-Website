/*
 * ─────────────────────────────────────────────────────────────
 *  EDGE — SITE CONTENT
 *  Everything the site says lives here. Edit this file only.
 * ─────────────────────────────────────────────────────────────
 *
 *  PHOTOS: drop images into /public/designs/<slug>/ and list them
 *  in `images` like '/designs/static-bloom/front.jpg'.
 *  While `images` is empty, the site draws a placeholder mockup
 *  so the layout never looks broken.
 *
 *  Portrait-ish photos (4:5) look best. ~1600px on the long side.
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
    slug: 'static-bloom',
    name: 'Static Bloom',
    type: 'Oversized Tee',
    tagline: 'Flowers growing out of TV noise.',
    accent: '#FF4A1C',
    base: '#111111',        // garment colour used by the placeholder mockup
    motif: 'bloom',         // placeholder graphic style: bloom | fault | orbit | signal
    story: [
      'It started with a broken television in a hostel corridor — the kind that only shows static. Someone had stuck a paper flower on the screen, and for a second it looked like it was growing out of the noise.',
      'Static Bloom is about that second. Beauty that shows up uninvited, in places that were never meant to hold it. The print is layered by hand: a grain field underneath, a single bloom punched through on top.',
      'Wear it loud. Or wear it under a jacket and let people find it.',
    ],
    details: [
      ['Fabric', '240 GSM combed cotton'],
      ['Fit', 'Oversized, dropped shoulder'],
      ['Print', 'Puff + screen, front & back'],
      ['Edition', 'Limited run'],
    ],
    images: [],
  },
  {
    slug: 'fault-line',
    name: 'Fault Line',
    type: 'Heavyweight Hoodie',
    tagline: 'Everything interesting happens where things crack.',
    accent: '#D8FF3C',
    base: '#1a1a1a',
    motif: 'fault',
    story: [
      'A fault line is where two things refuse to agree — and the ground gives way to something new. We think people work the same way.',
      'The graphic is a single fracture traced from a satellite map, running shoulder to hem. On the back, the coordinates of where it was drawn.',
      'Heavy, structured, built to be lived in for years.',
    ],
    details: [
      ['Fabric', '420 GSM brushed fleece'],
      ['Fit', 'Boxy, cropped hem'],
      ['Print', 'High-density screen print'],
      ['Edition', 'Limited run'],
    ],
    images: [],
  },
  {
    slug: 'low-orbit',
    name: 'Low Orbit',
    type: 'Boxy Tee',
    tagline: 'Close enough to see home. Far enough to miss it.',
    accent: '#7AA2FF',
    base: '#e9e6df',
    motif: 'orbit',
    story: [
      'Written at 3 a.m. on a night train, somewhere between leaving and arriving. Low Orbit is for the in-between — the people who are always a little bit away from where they started.',
      'A ring of type circles a small planet on the chest. Read it slowly: it is a letter nobody sent.',
    ],
    details: [
      ['Fabric', '220 GSM cotton jersey'],
      ['Fit', 'Boxy, regular length'],
      ['Print', 'Water-based screen print'],
      ['Edition', 'Limited run'],
    ],
    images: [],
  },
  {
    slug: 'night-signal',
    name: 'Night Signal',
    type: 'Long Sleeve',
    tagline: 'For the ones still awake.',
    accent: '#FF3D8B',
    base: '#0d0d0d',
    motif: 'signal',
    story: [
      'City lights look like a signal if you stare long enough. Night Signal is a love letter to everyone building something while the rest of the world sleeps.',
      'Reflective ink on the sleeves catches flash photography — so the shirt looks quiet in daylight and goes off at night.',
    ],
    details: [
      ['Fabric', '200 GSM cotton rib'],
      ['Fit', 'Relaxed, long sleeve'],
      ['Print', 'Reflective + screen'],
      ['Edition', 'Limited run'],
    ],
    images: [],
  },
]

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
