# /godot — Godot 4 skeleton

Minimal Godot port of the web prototype (phase 4 of the [ROADMAP](../ROADMAP.md), started in parallel).
The web prototype in `/web-prototype` stays the sandbox for trying new mechanics; this project only mirrors what is already decided there.

> **Note (v0.2):** the game pivoted to *Eurocrat* (see [docs/GDD.md](../docs/GDD.md)). This skeleton still implements the **v0.1** mechanics below; it will be updated once the v0.2 loop is validated in the web prototype.

Target: Godot 4.4+ (tested with 4.7.2), Mobile renderer, 2D only. Compatible with **Xogot** on iPad.

## What is ported

- 10×10 isometric grid, 64×32 px diamond tiles drawn in code (`_draw`), no image assets.
- Tools and costs: Demolish 0, Road 1, House 5, Shop 10, Park 3. Houses, shops and parks need a road on one of their 4 neighbours. Start with 20 coins.
- Income **only** from the 2-second tick: `shops*2 + floor(houses*0.5)`. Population = `houses*4`. Building or demolishing never grants coins (the web coin-exploit stays fixed; there is a test for it).
- Floating text: `-cost`, `no road nearby`, `no funds`, `demolished`, `saved`, `loaded`… Refused taps flash the tile.
- Rotate view (90° steps), pinch-to-zoom and mouse-wheel zoom (0.5–2.5×). No panning.
- HUD on top (title, population, coins, Rotate, Menu), toolbar at the bottom, safe areas respected.
- Start menu (Play / Load game / Exit), pause menu (Resume / Save game / Load game / Exit).
- Autosave to `user://autosave.json` (every action and tick, and when the app goes to the background) plus manual save to `user://savegame.json`. Same JSON as the web: `{ "grid": [100 strings], "coin": int }`.
- Music: menu theme (Ode to Joy, Eurodance mix) on menus, ambient main theme in game (ducked on pause), looped. `WIN_THEME` is loaded for the v0.2 inauguration screen.

Not ported (yet): the music on/off toggle and the click/build sounds of the web version. Fonts are Godot's default (no font files are fetched at runtime).

## Structure

```
godot/
├── project.godot          # project settings (stretch canvas_items/expand, any orientation)
├── scenes/main.tscn       # the only scene: World + HUD + Menu
├── scripts/
│   ├── game_state.gd      # pure game logic + save/load (no nodes) ← start here
│   ├── iso_grid.gd        # draws the grid, taps → tiles, rotate, zoom
│   ├── hud.gd             # top bar + toolbar
│   ├── menu.gd            # start / pause / exit screens
│   ├── safe_area.gd       # keeps the UI away from the notch
│   ├── palette.gd         # colors shared by everything
│   └── main.gd            # glue: timer, feedback, menus, music
├── theme/terminal_theme.tres  # square corners, neon borders (edit it in the Inspector)
├── audio/                 # the three OGG tracks (Loop enabled in Import)
└── tests/                 # headless tests
```

## Open it in Xogot (iPad)

1. In **Working Copy**, clone `https://github.com/valleverde-dev/city` (or pull if you already have it).
2. In **Xogot**, import a project from Working Copy and pick the `godot` folder (the one with `project.godot`). Press Play.
3. Edit in Xogot. Back in Working Copy, commit and **push** to `main`. Pull first if another session pushed.

The `.godot/` cache folder is ignored by git; Xogot rebuilds it on first open. Publishing to the App Store later still needs Xcode on a Mac (or a cloud Mac / CI runner) — see the ROADMAP.

## Tests (desktop / CI)

From this folder, with a Godot 4.4+ binary:

```sh
godot --headless --path . --import
godot --headless --path . -s res://tests/test_game_state.gd   # rules, income, save/load
godot --headless --path . -s res://tests/test_main_scene.gd   # real scene with simulated taps
```

Both print `N checks, 0 failed` and exit with code 0 on success.
