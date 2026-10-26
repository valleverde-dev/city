# Roadmap — Eurocrat

Living project document · update it as the prototype evolves. The game design lives in [docs/GDD.md](docs/GDD.md).

## Overview

**Eurocrat** (working title): a satirical, turn-based roguelike city builder. You are a Brussels programme officer who must deliver a model European town with plenty of money and no power — buy the land, file the permits, survive the neighbours, spend the funds before they expire. Tone and references: *Constructor* (1997), with a hyper-realistic, comic look at how building actually works in contemporary Europe. The plan: validate the loop in the web/iPad prototype, then port to Godot to ship on the App Store and Steam.

## Current status — v0.5.0 (Oct 26, 2026)

Playtest feedback: "I don't know what to do", "too much information", "too hard". v0.5 answers all three:
- **Campaign of 4 levels** with maps of 2×2, 4×4, 8×8 and 16×16. Each level switches on new rules (and only shows the UI for the rules in play). Levels I–II cannot be lost.
- **Guide:** a level card with the goal and what is new, then the mayor (or Brussels) walks you through each step and highlights where to tap.
- **Progression:** completing a level unlocks the next and lets you carry 1 of 3 perks; the combo catalogue persists.
- **New interface:** full-screen map; bottom tab bar (Agenda · Town · End month · Inbox · Combos); sheets on demand; a bell for problems; directive pill on the map; compact meters on phones.
- **New title screen:** a full-screen scene instead of a dialog — a hand-composed pixel diorama of the model town (built from the game's own sprites) under a dithered sky with drifting clouds, a stamped *Approved in principle* logo, the menu as a "one-stop shop" counter (now-serving display, levels as case files with Open / Pending / Approved stamps, compact language and music controls) and a scrolling *Union Bulletin* of satirical headlines. Enter starts; the cover blocks map input.
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
- **Pixel UI, institutional look.** The whole interface is now pixel art in the visual language of a (fictional) Union portal: blue header with a yellow rule, the Union's portico emblem, counters as inset tiles, segmented meters, case-file cards with hard shadows, raised pixel buttons, official letters on paper with a letterhead, date line, reference numbers and rubber stamps, stepped speech bubbles, pixelated character portraits, a title screen with an "official website of the Union" banner, and the map on a cadastral grid. 66 hand-drawn 12×12 icons replace Material Icons; three OFL pixel fonts (Jersey 10, Pixelify Sans, Silkscreen) are embedded. Compact two-row header on phones.
- Pixel-art map, Eurocrat soundtrack (menu / in-game / win), PWA, GitHub Pages → https://valleverde-dev.github.io/city/
- `/godot` still mirrors the v0.1 mechanics; port v0.3 once the loop is validated.

**Known issues**

- [x] ~~Material Icons load from Google Fonts~~ — replaced by embedded pixel icons and fonts; the game makes no network requests.
- [ ] Balance needs human playtesting (the bot is a sanity check, not a player).

## Next steps

1. Playtest v0.5 with new players; tune the level targets and the guide texts.
2. More 16×16 levels in different member states, each with its own bureaucratic quirk.
2b. Turn player actions into cards too (favours, consultants, dirty tricks)?
3. *Constructor*-style characters: named residents, complaints, a mayor with a face.
4. Member states with their own rule quirks; more buildings (logistics hub, data centre, social housing).
5. Decide on meta-progression between runs.
6. Port v0.5 to Godot when the loop is validated.

## Assets

### Graphics

- ✅ Pixel art chosen (Oct 2026) over flat vector and over satellite imagery (satellite tiles don't fit an isometric view and their licences don't allow shipping them in a commercial game).
- ✅ Pipeline: sprites are generated in code (`RENDERING` section of `web-prototype/src/index.html`) at 64×32 px per tile; `tools/export_sprites.py` writes `art/sprites/eurocrat_sprites.png` + `.json` atlas, ready to import in Godot (TileSet / AtlasTexture, filter = nearest).
- Next: animation frames (smoke, water, cranes), seasonal palettes per member state, hand-touched hero sprites (town hall, mayor's office).

### Art direction

- **v0.2: Constructor-style** colourful isometric map + a UI that parodies an institutional e-government portal (white panels, institutional blue, yellow highlights, rubber stamps). Fictional institutions only — no real EU names, flags or emblems.
- v0.1 used a Syndicate (1993) neon look; it was dropped with the pivot.
- Recommendation: document this as a style guide (moodboard + palette + typefaces) to keep assets consistent as they scale.

### Music

- ✅ Soundtrack v2 for the Eurocrat tone, in `audio/` (OGG + M4A + MIDI, generated by `audio/compose.py`):
  - Menu: "Ode to Joy (Brussels Eurodance Mix)" — cheap 90s Eurodance with Beethoven's melody (public domain).
  - In-game: "Please Hold: Public Consultation" — waiting-room ambient with the Ode hidden at half speed.
  - Win: "Douze Points for Harmonisation" — Eurovision-style schlager with the obligatory key change.
- ✅ Wired into the web prototype (menu / in-game / inauguration, crossfades, mute toggle) and the Godot skeleton (menu and in-game; win theme preloaded for the v0.2 port).
- v0.1's darksynth tracks were retired with the pivot.
- Later: short stingers (permit approved, directive failed, audit), more in-game variety, or re-voicing the MIDI with better instruments.
- Open to using other AIs (Gemini, ChatGPT, Atlas) for 3D asset generation too when the project needs it.

## Exports

### Godot

- **When to port:** once the game loop is validated in the web prototype (avoid porting too early and having to redo the design).
- **What carries over directly:** the rules in `index.html` are written as pure functions over one JSON state (grid, meters, rng) — easy to move to GDScript; state structure (already JSON, easy to move to GDScript/Godot Resources).
- **Why Godot:** native export to iOS and desktop (Windows/Mac/Linux) for Steam, and lighter than Unity for solo iteration.

### GitHub

- Repository with `/web-prototype` (current version), `/godot` (port, once it starts) and this `ROADMAP.md` as a living reference. ✅ https://github.com/valleverde-dev/city

## Production

### App Store

- Apple Developer account (USD 99/year).
- Even if the game is developed on the iPad, the final App Store submission requires Xcode, which only runs on a Mac. Options that avoid buying a Mac right away: cloud Mac services (MacStadium, etc.), macOS CI/CD runners (GitHub Actions, Codemagic) that build and sign the iOS build automatically, or borrowing/renting a Mac just for the publishing step.

### Steam

- Steamworks account (USD 100, recoupable).
- Desktop build generated directly from Godot (Windows/Mac/Linux) — without the Xcode limitation that applies to iOS.

## Suggested phases

1. **Web prototype:** ✅ v0.1 (basic loop) · ✅ v0.2 (Eurocrat roguelike loop) · ✅ v0.3 (cards, land economy, EN/ES) · ✅ v0.4 (combos, readability) · ✅ v0.5 (campaign of 4 levels, guide, sheets UI, panning).
2. **Mechanics design (current):** ✅ v0.3 cards, characters, land economy, i18n · next: playtest, tutorial.
3. **Asset production:** consolidate the style guide, music, possible 3D assets.
4. **Godot port:** migrate logic and UI, with the GitHub repository already active.
5. **Production:** prepare builds for Steam (direct) and the App Store (solve the Xcode/Mac step).
