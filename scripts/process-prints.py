"""
Turns a Figma print export into the flat prints the 3D showroom wraps onto the tee.

  python scripts/process-prints.py

The Figma export is the print layer of a front+back mockup (same canvas
proportions as the mockup, artwork exactly where it sits on the shirts).
For each one, the matching mockup tells us where the two tees are; the
print is cut and framed the same way process-designs.py frames the mockup,
so prints and mockups line up 1:1. Output: public/prints/<slug>-front.webp
and -back.webp (2400 x 3000 — the mockup frame at 2x — transparent).

SVGs are rasterised with @resvg/resvg-js (npm dev dependency).
"""
import json, subprocess, tempfile
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'design'
OUT = ROOT / 'public' / 'prints'
SCALE = 2                 # prints are made at 2x the mockup frame for a sharp 3D texture
W, H = 1200 * SCALE, 1500 * SCALE

# slug: (print export, the mockup composite it was drawn over)
JOBS = {
    '70-kms': ('70kms aint enough.svg', 'Group 173.png'),
}


def rasterise(path, _width=None):
    if path.suffix.lower() != '.svg':
        return Image.open(path).convert('RGBA')
    out = Path(tempfile.mkdtemp()) / 'print.png'
    js = (
        "const {Resvg}=require('@resvg/resvg-js');const fs=require('fs');"
        f"const png=new Resvg(fs.readFileSync({json.dumps(str(path))}),{{fitTo:{{mode:'zoom',value:{SCALE}}},background:'rgba(0,0,0,0)'}}).render().asPng();"
        f"fs.writeFileSync({json.dumps(str(out))},png)"
    )
    subprocess.run(['node', '-e', js], check=True, cwd=ROOT)
    return Image.open(out).convert('RGBA')


def ink_box(img, x0, x1):
    """Bounding box of dark ink between x0 and x1."""
    import numpy as np
    a = np.asarray(img).astype(int)
    m = (a[..., 3] > 200) & (a[..., :3].sum(axis=2) < 330)
    m[:, :x0] = False; m[:, x1:] = False
    ys, xs = np.nonzero(m)
    return xs.min(), ys.min(), xs.max(), ys.max()


def place_on_mockup(mock, sheet):
    """Figma exports are usually cropped to the artwork. Find the scale and offset
    that put the print's ink exactly on the mockup's ink, using both shirts."""
    mh, ph = mock.width // 2, sheet.width // 2
    pairs = [(ink_box(mock, 0, mh), ink_box(sheet, 0, ph)), (ink_box(mock, mh, mock.width), ink_box(sheet, ph, sheet.width))]
    k = sum((m[2] - m[0]) / (p[2] - p[0]) for m, p in pairs) / 2
    dx = sum(m[0] - p[0] * k for m, p in pairs) / 2
    dy = sum(m[1] - p[1] * k for m, p in pairs) / 2
    print(f'  print scale {k:.3f}, offset ({dx:.0f}, {dy:.0f})')
    placed = Image.new('RGBA', mock.size, (0, 0, 0, 0))
    scaled = sheet.resize((round(sheet.width * k), round(sheet.height * k)), Image.LANCZOS)
    placed.alpha_composite(scaled, (round(dx), round(dy)))
    return placed


def frame(mock_half, print_half):
    """Crop both to the tee silhouette of the mockup, fit into 1200x1500 like the mockups."""
    bbox = mock_half.split()[3].point(lambda v: 255 if v > 12 else 0).getbbox()
    piece = print_half.crop(bbox)
    w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
    k = min(W * 0.9 / w, H * 0.9 / h)
    piece = piece.resize((round(w * k), round(h * k)), Image.LANCZOS)
    canvas = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    canvas.alpha_composite(piece, ((W - piece.width) // 2, (H - piece.height) // 2))
    return canvas


OUT.mkdir(parents=True, exist_ok=True)
for slug, (print_file, mock_file) in JOBS.items():
    mock = Image.open(SRC / mock_file).convert('RGBA')
    mock = mock.resize((mock.width * SCALE, mock.height * SCALE), Image.LANCZOS)
    sheet = place_on_mockup(mock, rasterise(SRC / print_file, None))
    half = mock.width // 2
    for view, box in (('front', (0, 0, half, mock.height)), ('back', (half, 0, mock.width, mock.height))):
        img = frame(mock.crop(box), sheet.crop(box))
        dest = OUT / f'{slug}-{view}.webp'
        img.save(dest, 'WEBP', quality=90, method=6)
        print(dest.relative_to(ROOT), dest.stat().st_size // 1024, 'KB')
