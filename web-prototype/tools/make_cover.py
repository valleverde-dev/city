"""Generate the Eurocrat cover image for itch.io (630x500, plus a 1260x1000 copy for high-density screens).

The cover is built from the game itself, so it always matches the title screen:
  1. open the built game (dist/index.html) in headless Chromium at 1260x1000;
  2. grab one frame of the town diorama canvas, and a screenshot of the sky, clouds and the avenue of
     Union flags with the menu, logo, diorama and footer hidden;
  3. composite the pixel-art logo (art/logo/eurocrat-logo@1x.png, x11) and the diorama (x2) on top,
     with nearest-neighbour scaling so every art pixel stays crisp.
No menu, version, copyright or tagline on the cover.
The diorama is generated afresh on every load, so each run gives a slightly different town: keep the one you like.

    cd web-prototype && npm run build
    python3 web-prototype/tools/make_cover.py     # writes art/cover/eurocrat-cover-{1260x1000,630x500}.png
"""
import io
import base64
import pathlib
from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[2]
GAME = ROOT / 'web-prototype/dist/index.html'
LOGO = ROOT / 'art/logo/eurocrat-logo@1x.png'
OUT = ROOT / 'art/cover'

W, H = 1260, 1000          # 2x the itch.io cover size (630x500)
LOGO_SCALE, LOGO_TOP = 11, 95
DIO_SCALE, DIO_BOTTOM = 2, 75


def capture():
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        page = browser.new_page(viewport={'width': W, 'height': H})
        page.goto(GAME.as_uri())
        page.wait_for_timeout(3000)  # let the title screen draw its animated layers
        data = page.evaluate("document.querySelector('.cv-dio canvas').toDataURL('image/png')")
        page.add_style_tag(content='.cv-menu,.cv-foot,.cv-logo,.cv-dio{visibility:hidden!important}')
        page.wait_for_timeout(500)
        bg = page.screenshot()
        browser.close()
    dio = Image.open(io.BytesIO(base64.b64decode(data.split(',', 1)[1])))
    return Image.open(io.BytesIO(bg)), dio


def main():
    if not GAME.exists():
        raise SystemExit(f'{GAME} not found: run `npm run build` in web-prototype first')
    bg, dio = capture()
    cover = bg.convert('RGBA')
    logo = Image.open(LOGO).convert('RGBA')
    logo = logo.resize((logo.width * LOGO_SCALE, logo.height * LOGO_SCALE), Image.NEAREST)
    dio = dio.convert('RGBA')
    dio = dio.resize((dio.width * DIO_SCALE, dio.height * DIO_SCALE), Image.NEAREST)
    cover.alpha_composite(logo, ((W - logo.width) // 2, LOGO_TOP))
    cover.alpha_composite(dio, ((W - dio.width) // 2, H - dio.height - DIO_BOTTOM))
    cover = cover.convert('RGB')
    OUT.mkdir(parents=True, exist_ok=True)
    cover.save(OUT / f'eurocrat-cover-{W}x{H}.png', optimize=True)
    cover.resize((W // 2, H // 2), Image.LANCZOS).save(OUT / f'eurocrat-cover-{W // 2}x{H // 2}.png', optimize=True)
    print('wrote', *sorted(p.name for p in OUT.glob('*.png')))


if __name__ == '__main__':
    main()
