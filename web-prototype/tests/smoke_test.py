"""Smoke test for the Eurocrat web prototype (v0.3).

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
    # Ignore load failures for external fonts, which we block on purpose
    page.on("console", lambda m: m.type == "error" and "Failed to load resource" not in m.text and errors.append(m.text))
    page.route("**/fonts.googleapis.com/**", lambda r: r.abort())
    page.route("**/fonts.gstatic.com/**", lambda r: r.abort())

    print(f"Loading {URL}")
    page.goto(URL)
    page.evaluate("localStorage.clear()")
    page.reload()
    ev = page.evaluate
    S = lambda expr: ev(f"(()=>{{const S={G}.S, g={G}; return {expr};}})()")

    def clear_cards():
        S("(S.cards=[], S.perkChoice=null, 0)")

    # --- Languages: English by default here, Spanish from the menu, and back
    check(page.is_visible("text=New programme"), "start menu in English (browser locale)")
    page.click("text=Español")
    check(page.is_visible("text=Nuevo programa") and S("g.lang") == "es", "switching to Spanish translates the menu")
    check(page.locator("#hint").inner_text().startswith("Toca una parcela"), "the map hint is translated too")
    page.reload()
    check(page.is_visible("text=Nuevo programa"), "the language choice is remembered")
    page.click("text=English")
    check(page.is_visible("text=New programme"), "switching back to English")

    # --- New programme through the real UI
    page.click("text=New programme")
    check(page.is_visible("text=Letter of appointment"), "appointment letter appears")
    page.click("text=Accept the appointment")
    check(page.locator("#modal.hidden").count() == 1, "accepting closes the letter")
    check(S("S.month") == 1 and S("S.funds") == S("g.CFG.grant") and S("S.debt") == 0, "month 1, full grant, no debt")
    check(page.locator("#st-debt").is_hidden(), "no debt badge when there is no debt")

    # --- Deterministic game from here on
    ev(f"{G}.newGame(42)")
    N = S("Math.sqrt(S.grid.length)")
    check(N == 12, "the map is 12×12")

    ok_all = True
    for rot in range(4):
        bad = S(f"Array.from({{length:{N*N}}},(_,i)=>i).filter(i=>{{const [x,y]=g.screenOf(i); return g.tileAt(x,y)!==i;}}).length")
        ok_all = ok_all and bad == 0
        page.click("#rotateBtn")
    check(ok_all, "tap hit-testing maps every tile correctly in all 4 rotations")

    x, y = S("g.screenOf(66)")
    box = page.locator("#map").bounding_box()
    page.mouse.click(box["x"] + x, box["y"] + y)
    check(S("g.selected") == 66, "tapping the map selects the parcel under the finger")
    check(page.is_visible("text=Parcel 6-7"), "the panel shows the selected parcel")

    # --- Land rules
    check(not S("g.acquire(0).ok"), "the regional road is not for sale")
    hab = S("S.grid.findIndex(p=>p.k==='habitat')")
    check(hab < 0 or not S(f"g.acquire({hab}).ok"), "protected habitat cannot be bought")
    muni = S("S.grid.findIndex(p=>p.k==='muni' && p.st==='land')")
    S("(S.local=30, 0)")
    check(muni < 0 or S(f"g.acquire({muni}).msg.k") == "err.mayorNo", "municipal land needs the mayor (support ≥ 40)")
    check(muni < 0 or S(f"S.grid[{muni}].urban"), "municipal land is already urban")
    S("(S.local=60, S.slots=3, 0)")

    # Diagonal access: a road touching a parcel corner-to-corner gives access
    S("(S.grid[5*12+5]={...S.grid[5*12+5], k:'farm', st:'built', ty:'road'}, 0)")
    check(S("g.hasAccess(6,6)") and S("g.hasAccess(4,4)") and not S("g.hasAccess(7,7)"), "access counts diagonal neighbours (8-way)")

    # Buy a rustic farm parcel next to the regional road (owners may hold out first)
    lot = S("S.grid.findIndex((p,i)=>i%12===1 && p.k==='farm' && p.st==='land')")
    funds0 = S("S.funds"); tries = 0
    while S(f"S.grid[{lot}].st") == "land" and tries < 4:
        S("(S.slots=3, 0)"); S(f"g.acquire({lot})"); tries += 1
    check(S(f"S.grid[{lot}].st") == "owned" and S("S.funds") < funds0, "a farm parcel can be acquired (holdouts raise the price)")
    S("(S.slots=0, 0)")
    check(S(f"g.requestPermit({lot},'road').msg.k") == "err.slots", "actions need agenda slots")
    S("(S.slots=3, 0)")
    check(S(f"g.requestPermit({lot},'housing').msg.k") == "err.rustic", "rustic land cannot take housing")

    # Urban plan: rezones every rustic parcel you own
    check(S("g.submitPlan().ok") and S("!!S.plan"), "an urban plan can be submitted")
    months = 0
    while S("!!S.plan") and months < 6:
        S("(S.local=100, S.neigh=100, S.comp=100, S.directive=null, 0)"); clear_cards(); S("g.endMonth()"); months += 1
    check(S(f"S.grid[{lot}].urban"), f"the plan was approved and the parcel is now urban ({months} months)")

    # Permit + construction on urban land
    clear_cards(); S("(S.slots=3, 0)")
    check(S(f"g.requestPermit({lot},'housing').ok"), "permit request filed for urban land with road access")
    months = 0
    while S(f"S.grid[{lot}].st") in ("review", "approved", "building") and months < 12:
        S("(S.local=100, S.neigh=100, S.comp=100, S.directive=null, 0)"); clear_cards(); S("g.endMonth()"); months += 1
    check(S(f"S.grid[{lot}].st") == "built", f"housing approved and built ({months} months)")
    check(S("g.caps().homes") == S("g.B.housing.homes"), "a housing block adds homes")
    check(S("g.caps().bottleneck") == "jobs", "with homes but no factory, jobs are the bottleneck")

    # Selling urban land to a developer: money in, they build at their pace, no upkeep for us
    lot2 = S("S.grid.findIndex((p,i)=>i%12===1 && p.k==='farm' && p.st==='land')")
    S(f"(S.grid[{lot2}].st='owned', S.grid[{lot2}].urban=true, S.slots=3, S.market=0.7, 0)")
    check(S(f"g.sellPlot({lot2}).msg.k") == "err.noBuyers", "no developer buys when the market is cold")
    S("(S.market=1, 0)")
    f0 = S("S.funds"); sp0 = S("S.spent")
    check(S(f"g.sellPlot({lot2}).ok") and S("S.funds") > f0 and S("S.spent") == sp0, "selling a plot brings money (and does not count as spending)")
    months = 0
    while S(f"S.grid[{lot2}].st") == "private" and months < 12:
        clear_cards(); S("(S.market=1, S.directive=null, 0)"); S("g.endMonth()"); months += 1
    check(S(f"S.grid[{lot2}].st") == "built" and S(f"S.grid[{lot2}].priv"), f"the developer delivered the housing ({months} months)")

    # --- No free money: taps and selections never change funds
    f0 = S("S.funds")
    for _ in range(15):
        page.mouse.click(box["x"] + x, box["y"] + y)
    check(S("S.funds") == f0, "tapping parcels never changes funds")

    # --- Use-it-or-lose-it: warning 3 months before, then half the shortfall is taken back
    clear_cards(); S("(S.month=9, S.spent=1, S.funds=100, S.directive=null, S.over=null, S.refunds=[], 0)"); S("g.endMonth()")
    check(S("S.cards.some(c=>c.key==='ms.warn')"), "absorption warning 3 months before the milestone")
    clear_cards(); S("(S.month=12, S.spent=1, S.funds=100, S.directive=null, S.over=null, S.refunds=[], 0)"); S("g.endMonth()")
    need = S("Math.round(S.grant*0.20*10)/10")
    check(98 - need/2 < S("S.funds") < 101 - need/2 + 1, "half of the unspent money is decommitted at month 12")

    # --- Bridge loan instead of instant bankruptcy; bankrupt only above the debt cap
    clear_cards(); S("(S.over=null, S.funds=-3, S.debt=0, S.month=20, S.directive=null, S.strikes=0, 0)"); S("g.endMonth()")
    check(not S("S.over") and S("S.debt") > 0 and S("S.funds") >= 0, "running out of money takes a bridge loan, not game over")
    check(S("S.cards[0] && S.cards[0].key") == "loan", "the bank tells you about the loan")
    clear_cards(); S("(S.debt=g.CFG.debtCap-1, S.funds=-20, 0)"); S("g.endMonth()")
    check(S("S.over && S.over.why") == "bankrupt", "debt above the cap = bankrupt")

    # --- Event cards: shown with a character, choices with consequences, resolved through the UI
    ev(f"{G}.newGame(5)")
    site = S("(()=>{ const i=S.grid.findIndex(p=>p.k==='farm'); Object.assign(S.grid[i],{st:'building', ty:'housing', t:3, mcost:1}); return i; })()")
    S(f"(S.cards=[{{type:'event', id:'archaeology', v:{{i:{site}}}}}], 0)"); S("g.showNext()")
    check(page.is_visible("text=Archaeological find") and page.is_visible("text=Dr. Ottilie Steinbach"), "event card with its character")
    check(page.locator("#notice .choice").count() == 3 and page.locator("#notice .chip").count() >= 5, "three choices with consequence chips")
    check(S("S.focus") == site, "the map highlights the parcel where it happens")
    page.click("text=Call the Heritage Office")
    check(S(f"S.grid[{site}].halt") == 3 and S("S.cards.length") == 0, "choosing 'by the book' halts the site 3 months")
    check(page.is_visible("text=What needs attention") and page.locator(".problems li.bad").count() >= 1, "the halted site appears in the problems list")

    # Every event, directive and notice renders in both languages without raw keys
    raw = []
    for lang in ("en", "es"):
        S(f"(g.setLang('{lang}'), 0)")
        for eid in S("Object.keys(g.EVENTS)"):
            S(f"(S.cards=[{{type:'event', id:'{eid}', v:{{i:{site}, x:'1', good:true, priv:true, owned:true}}}}], 0)"); S("g.showNext()")
            txt = page.locator("#notice").inner_text()
            if re.search(r"\bev\.|\{\w+\}", txt): raw.append(f"{lang}:{eid}")
        for kind in ("spend", "park", "school", "consult", "reports", "residents", "roads"):
            S(f"(S.cards=[{{type:'directive', d:{{kind:'{kind}', deadline:9, param:3, ref:'X'}}}}], 0)"); S("g.showNext()")
            if re.search(r"\bdir\.|\{\w+\}", page.locator("#notice").inner_text()): raw.append(f"{lang}:dir:{kind}")
        S("(S.cards=[], 0)"); S("g.refresh()")
        if re.search(r"\b(pb|ui|act|pc|meter)\.\w", page.locator("#panel").inner_text()): raw.append(f"{lang}:panel")
    check(not raw, "all cards and the panel render in EN and ES with no raw keys" + (f": {raw}" if raw else ""))
    S("(g.setLang('en'), S.cards=[], 0)"); ev(f"{G}.hideModal()")

    # --- Meter popover explains why it moved
    S("(S.slots=3, 0)"); S("g.lobby()"); S("g.refresh()")
    page.click("#m-local")
    check(page.is_visible("#pop") and "Lunch with the mayor" in page.locator("#pop").inner_text(), "tapping a meter explains why it changed")
    page.mouse.click(5, 300)

    # --- Directive failure twice -> programme suspended
    S("(S.over=null, S.funds=50, S.comp=80, S.strikes=1, S.month=20, S.cards=[], "
      "S.directive={kind:'consult', deadline:20, base:S.consults, param:0, ref:'X'}, 0)")
    S("g.endMonth()")
    check(S("S.over && S.over.why") == "suspended", "two failed directives suspend the programme")

    # --- Perk choice
    S("(S.over=null, S.perkChoice=['cousin','notary','prefab'], 0)"); S("g.choosePerk('cousin')")
    check(S("S.perks.includes('cousin') && S.perkChoice===null"), "choosing a perk applies it")

    # --- Win: inauguration shown in the UI
    clear_cards(); S("(S.over=null, S.funds=40, S.debt=0, S.newcomers=2*g.CFG.target, S.directive=null, 0)"); S("g.endMonth()")
    check(S("S.over && S.over.win"), "reaching the target wins")
    S("(S.cards=[], 0)"); S("g.showNext()")
    check(page.is_visible("text=Inauguration!"), "the inauguration notice is shown")

    # --- Save / continue through the real UI
    ev(f"{G}.newGame(7)")
    S("(S.slots=3, 0)"); S("g.fileReport()"); clear_cards(); S("g.endMonth()")
    town = S("S.town")
    page.reload()
    check(page.is_visible(f"text=Continue · {town}"), "the start menu offers to continue the saved programme")
    page.click(f"text=Continue · {town}")
    page.wait_for_timeout(100)

    def drain():
        for _ in range(12):
            if page.locator("#modal:not(.hidden) .choice").count():
                page.locator("#modal:not(.hidden) .choice:not([disabled])").first.click()
            elif page.locator("#modal:not(.hidden) .perk").count():
                page.locator("#modal:not(.hidden) .perk").first.click()
            elif page.locator("#modal:not(.hidden) .btn.primary").count():
                page.locator("#modal:not(.hidden) .btn.primary").first.click()
            else:
                return
            page.wait_for_timeout(40)
    drain()
    check(S("S.town") == town and S("S.month") == 2, "continue restores town and month")
    page.click("#endTurn"); drain()
    if S("S.cards.length") == 0 and S("S.month") == 2:
        page.click("#endTurn"); drain()
    check(S("S.month") == 3, "the 'End month' button advances to the next month")

    # --- Layout
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
    # Pixel-art sprites: the whole sheet builds (it is also what tools/export_sprites.py dumps)
    check(ev(f"Object.keys({G}.spriteSheet().atlas).length") >= 60, "pixel-art sprite sheet builds")
    check(not errors, "no JS errors in the console" + (f": {errors}" if errors else ""))
    browser.close()

print()
if failures:
    print(f"{len(failures)} failure(s)")
    sys.exit(1)
print("All OK")
