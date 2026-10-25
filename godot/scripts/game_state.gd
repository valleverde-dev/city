class_name GameState
extends RefCounted
## Pure game logic: the grid, coins, build rules, income and save/load.
## No nodes, no rendering — so it can be tested headlessly (see tests/).

## Result of a build attempt, used by the UI to pick the feedback.
enum Result { BUILT, DEMOLISHED, NO_ROAD, NO_FUNDS, INVALID }

const SIZE := 10  # the grid is SIZE x SIZE
const START_COINS := 20
const TICK_SECONDS := 2.0

## Toolbar order. "grass" is the Demolish tool (it turns a tile back into grass).
const TOOLS: Array[Dictionary] = [
	{"id": "grass", "label": "Demolish", "cost": 0},
	{"id": "road", "label": "Road", "cost": 1},
	{"id": "house", "label": "House", "cost": 5},
	{"id": "shop", "label": "Shop", "cost": 10},
	{"id": "park", "label": "Park", "cost": 3},
]
const COSTS := {"grass": 0, "road": 1, "house": 5, "shop": 10, "park": 3}
## These buildings need a road on one of their 4 neighbours (no diagonals).
const NEEDS_ROAD := ["house", "shop", "park"]

var grid: Array[String] = []
var coin: int = START_COINS


func _init() -> void:
	reset()


## New empty city: all grass, starting coins.
func reset() -> void:
	grid.clear()
	grid.resize(SIZE * SIZE)
	grid.fill("grass")
	coin = START_COINS


static func index_of(row: int, col: int) -> int:
	return row * SIZE + col


static func is_inside(row: int, col: int) -> bool:
	return row >= 0 and row < SIZE and col >= 0 and col < SIZE


func get_tile(row: int, col: int) -> String:
	return grid[index_of(row, col)]


func has_adjacent_road(row: int, col: int) -> bool:
	for d: Vector2i in [Vector2i(-1, 0), Vector2i(1, 0), Vector2i(0, -1), Vector2i(0, 1)]:
		var r := row + d.x
		var c := col + d.y
		if is_inside(r, c) and get_tile(r, c) == "road":
			return true
	return false


## Tries to place `tool_id` on a tile. Never grants income: coins only go
## down here. Income comes exclusively from tick().
func build(row: int, col: int, tool_id: String) -> Result:
	if not is_inside(row, col) or not COSTS.has(tool_id):
		return Result.INVALID
	var cost: int = COSTS[tool_id]
	if tool_id in NEEDS_ROAD and not has_adjacent_road(row, col):
		return Result.NO_ROAD
	if coin < cost:
		return Result.NO_FUNDS
	coin -= cost
	grid[index_of(row, col)] = tool_id
	return Result.DEMOLISHED if tool_id == "grass" else Result.BUILT


func count(tile_type: String) -> int:
	return grid.count(tile_type)


func population() -> int:
	return count("house") * 4


## Coins earned per tick: 2 per shop + half a coin per house (rounded down).
func income() -> int:
	return count("shop") * 2 + floori(count("house") * 0.5)


## Called by the 2-second timer. Returns the coins granted.
func tick() -> int:
	var earned := income()
	coin += earned
	return earned


# --- Save / load -----------------------------------------------------------
# Same JSON shape as the web prototype: { "grid": [String x100], "coin": int }

func to_dict() -> Dictionary:
	return {"grid": Array(grid), "coin": coin}


## Loads a dictionary. Returns false (and leaves the state untouched) if invalid.
func from_dict(data: Variant) -> bool:
	if typeof(data) != TYPE_DICTIONARY:
		return false
	var raw_grid: Variant = data.get("grid")
	var raw_coin: Variant = data.get("coin")
	if typeof(raw_grid) != TYPE_ARRAY or raw_grid.size() != SIZE * SIZE:
		return false
	if typeof(raw_coin) != TYPE_INT and typeof(raw_coin) != TYPE_FLOAT:
		return false
	var new_grid: Array[String] = []
	for tile: Variant in raw_grid:
		if typeof(tile) != TYPE_STRING or not COSTS.has(tile):
			return false
		new_grid.append(tile)
	grid = new_grid
	coin = int(raw_coin)
	return true


func to_json() -> String:
	return JSON.stringify(to_dict())


func from_json(text: String) -> bool:
	var json := JSON.new()
	if json.parse(text) != OK:
		return false
	return from_dict(json.data)


func save_to(path: String) -> bool:
	var file := FileAccess.open(path, FileAccess.WRITE)
	if file == null:
		return false
	file.store_string(to_json())
	return true


func load_from(path: String) -> bool:
	if not FileAccess.file_exists(path):
		return false
	return from_json(FileAccess.get_file_as_string(path))
