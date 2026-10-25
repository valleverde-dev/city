# Eurocrat

*Working title.* A satirical, turn-based roguelike city builder. You are a programme officer sent from Brussels to deliver a model European town: lots of money, 36 months and no power whatsoever. Buy the land, file the permits, survive the neighbours — and spend the funds before they expire.

Web prototype playable on iPad, iPhone and desktop; a Godot port is planned for the App Store and Steam.

**Play it:** https://valleverde-dev.github.io/city/

- Game design: [docs/GDD.md](docs/GDD.md)
- Plan and status: [ROADMAP.md](ROADMAP.md)

## How to play (v0.4)

- Each turn is **one month**; you get **3 agenda slots** per month. Press **End month** when you're done.
- **Tap a parcel** to see what you can (not) do. A road or a finished building on any of the 8 neighbouring parcels (diagonals too) gives access.
- Buildings next to each other form **combos** (some good, some bad). Discover them by building; the build menu hints "combo?" and the catalogue keeps what you found.
- Farmland is **rustic**: only roads and parks. Submit an **urban plan** to rezone what you own — then build homes, factories, schools and health centres, or **sell plots to developers** (they pay you and build housing at their own pace).
- Buildings go through *permit review → contractor queue → construction*. Permits can be rejected.
- People only move in if there are **homes, jobs, school places and health care**.
- Every crisis is a **card**: a character tells you what happened and you choose how to respond.
- **What needs attention** (top of the panel) lists your problems; tap one to find it on the map. Tap a meter to see why it moved.
- Spend 20% of the grant by month 12 and 50% by month 24, or half the shortfall is taken back. Out of money? The bank lends — with interest, and only up to a limit.
- **Win:** 850 registered residents before month 36. **Lose:** debt over the bank's limit, audit, annulled plan, two failed directives, or time out.
- **Language:** English / Español (button in the top bar or the menus).

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
