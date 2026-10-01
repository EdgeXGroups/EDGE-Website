"""
Draws the Figma print templates for the 3D tee.

  python 3d/make_templates.py

Writes 3d/templates/tee-front-template.png and tee-back-template.png
(3000 x 3000 px = the 1 m x 1 m print square the 3D model uses).

In Figma: make a 3000 x 3000 frame, drop the template in as the bottom
layer, place the artwork where it should sit on the shirt, hide the
template, and export the frame as PNG (transparent background).
"""
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).parent
S = 3000
sides = json.loads((HERE / 'tee_uv.json').read_text())
(HERE / 'templates').mkdir(exist_ok=True)

try:
    font = ImageFont.truetype('arial.ttf', 46)
    small = ImageFont.truetype('arial.ttf', 34)
except OSError:
    font = small = ImageFont.load_default()

for side, polys in sides.items():
    off = 0.0 if side == 'front' else 0.5
    img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    to_px = lambda uv: ((uv[0] - off) / 0.5 * S, (1 - uv[1]) * S)
    for p in polys:
        d.polygon([to_px(uv) for uv in p], fill=(232, 230, 224, 255))
    # outline: redraw slightly darker edges by eroding
    mask = img.split()[3]
    edge = mask.filter(__import__('PIL.ImageFilter', fromlist=['ImageFilter']).FIND_EDGES)
    outline = Image.new('RGBA', (S, S), (90, 90, 90, 255))
    img.paste(outline, (0, 0), edge)
    # guides: centre line, 10 cm grid ticks
    for i in range(1, 10):
        x = S * i / 10
        d.line([(x, 0), (x, 40)], fill=(255, 74, 28, 200), width=4)
        d.line([(0, x), (40, x)], fill=(255, 74, 28, 200), width=4)
    d.line([(S / 2, 0), (S / 2, S)], fill=(255, 74, 28, 120), width=3)
    d.text((70, 60), f'EDGE oversized tee — {side.upper()} print template', fill=(255, 74, 28, 255), font=font)
    d.text((70, 120), '3000 × 3000 px = 1 m × 1 m. Ticks every 10 cm. Hide this layer before exporting.', fill=(255, 74, 28, 255), font=small)
    if side == 'back':
        d.text((70, 170), 'Seen from behind — draw it the way it should read when someone looks at the back.', fill=(255, 74, 28, 255), font=small)
    img.save(HERE / 'templates' / f'tee-{side}-template.png')
    print('wrote', side)
