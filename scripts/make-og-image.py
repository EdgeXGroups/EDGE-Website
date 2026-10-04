"""Builds public/brand/og.jpg — the 1200x630 image WhatsApp, Instagram DMs, Twitter/X,
Discord, iMessage and Google show when someone shares the site.
Run again after changing the featured designs:  python scripts/make-og-image.py
(needs: pip install pillow)
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
W, H = 1200, 630
INK, BONE, ACCENT = (7, 7, 7), (237, 234, 227), (255, 74, 28)
DESIGNS = ['rising', 'never-retreat', '70-kms']  # left → right, the middle one in front


def font(names, size):
    for n in names:
        for base in (Path('C:/Windows/Fonts'), Path('/usr/share/fonts/truetype/dejavu')):
            p = base / n
            if p.exists():
                return ImageFont.truetype(str(p), size)
    return ImageFont.load_default()


img = Image.new('RGB', (W, H), INK)

# a soft spotlight behind the pieces, like the showroom
glow = Image.new('L', (W, H), 0)
ImageDraw.Draw(glow).ellipse((560, -120, 1260, 760), fill=120)
glow = glow.filter(ImageFilter.GaussianBlur(120))
img = Image.composite(Image.new('RGB', (W, H), (70, 84, 120)), img, glow)

# the three featured pieces, fanned
def piece(slug, h):
    p = Image.open(ROOT / 'public' / 'designs' / slug / 'front.webp').convert('RGBA')
    bbox = p.getchannel('A').getbbox()
    if bbox:
        p = p.crop(bbox)
    return p.resize((round(p.width * h / p.height), h), Image.LANCZOS)

spots = [(640, 150, 360, -7), (920, 120, 400, 6), (770, 110, 450, 0)]  # x-centre, top, height, tilt — back to front
order = [DESIGNS[0], DESIGNS[2], DESIGNS[1]]
for slug, (cx, top, h, tilt) in zip(order, spots):
    p = piece(slug, h).rotate(tilt, resample=Image.BICUBIC, expand=True)
    shadow = Image.new('RGBA', p.size, (0, 0, 0, 0))
    shadow.putalpha(p.getchannel('A').point(lambda a: a * 0.55))
    shadow = shadow.filter(ImageFilter.GaussianBlur(18))
    img.paste(shadow, (cx - p.width // 2 + 10, top + 24), shadow)
    img.paste(p, (cx - p.width // 2, top), p)

# wordmark, left
mark = Image.open(ROOT / 'public' / 'brand' / 'edge-wordmark.png').convert('RGBA')
mw = 470
mark = mark.resize((mw, round(mark.height * mw / mark.width)), Image.LANCZOS)
img.paste(mark, (64, 150), mark)

d = ImageDraw.Draw(img)
serif = font(['georgiai.ttf', 'DejaVuSerif-Italic.ttf'], 44)
mono = font(['consolab.ttf', 'DejaVuSansMono-Bold.ttf'], 20)
d.text((66, 360), 'Built for the ones who', font=serif, fill=BONE)
d.text((66, 412), 'live near the edge.', font=serif, fill=BONE)

# accent strip
d.rectangle((0, H - 64, W, H), fill=ACCENT)
d.text((64, H - 44), 'DROP 01  ·  EVERY PIECE HAS A STORY', font=mono, fill=INK)
url = 'EDGEXGROUP.NETLIFY.APP'
d.text((W - 64 - d.textlength(url, font=mono), H - 44), url, font=mono, fill=INK)

out = ROOT / 'public' / 'brand' / 'og.jpg'
img.save(out, 'JPEG', quality=86, optimize=True, progressive=True)
print(f'wrote {out} ({out.stat().st_size // 1024} KB)')
