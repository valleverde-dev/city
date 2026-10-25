"""Smoke test for the web prototype.

Usage:    python3 web-prototype/tests/smoke_test.py [path/to/index.html]
Requires: pip install playwright && python3 -m playwright install chromium
"""
import pathlib
import sys

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]
target = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "src" / "index.html"
URL = target.resolve().as_uri()

failures = []


def check(cond, msg):
    print(("  OK   " if cond else "  FAIL ") + msg)
    if not cond:
        failures.append(msg)


with sync_playwright() as p:
    browser = p.chromium.launch()
    # Landscape iPad viewport with touch events
    page = browser.new_page(viewport={"width": 1180, "height": 820}, has_touch=True)
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    # Ignore load failures for external fonts, which we block on purpose
    page.on("console", lambda m: m.type == "error" and "Failed to load resource" not in m.text and errors.append(m.text))
    # External fonts are not needed to test the game logic
    page.route("**/fonts.googleapis.com/**", lambda r: r.abort())
    page.route("**/fonts.gstatic.com/**", lambda r: r.abort())

    print(f"Loading {URL}")
    page.goto(URL)
    page.evaluate("localStorage.clear()")
    page.reload()

    check(page.locator(".tile").count() == 100, "10x10 tile grid")
    check(page.locator(".tool").count() == 5, "5 tools in the toolbar")
    check(page.is_visible("#btnPlay"), "start screen visible")

    page.click("#btnPlay")
    check(page.locator("#menu.hidden").count() == 1, "Play hides the menu")
    coin0 = int(page.inner_text("#coin"))
    check(coin0 == 20, f"starting coins = 20 (got {coin0})")

    tile = lambda r, c: page.locator(f'.tile[data-r="{r}"][data-c="{c}"]')

    # Road (costs 1)
    page.locator(".tool").nth(1).click()
    tile(5, 5).click(force=True)
    check(tile(5, 5).get_attribute("data-t") == "road", "build a road")
    check(int(page.inner_text("#coin")) == coin0 - 1, "a road costs 1")

    # House with no adjacent road -> blocked
    page.locator(".tool").nth(2).click()
    tile(0, 0).click(force=True)
    check(tile(0, 0).get_attribute("data-t") == "grass", "house without an adjacent road is blocked")

    # House next to a road -> ok
    tile(5, 6).click(force=True)
    check(tile(5, 6).get_attribute("data-t") == "house", "house next to a road gets built")
    check(int(page.inner_text("#pop")) == 4, "population = 4 with one house")

    # Shop vs. available funds
    coins = int(page.inner_text("#coin"))
    page.locator(".tool").nth(3).click()
    tile(4, 5).click(force=True)
    built = tile(4, 5).get_attribute("data-t") == "shop"
    check(built == (coins >= 10), "shop respects the funds rule")

    # Demolish
    page.locator(".tool").nth(0).click()
    tile(5, 6).click(force=True)
    check(tile(5, 6).get_attribute("data-t") == "grass", "demolish turns the tile back to grass")

    # Rotate view
    before = tile(0, 0).get_attribute("style")
    page.click("#rotateBtn")
    page.wait_for_timeout(300)
    check(tile(0, 0).get_attribute("style") != before, "rotate button repositions tiles")

    # Pause menu + save/load
    page.click("#menuBtn")
    check(page.is_visible("#btnResume"), "pause menu")
    page.click("#btnSave")
    saved = page.evaluate("localStorage.getItem('citybuilder_save')")
    check(saved is not None and '"road"' in saved, "save game to localStorage")
    page.click("#btnLoad")
    check(page.locator("#menu.hidden").count() == 1, "loading a game resumes play")

    # Simulation tick (2 s)
    page.locator(".tool").nth(2).click()
    tile(5, 4).click(force=True)
    c1 = int(page.inner_text("#coin"))
    page.wait_for_timeout(2300)
    check(int(page.inner_text("#coin")) >= c1, "simulation tick runs")

    # Persistence after reload
    page.reload()
    check(tile(5, 5).get_attribute("data-t") == "road", "state persists after reload")

    page.screenshot(path=str(ROOT / "tests" / "last-run.png"))
    check(not errors, "no JS errors in the console" + (f": {errors}" if errors else ""))
    browser.close()

print()
if failures:
    print(f"{len(failures)} failure(s)")
    sys.exit(1)
print("All OK")
