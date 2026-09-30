"""
Turns the raw files in /design into web-ready images in /public/designs/<slug>/.

  python scripts/process-designs.py

- Front+back composites are split down the middle.
- Solid black / light-grey studio backgrounds are removed (flood fill from the
  edges only, so black ink *inside* a print is kept).
- Everything is centred on a transparent 4:5 canvas and saved as WebP.
"""
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'design'
OUT = ROOT / 'public' / 'designs'
W, H = 1200, 1500  # 4:5

# slug: (source file, layout, background)
#   layout  'split' = front | back side by side, 'single' = one view
#   bg      'alpha' = already transparent, 'dark' = black studio, 'light' = light-grey studio
JOBS = {
    'rising':           [('RP Merch Front.jpeg', 'single', 'light', 'front'),
                         ('RP Merch Back.jpeg', 'single', 'light', 'back')],
    'never-retreat':    [('WhatsApp Image 2026-09-30 at 10.00.43 PM.jpeg', 'split', 'dark', None)],
    '70-kms':           [('Group 173.png', 'split', 'alpha', None)],
    'dragon-drift':     [('Group 107.png', 'split', 'alpha', None)],
    'saiyan-at-rest':   [('Group 120.png', 'split', 'alpha', None)],
    'wanna-be-yours':   [('t-am-0-01.png', 'split', 'alpha', None)],
    'inner-peace':      [('t-kp-0-01.png', 'split', 'alpha', None)],
    'quattro':          [('WhatsApp Image 2026-09-30 at 9.59.08 PM.jpeg', 'split', 'dark', None)],
}


def remove_bg(img, mode):
    a = np.asarray(img.convert('RGB')).astype(np.int16)
    lum = a.mean(axis=2)
    sat = a.max(axis=2) - a.min(axis=2)
    if mode == 'dark':
        cand = lum < 22
    else:
        cand = (lum > 150) & (sat < 16)
    labels, _ = ndimage.label(cand)
    edge = np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]]))
    edge = edge[edge != 0]
    bg = np.isin(labels, edge)
    # keep only the garment itself: drop stray specks left around the frame
    fg, n = ndimage.label(~bg)
    if n > 1:
        sizes = ndimage.sum(np.ones_like(fg), fg, range(1, n + 1))
        bg |= fg != (1 + int(np.argmax(sizes)))
    # soften the cut edge a touch
    alpha = (~bg).astype(np.float32)
    alpha = ndimage.gaussian_filter(alpha, 0.8)
    out = img.convert('RGBA')
    out.putalpha(Image.fromarray((alpha * 255).clip(0, 255).astype(np.uint8)))
    return out


def fit(img):
    bbox = img.split()[3].point(lambda v: 255 if v > 12 else 0).getbbox()
    img = img.crop(bbox)
    scale = min(W * 0.9 / img.width, H * 0.9 / img.height)
    img = img.resize((round(img.width * scale), round(img.height * scale)), Image.LANCZOS)
    canvas = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    canvas.alpha_composite(img, ((W - img.width) // 2, (H - img.height) // 2))
    return canvas


for slug, jobs in JOBS.items():
    (OUT / slug).mkdir(parents=True, exist_ok=True)
    for file, layout, bg, name in jobs:
        img = Image.open(SRC / file).convert('RGBA')
        parts = [(name, img)] if layout == 'single' else [
            ('front', img.crop((0, 0, img.width // 2, img.height))),
            ('back', img.crop((img.width // 2, 0, img.width, img.height))),
        ]
        for view, part in parts:
            if bg != 'alpha':
                part = remove_bg(part, bg)
            dest = OUT / slug / f'{view}.webp'
            fit(part).save(dest, 'WEBP', quality=84, method=6)
            print(dest.relative_to(ROOT), dest.stat().st_size // 1024, 'KB')
