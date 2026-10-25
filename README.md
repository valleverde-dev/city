# City Builder

Isometric city builder with a corporate-terminal look (Syndicate, 1993). Web prototype playable on iPad, iPhone and desktop; a Godot port is planned for the App Store and Steam.

Plan and status: [ROADMAP.md](ROADMAP.md)

**Play it:** https://valleverde-dev.github.io/city/

## Structure

```
.
├── ROADMAP.md                  living project document
├── web-prototype/
│   ├── src/index.html          the game (a single self-contained HTML file)
│   ├── public/                 PWA manifest, service worker, icons
│   ├── scripts/build.mjs       build src + public → dist (no dependencies)
│   ├── tests/smoke_test.py     automated test in Chromium (Playwright)
│   └── package.json
├── godot/                      Godot port (phase 4)
└── .github/workflows/          CI: build + test + GitHub Pages
```

## Web prototype

```bash
cd web-prototype
npm run build        # generates dist/
npm run serve        # http://localhost:8080
npm test             # smoke test against src/ (requires: pip install playwright && python -m playwright install chromium)
```

To iterate, just open `web-prototype/src/index.html` in a browser. The build adds what's needed to install it as an app (PWA) and play offline.

### Playing on iPad

Every push to `main` publishes the build to GitHub Pages. In Safari, open the link above, then Share → *Add to Home Screen* to launch it full-screen like an app.

## Controls

- Tap a tile to build with the active tool (road, house, shop, park) or demolish.
- Houses, shops and parks need an adjacent road.
- Pinch or mouse wheel: zoom. ⟳ button: rotate the view. Menu: pause, save, load.
