# Architecture — web prototype

*Living document. v0.9.2 · Oct 29, 2026.* How the code of `web-prototype/` is organised, why, and how it maps to the Godot port.

## The idea in one paragraph

The game is **a set of rules over one JSON state**, plus a presentation that draws that state and turns taps into rule calls. The rules live in `src/core/` and know nothing about browsers: no DOM, canvas, audio or `localStorage`. They run unchanged in the browser, in Node (tests, balance bot) and are the specification for the Godot port. Everything else — pixel art, animation, the HUD and bottom bar, cards, music — is presentation and may change freely without touching the rules.

Until v0.5 everything lived in one 4,600-line `src/index.html`. v0.5.1 split it into ES modules **without changing behaviour**: the 89-check smoke test passes, the balance bot gives identical results for the same seeds, the sprite sheet export is pixel-identical, and screenshots of the title, level card, sheets and month end (iPad and iPhone sizes) match the old build pixel for pixel.

## Layers

```
            ┌──────────────────────────────────────────────┐
            │ main.js — boot + test hook (window.__eurocrat)│
            └──────────────────────────────────────────────┘
   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
   │ ui/          │  │ render/      │  │ audio/       │   presentation (DOM, canvas, Web Audio)
   │ sheets,cards │◀▶│ camera,      │  │ music, sfx   │   may import each other
   │ title,input… │  │ sprites,anim │  │              │
   └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
          ▼                 ▼                 ▼
   ┌──────────────────────────────────────────────────┐
   │ i18n/ — strings (EN/ES) + t()                     │
   └──────────────────────┬───────────────────────────┘
                          ▼
   ┌──────────────────────────────────────────────────┐
   │ core/ — the rules. Imports core/ only.            │
   │ No document / window / canvas / audio / storage   │
   └──────────────────────────────────────────────────┘
```

**The one hard rule: arrows only point down.** `core/` imports nothing outside `core/`. `scripts/check-layers.mjs` enforces it (and that no browser API appears in the core) on every `npm test` and in CI.

## Files

### `src/core/` — the rules (≈ 830 lines)

| File | What it holds | Godot port |
|---|---|---|
| `state.js` | `S` (the whole game state), `N` (map side), `setState`, the seeded RNG (`rnd`, `ri`, `pick`) and grid helpers (`idx`, `rc`, `inside`, neighbours) | `GameState` autoload |
| `config.js` | `VERSION` (checked by the build against `package.json`), tuning knobs (`CFG`), the settlement templates and their rule flags (`LEVELS`, `stageCfg()`, `on()`), buildings (`B`), perks, characters, town names | `Config` resource / JSON |
| `newgame.js` | Starting a run (`newGame`), starting a settlement on a plot, `consolidate()` (writes what was built into the map) and `attach(k)` (adds the chosen plot's land to the map) | `Run` |
| `region.js` | The Euroregion: settlement types and traits, region combos, the plots on offer (`candidates`, pinwheel) and the terrain of new land (`genPlot`, continuing roads and river), the frontier, the regional dividend, map helpers (`wcode`, `wid`, `worldIndex`) | `Region` + `LandGenerator` |
| `rules.js` | Meters (`bump`), money (`spend`), access, prices, permit/build times, approval chance, capacities (`caps`), `log` and `fx` | `Rules` |
| `economy.js` | Residents, taxes, monthly costs, committed money, milestones | `Rules` |
| `combos.js` | Adjacency combos and their effects; the discovered catalogue | `Combos` |
| `actions.js` | Player actions: acquire, permit, sell, plan, lobby, consult, report, repay; `renameTown` and `suggestTown` (v0.9.2) | `Actions` |
| `directives.js` | Brussels directives and perks | `Directives` |
| `events.js` | Event cards: setup, choices, consequences | `Events` (+ data) |
| `month.js` | `endMonth()`: the world resolves; `abandonRun()` (v0.9.2: Abandon / Restart end the run as a loss) | `Turn` |
| `career.js` | What carries over between runs (v0.8): experience (earned live since v0.9: `XP_FOR`, `gainXp`), levels (`LEVEL_K`) and ranks and their grant bonus, perks by rank (`PERK_RANK`), the 26 achievements (`ACH`, `checkAch(when)`), buildings unlocked by level (v0.9.2: `UNLOCK_LEVEL`, `unlocked`, level-ups queue their buildings in `S.unlocks`), the random start of a run (`randomStart`, replacing the v0.8 drafts). Stored apart from the run (`eurocrat_career`) | `Career` (user://) |
| `persist.js` | Save / load of the run, records between runs | `SaveGame` (user://) |
| `storage.js` | Key–value adapter: `localStorage` in the browser, memory in Node | `ConfigFile` / `FileAccess` |
| `format.js` | `money()` in the current language | a helper |
| `index.js` | **The public API** — read this first | — |

The contract with the UI (also the contract the Godot port must honour):

- The UI may **read** anything exported by `core/index.js`.
- The UI **changes** the game only through `newGame`, the actions (including `renameTown`), `choosePerk`, `resolveEvent` / `resolveCard`, `endMonth`, `abandonRun` and `attach`. New achievements, unlocks and promotions are queued in `S.newAch` / `S.rankUps` for the UI to announce; `S.over.career` holds the end-of-run summary.
- The state of a run: `S.world.cells` is the map, sparse: `"y,x"` → terrain or building code, only for land that exists (it grows with the region). `S.region` holds the consolidated settlements (`blocks`: position, size, type, residents, dividend), the plot in play (`active`) and, between settlements, the next one (`next`) and the plots on offer (`cands`, each with its terrain `cells`, with `S.pending = 'attach'`). `S.grid` is always the plot in play, in local coordinates; `S.frontier` lists the world cells around it (a combo with one of them has `j = -1-k`).
- Rendering works in a *frame*: a square around all the land (`render/camera.js`: `FRX`/`FRY` its corner on the map, `isoW`, `tileAtW`); `isoOf`/`tileAt` take local parcel indexes of the plot in play. `render/anim.js` keeps a static layer for the land outside the plot, repaints only the visible part each frame, and draws combo halos (cached outline sprites).
- Actions return `{ok, msg:{k,p}, bad?, cls?, sfx?}` — an i18n key with parameters and a sound *name*. The core never produces text or plays audio.
- Cards (`S.cards`), logs (`S.log`) and floating feedback (`S.fx`) are data in the state; the UI renders them.

### `src/i18n/`
`strings.js` holds every player-facing string in English and Spanish (about 1,000 keys each); `index.js` has `t()`, the current language and `setLanguage()`.

### `src/render/` — isometric pixel art (≈ 1,000 lines)
| File | What it draws |
|---|---|
| `camera.js` | Tile size, view rotation, zoom, panning, screen ↔ tile conversion, the selected parcel |
| `pixel.js` | The pixel toolkit (colour handling, sprite cache) |
| `ground.js` | Ground tiles (crops, river, village, roads…) |
| `sprites.js` | Props and the 20 building styles |
| `map.js` | Composing the static map layers; `setMapSize`, `startSite` |
| `anim.js` | The ~15 fps animation layer, night, completions, birds, flags, traffic |

### `src/ui/`, `src/audio/`, `src/main.js`
`dom.js` (helpers, floating feedback), `hud.js` (the floating HUD: the town's name — editable —, goal, months, money, meters, perks as relics, the experience bar), `dock.js` (v0.9: the bottom bar — agenda, parcel, building cards with the ghost preview and on-map confirm, land that is not yours, a consolidated settlement, the next plot, events; v0.9.2: `landArt` draws land as it looks on the map), `run.js` (the run file: combos, perks, career, region), `inbox.js` (what needs attention, the news), `problems.js`, `guide.js` (the mayor's guide), `cards.js` (letters — v0.9.2: two-column screens —, event cards), `title.js` (title screen: the scene, the menu and its views — new game, settings, credits — keyboard navigation, starting a run; v0.9.2: the pause screen and its views — settings, restart, abandon), `input.js` (touch, mouse, keyboard), `icons.js` (66 pixel icons), `regionmap.js` (the Euroregion minimap), `drama.js` (full-screen consolidation and game over, banners). `audio/music.js` and `audio/sfx.js`. `main.js` boots the game and exposes `window.__eurocrat` for the tests.

### `src/styles/` and `src/assets/`
CSS split by area and imported in order by `styles/index.css` (order matters: `readability.css` and `layout.css` refine the earlier files, and `screens.css` — v0.9.2: letters as screens, the pause screen, fades, banners — comes last). Keyframe names are global in the bundle: v0.9 had three different `slam` animations and the last one (a stamp's rotation) tilted every letter; give each animation its own name. The three OFL fonts are real `.woff` files in `assets/fonts/`, and `assets/logo.svg` is the game logo (generated by `tools/make_logo.py`, which also writes `art/logo/`); the build inlines them all.

## Build

`npm run build` (esbuild, the only dev dependency) bundles `main.js` and the CSS and inlines both, fonts included, into **one self-contained `dist/index.html`** — the same kind of file as before, so it still works offline, from `file://` and as a PWA, and the service worker did not change.

## Tests

| Command | What | Needs |
|---|---|---|
| `npm run check` | Layer check: the core stays portable | Node |
| `npm run test:core` | Rules tests: settlements, rule flags, determinism, actions, a month passing, consolidation and attach, the border, region effects, records, save/load, the difficulty band | Node |
| `npm run test:smoke` | 139 checks driving the real UI in Chromium (phone and iPad layouts, both languages) | Playwright |
| `npm test` | All of the above + build | both |
| `npm run balance -- 150 --run` / `--level=4` | The greedy bot over whole Euroregion runs, or one settlement, in Node | Node |

`tests/balance_bot.js` is shared: the same bot plays in the browser (`tests/balance.py`) and in Node (`tests/balance.mjs`) and gets identical results for the same seeds.

## Working on it

- **iPad (directing / playing):** every push to `main` builds and publishes to GitHub Pages; pull-request builds run the full test suite.
- **Desktop (coding):** `npm install`, then `npm run dev` (rebuilds on every save) and `npm run serve` (http://localhost:8080) in a second terminal.
- **Where to change things:**
  - a number (cost, months, target) → `core/config.js`
  - a new rule or meter → `core/rules.js` / `core/month.js`, plus a test in `tests/core/`
  - a new event card → `core/events.js` (logic) + `i18n/strings.js` (texts, both languages)
  - a new building → `core/config.js` (`B`) + `render/sprites.js` (art) + strings
  - a new screen or panel → `ui/` (the bottom bar is `ui/dock.js`)

## Known debts (deliberately left for later)

1. **Logs store formatted money.** Rules write `money(x)` into log parameters, so old log lines keep the language they were written in. Fix: store numbers, format in the UI.
2. **Presentation modules import each other in cycles** (`ui` ↔ `render`). It works (the bundle is one scope), but a `view` state object (selection, the building picked, the open run-file tab, camera) would make `ui/` and `render/` cleaner. Only worth doing if the UI keeps growing in the web version.
3. **Event cards mix data and code** (`EVENTS` entries hold functions). For Godot, split each card into data (texts, chips, weights) and a small effect function.
4. **`CFG` getters read the current level** (`CFG.months`, `CFG.target`). Convenient, but implicit; the port should pass the level explicitly.

## Porting to Godot

Port `core/` first, file by file, into GDScript autoloads with the same names; keep the JSON state identical so a web save can load in Godot. Port `tests/core/*.test.mjs` to GUT tests and use `tests/balance_bot.js` as the reference: a GDScript bot with the same seeds should reach the same outcomes once the RNG (`rnd()` in `state.js`, a mulberry32 variant) is ported bit for bit. Rendering and UI are rewritten in Godot (TileMapLayer, Control nodes); `art/sprites/` already holds the exported sprite sheet.
