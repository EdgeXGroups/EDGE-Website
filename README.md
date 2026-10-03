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

## Admin — editing the site (`/admin`)
Designs, the showroom, contact details and the team are edited at **yoursite.com/admin**. Saving publishes immediately — no rebuild.

- **Designs:** add (upload the front+back mockup; the Figma print export is optional and powers the 3D tee), edit text/colours, reorder, delete.
  Images are processed in the browser: the mockup is split, plain backgrounds removed, the print lined up automatically.
- **Price & availability** (per design): price, original price/MRP (shown struck through with the % off), sizes in stock, availability (in stock / few left / sold out / coming soon) and badges (Bestseller, New, Limited). These drive the Collection page's sort and filters and the size picker on each story. Each design can point at a **size chart** by name.
- **Size charts:** one per blank/manufacturer (sizes × measurements, inches or cm, plus a note). Designs reference them by name; renaming a chart updates its designs.
- Needs `supabase/migrations/0004_shop.sql` and `0005_size_charts.sql` run once. `supabase/seed/shop_starter.sql` fills in starter prices, a few discounts, sizes, badges and two placeholder size charts.
- **Showroom:** pick the three designs on the glass (slot 1 starts in the light).
- **Contact:** Instagram, email, phone, WhatsApp, location, tagline, drop name.
- **Team:** names, roles, lines, photos.

### Where the data lives — Supabase
Project `vpjntbsednknihxgntje` (account edgexgroups@gmail.com). Tables `designs`, `settings`, `team`, `admins`; images in the public storage bucket `media`. Row-level security: anyone can read the site's content, only users listed in `admins` can change anything.
The public site reads everything with one call to the `site_content()` function (`src/content.js`, plain fetch) and falls back to the built-in defaults in `src/content.defaults.js` if Supabase is unreachable or empty. The project URL and publishable key are in `src/supabase.config.js` — they're public by design. **Never** put the secret / service_role key in the front-end.

### One-time setup
1. **Create the tables:** Supabase → SQL Editor → New query → paste `supabase/migrations/0001_site_content.sql` → Run.
2. **Create the admin login:** Authentication → Users → Add user → Create new user (email + password, tick *Auto Confirm User*).
3. **Make it an admin:** SQL Editor → run `supabase/migrations/0002_make_admin.sql` (edit the email in it first if needed).
4. **Lock sign-ups:** Authentication → Sign In / Providers → turn off *Allow new users to sign up* (only admins you add by hand should exist).
5. **Password-reset links:** Authentication → URL Configuration → set *Site URL* to the live site and add `https://<your-site>/admin` (and `http://localhost:5173/admin` for local testing) to *Redirect URLs*.
6. Open `/admin`, sign in, press **Copy into Supabase** to move the 8 built-in designs into the database.

To add another admin later: create the user (step 2) and run 0002 with their email.

## Adding a new design without the admin
The admin is the normal way. The scripts below do the same processing offline and write the files into the repo (then add the design to `src/content.defaults.js`):
1. Drop the raw image(s) into `/design`, register them in `scripts/process-designs.py`, run `python scripts/process-designs.py` (needs `pip install pillow numpy scipy`).
2. For the 3D print: register the Figma print export in `scripts/process-prints.py` and run it.

## 3D showroom
The home page showroom renders the featured tees in 3D on `public/models/tee.glb`.

- **The tee model** comes from `design/fish_t-shirt.glb` — "fish t-shirt" by Gleb Gubkin ([Sketchfab](https://sketchfab.com/3d-models/fish-t-shirt-b2bf0e93920f42618fb0255e137a61c9)), **CC BY 4.0**. The licence requires the credit that's in the footer — keep it. `3d/build_from_glb.py` merges, decimates (≈120k tris), rescales, re-UVs, makes it white and Draco-compresses it (~0.9 MB):
  `"C:/Program Files/Blender Foundation/Blender 5.2/blender.exe" -b --factory-startup --python 3d/build_from_glb.py -- --preview 3d/preview`
  The source GLB (30 MB) is git-ignored; keep a copy of it to rebuild.
- **Prints from Figma:** export the *print layer* of a design's front+back mockup as SVG or PNG (same layout as the mockup image — Figma may crop it to the artwork, that's fine), put it in `/design`, add a line to `JOBS` in `scripts/process-prints.py` (`slug: (print file, mockup file)`) and run `python scripts/process-prints.py`. It lines the print up with the mockup automatically and writes `public/prints/<slug>-front.webp` / `-back.webp`. Then add `prints: { front: …, back: … }` to the design in `src/content.js`.
- Designs without `prints` wrap their mockup photos onto the tee instead. Designs with `model: 'card'` (the zip jacket) show as a two-sided photo.
- `3d/build_tee.py` is an older fully-generated tee (no licence attached) kept as a fallback; it writes `tee-simple.glb` and isn't used by the site.
