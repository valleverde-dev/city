# /godot

Reserved for the Godot port (phase 4 of the [ROADMAP](../ROADMAP.md)).

It starts once the game loop is validated in `/web-prototype`. What carries over directly:

- Isometric grid logic (10×10, 64×32 px tiles) and view rotation.
- Cost table and the adjacent-road rule.
- Save state in JSON (`{ grid: string[], coin: number }`) → `Resource` / `FileAccess` in GDScript.
