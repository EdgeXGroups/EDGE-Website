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
Two pages:
- `/` — home: WebGL hero, the **spotlight** (newest design revealed in a beam of light as you scroll), 3 featured designs, why Edge, team, contact.
- `/collection.html` — the **archive**: every design, filterable by category, grid or index view.

Tapping any design opens its story (front/back gallery, story, details). Each story has its own link, e.g. `/#/drop/rising` or `/collection.html#/drop/quattro`.

## Editing content
Everything the site says lives in **`src/content.js`**: brand info and contact links, the designs, the manifesto, the pillars and the team.

- **Order / featured:** designs are listed newest first. Mark up to 3 with `featured: true` to show them on the home page (otherwise the first 3 are used). The first featured design stars in the spotlight.
- **Stories marked `// DRAFT`** are placeholders — rewrite them.

## Adding a new design
1. Drop the raw image(s) into `/design` — either one front+back side-by-side image, or separate front and back photos.
2. Register it at the top of `scripts/process-designs.py` (slug, file, layout, background type).
3. Run `python scripts/process-designs.py` (needs `pip install pillow numpy scipy`). It splits front/back, removes plain studio backgrounds and writes `public/designs/<slug>/front.webp` + `back.webp`.
4. Add the design to `src/content.js` with `images: ['/designs/<slug>/front.webp', '/designs/<slug>/back.webp']`.

Team photos: put them in `public/team/` and add `photo: '/team/name.jpg'`.
