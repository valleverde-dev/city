# Eurocrat

![Eurocrat](art/logo/eurocrat-logo@4x.png)

*Working title.* A satirical, turn-based roguelike city builder. You are a programme officer sent from Brussels to grow a model **Euroregion**, one settlement at a time: lots of money, tight deadlines and no power whatsoever. Buy the land, file the permits, survive the neighbours, spend the funds before they expire — and choose where the next town goes.

Web prototype playable on iPad, iPhone and desktop; a Godot port is planned for the App Store and Steam.

**Play it:** https://valleverde-dev.github.io/city/

- Game design: [docs/GDD.md](docs/GDD.md)
- Plan and status: [ROADMAP.md](ROADMAP.md)
- Code organisation: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

## How to play (v0.10)

- A run is one **Euroregion**. It starts with a 2×2 hamlet; each settlement has a resident target and a deadline. The settlement card and the mayor's guide tell you what to do.
- Each turn is **one month**. Tap a parcel: the bar at the bottom shows what you can do (buy; for your land, a card per building — pick one, see it as a ghost on the map with its combos, confirm). Nothing selected, the bar is your agenda. Press **End month** to let time pass.
- People only move in if there is what they need (homes; from settlement II, jobs; from settlement III, school and health care).
- The map grows with the region. Meet the target and the settlement is **consolidated**: you pick a perk and **choose, on the map, where the new land goes** (4×4, 8×8, 16×16, then 16×16 with higher targets); roads and rivers carry on into it. Fail once and the run is over.
- Permits are approved when political support is at least 50: the game tells you in advance. Stubborn owners (+80%) are marked on the map.
- Each settlement has a **type** (farming, industrial, spa…). Neighbouring types form **region combos**, good and bad, and the parcels along the border give access and combos to your side.
- Buildings next to each other form **combos**, good and bad: they glow gold or red. From settlement III, crises arrive as **cards** and Brussels sends **directives**.
- **Controls:** drag to move the map, pinch / wheel / +− to zoom. PC: WASD / arrows, + −, Q / E turn the map, C centre, Space end month, Tab run file, Esc close / pause. Tap the town's name to rename it.
- **Run file** (bottom left, or Tab): your combo collection, the perks of this run and the pool, your career and the region.
- **Career:** experience comes with every step (levels and ranks during play), even in a lost run. Higher ranks add perks to the pool. Ranks raise every grant; career levels unlock 8 new buildings for good (market at level 2 … data centre at 18); 26 achievements give experience. After the first, guided run, every *New Euroregion* is random: settlement type, starting perk and member state are drawn for you.
- **Language:** English / Español (top bar or menus).

## Structure

```
.
├── ROADMAP.md                  living project document
├── docs/GDD.md                 game design document
├── docs/ARCHITECTURE.md        how the code is organised (layers, files, port map)
├── web-prototype/
│   ├── src/
│   │   ├── core/               the rules: pure functions over one JSON state, no DOM (→ GDScript)
│   │   ├── i18n/               English + Spanish strings, t()
│   │   ├── render/             isometric pixel art and animation (canvas)
│   │   ├── ui/                 HUD, bottom bar, run file, cards, title screen, input
│   │   ├── audio/              music and sound effects
│   │   ├── styles/ assets/     CSS and the embedded pixel fonts
│   │   ├── index.html          page template
│   │   └── main.js             boot
│   ├── public/                 PWA manifest, service worker, icons, music
│   ├── scripts/build.mjs       bundle src → one self-contained dist/index.html (esbuild)
│   ├── scripts/check-layers.mjs  keeps core/ free of browser code
│   ├── tests/core/             rules tests in Node (no browser)
│   ├── tests/smoke_test.py     UI test in Chromium (Playwright), runs in CI
│   ├── tests/balance.mjs|.py   difficulty check: a bot plays many seeded runs (Node or browser)
│   └── package.json
├── audio/                      soundtrack sources (MIDI + generator)
├── godot/                      Godot 4 skeleton (v0.1 mechanics, for Xogot)
└── .github/workflows/          CI: build + test + GitHub Pages
```

## Web prototype

```bash
cd web-prototype
npm install          # once: installs esbuild (the only dev dependency)
npm run dev          # rebuilds dist/ on every change in src/
npm run serve        # http://localhost:8080 (second terminal)
npm test             # layer check + rules tests (Node) + build + smoke test (needs: pip install playwright && python -m playwright install chromium)
npm run balance -- 150 --run       # difficulty check: 150 whole Euroregion runs, in Node
npm run balance -- 150 --level=4   # one settlement (IV), started directly
```

The tuning knobs (`CFG`, levels, building table `B`, perks) are in `src/core/config.js`; events in `src/core/events.js`; every text in `src/i18n/strings.js`. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for where everything else lives.

### Releases and itch.io

Each release produces a zip ready for itch.io (`index.html` at the root, no service worker):

```bash
cd web-prototype
npm run build:itch   # -> dist-itch/ and release/eurocrat-<version>-web.zip
```

To publish a release: bump `version` in `web-prototype/package.json`, merge to `main`, then tag it:

```bash
git tag v0.5.1 && git push origin v0.5.1
```

The **Release** workflow tests the itch build, attaches the zip to a GitHub Release and, once configured, uploads it to itch.io with butler (channel `html5`). To switch the upload on: in GitHub → Settings → Secrets and variables → Actions, add the secret `BUTLER_API_KEY` (itch.io → Settings → API keys) and the variable `ITCH_GAME` (`user/game`, e.g. `valleverde/eurocrat`).

itch.io page settings (once): Kind of project **HTML**; tick *This file will be played in the browser* on the upload; viewport **1280 × 800**; enable *Mobile friendly* and the *Fullscreen button*.

### Playing on iPad

Every push to `main` publishes the build to GitHub Pages. In Safari, open the link above, then Share → *Add to Home Screen* to launch it full-screen like an app.

## Note on satire

All institutions, countries and programmes in the game are fictional parodies. No real EU names, flags or institutional logos are used: the Union has its own flag (a white star on blue, in the proportions of Vietnam's), our own invention. The game is not affiliated with, or endorsed by, the European Union.
