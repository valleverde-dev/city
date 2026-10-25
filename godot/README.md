# /godot

Reservado para el port a Godot (fase 4 del [ROADMAP](../ROADMAP.md)).

Se arranca cuando el game loop esté validado en `/web-prototype`. Lo que migra directamente:

- Lógica de grid isométrico (10×10, tile 64×32 px) y rotación de vista.
- Tabla de costes y regla de adyacencia a calle.
- Estado de partida en JSON (`{ grid: string[], coin: number }`) → `Resource` / `FileAccess` en GDScript.
