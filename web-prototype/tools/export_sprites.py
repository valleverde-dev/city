"""Export every map sprite of the web prototype to a PNG sheet + JSON atlas.

The sprites are generated in code (src/render/: pixel.js, ground.js, sprites.js);
this dumps them to files so they can be reviewed and reused in the Godot port.

Usage:    python3 web-prototype/tools/export_sprites.py [out_dir]   (default: art/sprites)
Requires: pip install playwright pillow && python3 -m playwright install chromium
Writes:   eurocrat_sprites.png (1x, 64x112 cells), eurocrat_sprites_x4.png (preview), eurocrat_sprites.json
"""
import base64
import io
import json
import pathlib
import sys

from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]
out = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT.parent / "art" / "sprites"
out.mkdir(parents=True, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    page.route("**/fonts.g*/**", lambda r: r.abort())
    page.goto((ROOT / "dist" / "index.html").resolve().as_uri())   # run `npm run build` first
    sheet = page.evaluate("window.__eurocrat.spriteSheet()")
    browser.close()

img = Image.open(io.BytesIO(base64.b64decode(sheet["png"].split(",", 1)[1])))
img.save(out / "eurocrat_sprites.png")
img.resize((img.width * 4, img.height * 4), Image.NEAREST).save(out / "eurocrat_sprites_x4.png")
meta = {"tile": {"w": 64, "h": 32}, "note": "ox/oy = pixel of the sprite that sits on the tile centre", "sprites": sheet["atlas"]}
(out / "eurocrat_sprites.json").write_text(json.dumps(meta, indent=1))
print(f"{len(sheet['atlas'])} sprites -> {out}")
