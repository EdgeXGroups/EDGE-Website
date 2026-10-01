# EDGE — website

```
npm install
npm run dev      # local preview (also on your phone via the Network URL)
npm run build    # production build → dist/  (deploy to Vercel / Netlify / any static host)
```

## Deploying to Netlify
Settings live in `netlify.toml` (build `npm run build`, publish `dist`, Node 22), so nothing needs configuring in the dashboard.

- **From GitHub (recommended):** push this repo, then Netlify → *Add new site → Import an existing project* → pick the repo → *Deploy*. Every push to `main` redeploys.
- **Drag & drop:** run `npm run build` and drop the `dist` folder onto app.netlify.com/drop.

## Pages
- `/` — home: WebGL hero, then the **showroom**: the 3 featured designs on a glass rim, one lit in a beam of light. Tap a side piece / swipe / arrows to swap; scrolling turns the lit piece front → back. Then a link to the full collection and what makes Edge different.
- `/collection.html` — the **collection**: every design, filterable by category, grid or index view.
- `/team.html` — the team, plus "how we work".
- `/contact.html` — contact form (opens the visitor's email app) and direct links. `?design=<slug>` pre-selects a design; the story pages' "Ask about this piece" button uses this.

The nav, menu and footer for all pages are built in `src/chrome.js` — edit links there once.

Tapping any design opens its story (front/back gallery, story, details). Each story has its own link, e.g. `/#/drop/rising` or `/collection.html#/drop/quattro`.

## Editing content
Everything the site says lives in **`src/content.js`**: brand info and contact links, the designs, the manifesto, the pillars and the team.

- **Order / featured:** designs are listed newest first. Mark up to 3 with `featured: true` to show them on the home page (otherwise the first 3 are used). The first featured design stars in the spotlight.
- **Stories marked `// DRAFT`** (and the team page's "how we work" list) are placeholders — rewrite them.

## Adding a new design
1. Drop the raw image(s) into `/design` — either one front+back side-by-side image, or separate front and back photos.
2. Register it at the top of `scripts/process-designs.py` (slug, file, layout, background type).
3. Run `python scripts/process-designs.py` (needs `pip install pillow numpy scipy`). It splits front/back, removes plain studio backgrounds and writes `public/designs/<slug>/front.webp` + `back.webp`.
4. Add the design to `src/content.js` with `images: ['/designs/<slug>/front.webp', '/designs/<slug>/back.webp']`.

Team photos: put them in `public/team/` and add `photo: '/team/name.jpg'`.

## 3D showroom
The home page showroom renders the featured tees in 3D on `public/models/tee.glb`.

- **The tee model** comes from `design/fish_t-shirt.glb` — "fish t-shirt" by Gleb Gubkin ([Sketchfab](https://sketchfab.com/3d-models/fish-t-shirt-b2bf0e93920f42618fb0255e137a61c9)), **CC BY 4.0**. The licence requires the credit that's in the footer — keep it. `3d/build_from_glb.py` merges, decimates (≈120k tris), rescales, re-UVs, makes it white and Draco-compresses it (~0.9 MB):
  `"C:/Program Files/Blender Foundation/Blender 5.2/blender.exe" -b --factory-startup --python 3d/build_from_glb.py -- --preview 3d/preview`
  The source GLB (30 MB) is git-ignored; keep a copy of it to rebuild.
- **Prints from Figma:** export the *print layer* of a design's front+back mockup as SVG or PNG (same layout as the mockup image — Figma may crop it to the artwork, that's fine), put it in `/design`, add a line to `JOBS` in `scripts/process-prints.py` (`slug: (print file, mockup file)`) and run `python scripts/process-prints.py`. It lines the print up with the mockup automatically and writes `public/prints/<slug>-front.webp` / `-back.webp`. Then add `prints: { front: …, back: … }` to the design in `src/content.js`.
- Designs without `prints` wrap their mockup photos onto the tee instead. Designs with `model: 'card'` (the zip jacket) show as a two-sided photo.
- `3d/build_tee.py` is an older fully-generated tee (no licence attached) kept as a fallback; it writes `tee-simple.glb` and isn't used by the site.
