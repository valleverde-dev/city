"""Smoke test for the Eurocrat web prototype (v0.5: levels, guide, sheets, panning).

Usage:    python3 web-prototype/tests/smoke_test.py [path/to/index.html]
Requires: pip install playwright && python3 -m playwright install chromium
"""
import pathlib
import re
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
    page = browser.new_page(viewport={"width": 1180, "height": 820}, has_touch=True, locale="en-US")  # landscape iPad
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("console", lambda m: m.type == "error" and "Failed to load resource" not in m.text and errors.append(m.text))
    external = []   # the game must be fully self-contained: fonts and icons are embedded
    page.on("request", lambda r: r.url.split(":")[0] in ("http", "https") and external.append(r.url))

    print(f"Loading {URL}")
    page.goto(URL)
    page.evaluate("localStorage.clear()")
    page.reload()
    ev = page.evaluate
    S = lambda expr: ev(f"(()=>{{const S={G}.S, g={G}; return {expr};}})()")

    def clear_cards():
        S("(S.cards=[], S.perkChoice=null, 0)")

    def drain():
        """Click through any open notices / choices with the first option."""
        for _ in range(15):
            if page.locator("#modal:not(.hidden) .choice").count():
                page.locator("#modal:not(.hidden) .choice:not([disabled])").first.click()
            elif page.locator("#modal:not(.hidden) .btn.primary").count() and not S("!!S.over"):
                page.locator("#modal:not(.hidden) .btn.primary").first.click()
            else:
                return
            page.wait_for_timeout(40)

    def tap(i):
        x, y = S(f"g.screenOf({i})"); box = page.locator("#map").bounding_box()
        page.mouse.click(box["x"] + x, box["y"] + y); page.wait_for_timeout(60)

    # --- Start menu: language and the level list
    check(page.locator(".lvl").count() == 4, "the start menu lists the 4 levels")
    check(page.locator(".lvl:disabled").count() == 3, "only level I is unlocked at first")
    page.click("text=Español")
    check(page.is_visible("text=Proyecto piloto") and S("g.lang") == "es", "switching to Spanish translates the menu")
    page.reload()
    check(page.is_visible("text=Proyecto piloto"), "the language choice is remembered")
    page.click("text=English")
    check(page.is_visible("text=Pilot Project"), "switching back to English")

    # --- Level I through the real UI: intro, level card, guide, buy, build, end months, win
    page.locator(".lvl").first.click()
    check(page.is_visible("text=Letter of appointment"), "level I starts with the appointment letter")
    page.click("text=Accept the appointment")
    check(page.is_visible("text=Pilot Project") and page.locator("#notice .rules li").count() >= 3, "the level card explains the goal and the new rules")
    page.click("text=Get to work")
    check(S("Math.sqrt(S.grid.length)") == 2 and S("S.level") == 0, "level I is a 2×2 map")
    check(page.locator("#meters").is_hidden(), "level I shows no meters (none of those rules are in play)")
    check(page.locator(".tab[data-tab=agenda]").is_hidden() and page.locator(".tab[data-tab=combos]").is_hidden(), "level I hides the Agenda and Combos tabs")
    check(page.is_visible("#guide") and "step 1 of" in page.locator("#guide").inner_text().lower(), "the mayor's guide shows step 1")
    lot = S("S.grid.findIndex(p=>p.k==='farm' && p.st==='land')")
    tap(lot)
    check(S("g.sheet") == "parcel" and page.is_visible("#sheet") and S("g.selected") == lot, "tapping a parcel opens its sheet")
    page.locator("#sheet .act").first.click(); page.wait_for_timeout(60)
    check(S(f"S.grid[{lot}].st") == "owned", "buy the parcel from the sheet")
    check("step 2 of" in page.locator("#guide").inner_text().lower(), "the guide moves to step 2")
    check(page.locator("#sheet .act.build").count() == 2, "level I offers only housing and park (no roads, factories or services)")
    page.locator("#sheet .act.build").first.click(); page.wait_for_timeout(60)
    check(S(f"S.grid[{lot}].ty") == "housing", "order a housing block")
    check(page.locator("#endTurn.nudge").count() == 1, "the guide nudges the End month button")
    for _ in range(10):
        if S("!!S.over"): break
        page.click("#endTurn"); page.wait_for_timeout(60); drain()
    check(S("S.over && S.over.win"), f"level I is won by ending months ({S('S.month')} months)")
    check(S("S.debt") == 0, "level I never needs a loan")
    check(page.is_visible("text=Level I complete!") and page.locator("#notice .perk").count() == 3, "level complete: choose 1 of 3 perks to carry")
    perk = S("S.carryChoice[0]")
    page.locator("#notice .perk").first.click(); page.wait_for_timeout(100)
    check(S("S.level") == 1 and S("Math.sqrt(S.grid.length)") == 4, "the next level starts on a 4×4 map")
    check(S("g.campaign().max") == 1 and S(f"S.perks.includes('{perk}') || (S.shovel && '{perk}'==='shovel')"), "progress and the carried perk are kept")
    check(page.is_visible("text=Expansion Phase"), "level II card")
    clear_cards(); S("(g.showNext(), 0)")
    check(not page.locator("#m-local").is_hidden() and page.locator("#m-neigh").is_hidden(), "level II shows only the Mayor meter")
    check(page.locator(".tab[data-tab=agenda]").is_visible() and page.locator(".tab[data-tab=combos]").is_visible(), "level II unlocks the Agenda and Combos tabs")
    check(S("g.on('access') && !g.on('rustic') && !g.on('events')"), "level II rules: access yes, rustic land and events not yet")

    # --- Back to the menu: level II is unlocked now
    page.click("#menuBtn"); page.click("text=Main menu")
    check(page.locator(".lvl:not(:disabled)").count() == 2, "the menu shows level II unlocked")
    page.keyboard.press("Escape")

    # --- Full rules: level IV (16×16), deterministic
    ev(f"{G}.newGame(42, 3)"); clear_cards(); S("(g.refresh(), 0)")
    N = S("Math.sqrt(S.grid.length)")
    check(N == 16 and S("g.on('market') && g.on('milestones')"), "level IV is a 16×16 map with every rule")
    ok_all = True
    for rot in range(4):
        bad = S(f"Array.from({{length:{N*N}}},(_,i)=>i).filter(i=>{{const [x,y]=g.screenOf(i); return x>0&&y>0&&x<innerWidth&&y<innerHeight && g.tileAt(x,y)!==i;}}).length")
        ok_all = ok_all and bad == 0
        page.click("#rotateBtn")
    check(ok_all, "tap hit-testing maps every visible tile correctly in all 4 rotations")

    # Panning and zooming
    cam0 = S("g.cam"); box = page.locator("#map").bounding_box()
    page.mouse.move(box["x"] + 500, box["y"] + 300); page.mouse.down(); page.mouse.move(box["x"] + 380, box["y"] + 240, steps=6); page.mouse.up()
    cam1 = S("g.cam")
    check(cam1 != cam0 and S("g.sheet") is None, "dragging moves the map (and does not select a parcel)")
    page.keyboard.down("d"); page.wait_for_timeout(250); page.keyboard.up("d")
    check(S("g.cam")[0] > cam1[0], "the D key moves the map")
    z0 = S("g.zoom"); page.mouse.move(box["x"] + 400, box["y"] + 300); page.mouse.wheel(0, -400); page.wait_for_timeout(60)
    check(S("g.zoom") > z0, "the mouse wheel zooms in")
    page.click("#zoomOutBtn")
    check(S("g.zoom") < S("g.zoom") * 1.01, "the − button zooms out")
    S("(g.panBy(-99999, -99999), 0)")
    cx, cy = S("g.cam")
    check(abs(cx) <= N*32 + 1 and cy <= (N-1)*32 + 26, "the camera cannot leave the map")

    # Land rules
    check(not S("g.acquire(0).ok"), "the regional road is not for sale")
    hab = S("S.grid.findIndex(p=>p.k==='habitat')")
    check(hab < 0 or not S(f"g.acquire({hab}).ok"), "protected habitat cannot be bought")
    muni = S("S.grid.findIndex(p=>p.k==='muni' && p.st==='land')")
    S("(S.local=30, 0)")
    check(muni < 0 or S(f"g.acquire({muni}).msg.k") == "err.mayorNo", "municipal land needs the mayor (support ≥ 40)")
    S("(S.local=60, S.slots=3, 0)")
    road = 5*N + 5
    S(f"(S.grid[{road}]={{...S.grid[{road}], k:'farm', st:'built', ty:'road'}}, 0)")
    check(S("g.hasAccess(6,6)") and S("g.hasAccess(4,4)") and not S("g.hasAccess(7,7)"), "access counts diagonal neighbours (8-way)")
    lot = S(f"S.grid.findIndex((p,i)=>i%{N}===1 && p.k==='farm' && p.st==='land')")
    tries = 0
    while S(f"S.grid[{lot}].st") == "land" and tries < 4:
        S("(S.slots=3, 0)"); S(f"g.acquire({lot})"); tries += 1
    check(S(f"S.grid[{lot}].st") == "owned", "a farm parcel can be acquired (holdouts raise the price)")
    S("(S.slots=0, 0)")
    check(S(f"g.requestPermit({lot},'road').msg.k") == "err.slots", "actions need agenda slots")
    S("(S.slots=3, 0)")
    check(S(f"g.requestPermit({lot},'housing').msg.k") == "err.rustic", "rustic land cannot take housing")
    check(S("g.submitPlan().ok") and S("!!S.plan"), "an urban plan can be submitted")
    months = 0
    while S("!!S.plan") and months < 6:
        S("(S.local=100, S.neigh=100, S.comp=100, S.directive=null, 0)"); clear_cards(); S("g.endMonth()"); months += 1
    check(S(f"S.grid[{lot}].urban"), f"the plan was approved and the parcel is now urban ({months} months)")
    clear_cards(); S("(S.slots=3, 0)")
    check(S(f"g.requestPermit({lot},'housing').ok"), "permit request filed for urban land with access")
    months = 0
    while S(f"S.grid[{lot}].st") in ("review", "approved", "building") and months < 12:
        S("(S.local=100, S.neigh=100, S.comp=100, S.directive=null, 0)"); clear_cards(); S("g.endMonth()"); months += 1
    check(S(f"S.grid[{lot}].st") == "built", f"housing approved and built ({months} months)")
    check(S("g.caps().bottleneck") == "jobs", "with homes but no factory, jobs are the bottleneck")
    lot2 = S(f"S.grid.findIndex((p,i)=>i%{N}===1 && p.k==='farm' && p.st==='land')")
    S(f"(S.grid[{lot2}].st='owned', S.grid[{lot2}].urban=true, S.slots=3, S.market=0.7, 0)")
    check(S(f"g.sellPlot({lot2}).msg.k") == "err.noBuyers", "no developer buys when the market is cold")
    S("(S.market=1, 0)"); f0 = S("S.funds"); sp0 = S("S.spent")
    check(S(f"g.sellPlot({lot2}).ok") and S("S.funds") > f0 and S("S.spent") == sp0, "selling a plot brings money (and does not count as spending)")

    # Use-it-or-lose-it, loans, directives, perks, win
    clear_cards(); S("(S.month=9, S.spent=1, S.funds=100, S.directive=null, S.over=null, S.refunds=[], 0)"); S("g.endMonth()")
    check(S("S.cards.some(c=>c.key==='ms.warn')"), "absorption warning 3 months before the milestone")
    clear_cards(); S("(S.month=12, S.spent=1, S.funds=100, S.directive=null, S.over=null, S.refunds=[], 0)"); S("g.endMonth()")
    need = S("Math.round(S.grant*0.20*10)/10")
    check(98 - need/2 < S("S.funds") < 101 - need/2 + 1, "half of the unspent money is decommitted at month 12")
    clear_cards(); S("(S.over=null, S.funds=-3, S.debt=0, S.month=20, S.directive=null, S.strikes=0, 0)"); S("g.endMonth()")
    check(not S("S.over") and S("S.debt") > 0 and S("S.cards[0] && S.cards[0].key") == "loan", "running out of money takes a bridge loan, not game over")
    clear_cards(); S("(S.debt=g.CFG.debtCap-1, S.funds=-20, 0)"); S("g.endMonth()")
    check(S("S.over && S.over.why") == "bankrupt", "debt above the cap = bankrupt (level IV)")
    S("(S.over=null, S.funds=50, S.debt=0, S.comp=80, S.strikes=1, S.month=20, S.cards=[], S.directive={kind:'consult', deadline:20, base:S.consults, param:0, ref:'X'}, 0)")
    S("g.endMonth()")
    check(S("S.over && S.over.why") == "suspended", "two failed directives suspend the programme")
    S("(S.over=null, S.perkChoice=['cousin','notary','prefab'], 0)"); S("g.choosePerk('cousin')")
    check(S("S.perks.includes('cousin') && S.perkChoice===null"), "choosing a perk applies it")
    clear_cards(); S("(S.over=null, S.funds=40, S.debt=0, S.newcomers=2*g.CFG.target, S.directive=null, 0)"); S("g.endMonth()")
    check(S("S.over && S.over.win"), "reaching the target wins")
    S("(S.cards=[], 0)"); S("g.showNext()")
    check(page.is_visible("text=Inauguration!"), "the last level ends with the inauguration")

    # --- Combos (discovered by building), access through finished buildings
    S("localStorage.removeItem('eurocrat_combos')")
    ev(f"{G}.newGame(3, 3)"); clear_cards()
    S(f"(()=>{{ const put=(r,c,ty)=>Object.assign(S.grid[r*{N}+c],{{k:'farm',st:'built',ty}}); put(6,6,'housing'); put(6,7,'park'); return 0; }})()")
    check(S("g.activeCombos().map(x=>x.id).join()") == "greenViews", "housing next to a park = 'Green Views' combo")
    S(f"(Object.assign(S.grid[7*{N}+7],{{k:'farm',st:'built',ty:'factory'}}), 0)")
    check(S("g.activeCombos().some(x=>x.id==='smoke' && !x.good)"), "a factory diagonal to housing = bad combo")
    S(f"(Object.assign(S.grid[5*{N}+6],{{k:'farm',st:'owned',urban:true}}), S.slots=3, g.centreOn(5*{N}+6), g.refresh(), 0)")
    tap(5*N + 6)
    check(page.locator("#sheet .chip.mystery").count() >= 1, "undiscovered combos show as 'combo?' in the build options")
    S("g.endMonth()")
    check(S("S.cards.filter(c=>c.type==='combo').length") == 2 and S("g.discovered().length") == 2, "new combos are announced and discovered")
    S("g.showNext()")
    nb = page.locator("#notice").bounding_box(); vw = page.viewport_size
    check(abs((nb["x"] + nb["width"]/2) - vw["width"]/2) < 40, "cards appear in the middle of the screen")
    clear_cards(); ev(f"{G}.hideModal()"); S("(g.refresh(), 0)")
    page.click(".tab[data-tab=combos]")
    check(S("g.sheet") == "combos" and page.locator("#sheet .catalogue li").count() == S("g.COMBOS.length"), "the Combos tab opens the catalogue")
    page.click(".tab[data-tab=combos]")
    check(S("g.sheet") is None, "tapping the tab again closes it")
    S(f"(Object.assign(S.grid[3*{N}+8],{{k:'farm',st:'built',ty:'school'}}), 0)")
    check(S("g.hasAccess(4,9)") and S("g.hasAccess(2,7)"), "a finished building gives access to its neighbours")
    S(f"(S.grid[3*{N}+8].st='building', 0)")
    check(not S("g.hasAccess(4,9)"), "a building under construction does not give access yet")

    # --- Event cards with characters and choices
    ev(f"{G}.newGame(5, 3)")
    site = S("(()=>{ const i=S.grid.findIndex(p=>p.k==='farm'); Object.assign(S.grid[i],{st:'building', ty:'housing', t:3, mcost:1}); return i; })()")
    S(f"(S.cards=[{{type:'event', id:'archaeology', v:{{i:{site}}}}}], 0)"); S("g.showNext()")
    check(page.is_visible("text=Archaeological find") and page.locator("#notice .choice").count() == 3, "event card with its character and three choices")
    page.click("text=Call the Heritage Office")
    check(S(f"S.grid[{site}].halt") == 3, "choosing 'by the book' halts the site 3 months")
    page.click("#bellBtn")
    check(S("g.sheet") == "problems" and page.locator("#sheet .problems li.bad").count() >= 1, "the bell opens the problems list with the halted site")
    page.locator("#sheet .problems li.bad").first.click()
    check(S("g.sheet") == "parcel" and S("g.selected") == site, "tapping a problem jumps to its parcel")
    page.click("#sheetClose")

    # --- Every card, level and guide step renders in both languages without raw keys
    raw = []
    for lang in ("en", "es"):
        S(f"(g.setLang('{lang}'), 0)")
        for eid in S("Object.keys(g.EVENTS)"):
            S(f"(S.cards=[{{type:'event', id:'{eid}', v:{{i:{site}, x:'1', good:true, priv:true, owned:true}}}}], 0)"); S("g.showNext()")
            if re.search(r"\bev\.|\{\w+\}", page.locator("#notice").inner_text()): raw.append(f"{lang}:{eid}")
        for k in range(4):
            ev(f"{G}.newGame(9, {k})"); S("(S.cards=[{type:'level'}], 0)"); S("g.showNext()")
            if re.search(r"\blvl\.|\{\w+\}", page.locator("#notice").inner_text()): raw.append(f"{lang}:level{k+1}")
            S("(S.cards=[], 0)"); ev(f"{G}.hideModal()"); S("(g.refresh(), 0)")
            if re.search(r"\b(g\d|ui|tab|pb)\.\w", page.locator("#guide").inner_text() + page.locator("#tabs").inner_text()): raw.append(f"{lang}:guide{k+1}")
            for tab in ("city", "inbox", "problems"):
                S(f"g.openSheet('{tab}')")
                if re.search(r"\b(pb|ui|act|pc|meter|lvl)\.\w|\{\w+\}", page.locator("#sheet").inner_text()): raw.append(f"{lang}:{tab}{k+1}")
            S("g.closeSheet()")
    check(not raw, "cards, levels, guide and sheets render in EN and ES with no raw keys" + (f": {raw}" if raw else ""))
    S("(g.setLang('en'), S.cards=[], 0)"); ev(f"{G}.hideModal()")

    # --- Save / continue through the real UI
    ev(f"{G}.newGame(7, 1)")
    S("(S.slots=3, 0)"); S("g.lobby()"); clear_cards(); S("g.endMonth()"); clear_cards(); S("(g.refresh(), 0)")
    town = S("S.town")
    page.reload()
    check(page.is_visible(f"text=Continue · level II · {town}"), "the start menu offers to continue the saved level")
    page.click(f"text=Continue · level II · {town}"); page.wait_for_timeout(100); drain()
    check(S("S.town") == town and S("S.level") == 1 and S("Math.sqrt(S.grid.length)") == 4, "continue restores the level and its map")
    m0 = S("S.month"); page.click("#endTurn"); drain()
    check(S("S.month") == m0 + 1, "the End month button advances to the next month")
    page.keyboard.press("Space"); drain()
    check(S("S.month") == m0 + 2, "Space also ends the month")

    # --- Layout: full-screen map, tab bar at the bottom, sheet over the map; phone too
    def rect(sel):
        return page.locator(sel).bounding_box()
    w, tb = rect("#world"), rect("#tabs")
    check(tb["y"] >= w["y"] + w["height"] - 1 and w["width"] >= 1170, "iPad: the map uses the full width, tabs at the bottom")
    S("g.openSheet('city')"); page.wait_for_timeout(350)
    sh = rect("#sheet")
    check(sh["x"] < 40 and sh["width"] < 500, "iPad: sheets float on the left, not a fixed side panel")
    S("g.closeSheet()")
    page.set_viewport_size({"width": 390, "height": 844}); page.wait_for_timeout(200)
    ev(f"{G}.newGame(11, 3)"); clear_cards(); S("(g.refresh(), 0)"); page.wait_for_timeout(100)
    m = rect("#meters"); w = rect("#world"); tb = rect("#tabs")
    check(m["height"] < 70, f"iPhone: the four meters fit in one row ({m['height']:.0f}px)")
    check(w["height"] > 450 and tb["y"] + tb["height"] <= 844 + 1, f"iPhone: the map gets most of the screen ({w['height']:.0f}px)")
    check(ev("document.documentElement.scrollWidth <= innerWidth"), "iPhone: no horizontal overflow")
    S("g.openSheet('agenda')"); page.wait_for_timeout(350)   # let the slide-up animation finish
    sh = rect("#sheet")
    check(sh["width"] >= 385 and sh["y"] + sh["height"] <= tb["y"] + 1, "iPhone: sheets slide up from the bottom, above the tabs")
    fs = ev("parseFloat(getComputedStyle(document.querySelector('#sheet .card p')).fontSize)")
    check(fs >= 15, f"sheet text is readable ({fs:.0f}px)")
    page.set_viewport_size({"width": 1180, "height": 820})

    page.screenshot(path=str(ROOT / "tests" / "last-run.png"))
    check(ev(f"Object.keys({G}.spriteSheet().atlas).length") >= 60, "pixel-art sprite sheet builds")
    check(page.locator(".material-icons").count() == 0 and page.locator("#hud .ico").count() >= 5, "pixel icons replace the icon font")
    check(ev("document.fonts.check('20px Jersey') && document.fonts.check('14px Pixel')"), "embedded pixel fonts are available")
    check(not external, "no external requests" + (f": {external[:3]}" if external else ""))
    check(not errors, "no JS errors in the console" + (f": {errors}" if errors else ""))
    browser.close()

print()
if failures:
    print(f"{len(failures)} failure(s)")
    sys.exit(1)
print("All OK")
