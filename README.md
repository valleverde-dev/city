# Eurocrat

*Working title.* A satirical, turn-based roguelike city builder. You are a programme officer sent from Brussels to deliver a model European town: lots of money, 36 months and no power whatsoever. Buy the land, file the permits, survive the neighbours — and spend the funds before they expire.

Web prototype playable on iPad, iPhone and desktop; a Godot port is planned for the App Store and Steam.

**Play it:** https://valleverde-dev.github.io/city/

- Game design: [docs/GDD.md](docs/GDD.md)
- Plan and status: [ROADMAP.md](ROADMAP.md)
- Code organisation: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

## How to play (v0.5)

- The campaign has **four levels**: a 2×2 pilot, a 4×4 neighbourhood, an 8×8 partial plan and the 16×16 Model Town. Each one adds new rules; the level card and the mayor's guide tell you what to do.
- Each turn is **one month**. Tap a parcel to buy it or build on it; press **End month** to let time pass.
- People only move in if there is what they need (homes; from level II jobs; from level III school and health care).
- Buildings next to each other form **combos**, good and bad. From level III, crises arrive as **cards** and Brussels sends **directives**.
- Completing a level unlocks the next one and lets you **carry a perk**.
- **Controls:** drag to move the map, pinch / wheel / +− to zoom. PC: WASD / arrows, + −, R rotate, C centre, Space end month, Esc close / pause.
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
│   │   ├── ui/                 HUD, sheets, cards, title screen, input
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
npm run balance -- 150 --level=4   # difficulty check over 150 seeded runs, in Node
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
