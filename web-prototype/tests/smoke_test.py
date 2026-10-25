"""Smoke test del prototipo web.

Uso:  python3 web-prototype/tests/smoke_test.py [ruta/al/index.html]
Requiere: pip install playwright && python3 -m playwright install chromium
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
    # Tamaño de iPad en horizontal, con eventos táctiles
    page = browser.new_page(viewport={"width": 1180, "height": 820}, has_touch=True)
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    # Ignora los fallos de carga de fuentes externas, que bloqueamos a propósito
    page.on("console", lambda m: m.type == "error" and "Failed to load resource" not in m.text and errors.append(m.text))
    # Las fuentes externas no son necesarias para probar la lógica
    page.route("**/fonts.googleapis.com/**", lambda r: r.abort())
    page.route("**/fonts.gstatic.com/**", lambda r: r.abort())

    print(f"Cargando {URL}")
    page.goto(URL)
    page.evaluate("localStorage.clear()")
    page.reload()

    check(page.locator(".tile").count() == 100, "grid de 10x10 casillas")
    check(page.locator(".tool").count() == 5, "5 herramientas en la barra")
    check(page.is_visible("#btnPlay"), "pantalla de inicio visible")

    page.click("#btnPlay")
    check(page.locator("#menu.hidden").count() == 1, "Jugar oculta el menú")
    coin0 = int(page.inner_text("#coin"))
    check(coin0 == 20, f"monedas iniciales = 20 (hay {coin0})")

    tile = lambda r, c: page.locator(f'.tile[data-r="{r}"][data-c="{c}"]')

    # Calle (cuesta 1)
    page.locator(".tool").nth(1).click()
    tile(5, 5).click(force=True)
    check(tile(5, 5).get_attribute("data-t") == "road", "construir calle")
    check(int(page.inner_text("#coin")) == coin0 - 1, "la calle cuesta 1")

    # Casa sin calle al lado -> bloqueada
    page.locator(".tool").nth(2).click()
    tile(0, 0).click(force=True)
    check(tile(0, 0).get_attribute("data-t") == "grass", "casa sin calle adyacente se bloquea")

    # Casa junto a la calle -> ok
    tile(5, 6).click(force=True)
    check(tile(5, 6).get_attribute("data-t") == "house", "casa junto a calle se construye")
    check(int(page.inner_text("#pop")) == 4, "población = 4 con una casa")

    # Tienda sin fondos suficientes
    page.evaluate("1")
    coins = int(page.inner_text("#coin"))
    page.locator(".tool").nth(3).click()
    tile(4, 5).click(force=True)
    built = tile(4, 5).get_attribute("data-t") == "shop"
    check(built == (coins >= 10), "regla de fondos de la tienda")

    # Demoler
    page.locator(".tool").nth(0).click()
    tile(5, 6).click(force=True)
    check(tile(5, 6).get_attribute("data-t") == "grass", "demoler devuelve a césped")

    # Rotar vista
    before = tile(0, 0).get_attribute("style")
    page.click("#rotateBtn")
    page.wait_for_timeout(300)
    check(tile(0, 0).get_attribute("style") != before, "botón de rotar recoloca casillas")

    # Menú pausa + guardar/cargar
    page.click("#menuBtn")
    check(page.is_visible("#btnResume"), "menú de pausa")
    page.click("#btnSave")
    saved = page.evaluate("localStorage.getItem('citybuilder_save')")
    check(saved is not None and '"road"' in saved, "guardar partida en localStorage")
    page.click("#btnLoad")
    check(page.locator("#menu.hidden").count() == 1, "cargar partida reanuda el juego")

    # Tick de simulación (2 s)
    page.locator(".tool").nth(2).click()
    tile(5, 4).click(force=True)
    c1 = int(page.inner_text("#coin"))
    page.wait_for_timeout(2300)
    check(int(page.inner_text("#coin")) >= c1, "el tick de simulación corre")

    # Persistencia tras recargar
    page.reload()
    check(tile(5, 5).get_attribute("data-t") == "road", "el estado persiste tras recargar")

    page.screenshot(path=str(ROOT / "tests" / "last-run.png"))
    check(not errors, "sin errores JS en consola" + (f": {errors}" if errors else ""))
    browser.close()

print()
if failures:
    print(f"{len(failures)} fallo(s)")
    sys.exit(1)
print("Todo OK")
