extends SceneTree
## Headless unit tests for GameState (pure logic, no scene).
## Run from the godot/ folder:
##   godot --headless --path . -s res://tests/test_game_state.gd

const GameStateScript := preload("res://scripts/game_state.gd")
const TEST_SAVE := "user://test_game_state.json"

var _failures := 0
var _checks := 0


func _init() -> void:
	test_new_game()
	test_costs()
	test_adjacency_rule()
	test_no_funds()
	test_demolish()
	test_tick_income()
	test_no_income_on_tap()
	test_save_load_round_trip()
	test_load_rejects_bad_data()
	print("%d checks, %d failed" % [_checks, _failures])
	quit(1 if _failures > 0 else 0)


func check(condition: bool, message: String) -> void:
	_checks += 1
	if not condition:
		_failures += 1
		printerr("FAIL: " + message)


func test_new_game() -> void:
	var s: GameState = GameStateScript.new()
	check(s.grid.size() == 100, "grid has 100 tiles")
	check(s.count("grass") == 100, "new grid is all grass")
	check(s.coin == 20, "starts with 20 coins")
	check(s.population() == 0 and s.income() == 0, "empty city: no population, no income")


func test_costs() -> void:
	var expected := {"grass": 0, "road": 1, "house": 5, "shop": 10, "park": 3}
	for id: String in expected:
		var s: GameState = GameStateScript.new()
		s.coin = 100
		s.grid[GameState.index_of(0, 0)] = "road"  # satisfy the road rule at (0,1)
		var result := s.build(0, 1, id)
		check(result != GameState.Result.NO_ROAD and result != GameState.Result.NO_FUNDS, "%s can be built" % id)
		check(s.coin == 100 - expected[id], "%s costs %d" % [id, expected[id]])
	for tool in GameState.TOOLS:
		check(GameState.COSTS[tool["id"]] == tool["cost"], "toolbar cost matches for %s" % tool["id"])


func test_adjacency_rule() -> void:
	var s: GameState = GameStateScript.new()
	s.coin = 100
	for id in ["house", "shop", "park"]:
		check(s.build(5, 5, id) == GameState.Result.NO_ROAD, "%s needs a road" % id)
	check(s.coin == 100, "a refused build costs nothing")
	check(s.get_tile(5, 5) == "grass", "a refused build leaves the tile untouched")
	check(s.build(5, 5, "road") == GameState.Result.BUILT, "roads need no road")
	s.grid[GameState.index_of(5, 5)] = "grass"
	s.grid[GameState.index_of(4, 4)] = "road"  # diagonal does not count
	check(s.build(5, 5, "house") == GameState.Result.NO_ROAD, "diagonal road does not count")
	for d: Vector2i in [Vector2i(-1, 0), Vector2i(1, 0), Vector2i(0, -1), Vector2i(0, 1)]:
		var t: GameState = GameStateScript.new()
		t.grid[GameState.index_of(5 + d.x, 5 + d.y)] = "road"
		check(t.build(5, 5, "house") == GameState.Result.BUILT, "road at offset %s counts" % d)
	var edge: GameState = GameStateScript.new()
	edge.grid[GameState.index_of(0, 1)] = "road"
	check(edge.build(0, 0, "park") == GameState.Result.BUILT, "corner tile next to a road")
	check(edge.build(-1, 0, "road") == GameState.Result.INVALID, "outside the grid is invalid")
	check(edge.build(0, 0, "castle") == GameState.Result.INVALID, "unknown tool is invalid")


func test_no_funds() -> void:
	var s: GameState = GameStateScript.new()
	s.grid[GameState.index_of(0, 0)] = "road"
	s.coin = 9
	check(s.build(0, 1, "shop") == GameState.Result.NO_FUNDS, "shop needs 10 coins")
	check(s.coin == 9 and s.get_tile(0, 1) == "grass", "no-funds build changes nothing")
	s.coin = 10
	check(s.build(0, 1, "shop") == GameState.Result.BUILT, "exactly enough coins is fine")
	check(s.coin == 0, "coins can reach zero")
	s.coin = 0
	check(s.build(9, 9, "road") == GameState.Result.NO_FUNDS, "road needs 1 coin")
	# The web checks the road rule before funds: keep the same message priority.
	check(s.build(5, 5, "house") == GameState.Result.NO_ROAD, "no road is reported before no funds")


func test_demolish() -> void:
	var s: GameState = GameStateScript.new()
	s.build(0, 0, "road")
	s.build(0, 1, "house")
	var coins := s.coin
	check(s.build(0, 1, "grass") == GameState.Result.DEMOLISHED, "demolish returns DEMOLISHED")
	check(s.get_tile(0, 1) == "grass", "demolished tile becomes grass")
	check(s.coin == coins, "demolish is free and refunds nothing")
	check(s.build(7, 7, "grass") == GameState.Result.DEMOLISHED, "demolishing grass needs no road")


func test_tick_income() -> void:
	var s: GameState = GameStateScript.new()
	s.coin = 0
	s.grid[0] = "shop"
	s.grid[1] = "shop"
	s.grid[2] = "house"
	s.grid[3] = "house"
	s.grid[4] = "house"
	s.grid[5] = "park"
	s.grid[6] = "road"
	check(s.income() == 2 * 2 + 1, "income = shops*2 + floor(houses*0.5)")
	check(s.population() == 12, "population = houses*4")
	check(s.tick() == 5 and s.coin == 5, "tick adds the income")
	s.tick()
	check(s.coin == 10, "every tick adds income again")


func test_no_income_on_tap() -> void:
	# Regression for the web exploit: tapping (even free Demolish) must never
	# add coins. Only tick() does.
	var s: GameState = GameStateScript.new()
	s.coin = 50
	s.grid[0] = "shop"
	s.grid[1] = "house"
	s.grid[2] = "house"
	for i in 200:
		s.build(9, 9, "grass")
	check(s.coin == 50, "200 demolish taps grant no coins")
	s.build(8, 8, "road")
	check(s.coin == 49, "building only subtracts the cost")
	s.build(8, 8, "grass")
	check(s.coin == 49, "demolishing grants nothing")


func test_save_load_round_trip() -> void:
	var s: GameState = GameStateScript.new()
	s.build(3, 3, "road")
	s.build(3, 4, "house")
	s.build(2, 3, "park")
	s.coin = 123
	check(s.save_to(TEST_SAVE), "save writes the file")
	var data: Variant = JSON.parse_string(FileAccess.get_file_as_string(TEST_SAVE))
	check(typeof(data) == TYPE_DICTIONARY and data.keys().size() == 2, "save has exactly grid + coin")
	check(data["grid"].size() == 100 and data["grid"][34] == "house", "grid is a 100-string array")
	var t: GameState = GameStateScript.new()
	check(t.load_from(TEST_SAVE), "load reads the file")
	check(t.grid == s.grid and t.coin == 123, "round-trip keeps grid and coins")
	check(typeof(t.coin) == TYPE_INT, "coin stays an int after JSON")
	# A save written by the web prototype loads too.
	var web := '{"grid":%s,"coin":7}' % JSON.stringify(Array(s.grid))
	var u: GameState = GameStateScript.new()
	check(u.from_json(web) and u.coin == 7 and u.get_tile(3, 4) == "house", "web save format loads")
	DirAccess.remove_absolute(ProjectSettings.globalize_path(TEST_SAVE))
	check(not GameStateScript.new().load_from(TEST_SAVE), "missing file returns false")


func test_load_rejects_bad_data() -> void:
	var s: GameState = GameStateScript.new()
	s.coin = 42
	check(not s.from_json("not json"), "garbage is rejected")
	check(not s.from_json('{"grid":["grass"],"coin":1}'), "short grid is rejected")
	var bad := []
	bad.resize(100)
	bad.fill("lava")
	check(not s.from_dict({"grid": bad, "coin": 1}), "unknown tile is rejected")
	check(s.coin == 42 and s.count("grass") == 100, "a rejected load leaves the state untouched")
