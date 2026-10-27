# Roadmap — Eurocrat

Living project document · update it as the prototype evolves. The game design lives in [docs/GDD.md](docs/GDD.md).

## Overview

**Eurocrat** (working title): a satirical, turn-based roguelike city builder. You are a Brussels programme officer who must deliver a model European town with plenty of money and no power — buy the land, file the permits, survive the neighbours, spend the funds before they expire. Tone and references: *Constructor* (1997), with a hyper-realistic, comic look at how building actually works in contemporary Europe. The plan: validate the loop in the web/iPad prototype, then port to Godot to ship on the App Store and Steam.

## Current status — v0.7.0 (Oct 27, 2026) · the map grows with the region, fair rules, glowing combos

Playtest feedback on v0.6.1: the fixed world felt like buying land on a map that already exists, not building a region; the second settlement was too hard and too random; combo links looked odd.
- **The map grows with the region.** No world in advance: the map is the land the region has. Each new settlement adds land next to it, chosen on the map from four plots (N/E/S/W, in a pinwheel so they never overlap) whose terrain you see before choosing. New land continues the roads and the river that reach it; every plot from 4×4 has its own road and village.
- **Fair, not random.** Permits are approved if political support ≥ 50 when decided (shown in advance, with warnings); stubborn owners (+80%) are marked from the start instead of raising prices at random. The bot now passes settlement II every time; III ~59%, IV ~54%; runs average ~4.1 settlements.
- **Combos glow, Kairosoft-style:** a pulsing gold outline with sparkles (good) or red outline (bad) around the buildings of a combo, instead of dotted links.
- Tests: 16 rules tests, 107 browser checks.

## Previous — v0.6.1 (Oct 27, 2026) · one world map

Playtest feedback on v0.6: joining settlements as separate maps felt wrong, and the new territory did not respect the original map (each settlement was generated as a fresh, rotated site and only a strip of its neighbour was shown). v0.6.1 does it the *Cities: Skylines 2* way:
- **One world map per run** (48×48): regional roads from edge to edge, a river, woods and wetlands, old villages. Land you do not own is veiled.
- **Settlements are plots of that map.** The plot in play is that land, with its roads, river and villages. When it is consolidated, what you built is written back into the world and stays where it was.
- **The next plot is chosen on the map:** up to four highlighted, numbered plots next to the region. Tap one to see what it borders and what is on it, then acquire it.
- When no free land is left next to the region, the **Euroregion is complete** (a win).
- Rendering: the whole world is drawn (static layer + the plot in play) and only the visible part is repainted each frame. Building styles come from the world cell, so a building looks the same before and after consolidation.
- Tests: 15 rules tests (incl. "the new plot is the same land of the world") and 107 browser checks. Bot: about 2.9 settlements per run.

## Previous — v0.6.0 (Oct 27, 2026) · the Euroregion

Separate levels broke the roguelike logic: they played like a campaign. In v0.6 **a run is one Euroregion that grows**:
- **One run, one region.** It starts with a 2×2 hamlet. Every settlement that meets its target is **consolidated** (frozen into the region, still paying half its taxes as a regional dividend). The next one is **attached** on the side you choose: N ↗, E ↘, S ↙ or W ↖. Sizes go 4×4, 8×8, 16×16, then 16×16 again and again with a target 30% higher each time. Any failure ends the run. The rules still switch on one settlement at a time, as in v0.5.
- **Settlement types** (random): farming, industrial, commuter, spa, university, historic, logistics, each with a trait.
- **Region combos** (8 good, 7 bad) depend on where you attach, between the new settlement's type and its neighbours' types: Commuter Belt, Smokestack View, Slurry Season, Rust Belt… They are discovered like building combos and kept in the same catalogue.
- **A real border.** The neighbours' parcels along the edge give access and form ordinary combos with what you build on your side (drawn as a strip in v0.6.0; the whole world map from v0.6.1).
- **Money between settlements:** Brussels recovers 50% of the unspent funds and the other half carries over. Debt and perks carry over too, and you pick a perk at every consolidation.
- **Region map** (isometric minimap) in the Town sheet, on the consolidation card and on the attach card, which outlines the four candidate positions.
- **Records between runs:** most settlements and largest population, shown on the title screen (*New Euroregion*).
- **Balance** (bot, 150 runs): average ~3.3 settlements per run. 10% end in settlement II, 33% in III, then a long tail; very few pass the sixth.
- **Tests:** 14 rules tests in Node (consolidation, attach geometry, the border, region effects, records, the run's difficulty band) and 104 browser checks (a whole consolidation and attach through the UI, every new card in EN/ES).

## Previous — v0.5.1 (Oct 27, 2026) · architecture for scale

No gameplay changes: v0.5.1 makes the prototype ready to grow and to be ported.
- **Modules instead of one file.** The 4,600-line `src/index.html` is now ES modules by layer: `core/` (the rules), `i18n/`, `render/`, `ui/`, `audio/`, plus CSS and the real font files. The build (esbuild) still produces **one self-contained `dist/index.html`**, so the PWA, offline play and GitHub Pages work as before.
- **A portable core.** `src/core/` has no DOM, canvas, audio or `localStorage`; a layer check fails the build if that changes. It is the specification for the Godot port (file → GDScript autoload map in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)).
- **Tests without a browser.** Rules tests in Node (levels, rule flags, determinism, actions, a month passing, save/load, the difficulty band) and the balance bot running in Node with identical results to the browser.
- **Proven identical:** the smoke test (90 checks at the time) passes, the bot gives the same outcomes for the same seeds, the sprite export is pixel-identical and screenshots of title, level card, sheets and month end match the old build pixel for pixel (iPad and iPhone sizes).
- `/godot` is **frozen** at v0.1 until the port starts (see *Port triggers* below).

## Between v0.5.1 and v0.6 — title screen

- **Classic title screen**, from the design wireframe: the logo, a vertical menu — *New game* (the case files) · *Continue* · *Settings* (language, music) · *Credits* — and the version and copyright in the bottom corners, over the animated diorama and an avenue of waving flags. Keyboard: arrows / W-S, Enter, Esc. Replaces the "one-stop shop" panel and the news ticker.
- **The Union's own flag:** the shape and proportions of Vietnam's flag (3:2, one centred star, radius 3/10 of the height) but a white star on European blue. It replaces the portico emblem on the letterheads (the header shows only the logo), and every flag on the title screen (the avenue, the front row, the diorama's plazas) now flies it instead of the flag of Europe; the star rides the waving cloth as one piece so it stays legible. The portico's small icon became a ballot box (municipal land) and ruins (archaeology). The flag of Europe is no longer used anywhere.
- **Game logo:** EUROCRAT as a pixel-art asset with a transparent background (`art/logo/`: SVG + PNG 1×/4×/8×; `tools/make_logo.py` rebuilds it from the Jersey 10 font), CRAT in the secondary yellow. It replaces the EUROCRAT text on the title screen and in the header.
- The version shown comes from `core/config.js` (`VERSION`); the build fails if it differs from `package.json`.
- Smoke test: 96 checks (menu, its views, keyboard navigation, Continue pre-selected with a save).

## Previous — v0.5.0 (Oct 26, 2026)

Playtest feedback: "I don't know what to do", "too much information", "too hard". v0.5 answers all three:
- **Campaign of 4 levels** with maps of 2×2, 4×4, 8×8 and 16×16. Each level switches on new rules (and only shows the UI for the rules in play). Levels I–II cannot be lost.
- **Guide:** a level card with the goal and what is new, then the mayor (or Brussels) walks you through each step and highlights where to tap.
- **Progression:** completing a level unlocks the next and lets you carry 1 of 3 perks; the combo catalogue persists.
- **New interface:** full-screen map; bottom tab bar (Agenda · Town · End month · Inbox · Combos); sheets on demand; a bell for problems; directive pill on the map; compact meters on phones.
- **New title screen:** a full-screen scene instead of a dialog — a hand-composed, animated pixel diorama of the model town (with two plazas of EU flags) floating over an avenue of waving flags of Europe, a nearer row of big flags when there is room. Classic layout: the logo, a vertical menu — *New game* (the case files, i.e. the levels) · *Continue* (disabled with no save; selected when there is one) · *Settings* (language, music) · *Credits* (author, music and font rights, satire disclaimer) — and the version and copyright in the bottom corners. Arrow keys / W-S move, Enter picks, Esc goes back; the cover blocks map input. The version shown comes from `core/config.js`, which the build checks against `package.json`.
- **Moving the map:** drag with one finger or the mouse, pinch / wheel / +− to zoom, WASD / arrows on PC, keyboard shortcuts (R, C, Space, Esc).
- **Difficulty curve** (test bot, no carried perks): I 100% · II ~84% · III ~38% · IV ~35%.
- **Tests:** 89-check smoke test (a full level I played through the UI, level progression, panning, sheets, both languages, phone and iPad layouts).

## Previous — v0.4.0

- **Adjacency combos** (Kairosoft-style): 9 good and 4 bad combos between neighbouring buildings (8-way), discovered by building, with a catalogue that persists between runs, a "combo?" hint in the build menu, a discovery card and green/red links on the map.
- **Access through buildings:** a finished building (or the old village) gives access to its 8 neighbours, like a road.
- **Readability:** pixel fonts only for titles, figures, buttons and stamps; all reading text in a crisp sans at 15–16px with darker contrast. Event cards and notices open in the centre of the screen.
- **Difficulty:** target raised to 850 residents to compensate; the combo-aware bot wins ~35% of 200 runs.
- **Tests:** 71-check smoke test (combos, discovery, catalogue persistence, access rules, centred cards, text size and font).

## Previous — v0.3.0

- **Event cards with choices.** 15 events arrive as cards told by 8 recurring characters (portraits + their own sound), each with 2–3 options whose consequences are shown up front. The affected parcel pulses on the map.
- **Problems made visible.** "What needs attention" list (tap to locate), markers on the map, and every meter explains why it moved.
- **Realistic money.** Urban plans (rezoning), land value capture (urban land ×3), selling plots to developers who build at their own pace (and may stop or go bust), local tax share, bridge loans instead of instant bankruptcy, a warning before each spending milestone and only half the shortfall decommitted.
- **Map.** 12×12; road access counts diagonals; diagonal roads join visually on the pixel-art map.
- **Languages.** English and Spanish (HUD button or menus), 440 strings each.
- **Difficulty.** Target 700 residents, €130M grant. The test bot wins ~37% of 200 runs (v0.2: 8%), losses spread across bankruptcy, suspension and timeout.
- **Tests.** 55-check smoke test (both languages, every card renders without raw keys, diagonal access, plan, developers, loans, cards through the UI, layout). Runs in CI.
- **A living map.** 20 building styles (housing: slab, tower, terraced houses, perimeter block, timber eco-block, brutalist unit · factory: sawtooth works, logistics hub, agri-food silos, clean-tech plant with a wind turbine · school: brick, modern, old clock-tower · clinic: health centre with helipad, pavilion with ambulance, old hospital · park: wooded, duck pond, playground, fountain square), picked per parcel from the run's seed with random colourways and a satirical name shown in the parcel sheet ("Subsidiarity Towers", "Straight Banana Packers"…). An animation layer at ~15 fps adds traffic on straight roads (right-hand lanes, denser as the town grows, buses on the regional road), pedestrians and schoolchildren, grazing sheep, the protected toad hopping, chimney smoke and steam, waving pennants, shimmering river, ducks, a fountain, swings, a turning wind turbine, crane hooks lifting loads, welding sparks, blinking beacons, street lamps and passing birds. **Finished buildings rise from the ground** in a puff of dust, and **ending the month plays a short night**: the town darkens in three pixel steps, windows light up at random, lamps and headlights come on, and new buildings appear at dawn. Respects reduced motion; pauses when the tab is hidden (~3–4 ms per frame on a full 16×16 map). The **title-screen diorama** shares the same animation layer: its buildings get new random styles on every visit, traffic and people move, and its building sites keep finishing themselves — then the Commission requests changes and they go back to being building sites.
- **Pixel UI, institutional look.** The whole interface is now pixel art in the visual language of a (fictional) Union portal: blue header with a yellow rule, the Union's portico emblem, counters as inset tiles, segmented meters, case-file cards with hard shadows, raised pixel buttons, official letters on paper with a letterhead, date line, reference numbers and rubber stamps, stepped speech bubbles, pixelated character portraits, a title screen with an "official website of the Union" banner, and the map on a cadastral grid. 66 hand-drawn 12×12 icons replace Material Icons; three OFL pixel fonts (Jersey 10, Pixelify Sans, Silkscreen) are embedded. Compact two-row header on phones.
- Pixel-art map, Eurocrat soundtrack (menu / in-game / win), PWA, GitHub Pages → https://valleverde-dev.github.io/city/
- `/godot` still mirrors the v0.1 mechanics; port v0.3 once the loop is validated.

**Known issues**

- [x] ~~Material Icons load from Google Fonts~~ — replaced by embedded pixel icons and fonts; the game makes no network requests.
- [ ] Balance needs human playtesting (the bot is a sanity check, not a player).

## Next steps

1. Playtest v0.7: is settlement II fair now, is support easy to read, does the growing map feel right? Tune the 30% target step, the 50% carry-over and debt between settlements (most bot runs end in bankruptcy).
2. Cross-border events between settlements of the region (a joint Interreg project, a border dispute, a shared hospital) and more settlement types and region combos.
3. Member states with their own rule quirks (each settlement already has one): a bureaucracy per country.
4. Turn player actions into cards too (favours, consultants, dirty tricks)?
5. *Constructor*-style characters: named residents, complaints, a mayor with a face.
6. More buildings (logistics hub, data centre, social housing, tram).
6. Port to Godot when a port trigger is met: `core/` first (with its tests), then rendering and UI.

## Assets

### Graphics

- ✅ Pixel art chosen (Oct 2026) over flat vector and over satellite imagery (satellite tiles don't fit an isometric view and their licences don't allow shipping them in a commercial game).
- ✅ Pipeline: sprites are generated in code (`web-prototype/src/render/`) at 64×32 px per tile; `tools/export_sprites.py` writes `art/sprites/eurocrat_sprites.png` + `.json` atlas, ready to import in Godot (TileSet / AtlasTexture, filter = nearest).
- Next: animation frames (smoke, water, cranes), seasonal palettes per member state, hand-touched hero sprites (town hall, mayor's office).

### Art direction

- **v0.2: Constructor-style** colourful isometric map + a UI that parodies an institutional e-government portal (white panels, institutional blue, yellow highlights, rubber stamps). Fictional institutions only — no real EU names, flags or logos; the Union has its own flag (see GDD §1).
- v0.1 used a Syndicate (1993) neon look; it was dropped with the pivot.
- Recommendation: document this as a style guide (moodboard + palette + typefaces) to keep assets consistent as they scale.

### Music

- ✅ Soundtrack v2 for the Eurocrat tone, in `audio/` (OGG + M4A + MIDI, generated by `audio/compose.py`):
  - Menu: "Ode to Joy (Brussels Eurodance Mix)" — cheap 90s Eurodance with Beethoven's melody (public domain).
  - One theme per campaign level, growing with the town: I "Pilot Project" (village musette waltz), II "Expansion Phase" (80s Eurovision synth-pop), III "Partial Plan" (tense office ambient: clock, typewriters, stamps, the Ode in minor), IV "Model Town" (Euro-trance anthem). They replaced the single in-game track ("Please Hold").
  - Win: "Douze Points for Harmonisation" — Eurovision-style schlager with the obligatory key change.
- ✅ Wired into the web prototype (menu / level themes / inauguration, crossfades, mute toggle) and the Godot skeleton (menu, level I theme in game; win theme preloaded for the port).
- v0.1's darksynth tracks were retired with the pivot.
- Later: short stingers (permit approved, directive failed, audit), a tension layer for the last months of a level, or re-voicing the MIDI with better instruments.
- Open to using other AIs (Gemini, ChatGPT, Atlas) for 3D asset generation too when the project needs it.

## Exports

### Godot

- **When to port:** once the game loop is validated in the web prototype (avoid porting too early and having to redo the design).
- **What carries over directly:** the rules live in `web-prototype/src/core/` as pure functions over one JSON state (grid, meters, rng), with no browser code (enforced by a layer check) and their own Node tests — port them file by file to GDScript autoloads (map in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)); the JSON state can stay identical so web saves load in Godot.
- **Why Godot:** native export to iOS and desktop (Windows/Mac/Linux) for Steam, and lighter than Unity for solo iteration.
- **Port triggers** (decide on these, not on anxiety): (1) the v0.5 playtest goes well — players finish level IV and ask for more; (2) bigger maps (32×32+) with a living town make the iPad web build slow; (3) Steam needs controller support, achievements or cloud saves as core features. Until then the web build stays the sandbox and `/godot` stays frozen.
- **Alternative kept open:** ship the web build itself, wrapped (Capacitor for iOS, Tauri/Electron for Steam). Reasonable for a turn-based 2D game; iOS would still need Xcode.

### GitHub

- Repository with `/web-prototype` (current version), `/godot` (port, once it starts) and this `ROADMAP.md` as a living reference. ✅ https://github.com/valleverde-dev/city

## Production

### itch.io (every release)

- ✅ `npm run build:itch` makes `release/eurocrat-<version>-web.zip` (no service worker or PWA tags; tested inside a cross-origin iframe like itch's).
- ✅ Tagging `vX.Y.Z` runs the Release workflow: tests, GitHub Release with the zip, and a butler push to itch.io once `BUTLER_API_KEY` + `ITCH_GAME` are set.
- To do: create the itch.io page (HTML5, 1280×800, mobile friendly, fullscreen button) and add the two settings.

### App Store

- Apple Developer account (USD 99/year).
- Even if the game is developed on the iPad, the final App Store submission requires Xcode, which only runs on a Mac. Options that avoid buying a Mac right away: cloud Mac services (MacStadium, etc.), macOS CI/CD runners (GitHub Actions, Codemagic) that build and sign the iOS build automatically, or borrowing/renting a Mac just for the publishing step.

### Steam

- Steamworks account (USD 100, recoupable).
- Desktop build generated directly from Godot (Windows/Mac/Linux) — without the Xcode limitation that applies to iOS.

## Suggested phases

1. **Web prototype:** ✅ v0.1 (basic loop) · ✅ v0.2 (Eurocrat roguelike loop) · ✅ v0.3 (cards, land economy, EN/ES) · ✅ v0.4 (combos, readability) · ✅ v0.5 (campaign of 4 levels, guide, sheets UI, panning) · ✅ v0.5.1 (modules, portable core, Node tests).
2. **Mechanics design (current):** ✅ v0.3 cards, characters, land economy, i18n · next: playtest, tutorial.
3. **Asset production:** consolidate the style guide, music, possible 3D assets.
4. **Godot port:** migrate logic and UI, with the GitHub repository already active.
5. **Production:** prepare builds for Steam (direct) and the App Store (solve the Xcode/Mac step).
