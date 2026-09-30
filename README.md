# EDGE — website

```
npm install
npm run dev      # local preview (also on your phone via the Network URL)
npm run build    # production build → dist/  (deploy to Vercel / Netlify / any static host)
```

## Editing content
Everything the site says lives in **`src/content.js`**: brand info and contact links, the designs (name, story, specs, accent colour), the manifesto, the pillars and the team.

- **Design photos:** put them in `public/designs/<slug>/` and list them in that design's `images`, e.g. `'/designs/static-bloom/front.jpg'`. The first image is the card cover. Until you add photos, the site draws placeholder mockups.
- **Team photos:** put them in `public/team/` and add `photo: '/team/name.jpg'`.
- **Linking to one design:** `yoursite.com/#/drop/static-bloom`
