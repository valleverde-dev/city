# Eurocrat

*Working title.* A satirical, turn-based roguelike city builder. You are a programme officer sent from Brussels to deliver a model European town: lots of money, 36 months and no power whatsoever. Buy the land, file the permits, survive the neighbours — and spend the funds before they expire.

Web prototype playable on iPad, iPhone and desktop; a Godot port is planned for the App Store and Steam.

**Play it:** https://valleverde-dev.github.io/city/

- Game design: [docs/GDD.md](docs/GDD.md)
- Plan and status: [ROADMAP.md](ROADMAP.md)

## How to play (v0.2)

- Each turn is **one month**; you get **3 agenda slots** per month. Press **End month** when you're done.
- **Tap a parcel** to see what you can (not) do: buy it, request a permit (it needs a road next to it), follow its construction.
- Buildings go through *acquire → permit review → contractor queue → construction*. Permits can be rejected.
- People only move in if there are **homes, jobs, school places and health care** — the panel tells you which one is holding growth back.
- Keep the **mayor** (local support), the **neighbours** and the **Commission** (compliance) happy enough. Spend at least 20% of the grant by month 12 and 50% by month 24, or the shortfall is taken back.
- Complete **directives** for a perk (pick 1 of 3). Fail two and the programme is suspended.
- **Win:** 600 registered residents before month 36. **Lose:** bankruptcy, audit, annulled plan, two failed directives, or time out.
- Pinch or mouse wheel to zoom; ⟳ button to rotate the view. Your game is saved automatically.

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
