extends Node
## Wires everything together: game state, grid, HUD, menus, timer, music.

const MUSIC_VOLUME := 0.45  # linear, 0..1
const PAUSE_DUCK := 0.4  # music level on the pause screen
const EXIT_LEVEL := 0.6  # music level on the exit screen
const MENU_THEME: AudioStream = preload("res://audio/eurocrat_menu.ogg")  # Ode to Joy, Eurodance mix
const MAIN_THEME: AudioStream = preload("res://audio/eurocrat_main.ogg")  # ambient hold music
const WIN_THEME: AudioStream = preload("res://audio/eurocrat_win.ogg")  # Eurovision-style, for the v0.2 win screen

## Save files live in user:// (the app's private data folder).
## They are vars so tests can point them somewhere else.
var autosave_path := "user://autosave.json"
var save_path := "user://savegame.json"
var state := GameState.new()
var current_tool := "road"

@onready var world: IsoGrid = $World
@onready var tick_timer: Timer = $TickTimer
@onready var music: AudioStreamPlayer = $Music
@onready var hud: Control = %HUD
@onready var menu: Control = %Menu
@onready var float_layer: Control = %FloatLayer

var _music_tween: Tween


func _ready() -> void:
	state.load_from(autosave_path)  # keeps the fresh state if there is no autosave
	world.state = state
	world.tile_tapped.connect(_on_tile_tapped)

	tick_timer.wait_time = GameState.TICK_SECONDS
	tick_timer.timeout.connect(_on_tick)

	hud.setup(GameState.TOOLS, current_tool)
	hud.tool_selected.connect(func(id: String) -> void: current_tool = id)
	hud.rotate_pressed.connect(world.rotate_view)
	hud.menu_pressed.connect(_pause)

	menu.action.connect(_on_menu_action)
	_refresh()
	_show_menu("start")


func _notification(what: int) -> void:
	# Save when the app goes to the background (iOS) or the window closes.
	if what == NOTIFICATION_APPLICATION_PAUSED or what == NOTIFICATION_WM_CLOSE_REQUEST:
		_autosave()


# --- Gameplay --------------------------------------------------------------

func _on_tile_tapped(row: int, col: int, screen_pos: Vector2) -> void:
	var cost: int = GameState.COSTS[current_tool]
	match state.build(row, col, current_tool):
		GameState.Result.NO_ROAD:
			world.flash_tile(row, col)
			float_text(screen_pos, "no road nearby")
		GameState.Result.NO_FUNDS:
			world.flash_tile(row, col)
			float_text(screen_pos, "no funds")
		GameState.Result.DEMOLISHED:
			float_text(screen_pos, "demolished")
		GameState.Result.BUILT:
			float_text(screen_pos, "-%d" % cost if cost > 0 else "ok")
	# Building only refreshes the view: income comes from the timer alone.
	world.queue_redraw()
	_refresh()
	_autosave()


func _on_tick() -> void:
	state.tick()
	_refresh()
	_autosave()


func _refresh() -> void:
	hud.refresh(state.population(), state.coin)


func _autosave() -> void:
	state.save_to(autosave_path)


# --- Menus -----------------------------------------------------------------

func _show_menu(screen: String) -> void:
	menu.show_screen(screen)
	world.input_enabled = false
	match screen:
		"start":
			_play_music(MENU_THEME)
		"pause":
			_play_music(MAIN_THEME, PAUSE_DUCK)
		"exit":
			tick_timer.stop()
			_play_music(MENU_THEME, EXIT_LEVEL)


func _start_playing() -> void:
	menu.close()
	world.input_enabled = true
	tick_timer.start()
	_play_music(MAIN_THEME)


func _pause() -> void:
	tick_timer.stop()
	_show_menu("pause")


func _on_menu_action(id: String) -> void:
	match id:
		"play", "resume":
			_start_playing()
		"save":
			toast("saved" if state.save_to(save_path) else "save failed")
		"load":
			_load_game()
		"exit":
			_show_menu("exit")
		"back":
			_show_menu("start")
		"quit":
			_autosave()
			get_tree().quit()


func _load_game() -> void:
	if not FileAccess.file_exists(save_path):
		toast("no saved game")
		return
	if not state.load_from(save_path):
		toast("load failed")
		return
	_autosave()
	world.queue_redraw()
	_refresh()
	_start_playing()
	toast("loaded")


# --- Feedback --------------------------------------------------------------

## Text that floats up and fades out at a screen position.
func float_text(screen_pos: Vector2, text: String) -> void:
	var label := Label.new()
	label.text = text.to_upper()
	label.theme_type_variation = &"FloatLabel"
	label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	float_layer.add_child(label)
	label.reset_size()
	label.position = screen_pos - label.size / 2.0
	var tween := label.create_tween().set_parallel()
	tween.tween_property(label, "position:y", label.position.y - 28.0, 0.9) \
		.set_ease(Tween.EASE_OUT).set_trans(Tween.TRANS_CUBIC)
	tween.tween_property(label, "modulate:a", 0.0, 0.9).set_ease(Tween.EASE_IN)
	tween.chain().tween_callback(label.queue_free)


func toast(text: String) -> void:
	float_text(hud.toast_position(), text)


# --- Music -----------------------------------------------------------------

## Plays `track` looped, fading to MUSIC_VOLUME * level.
func _play_music(track: AudioStream, level: float = 1.0) -> void:
	if _music_tween:
		_music_tween.kill()
	if music.stream != track or not music.playing:
		if track is AudioStreamOggVorbis:
			track.loop = true
		music.stream = track
		music.volume_db = -40.0
		music.play()
	_music_tween = create_tween()
	_music_tween.tween_property(music, "volume_db", linear_to_db(MUSIC_VOLUME * level), 1.0)
