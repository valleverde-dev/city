"""Smoke test for the Eurocrat web prototype (v0.6: the Euroregion run, guide, sheets, panning).

Usage:    npm run build && python3 web-prototype/tests/smoke_test.py [path/to/index.html]   (default: dist/index.html)
Requires: pip install playwright && python3 -m playwright install chromium
"""
import pathlib
import re
import sys

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]
target = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "dist" / "index.html"
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

    # --- Title screen: logo, the four-item menu, version and copyright; settings (language), credits, level list
    cv = page.locator("#cover")
    items = [x.strip().lower() for x in page.locator("#cover .cv-item b").all_inner_texts()]
    check(page.is_visible("#cover .cv-logo") and items == ["new euroregion", "continue", "settings", "credits"], f"the title screen shows the logo and New Euroregion · Continue · Settings · Credits ({items})")
    check("2×2 hamlet" in page.locator("#cover .cv-item.new").inner_text(), "with no record yet, New Euroregion says it starts with a 2×2 hamlet")
    check(page.locator("#cover .cv-item.cont").is_disabled(), "Continue is disabled with no saved programme")
    check(page.is_visible("#cover .cv-foot .ver") and "Groenendaal" in page.locator("#cover .cv-foot .copy").inner_text(), "version and copyright sit in the corners")
    cb = cv.bounding_box(); vw = page.viewport_size
    check(cb["width"] == vw["width"] and cb["height"] == vw["height"], "the title screen covers the whole viewport")
    page.keyboard.press("ArrowDown"); page.keyboard.press("Enter")
    check(page.locator("#cover .cv-menu").get_attribute("data-view") == "settings", "arrow keys skip the disabled item; Enter opens Settings")
    page.locator("#cover .cv-item.lang").click()
    check(page.is_visible("text=Idioma: Español") and S("g.lang") == "es", "switching to Spanish translates the menu")
    page.reload()
    check(page.is_visible("text=Nueva Euroregión"), "the language choice is remembered")
    page.click("text=Ajustes"); page.locator("#cover .cv-item.lang").click()
    check(page.is_visible("text=Language: English"), "switching back to English")
    page.keyboard.press("Escape")
    check(page.locator("#cover .cv-menu").get_attribute("data-view") == "main", "Esc goes back to the main menu")
    page.click("text=Credits")
    check("Groenendaal" in page.locator("#cover .cv-credits").inner_text(), "the credits name the author")
    page.click("text=Back")

    # --- Settlement I through the real UI: intro, settlement card, guide, buy, build, end months, consolidation
    page.click("#cover .cv-item.new")
    check(page.is_visible("text=Letter of appointment") and "Euroregion" in page.locator("#notice").inner_text(), "a new Euroregion starts with the appointment letter")
    page.click("text=Accept the appointment")
    check(page.is_visible("text=Pilot Project") and page.locator("#notice .rules li").count() >= 3 and page.is_visible("#notice .stype"), "the settlement card explains its type, the goal and the new rules")
    page.click("text=Get to work")
    check(S("Math.sqrt(S.grid.length)") == 2 and S("S.stage") == 0 and S("S.stype") == "hamlet", "settlement I is a 2×2 hamlet")
    check("Settlement I ·" in page.locator("#townName").inner_text(), "the header names the settlement")
    check(page.locator("#meters").is_hidden(), "settlement I shows no meters (none of those rules are in play)")
    check(page.locator(".tab[data-tab=agenda]").is_hidden() and page.locator(".tab[data-tab=combos]").is_hidden(), "settlement I hides the Agenda and Combos tabs")
    check(page.is_visible("#guide") and "step 1 of" in page.locator("#guide").inner_text().lower(), "the mayor's guide shows step 1")
    lot = S("S.grid.findIndex(p=>p.k==='farm' && p.st==='land')")
    tap(lot)
    check(S("g.sheet") == "parcel" and page.is_visible("#sheet") and S("g.selected") == lot, "tapping a parcel opens its sheet")
    page.locator("#sheet .act").first.click(); page.wait_for_timeout(60)
    check(S(f"S.grid[{lot}].st") == "owned", "buy the parcel from the sheet")
    check("step 2 of" in page.locator("#guide").inner_text().lower(), "the guide moves to step 2")
    check(page.locator("#sheet .act.build").count() == 2, "settlement I offers only housing and park (no roads, factories or services)")
    page.locator("#sheet .act.build").first.click(); page.wait_for_timeout(60)
    check(S(f"S.grid[{lot}].ty") == "housing", "order a housing block")
    check(page.locator("#endTurn.nudge").count() == 1, "the guide nudges the End month button")
    for _ in range(10):
        if S("!!S.over || !!S.pending"): break
        page.click("#endTurn"); page.wait_for_timeout(60)
    check(S("S.pending") == "attach" and not S("S.over"), f"settlement I is consolidated by ending months ({S('S.month')} months)")
    check(S("S.debt") == 0, "settlement I never needs a loan")
    check(page.is_visible("text=is consolidated!") and page.locator("#notice canvas.regionmap").count() == 1, "the consolidation card shows the region map")
    page.locator("#notice .btn.primary").first.click(); page.wait_for_timeout(60)
    check(page.locator("#notice .perk").count() == 3, "then choose 1 of 3 perks")
    perk = S("S.perkChoice[0]")
    page.locator("#notice .perk").first.click(); page.wait_for_timeout(100)
    nc = S("S.region.cands.length")
    check(page.locator("#modal").is_hidden() and S("g.sheet") == "attach" and page.locator("#sheet .choice.side").count() == nc and 1 <= nc <= 4,
          f"then the next plot is chosen on the map: {nc} numbered plots, listed in a sheet")
    check(page.locator("#sheet .acquire").is_disabled(), "nothing is acquired until a plot is chosen")
    box = page.locator("#map").bounding_box(); shr = page.locator("#sheet").bounding_box()
    vis = [j for j in range(nc) if (lambda q: q[0] + box["x"] > shr["x"] + shr["width"] + 10 and 0 < q[1] < box["height"])(S(f"(()=>{{const P=S.region.cands[{j}]; return g.screenOfW(P.y+(P.n-1)/2, P.x+(P.n-1)/2);}})()"))]
    check(len(vis) >= 1, f"the plots on offer are framed beside the sheet ({len(vis)} of {nc} visible)")
    k = vis[0] if vis else 0; P = S(f"S.region.cands[{k}]")
    x, y = S(f"g.screenOfW({P['y']}+({P['n']}-1)/2, {P['x']}+({P['n']}-1)/2)")
    page.mouse.click(box["x"] + x, box["y"] + y); page.wait_for_timeout(100)
    check(S("g.attachSel") == k and page.locator(f"#sheet .choice.side.on[data-k='{k}']").count() == 1, "tapping a plot on the map selects it")
    page.locator("#sheet .acquire").click(); page.wait_for_timeout(150)
    check(S("S.stage") == 1 and S("Math.sqrt(S.grid.length)") == 4 and S("S.region.blocks.length") == 1, "the next settlement is a 4×4 next to the region")
    check(S(f"S.region.active.x === {P['x']} && S.region.active.y === {P['y']}") and S("S.frontier.some(f=>f.b===0)"), "it is the chosen plot of the same world map, next to the hamlet")
    check(S(f"S.perks.includes('{perk}') || (S.shovel && '{perk}'==='shovel')"), "the perk stays for the rest of the run")
    check(page.is_visible("text=Expansion Phase") and "Settlement II" in page.locator("#notice .lvl-tag").inner_text(), "settlement II card")
    clear_cards(); S("(g.showNext(), 0)")
    check(not page.locator("#m-local").is_hidden() and page.locator("#m-neigh").is_hidden(), "settlement II shows only the Mayor meter")
    check(page.locator(".tab[data-tab=agenda]").is_visible() and page.locator(".tab[data-tab=combos]").is_visible(), "settlement II unlocks the Agenda and Combos tabs")
    check(S("g.on('access') && !g.on('rustic') && !g.on('events')"), "settlement II rules: access yes, rustic land and events not yet")
    page.click(".tab[data-tab=city]"); page.wait_for_timeout(100)
    check(page.locator("#sheet canvas.regionmap").count() == 1 and page.is_visible("#sheet .stype"), "the Town sheet shows the Euroregion map and this settlement's type")
    page.click(".tab[data-tab=city]")

    # --- Back to the menu: the run can be continued
    page.click("#menuBtn"); page.click("text=Main menu")
    check("Settlement II" in page.locator("#cover .cv-item.cont").inner_text(), "the menu offers to continue the run at settlement II")
    page.keyboard.press("Escape")

    # --- Full rules: settlement IV (16×16, with made-up neighbours), deterministic; its type's bonuses switched off
    ev(f"{G}.newGame(42, 3)"); clear_cards(); S("(S.rfx={}, g.refresh(), 0)")
    N = S("Math.sqrt(S.grid.length)")
    check(N == 16 and S("g.on('market') && g.on('milestones')"), "settlement IV is a 16×16 map with every rule")
    WN = (ev(f"{G}.artSize[0]") - 32) // 64
    land = S("Object.keys(S.world.cells).length")
    check(S("S.frontier.length") > 0 and land > N * N and WN >= N + 2, f"the map is all the land of the region ({land} parcels), drawn around the settlement")
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
    S("(g.panBy(-99999, -99999), 0)")
    check(S("g.cam") == [cx, cy] and abs(cx) <= WN*32 + 1, "the camera cannot leave the map")

    # Land rules
    check(not S("g.acquire(S.grid.findIndex(p=>p.k==='regional')).ok"), "the regional road is not for sale")
    hab = S("S.grid.findIndex(p=>p.k==='habitat')")
    check(hab < 0 or not S(f"g.acquire({hab}).ok"), "protected habitat cannot be bought")
    muni = S("S.grid.findIndex(p=>p.k==='muni' && p.st==='land')")
    S("(S.local=30, 0)")
    check(muni < 0 or S(f"g.acquire({muni}).msg.k") == "err.mayorNo", "municipal land needs the mayor (support ≥ 40)")
    S("(S.local=60, S.slots=3, 0)")
    S(f"(()=>{{ for(let r=2;r<10;r++) for(let c=2;c<10;c++) Object.assign(S.grid[r*{N}+c], {{k:'farm', st:'land', ty:null}}); return 0; }})()")   # plain farmland around (5,5)
    road = 5*N + 5
    S(f"(S.grid[{road}]={{...S.grid[{road}], k:'farm', st:'built', ty:'road'}}, 0)")
    check(S("g.hasAccess(6,6)") and S("g.hasAccess(4,4)") and not S("g.hasAccess(7,7)"), "access counts diagonal neighbours (8-way)")
    acc = f"(p,i)=>p.k==='farm' && p.st==='land' && g.hasAccess(Math.floor(i/{N}), i%{N}) && Math.abs(Math.floor(i/{N})-5)+Math.abs(i%{N}-5)>3"
    lot = S(f"S.grid.findIndex({acc})")
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
    lot2 = S(f"S.grid.findIndex({acc})")
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
    check(S("S.pending") == "attach" and S("S.region.blocks.length") == 4, "reaching the target consolidates the settlement")
    check(S("S.region.next.n") == 16 and S("S.region.cands.length") >= 1, "after 16×16 the next settlements stay 16×16")
    S("(S.cards=[], S.perkChoice=null, 0)"); S("g.attach(0)"); clear_cards()
    check(S("S.stage") == 4 and S("g.CFG.target") > 1100, "settlement V: same size, higher target")
    S("(S.debt=g.CFG.debtCap+1, S.cards=[], 0)"); S("g.endMonth()"); S("g.showNext()")
    check(S("S.over && S.over.why") == "bankrupt" and page.is_visible("text=New Euroregion") and page.locator("#notice canvas.regionmap").count() == 1,
          "a loss ends the run: what the region reached, and start a new one")
    check(S("g.records().best.settlements") >= 4, "the record keeps the best Euroregion")

    # --- Combos (discovered by building), access through finished buildings
    S("localStorage.removeItem('eurocrat_combos')")
    ev(f"{G}.newGame(3, 3)"); clear_cards()
    # a 6×6 patch of plain farmland in the middle of the plot (whatever the world put there)
    r0, c0 = 6, 6
    S(f"(()=>{{ for(let a=-1;a<5;a++) for(let b=-1;b<5;b++) Object.assign(S.grid[({r0}+a)*{N}+{c0}+b], {{k:'farm', st:'land', ty:null, urban:true}}); return 0; }})()")
    at = lambda r, c: (r0 + r) * N + c0 + c
    S(f"(()=>{{ const put=(i,ty)=>Object.assign(S.grid[i],{{k:'farm',st:'built',ty}}); put({at(0,0)},'housing'); put({at(0,1)},'park'); return 0; }})()")
    check(S("g.activeCombos().map(x=>x.id).join()") == "greenViews", "housing next to a park = 'Green Views' combo")
    S(f"(Object.assign(S.grid[{at(1,1)}],{{k:'farm',st:'built',ty:'factory'}}), 0)")
    check(S("g.activeCombos().some(x=>x.id==='smoke' && !x.good)"), "a factory diagonal to housing = bad combo")
    S(f"(Object.assign(S.grid[{at(-1,0)}],{{k:'farm',st:'owned',urban:true}}), S.slots=3, g.centreOn({at(-1,0)}), g.refresh(), 0)")
    tap(at(-1, 0))
    check(page.locator("#sheet .chip.mystery").count() >= 1, "undiscovered combos show as 'combo?' in the build options")
    S("g.endMonth()")
    check(S("S.cards.filter(c=>c.type==='combo').length") == 2 and S("g.discovered().filter(id=>g.COMBOS.some(c=>c.id===id)).length") == 2, "new combos are announced and discovered")
    S("g.showNext()")
    nb = page.locator("#notice").bounding_box(); vw = page.viewport_size
    check(abs((nb["x"] + nb["width"]/2) - vw["width"]/2) < 40, "cards appear in the middle of the screen")
    clear_cards(); ev(f"{G}.hideModal()"); S("(g.refresh(), 0)")
    page.click(".tab[data-tab=combos]")
    check(S("g.sheet") == "combos" and page.locator("#sheet .catalogue li").count() == S("g.COMBOS.length + Object.keys(g.RCOMBO_BY_ID).length"), "the Combos tab opens the catalogue (adjacency and region combos)")
    page.click(".tab[data-tab=combos]")
    check(S("g.sheet") is None, "tapping the tab again closes it")
    S(f"(Object.assign(S.grid[{at(2,3)}],{{k:'farm',st:'built',ty:'school'}}), 0)")
    check(S(f"g.hasAccess({r0+3},{c0+4})") and S(f"g.hasAccess({r0+1},{c0+2})"), "a finished building gives access to its neighbours")
    S(f"(S.grid[{at(2,3)}].st='building', 0)")
    check(not S(f"g.hasAccess({r0+3},{c0+4})"), "a building under construction does not give access yet")

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
        for k in range(6):
            ev(f"{G}.newGame(9, {k})"); S("(S.cards=[{type:'level'}], 0)"); S("g.showNext()")
            if re.search(r"\b(lvl|stl|st|std|rcombo)\.|\{\w+\}", page.locator("#notice").inner_text()): raw.append(f"{lang}:level{k+1}")
            S("(S.cards=[], 0)"); ev(f"{G}.hideModal()"); S("(g.refresh(), 0)")
            if re.search(r"\b(g\d|ui|tab|pb)\.\w", page.locator("#guide").inner_text() + page.locator("#tabs").inner_text()): raw.append(f"{lang}:guide{k+1}")
            for tab in ("city", "inbox", "problems"):
                S(f"g.openSheet('{tab}')")
                if re.search(r"\b(pb|ui|act|pc|meter|lvl)\.\w|\{\w+\}", page.locator("#sheet").inner_text()): raw.append(f"{lang}:{tab}{k+1}")
            S("g.closeSheet()")
        # the Euroregion cards: consolidation, region combo, attach, end of run
        ev(f"{G}.newGame(9, 2)")
        S("(S.cards=[], S.newcomers=3*g.CFG.target, S.directive=null, 0)"); S("g.endMonth()")
        S("(S.cards=[S.cards.find(c=>c.type==='consolidated'), {type:'rcombo', id:'slurry', b:0}], 0)")
        for _ in range(2):
            S("g.showNext()")
            if re.search(r"\b(cons|rcombo|st|ui)\.\w|\{\w+\}", page.locator("#notice").inner_text()): raw.append(f"{lang}:card{_}")
            S("(S.cards.shift(), 0)")
        S("(S.perkChoice=null, 0)"); S("g.showNext()"); S("(g.refresh(), 0)")
        if re.search(r"\b(att|side|st|std|rcombo|land)\.\w|\{\w+\}", page.locator("#sheet").inner_text()): raw.append(f"{lang}:attach")
        S("(S.pending=null, S.over={win:false, why:'timeout'}, 0)"); S("g.showNext()")
        if re.search(r"\b(over|run|ui)\.\w|\{\w+\}", page.locator("#notice").inner_text()): raw.append(f"{lang}:over")
        S("(S.over={win:true, why:'complete'}, 0)"); S("g.showNext()")
        if re.search(r"\b(over|run|ui)\.\w|\{\w+\}", page.locator("#notice").inner_text()): raw.append(f"{lang}:over")
        S("(S.over=null, 0)")
    check(not raw, "cards, settlements, guide and sheets render in EN and ES with no raw keys" + (f": {raw}" if raw else ""))
    S("(g.setLang('en'), S.cards=[], 0)"); ev(f"{G}.hideModal()")

    # --- Save / continue through the real UI
    ev(f"{G}.newGame(7, 1)")
    S("(S.slots=3, 0)"); S("g.lobby()"); clear_cards(); S("g.endMonth()"); clear_cards(); S("(g.refresh(), 0)")
    town = S("S.town")
    page.reload()
    play = page.locator("#cover .cv-item.cont")
    check(page.is_visible("#cover") and play.is_enabled() and f"Settlement II · {town}" in play.inner_text(), "the start menu offers to continue the saved run")
    check(page.evaluate("document.activeElement.classList.contains('cont')"), "with a saved programme, Continue is the selected item")
    play.click(); page.wait_for_timeout(100); drain()
    check(page.locator("#cover").is_hidden(), "the cover closes when the game starts")
    check(S("S.town") == town and S("S.stage") == 1 and S("Math.sqrt(S.grid.length)") == 4, "continue restores the settlement and its map")
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
    sizes = []
    for lv in range(5):
        ev(f"{G}.newGame(3, {lv})"); clear_cards()
        n = S("Math.round(Math.sqrt(S.grid.length))"); aw = ev(f"{G}.artSize[0]")
        sizes.append(aw >= (n + 2) * 64 + 32 and n == [2, 4, 8, 16, 16][lv])
    check(all(sizes), "every settlement is a plot (2, 4, 8, 16, 16) of a map that grows with the region")
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
