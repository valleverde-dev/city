extends SceneTree
## Headless smoke test of the real main scene: menus, taps, HUD, timer,
## save/load, rotate and zoom. Input is simulated with real InputEvents.
## Run from the godot/ folder:
##   godot --headless --path . -s res://tests/test_main_scene.gd

const AUTOSAVE := "user://test_autosave.json"
const SAVE := "user://test_savegame.json"

var _failures := 0
var _checks := 0
var main: Node


func _initialize() -> void:
	_run()


func check(condition: bool, message: String) -> void:
	_checks += 1
	if not condition:
		_failures += 1
		printerr("FAIL: " + message)


func _run() -> void:
	for path in [AUTOSAVE, SAVE]:
		DirAccess.remove_absolute(ProjectSettings.globalize_path(path))
	main = load("res://scenes/main.tscn").instantiate()
	main.autosave_path = AUTOSAVE
	main.save_path = SAVE
	root.add_child(main)
	await _frames(3)

	var world: IsoGrid = main.world
	var state: GameState = main.state
	var menu: Control = main.menu

	# Start menu
	check(menu.visible and menu.screen == "start", "starts on the start menu")
	check(main.music.playing and main.music.stream == main.MENU_THEME, "menu theme plays on the menu")
	check(main.tick_timer.is_stopped(), "no ticks on the start menu")
	_tap_tile(world, 0, 0)
	check(state.coin == 20 and state.get_tile(0, 0) == "grass", "taps are blocked while the menu is open")

	_press_menu_button(menu, "Play")
	await _frames(2)
	check(not menu.visible, "Play closes the menu")
	check(not main.tick_timer.is_stopped(), "Play starts the tick timer")
	check(main.music.stream == main.MAIN_THEME, "main theme plays in game")
	check(_hud_text(main, "Coins") == "$ 20", "HUD shows 20 coins")

	# Build with real taps (default tool: road)
	_tap_tile(world, 0, 0)
	check(state.get_tile(0, 0) == "road" and state.coin == 19, "tap builds a road for 1 coin")
	check(main.float_layer.get_child_count() > 0, "floating text appears")
	_select_tool(main, "House")
	_tap_tile(world, 5, 5)
	check(state.get_tile(5, 5) == "grass" and state.coin == 19, "house without road is refused")
	_select_tool(main, "Shop")
	_tap_tile(world, 0, 1)
	check(state.get_tile(0, 1) == "shop" and state.coin == 9, "shop next to the road costs 10")
	_tap_tile(world, 1, 0)
	check(state.get_tile(1, 0) == "grass" and state.coin == 9, "no funds for a second shop")
	check(_hud_text(main, "Coins") == "$ 9", "HUD follows the coins")

	# Regression: many demolish taps in one frame grant nothing
	_select_tool(main, "Demolish")
	for i in 30:
		_tap_tile(world, 9, 9)
	check(state.coin == 9, "demolish taps grant no coins")

	# Timer income: 1 shop = 2 coins per 2 s tick
	await create_timer(2.3).timeout
	check(state.coin == 11, "one tick adds 2 coins (got %d)" % state.coin)
	check(FileAccess.file_exists(AUTOSAVE), "autosave written")

	# Taps on the HUD never reach the grid (zoom in so the grid is under it)
	world.set_zoom(2.5)
	_select_tool(main, "Road")
	var coins := state.coin
	_click(Vector2(world.get_viewport_rect().size.x / 2.0, 12))
	check(state.coin == coins, "a tap on the top bar does not build")
	world.set_zoom(1.0)

	# Wheel zoom and its limits
	_wheel(MOUSE_BUTTON_WHEEL_UP)
	check(is_equal_approx(world.zoom, 1.1), "wheel up zooms in")
	for i in 40:
		_wheel(MOUSE_BUTTON_WHEEL_DOWN)
	check(is_equal_approx(world.zoom, 0.5), "zoom is clamped to 0.5")
	world.set_zoom(1.0)

	# Rotate: picking still hits the right tile in every orientation
	for r in 4:
		_click_control(main.get_node("%RotateButton"))
		check(world.view_rotation == (r + 1) % 4, "rotate steps 90°")
		_tap_tile(world, 9, r)
		check(state.get_tile(9, r) == "road", "tap after rotation %d hits the right tile" % (r + 1))

	# Pause, save, change, load
	main.get_node("%PauseButton").pressed.emit()
	await _frames(1)
	check(menu.visible and menu.screen == "pause", "Menu opens the pause screen")
	check(main.tick_timer.is_stopped(), "pause stops the timer")
	_press_menu_button(menu, "Save game")
	check(FileAccess.file_exists(SAVE), "Save game writes the save file")
	var saved_grid := state.grid.duplicate()
	var saved_coin := state.coin
	state.reset()
	_press_menu_button(menu, "Load game")
	await _frames(1)
	check(state.grid == saved_grid and state.coin == saved_coin, "Load game restores the save")
	check(not menu.visible and not main.tick_timer.is_stopped(), "Load game resumes play")

	# Exit screen
	main.get_node("%PauseButton").pressed.emit()
	await _frames(1)
	_press_menu_button(menu, "Exit")
	await _frames(1)
	check(menu.screen == "exit" and main.tick_timer.is_stopped(), "Exit shows the exit screen, no ticks")
	_press_menu_button(menu, "Back to start")
	await _frames(1)
	check(menu.screen == "start", "Back to start")

	for path in [AUTOSAVE, SAVE]:
		DirAccess.remove_absolute(ProjectSettings.globalize_path(path))
	print("%d checks, %d failed" % [_checks, _failures])
	main.music.stop()
	main.queue_free()
	main = null
	await create_timer(0.2).timeout  # let the audio thread release the stream
	quit(1 if _failures > 0 else 0)


func _frames(n: int) -> void:
	for i in n:
		await process_frame


func _click(pos: Vector2) -> void:
	for pressed in [true, false]:
		var e := InputEventMouseButton.new()
		e.button_index = MOUSE_BUTTON_LEFT
		e.pressed = pressed
		e.position = pos
		e.global_position = pos
		root.push_input(e, true)


func _click_control(control: Control) -> void:
	_click(control.get_global_rect().get_center())


func _wheel(button: MouseButton) -> void:
	var e := InputEventMouseButton.new()
	e.button_index = button
	e.pressed = true
	var center := root.get_visible_rect().size / 2.0
	e.position = center
	e.global_position = center
	root.push_input(e, true)


func _tap_tile(world: IsoGrid, row: int, col: int) -> void:
	_click(world.tile_screen_position(row, col))


func _buttons_under(node: Node) -> Array[Button]:
	var found: Array[Button] = []
	for child in node.find_children("*", "Button", true, false):
		found.append(child)
	return found


func _press_menu_button(menu: Control, text: String) -> void:
	for b in _buttons_under(menu):
		if b.text == text and not b.is_queued_for_deletion():
			b.pressed.emit()
			return
	check(false, "menu button '%s' exists" % text)


func _select_tool(main_node: Node, label: String) -> void:
	for b in _buttons_under(main_node.get_node("%Tools")):
		if b.text.begins_with(label):
			_click_control(b)
			check(b.button_pressed, "tool '%s' is selected by a click" % label)
			return
	check(false, "tool '%s' exists" % label)


func _hud_text(main_node: Node, name: String) -> String:
	return (main_node.get_node("%" + name) as Label).text
