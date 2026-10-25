"""Smoke test for the Eurocrat web prototype (v0.2).

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


G = "window.__eurocrat"

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1180, "height": 820}, has_touch=True)  # landscape iPad
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    # Ignore load failures for external fonts, which we block on purpose
    page.on("console", lambda m: m.type == "error" and "Failed to load resource" not in m.text and errors.append(m.text))
    page.route("**/fonts.googleapis.com/**", lambda r: r.abort())
    page.route("**/fonts.gstatic.com/**", lambda r: r.abort())

    print(f"Loading {URL}")
    page.goto(URL)
    page.evaluate("localStorage.clear()")
    page.reload()
    ev = page.evaluate

    # --- Start menu and a new programme through the real UI
    check(page.is_visible("text=New programme"), "start menu shows 'New programme'")
    page.click("text=New programme")
    check(page.is_visible("text=Letter of appointment"), "appointment letter appears")
    page.click("text=Accept the appointment")
    check(page.locator("#modal.hidden").count() == 1, "accepting closes the letter")
    check(ev(f"{G}.S.month") == 1 and ev(f"{G}.S.funds") == ev(f"{G}.CFG.grant"), "month 1 with the full grant")
    check(ev(f"{G}.S.slots") == ev(f"{G}.CFG.slots"), "agenda slots at the start of the month")
    check(page.is_visible("#endTurn"), "'End month' button visible")

    # --- Deterministic game from here on
    ev(f"{G}.newGame(42)")
    S = lambda expr: ev(f"(()=>{{const S={G}.S, g={G}; return {expr};}})()")

    # Hit-testing: tapping the centre of every tile selects that tile, in all 4 rotations
    ok_all = True
    for rot in range(4):
        bad = S("Array.from({length:100},(_,i)=>i).filter(i=>{const [x,y]=g.screenOf(i); return g.tileAt(x,y)!==i;}).length")
        ok_all = ok_all and bad == 0
        page.click("#rotateBtn")
    check(ok_all, "tap hit-testing maps every tile correctly in all 4 rotations")

    # A real tap on the canvas selects a parcel
    x, y = S("g.screenOf(55)")
    box = page.locator("#map").bounding_box()
    page.mouse.click(box["x"] + x, box["y"] + y)
    check(S("g.selected") == 55, "tapping the map selects the parcel under the finger")
    check(page.is_visible("text=Cadastral parcel 6-6"), "the panel shows the selected parcel")

    # --- Land rules
    check(not S("g.acquire(0).ok"), "the regional road is not for sale")
    hab = S("S.grid.findIndex(p=>p.k==='habitat')")
    check(hab < 0 or not S(f"g.acquire({hab}).ok"), "protected habitat cannot be bought")
    muni = S("S.grid.findIndex(p=>p.k==='muni' && p.st==='land')")
    S("(S.local=30, 0)")
    check(muni < 0 or S(f"g.acquire({muni}).msg").startswith("The mayor says no"), "municipal land needs local support ≥ 40")
    S("(S.local=60, S.slots=3, 0)")

    # Buy a farm parcel next to the regional road (owners may hold out first)
    lot = S("S.grid.findIndex((p,i)=>i%10===1 && p.k==='farm' && p.st==='land')")
    funds0 = S("S.funds")
    tries = 0
    while S(f"S.grid[{lot}].st") == "land" and tries < 4:
        S("(S.slots=3, 0)")
        S(f"g.acquire({lot})")
        tries += 1
    check(S(f"S.grid[{lot}].st") == "owned", "a farm parcel can be acquired (holdouts raise the price)")
    check(S("S.funds") < funds0, "buying land costs money")
    S("(S.slots=0, 0)")
    check(S(f"g.requestPermit({lot},'housing').msg") == "No agenda slots left", "actions need agenda slots")

    # Permits need road access
    far = S("S.grid.findIndex((p,i)=>i%10===8 && p.k==='farm' && p.st==='land')")
    S(f"(S.grid[{far}].st='owned', S.slots=3, 0)")
    check(S(f"g.requestPermit({far},'housing').msg") == "No road access", "no permit without road access")
    S(f"(S.grid[{far}].st='land', 0)")
    check(S(f"g.requestPermit({lot},'housing').ok"), "permit request filed for a parcel with road access")
    check(S(f"S.grid[{lot}].st") == "review", "the parcel goes under review")

    # Force approval, then the building gets built over the following months and is paid monthly
    S("(S.local=100, S.neigh=100, S.comp=100, 0)")
    months = 0
    while S(f"S.grid[{lot}].st") in ("review", "approved", "building") and months < 12:
        S("(S.local=100, S.neigh=100, S.comp=100, S.directive=null, S.notices=[], S.perkChoice=null, 0)")
        f_before = S("S.funds")
        S("g.endMonth()")
        months += 1
    check(S(f"S.grid[{lot}].st") == "built", f"permit approved and housing built ({months} months)")
    check(S("g.caps().homes") == S("g.B.housing.homes"), "a housing block adds homes")

    # Residents need homes, jobs and services: homes alone are not enough
    check(S("g.caps().bottleneck") == "jobs", "with homes but no factory, jobs are the bottleneck")

    # --- No free money: taps and selections never change funds
    f0 = S("S.funds")
    for _ in range(20):
        page.mouse.click(box["x"] + x, box["y"] + y)
    check(S("S.funds") == f0, "tapping parcels never changes funds")

    # --- Use-it-or-lose-it at month 12
    S("(S.month=12, S.spent=1, S.funds=100, S.directive=null, S.notices=[], S.over=null, S.perkChoice=null, S.refunds=[], 0)")
    S("g.endMonth()")
    need = S("Math.round(S.grant*0.20*10)/10")
    check(S("S.funds") <= 100 - need + 2, f"unspent money is decommitted at the month-12 milestone (€{need}M due)")

    # --- Directive failure twice -> programme suspended
    S("(S.over=null, S.funds=50, S.comp=80, S.strikes=1, S.month=20, S.notices=[], "
      "S.directive={kind:'consult', deadline:20, base:S.consults, param:0}, 0)")
    S("g.endMonth()")
    check(S("S.over && S.over.why") == "suspended", "two failed directives suspend the programme")

    # --- Perk choice
    S("(S.over=null, S.perkChoice=['cousin','notary','prefab'], 0)")
    S("g.choosePerk('cousin')")
    check(S("S.perks.includes('cousin') && S.perkChoice===null"), "choosing a perk applies it")

    # --- Lose: bankrupt
    S("(S.over=null, S.funds=-1, S.month=20, S.directive=null, S.notices=[], S.strikes=0, 0)")
    S("g.endMonth()")
    check(S("S.over && S.over.why") == "bankrupt", "negative funds = bankrupt")

    # --- Win: inauguration shown in the UI
    # Residents drift toward capacity each month, so start well above the target
    S("(S.over=null, S.funds=40, S.perkChoice=null, S.newcomers=2*g.CFG.target, S.directive=null, S.notices=[], 0)")
    S("g.endMonth()")
    check(S("S.over && S.over.win"), "reaching the target wins")
    S("g.showNotices()")
    check(page.is_visible("text=Inauguration!"), "the inauguration notice is shown")

    # --- Save / continue through the real UI
    ev(f"{G}.newGame(7)")
    S("(S.slots=3, 0)"); S("g.fileReport()"); S("g.endMonth()")
    town = S("S.town")
    page.reload()
    check(page.is_visible(f"text=Continue · {town}"), "the start menu offers to continue the saved programme")
    page.click(f"text=Continue · {town}")
    page.wait_for_timeout(100)
    while page.locator("#modal:not(.hidden) .btn.primary").count():
        page.locator("#modal:not(.hidden) .btn.primary").first.click()
        page.wait_for_timeout(50)
    check(S("S.town") == town and S("S.month") == 2, "continue restores town and month")

    # --- End month through the UI advances the month
    page.click("#endTurn")
    while page.locator("#modal:not(.hidden) .btn.primary").count():
        page.locator("#modal:not(.hidden) .btn.primary").first.click()
        page.wait_for_timeout(50)
    if page.locator("#modal:not(.hidden) .perk").count():
        page.locator("#modal:not(.hidden) .perk").first.click()
    check(S("S.month") == 3, "the 'End month' button advances to the next month")

    # --- Layout: map and panel side by side on iPad landscape, stacked on iPhone
    def rect(sel):
        return page.locator(sel).bounding_box()
    w, pn = rect("#world"), rect("#panel")
    check(pn["x"] >= w["x"] + w["width"] - 1, "iPad landscape: the panel sits to the right of the map")
    page.set_viewport_size({"width": 390, "height": 844})
    page.wait_for_timeout(150)
    w, pn, hud = rect("#world"), rect("#panel"), rect("#meters")
    check(pn["y"] >= w["y"] + w["height"] - 1 and w["height"] > 200, "iPhone: the map is above the panel and still usable")
    check(rect("#hint")["y"] >= hud["y"] + hud["height"], "iPhone: the hint is not covered by the top bar")
    page.set_viewport_size({"width": 1180, "height": 820})

    page.screenshot(path=str(ROOT / "tests" / "last-run.png"))
    check(not errors, "no JS errors in the console" + (f": {errors}" if errors else ""))
    browser.close()

print()
if failures:
    print(f"{len(failures)} failure(s)")
    sys.exit(1)
print("All OK")
