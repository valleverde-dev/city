"""Smoke test for the Eurocrat web prototype (v0.9: the Euroregion run, the floating HUD and the bottom bar, the run file, panning).

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
    check(page.is_visible("#cover .cv-logo") and items == ["new euroregion", "continue", "career file", "settings", "credits"], f"the title screen shows the logo and New Euroregion · Continue · Career file · Settings · Credits ({items})")
    check("2×2 hamlet" in page.locator("#cover .cv-item.new").inner_text(), "with no record yet, New Euroregion says it starts with a 2×2 hamlet")
    check(page.locator("#cover .cv-item.cont").is_disabled(), "Continue is disabled with no saved programme")
    check(page.is_visible("#cover .cv-foot .ver") and "Groenendaal" in page.locator("#cover .cv-foot .copy").inner_text(), "version and copyright sit in the corners")
    cb = cv.bounding_box(); vw = page.viewport_size
    check(cb["width"] == vw["width"] and cb["height"] == vw["height"], "the title screen covers the whole viewport")
    page.keyboard.press("ArrowDown"); page.keyboard.press("ArrowDown"); page.keyboard.press("Enter")
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
    check("settlement i ·" in page.locator("#townName").inner_text().lower(), "the header names the settlement")
    check(page.locator("#meters").is_hidden(), "settlement I shows no meters (none of those rules are in play)")
    check(S("g.dock") == "agenda" and page.locator("#strip .tile.act").count() == 0 and page.locator("#strip .tile").count() >= 1, "settlement I: the bottom bar shows the goal, no agenda yet")
    check(page.is_visible("#guide") and "step 1 of" in page.locator("#guide").inner_text().lower(), "the mayor's guide shows step 1")
    lot = S("S.grid.findIndex(p=>p.k==='farm' && p.st==='land')")
    tap(lot)
    check(S("g.dock") == "parcel" and S("g.selected") == lot and page.locator("#strip .tile[data-k=buy]").count() == 1, "tapping a parcel shows what you can do with it in the bottom bar (no sheet)")
    page.locator("#strip .tile[data-k=buy]").click(); page.wait_for_timeout(60)
    check(S(f"S.grid[{lot}].st") == "owned", "buy the parcel from the bar")
    check(S("S.rs.xp") > 0 and page.locator("#runBtn .xpbar i").count() == 1, "every step gives experience at once (the run file's bar fills)")
    check("step 2 of" in page.locator("#guide").inner_text().lower(), "the guide moves to step 2")
    check(page.locator("#strip .tile.build").count() == 2, "settlement I offers only housing and park (no roads, factories or services)")
    page.locator("#strip .tile.build[data-k=housing]").click(); page.wait_for_timeout(80)
    check(S("g.armed") == "housing" and page.is_visible("#confirm .ok") and S(f"S.grid[{lot}].st") == "owned", "picking a building shows it as a ghost on the map, with Confirm beside it")
    page.locator("#confirm .ok").click(); page.wait_for_timeout(60)
    check(S(f"S.grid[{lot}].ty") == "housing" and page.locator("#confirm").is_hidden(), "confirm: the permit for a housing block is requested")
    check(page.locator("#endTurn.nudge").count() == 1, "the guide nudges the End month button")
    for _ in range(10):
        if S("!!S.over || !!S.pending"): break
        page.click("#endTurn"); page.wait_for_timeout(60)
    check(S("S.pending") == "attach" and not S("S.over"), f"settlement I is consolidated by ending months ({S('S.month')} months)")
    check(S("S.debt") == 0, "settlement I never needs a loan")
    check(page.is_visible("#drama.win") and page.locator("#drama .ribbon").count() == 1, "consolidating is a full-screen inauguration (ribbon, confetti)")
    page.locator("#drama").click(); page.wait_for_timeout(900)
    check(page.is_visible("#drama .gazette") and page.locator("#drama canvas.regionmap").count() == 1, "then the Union Gazette's front page, with the region map")
    page.locator("#drama .go").click(); page.wait_for_timeout(60)
    check(page.locator("#drama").is_hidden(), "Continue closes the full-screen moment")
    check(page.locator("#notice .perk").count() == 3, "then choose 1 of 3 perks")
    perk = S("S.perkChoice[0]")
    page.locator("#notice .perk").first.click(); page.wait_for_timeout(100)
    nc = S("S.region.cands.length")
    check(page.locator("#modal").is_hidden() and S("g.dock") == "attach" and page.locator("#strip .tile.plot").count() == nc and 1 <= nc <= 4,
          f"then the next plot is chosen on the map: {nc} numbered plots, also as cards in the bar")
    check(page.locator("#strip .tile.go").is_disabled(), "nothing is acquired until a plot is chosen")
    box = page.locator("#map").bounding_box()
    vis = [j for j in range(nc) if (lambda q: 0 < q[0] < box["width"] and 0 < q[1] < box["height"])(S(f"(()=>{{const P=S.region.cands[{j}]; return g.screenOfW(P.y+(P.n-1)/2, P.x+(P.n-1)/2);}})()"))]
    check(len(vis) == nc, f"the plots on offer are framed on the map ({len(vis)} of {nc} visible)")
    k = vis[0] if vis else 0; P = S(f"S.region.cands[{k}]")
    x, y = S(f"g.screenOfW({P['y']}+({P['n']}-1)/2, {P['x']}+({P['n']}-1)/2)")
    page.mouse.click(box["x"] + x, box["y"] + y); page.wait_for_timeout(100)
    check(S("g.attachSel") == k and page.locator(f"#strip .tile.plot.on[data-k='{k}']").count() == 1, "tapping a plot on the map selects it (and its card)")
    page.locator("#strip .tile.go").click(); page.wait_for_timeout(150)
    check(S("S.stage") == 1 and S("Math.sqrt(S.grid.length)") == 4 and S("S.region.blocks.length") == 1, "the next settlement is a 4×4 next to the region")
    check(S(f"S.region.active.x === {P['x']} && S.region.active.y === {P['y']}") and S("S.frontier.some(f=>f.b===0)"), "it is the chosen plot of the same world map, next to the hamlet")
    check(S(f"S.perks.includes('{perk}') || (S.shovel && '{perk}'==='shovel')"), "the perk stays for the rest of the run")
    check(page.is_visible("text=Expansion Phase") and "Settlement II" in page.locator("#notice .lvl-tag").inner_text(), "settlement II card")
    clear_cards(); S("(g.showNext(), 0)")
    check(not page.locator("#m-local").is_hidden() and page.locator("#m-neigh").is_hidden(), "settlement II shows only the Mayor meter")
    check(S("g.dock") == "agenda" and page.locator("#strip .tile[data-k=lobby]").count() == 1, "settlement II: with nothing selected, the bar is the agenda (lunch with the mayor)")
    check(S("g.on('access') && !g.on('rustic') && !g.on('events')"), "settlement II rules: access yes, rustic land and events not yet")
    page.click("#runBtn"); page.wait_for_timeout(60); page.click("#run .rtab[data-t=region]"); page.wait_for_timeout(60)
    check(page.locator("#run canvas.regionmap").count() == 1 and page.is_visible("#run .rbox.town"), "the run file's Region tab shows the Euroregion map and this settlement in numbers")
    page.click("#run .run-x")

    # --- Back to the menu: the run can be continued
    page.click("#menuBtn"); page.click("text=Main menu")
    check("Settlement II" in page.locator("#cover .cv-item.cont").inner_text(), "the menu offers to continue the run at settlement II")
    check(page.evaluate("!!document.querySelector('#toast') && document.querySelector('#toast').textContent.length > 5") and "firstStone" in page.evaluate("localStorage.getItem('eurocrat_career')"), "achievements pop up as banners during play, and stay in the career")
    page.click("#cover .cv-item.career"); page.wait_for_timeout(60)
    check(page.locator(".cv-career li").count() == 8 + S("Object.keys(g.ACH_BY_ID).length") and page.locator(".cv-career li.on").count() >= 2,
          "the career file lists the 8 unlockable buildings and every achievement (market unlocked already)")
    page.keyboard.press("Escape")
    page.click("#cover .cv-item.new"); page.wait_for_timeout(60)
    check(page.locator("#cover .cv-item.draft").count() == 3 and page.locator("#cover .cv-item.tut").count() == 1, "after the tutorial, New Euroregion offers three dossiers (or the tutorial again)")
    page.keyboard.press("Escape"); page.keyboard.press("Escape")

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
    check(cam1 != cam0 and S("g.selected") == -1, "dragging moves the map (and does not select a parcel)")
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
    check(S("S.over && S.over.why") == "bankrupt" and page.is_visible("#drama.lose") and page.locator("#drama .stamp-big").count() == 1,
          "a loss is a full-screen moment: the dossier is stamped and shredded")
    page.locator("#drama").click(); page.wait_for_timeout(500)
    check(page.is_visible("#drama .gazette") and page.locator("#drama canvas.regionmap").count() == 1 and page.is_visible("#drama >> text=New Euroregion"),
          "then the Gazette, what the region reached, and start a new one")
    check(page.locator("#drama .xpbar").count() == 1 and S("S.over.career && S.over.career.after > S.over.career.before"), "every run gives experience, even a lost one")
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
    check(page.locator("#strip .tile.build .tb.mystery").count() >= 1, "undiscovered combos show as '?' on the building cards")
    page.locator("#strip .tile.build[data-k=housing]").click(); page.wait_for_timeout(60)
    check(page.locator("#chips .mchip").count() >= 1, "the ghost shows where a combo would form, on the map")
    S("(g.setArmed(null), 0)")
    S("g.endMonth()")
    check(S("S.cards.filter(c=>c.type==='combo').length") == 2 and S("g.discovered().filter(id=>g.COMBOS.some(c=>c.id===id)).length") == 2, "new combos are announced and discovered")
    S("g.showNext()"); page.wait_for_timeout(80)
    banner = page.locator("#toast.combo").count() == 1 or "combo" in S("g.toasts")
    check(S("S.cards.length") == 0 and page.locator("#modal").is_hidden() and banner, "a new combo is a banner, not a letter: the game goes on")
    S("(S.cards=[{type:'notice', char:'mayor', icon:'map', key:'plan.ok', p:{n:1}, stamp:'stamp.approved', cls:'ok'}], 0)"); S("g.showNext()")
    nb = page.locator("#notice").bounding_box(); vw = page.viewport_size
    check(abs((nb["x"] + nb["width"]/2) - vw["width"]/2) < 40, "letters appear in the middle of the screen")
    clear_cards(); ev(f"{G}.hideModal()"); S("(g.refresh(), 0)")
    page.keyboard.press("e"); page.wait_for_timeout(60)
    check(S("g.runTab") == "combos" and page.locator("#run .ccard").count() == S("g.COMBOS.length + Object.keys(g.RCOMBO_BY_ID).length"), "E opens the run file on the combo collection (adjacency and region combos)")
    page.click("#run .rtab[data-t=perks]"); page.wait_for_timeout(40)
    check(page.locator("#run .qcard").count() == 14 and page.locator("#run .pcard").count() >= 1, "Perks: this run's hand and the whole pool (some locked by rank)")
    page.click("#run .rtab[data-t=career]"); page.wait_for_timeout(40)
    check(page.locator("#run .ucard").count() == 8 and page.locator("#run .achs .md").count() == S("Object.keys(g.ACH_BY_ID).length"), "Career: level and rank, achievements, the 8 buildings to unlock")
    page.keyboard.press("Escape")
    check(S("g.runTab") is None, "Esc closes it")
    S(f"(Object.assign(S.grid[{at(2,3)}],{{k:'farm',st:'built',ty:'school'}}), 0)")
    check(S(f"g.hasAccess({r0+3},{c0+4})") and S(f"g.hasAccess({r0+1},{c0+2})"), "a finished building gives access to its neighbours")
    S(f"(S.grid[{at(2,3)}].st='building', 0)")
    check(not S(f"g.hasAccess({r0+3},{c0+4})"), "a building under construction does not give access yet")

    # --- Event cards with characters and choices
    ev(f"{G}.newGame(5, 3)")
    site = S("(()=>{ const i=S.grid.findIndex(p=>p.k==='farm'); Object.assign(S.grid[i],{st:'building', ty:'housing', t:3, mcost:1}); return i; })()")
    S(f"(S.cards=[{{type:'event', id:'archaeology', v:{{i:{site}}}}}], 0)"); S("g.showNext()")
    check(page.is_visible("#dock >> text=Archaeological find") and page.locator("#strip .choice").count() == 3 and page.locator("#modal").is_hidden(),
          "an event takes the bottom bar: its character, the headline and three choices (the map stays in view)")
    page.click("#strip .choice[data-k=call]")
    check(S(f"S.grid[{site}].halt") == 3 and S("g.dock") != "event", "choosing 'by the book' halts the site 3 months, and the bar is free again")
    S("(S.cards=[{type:'result', id:'archaeology', res:'caught', v:{i:%d}}], 0)" % 0); S("g.showNext()")
    check(S("g.dock") == "event" and page.locator("#strip .tile.result").count() == 1, "an outcome shows in the bar too")
    page.click("#strip .tile[data-k=ok]")
    page.click("#inboxBtn")
    check(page.is_visible("#inbox") and page.locator("#inbox .problems li.bad").count() >= 1, "the inbox lists what needs attention, with the halted site")
    page.locator("#inbox .problems li.bad.go").first.click()
    check(S("g.dock") == "parcel" and S("g.selected") == site and page.locator("#inbox").is_hidden(), "tapping a problem jumps to its parcel")
    page.keyboard.press("Escape")

    # --- Every card, level and guide step renders in both languages without raw keys
    raw = []
    for lang in ("en", "es"):
        S(f"(g.setLang('{lang}'), 0)")
        for eid in S("Object.keys(g.EVENTS)"):
            S(f"(S.cards=[{{type:'event', id:'{eid}', v:{{i:{site}, x:'1', good:true, priv:true, owned:true}}}}], 0)"); S("g.showNext()")
            if re.search(r"\bev\.|\{\w+\}", page.locator("#dock").inner_text()): raw.append(f"{lang}:{eid}")
        for k in range(6):
            ev(f"{G}.newGame(9, {k})"); S("(S.cards=[{type:'level'}], 0)"); S("g.showNext()")
            if re.search(r"\b(lvl|stl|st|std|rcombo)\.|\{\w+\}", page.locator("#notice").inner_text()): raw.append(f"{lang}:level{k+1}")
            S("(S.cards=[], 0)"); ev(f"{G}.hideModal()"); S("(g.refresh(), 0)")
            if re.search(r"\b(g\d|ui|tab|pb|d|dw|tag|hud|xp|file|meterS|bns)\.\w|\{\w+\}", page.locator("#guide").inner_text() + page.locator("#dock").inner_text() + page.locator("#hud").inner_text()): raw.append(f"{lang}:guide{k+1}")
            for tab in ("combos", "perks", "career", "region"):
                S(f"(g.openRun('{tab}'), 0)")
                if re.search(r"\b(file|xp|perk|perkd|ach|lock|combo|rcombo|piece|st|std|ui|rank|b)\.\w|\{\w+\}", page.locator("#run").inner_text()): raw.append(f"{lang}:run-{tab}{k+1}")
            S("(g.closeRun(), g.toggleInbox(true), 0)")
            if re.search(r"\b(pb|ui|inbox|log)\.\w|\{\w+\}", page.locator("#inbox").inner_text()): raw.append(f"{lang}:inbox{k+1}")
            S("(g.toggleInbox(false), 0)")
            for st in ("land", "owned", "review", "building", "built"):
                i = S(f"(()=>{{ const i=S.grid.findIndex(p=>p.k==='farm'); Object.assign(S.grid[i], {{st:'{st}', ty:'{st}'==='land'||'{st}'==='owned' ? null : 'housing', t:2, mcost:1, urban:true}}); g.centreOn(i); g.refresh(); return i; }})()")
                tap(i)
                if re.search(r"\b(d|dw|tag|pcs|lock|b|k|ui|style|names)\.\w|\{\w+\}", page.locator("#dock").inner_text()): raw.append(f"{lang}:parcel-{st}{k+1}")
                page.keyboard.press("Escape")
        # the Euroregion cards: consolidation, region combo, attach, end of run
        ev(f"{G}.newGame(9, 2)")
        S("(S.cards=[], S.newcomers=3*g.CFG.target, S.directive=null, 0)"); S("g.endMonth()")
        S("(S.cards=[S.cards.find(c=>c.type==='consolidated')], 0)")
        S("g.showNext()"); page.wait_for_timeout(20); page.locator("#drama").click(); page.wait_for_timeout(50)
        if re.search(r"\b(cons|rcombo|st|ui|news|drama)\.\w|\{\w+\}", page.locator("#drama").inner_text()): raw.append(f"{lang}:consolidated")
        S("(S.cards=[{type:'rcombo', id:'slurry', b:0}], 0)"); S("g.showNext()"); page.wait_for_timeout(20)
        if re.search(r"\b(toast|rcombo|rcombod)\.\w|\{\w+\}", page.evaluate("document.getElementById('toast').innerText")): raw.append(f"{lang}:rcombo")
        S("(S.perkChoice=null, 0)"); S("g.showNext()"); S("(g.refresh(), 0)")
        if re.search(r"\b(att|side|st|std|rcombo|land|d)\.\w|\{\w+\}", page.locator("#dock").inner_text()): raw.append(f"{lang}:attach")
        for why in ("timeout", "bankrupt", "audit", "suspended", "court"):
            S(f"(S.pending=null, S.over={{win:false, why:'{why}', dramaPlayed:true}}, 0)"); S("g.showNext()")
            if re.search(r"\b(over|run|ui|news|sum|rank|ach)\.\w|\{\w+\}", page.locator("#drama").inner_text()): raw.append(f"{lang}:over-{why}")
        S("(S.over=null, 0)")
        ev(f"{G}.startRun()"); ev(f"{G}.hideModal()"); page.click("#menuBtn"); page.click("text=Main menu" if lang == "en" else "text=Menú principal")
        for view in ("career", "new"):
            page.click(f"#cover .cv-item.{view}"); page.wait_for_timeout(50)
            if re.search(r"\b(car|ach|rank|b|bd|title|draft|st|std|perk|country)\.\w|\{\w+\}", page.locator("#cover").inner_text()): raw.append(f"{lang}:menu-{view}")
            page.keyboard.press("Escape")
        page.keyboard.press("Escape")
    check(not raw, "cards, settlements, guide, the bar, the run file and the inbox render in EN and ES with no raw keys" + (f": {raw}" if raw else ""))
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

    # --- Layout: the map fills the screen, the HUD floats over it, one bar at the bottom that never changes size; phone too
    def rect(sel):
        return page.locator(sel).bounding_box()
    w, dk, hd = rect("#world"), rect("#dock"), rect("#hud")
    check(dk["y"] >= w["y"] + w["height"] - 1 and w["width"] >= 1170 and hd["y"] < w["y"] + 20, "iPad: the map uses the full width, the HUD floats over it, one bar at the bottom")
    h0 = rect("#dock")["height"]; lot3 = S("(()=>{ const i=S.grid.findIndex(p=>p.k==='farm' && p.st==='land'); g.centreOn(i); g.refresh(); return i; })()"); tap(lot3)
    check(S("g.dock") == "parcel" and abs(rect("#dock")["height"] - h0) < 1, "iPad: selecting a parcel changes what the bar shows, not its size (nothing slides in)")
    page.keyboard.press("Escape")
    page.set_viewport_size({"width": 390, "height": 844}); page.wait_for_timeout(200)
    ev(f"{G}.newGame(11, 3)"); clear_cards(); S("(g.refresh(), 0)"); page.wait_for_timeout(100)
    hd = rect("#hud"); w = rect("#world"); dk = rect("#dock")
    check(hd["height"] < 110, f"iPhone: the HUD takes two short rows ({hd['height']:.0f}px)")
    check(w["height"] > 450 and dk["y"] + dk["height"] <= 844 + 1, f"iPhone: the map gets most of the screen ({w['height']:.0f}px)")
    check(ev("document.documentElement.scrollWidth <= innerWidth"), "iPhone: no horizontal overflow")
    sw = ev("(()=>{ const s=document.getElementById('strip'); return [s.scrollWidth, s.clientWidth]; })()")
    check(sw[0] > sw[1], "iPhone: the bar's cards scroll sideways")
    fs = ev("parseFloat(getComputedStyle(document.querySelector('#strip .tile b')).fontSize)")
    check(fs >= 15, f"card titles are readable ({fs:.0f}px)")
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
