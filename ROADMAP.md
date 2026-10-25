# Roadmap — CityBuilder

Living project document · update it as the prototype evolves.

## Overview

Isometric city builder with a first playable prototype already running (web, Syndicate 1993-style aesthetic). The plan: validate mechanics in the web/iPad prototype, consolidate the game design, and port to Godot to ship on the App Store and Steam.

## Current status — v0.1.0 (Oct 25, 2026)

- Web prototype verified with an automated smoke test (18/18 checks: build, demolish, adjacency, funds, rotation, pause, save/load, tick, persistence).
- Installable PWA build for iPad/iPhone ("Add to Home Screen"), with offline mode.
- CI on GitHub Actions: build + test + deploy to GitHub Pages on every push to `main` → https://valleverde-dev.github.io/city/
- Game, code and docs in English.

**Known bugs**

- [ ] **Coin exploit:** every tap on a tile calls `tick()`, so repeatedly tapping with "Demolish" (cost 0) generates unlimited income. Fix: in `handleBuild`, refresh only the HUD instead of running a tick.
- [ ] Fonts (Orbitron, Share Tech Mono, Material Icons) load from Google Fonts, so the first load needs a connection. Consider bundling them in `public/fonts/`.

## Mechanics

### Game loop

- **Short loop (already prototyped):** tap a tile → build/demolish → coin cost → simulation tick → population and income go up.
- **Mid loop (TBD):** manage resources beyond coins (power, water, security — a corporate/dystopian theme fits Syndicate), balance spending vs. income, unlock new building types at milestones.
- **Long loop (TBD):** progression across games or city "eras", prestige/reset, or an endless sandbox mode.
- **Open question:** a single sandbox loop, or difficulty/campaign layers on top?

### Goals

- **Short term:** milestones like "reach X population", "build your first block".
- **Mid term:** unlock new buildings/mechanics (e.g. industrial district, rival corporation).
- **Long term:** a "victory" condition in campaign mode (self-sufficient city, economic dominance) vs. a sandbox mode with no end goal.

### Missions

- Guided tutorial (the groundwork is there: start screen, tools, cost/adjacency).
- Syndicate-style contracts: short generated missions ("build 5 shops in X turns", "keep unrest below Y").
- A possible corporate storyline to give the game more identity (fits the chosen aesthetic).

### Game over

- **Sandbox mode:** no game over, just free progression.
- **Scenario/campaign mode:** lose conditions (bankruptcy, riots/unrest, missed time limit).
- **Recommendation:** start without game over (sandbox) to validate the loop; add fail conditions once a campaign mode is defined.

## Assets

### Graphics

- Define the art pipeline: hand-drawn vs. generated isometric tiles, base tile size (the prototype uses 64×32 px).
- Decide whether to keep the flat/vector style (as in the prototype) or move to pixel art/more detailed sprites when porting to Godot.

### Art direction

- Already established in the prototype: Syndicate (1993) aesthetic — near-black dark palette, neon accents (cyan, alert red, amber, acid green), Orbitron/Share Tech Mono typography, "corporate terminal" UI with a CRT texture.
- Recommendation: document this as a style guide (moodboard + palette + typefaces) to keep assets consistent as they scale.

### Music

- Suggested style: synthwave/darksynth, consistent with the chosen aesthetic.
- Options: AI generation tools, royalty-free music libraries, or commissioned music later on.
- Open to using other AIs (Gemini, ChatGPT, Atlas) for 3D asset generation too when the project needs it.

## Exports

### Godot

- **When to port:** once the game loop is validated in the web prototype (avoid porting too early and having to redo the design).
- **What carries over directly:** grid logic, costs/adjacency, state structure (already JSON, easy to move to GDScript/Godot Resources).
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

1. **Web prototype (current):** validate the game loop, cost/adjacency mechanics, aesthetic.
2. **Mechanics design:** settle goals, missions and the game-over condition.
3. **Asset production:** consolidate the style guide, music, possible 3D assets.
4. **Godot port:** migrate logic and UI, with the GitHub repository already active.
5. **Production:** prepare builds for Steam (direct) and the App Store (solve the Xcode/Mac step).
