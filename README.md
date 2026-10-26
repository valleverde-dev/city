# Eurocrat

*Working title.* A satirical, turn-based roguelike city builder. You are a programme officer sent from Brussels to deliver a model European town: lots of money, 36 months and no power whatsoever. Buy the land, file the permits, survive the neighbours — and spend the funds before they expire.

Web prototype playable on iPad, iPhone and desktop; a Godot port is planned for the App Store and Steam.

**Play it:** https://valleverde-dev.github.io/city/

- Game design: [docs/GDD.md](docs/GDD.md)
- Plan and status: [ROADMAP.md](ROADMAP.md)

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
├── web-prototype/
│   ├── src/index.html          the game (a single self-contained HTML file)
│   ├── public/                 PWA manifest, service worker, icons, music
│   ├── scripts/build.mjs       build src + public → dist (no dependencies)
│   ├── tests/smoke_test.py     automated test in Chromium (Playwright), runs in CI
│   ├── tests/balance.py        difficulty check: a bot plays many seeded runs
│   └── package.json
├── audio/                      soundtrack sources (MIDI + generator)
├── godot/                      Godot 4 skeleton (v0.1 mechanics, for Xogot)
└── .github/workflows/          CI: build + test + GitHub Pages
```

## Web prototype

```bash
cd web-prototype
npm run build        # generates dist/
npm run serve        # http://localhost:8080
npm test             # smoke test against src/ (requires: pip install playwright && python -m playwright install chromium)
python3 tests/balance.py 150   # difficulty check over 150 seeded runs
```

To iterate, just open `web-prototype/src/index.html` in a browser. The tuning knobs (`CFG`, building table `B`, events, directives, perks) are at the top of the script.

### Playing on iPad

Every push to `main` publishes the build to GitHub Pages. In Safari, open the link above, then Share → *Add to Home Screen* to launch it full-screen like an app.

## Note on satire

All institutions, countries and programmes in the game are fictional parodies. No real EU names, flags or emblems are used.
