"""Generate the Eurocrat logo: EUROCRAT in Jersey 10, pixel for pixel, on a transparent background.

The font is drawn on a grid of 75 font units per pixel (caps are 10 px tall), so the letters are rasterised exactly.
Look (same as the old CSS logo): white EURO + yellow CRAT, a 1 px navy outline, and a stepped navy extrusion
down-right. Outputs an SVG (one rect run per pixel row and colour; scales crisply to any size) and PNGs at 1x/4x/8x.

    python3 web-prototype/tools/make_logo.py            # writes art/logo/* and web-prototype/src/assets/logo.svg
"""
import pathlib
from fontTools.ttLib import TTFont
from fontTools.pens.recordingPen import RecordingPen
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[2]
FONT = ROOT / 'web-prototype/src/assets/fonts/jersey10.woff'
OUT = ROOT / 'art/logo'
GAME_SVG = ROOT / 'web-prototype/src/assets/logo.svg'

UNIT = 75             # font units per pixel in Jersey 10
TRACK = 1             # extra pixels between letters, so the outlines just meet
WHITE, YELLOW = '#ffffff', '#e6b400'   # CRAT: the game's secondary yellow (--yellow2)
NAVY, DEEP = '#0b1f4d', '#061232'
# extrusion, drawn back to front: (dx, dy, colour, alpha)
EXTRUDE = [(2, 3, DEEP, 0.45), (2, 2, DEEP, 1), (1, 2, DEEP, 1), (1, 1, NAVY, 1)]
PAD = 1               # transparent margin

def glyph_pixels(font, ch):
    gs, cmap = font.getGlyphSet(), font.getBestCmap()
    g = gs[cmap[ord(ch)]]; pen = RecordingPen(); g.draw(pen)
    contours, cur = [], []
    for op, args in pen.value:
        if op == 'moveTo': cur = [args[0]]
        elif op == 'lineTo': cur.append(args[0])
        elif op in ('closePath', 'endPath'): contours.append(cur); cur = []
        else: raise ValueError('curves are not expected in a pixel font: ' + op)
    def winding(x, y):
        w = 0
        for c in contours:
            for (x0, y0), (x1, y1) in zip(c, c[1:] + c[:1]):
                if y0 <= y < y1 and (x1 - x0) * (y - y0) - (x - x0) * (y1 - y0) > 0: w += 1
                elif y1 <= y < y0 and (x1 - x0) * (y - y0) - (x - x0) * (y1 - y0) < 0: w -= 1
        return w
    adv = round(g.width / UNIT); top = 750 // UNIT
    px = {(x, top - 1 - y) for x in range(adv) for y in range(-5, top + 2)
          if winding((x + 0.5) * UNIT, (y + 0.5) * UNIT) != 0}
    return px, adv

def build(word='EUROCRAT', split=4):
    font = TTFont(str(FONT))
    fill, x = {}, 0
    for i, ch in enumerate(word):
        px, adv = glyph_pixels(font, ch)
        for (gx, gy) in px: fill[(x + gx, gy)] = WHITE if i < split else YELLOW
        x += adv + TRACK
    outline = {(a + dx, b + dy) for (a, b) in fill for dx in (-1, 0, 1) for dy in (-1, 0, 1)} - set(fill)
    body = set(fill) | outline
    layers = {}
    for dx, dy, col, al in EXTRUDE:
        for (a, b) in body: layers[(a + dx, b + dy)] = (col, al)
    for p in outline: layers[p] = (NAVY, 1)
    for p, col in fill.items(): layers[p] = (col, 1)
    xs = [p[0] for p in layers]; ys = [p[1] for p in layers]
    ox, oy = min(xs) - PAD, min(ys) - PAD
    W, H = max(xs) - ox + 1 + PAD, max(ys) - oy + 1 + PAD
    return {(a - ox, b - oy): v for (a, b), v in layers.items()}, W, H

def to_svg(px, W, H):
    runs = {}
    for y in range(H):
        x = 0
        while x < W:
            v = px.get((x, y))
            if not v: x += 1; continue
            s = x
            while x < W and px.get((x, y)) == v: x += 1
            runs.setdefault(v, []).append(f'M{s} {y}h{x - s}v1h{s - x}z')
    paths = ''.join(f'<path fill="{c}"{"" if a == 1 else f" fill-opacity=\"{a}\""} d="{"".join(d)}"/>' for (c, a), d in runs.items())
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W * 8}" height="{H * 8}" '
            f'shape-rendering="crispEdges" role="img" aria-label="Eurocrat"><title>Eurocrat</title>{paths}</svg>\n')

def to_png(px, W, H, k):
    im = Image.new('RGBA', (W * k, H * k), (0, 0, 0, 0))
    for (x, y), (c, a) in px.items():
        rgba = tuple(int(c[i:i + 2], 16) for i in (1, 3, 5)) + (round(255 * a),)
        for j in range(k):
            for i in range(k): im.putpixel((x * k + i, y * k + j), rgba)
    return im

if __name__ == '__main__':
    px, W, H = build()
    OUT.mkdir(parents=True, exist_ok=True)
    svg = to_svg(px, W, H)
    (OUT / 'eurocrat-logo.svg').write_text(svg); GAME_SVG.write_text(svg)
    for k in (1, 4, 8): to_png(px, W, H, k).save(OUT / f'eurocrat-logo@{k}x.png')
    print(f'logo {W}x{H} px -> {OUT} and {GAME_SVG}')
