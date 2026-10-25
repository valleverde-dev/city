class_name IsoGrid
extends Node2D
## Draws the isometric grid procedurally and turns taps into tile coordinates.
## View controls: rotate in 90° steps, pinch / mouse-wheel zoom. No panning.

signal tile_tapped(row: int, col: int, screen_pos: Vector2)

const TILE_W := 64.0
const TILE_H := 32.0
const MIN_ZOOM := 0.5
const MAX_ZOOM := 2.5
const WHEEL_STEP := 0.1
const TAP_SLOP := 24.0  # px a finger may move and still count as a tap
const PINCH_COOLDOWN_MS := 150  # ignore taps right after a pinch
const FLASH_MS := 160
const OUTLINE := Color(0.0, 0.898, 1.0, 0.1)

var state: GameState
var view_rotation := 0  # 0..3, quarter turns
var zoom := 1.0
var input_enabled := true

var _touches: Dictionary = {}  # touch index -> Vector2
var _pinching := false
var _pinch_start_dist := 1.0
var _pinch_start_zoom := 1.0
var _block_taps_until := 0
var _mouse_down := false
var _press_pos := Vector2.ZERO
var _flash_until: Dictionary = {}  # tile index -> msec


func _ready() -> void:
	get_viewport().size_changed.connect(_recenter)
	_recenter()


func _recenter() -> void:
	position = get_viewport_rect().size / 2.0


func rotate_view() -> void:
	view_rotation = (view_rotation + 1) % 4
	queue_redraw()


func set_zoom(value: float) -> void:
	zoom = clampf(value, MIN_ZOOM, MAX_ZOOM)
	scale = Vector2(zoom, zoom)


func flash_tile(row: int, col: int) -> void:
	_flash_until[GameState.index_of(row, col)] = Time.get_ticks_msec() + FLASH_MS
	queue_redraw()


# --- Coordinates -----------------------------------------------------------

## Rotates (row, col) by `steps` quarter turns, like rotateCoord() in the web.
static func rotate_coord(cell: Vector2i, steps: int) -> Vector2i:
	var n := GameState.SIZE
	for i in posmod(steps, 4):
		cell = Vector2i(cell.y, n - 1 - cell.x)
	return cell


## Inverse of rotate_coord().
static func unrotate_coord(cell: Vector2i, steps: int) -> Vector2i:
	var n := GameState.SIZE
	for i in posmod(steps, 4):
		cell = Vector2i(n - 1 - cell.y, cell.x)
	return cell


## Tile center in this node's local space (the grid is centered on the origin).
func tile_center(row: int, col: int) -> Vector2:
	var v := rotate_coord(Vector2i(row, col), view_rotation)
	var half_h := (GameState.SIZE - 1) * TILE_H / 2.0
	return Vector2((v.y - v.x) * TILE_W / 2.0, (v.y + v.x) * TILE_H / 2.0 - half_h)


## Tile under a local point, or Vector2i(-1, -1) if outside the grid.
func tile_at_local(point: Vector2) -> Vector2i:
	var half_h := (GameState.SIZE - 1) * TILE_H / 2.0
	var u := point.x / (TILE_W / 2.0)  # = col - row (rotated)
	var w := (point.y + half_h) / (TILE_H / 2.0)  # = col + row (rotated)
	var v := Vector2i(roundi((w - u) / 2.0), roundi((w + u) / 2.0))
	if not GameState.is_inside(v.x, v.y):
		return Vector2i(-1, -1)
	return unrotate_coord(v, view_rotation)


## Tile center in screen (canvas) coordinates, for floating text.
func tile_screen_position(row: int, col: int) -> Vector2:
	return get_global_transform_with_canvas() * tile_center(row, col)


func screen_to_tile(screen_pos: Vector2) -> Vector2i:
	return tile_at_local(get_global_transform_with_canvas().affine_inverse() * screen_pos)


# --- Drawing ---------------------------------------------------------------

func _process(_delta: float) -> void:
	if _flash_until.is_empty():
		return
	var now := Time.get_ticks_msec()
	for i: int in _flash_until.keys():
		if _flash_until[i] <= now:
			_flash_until.erase(i)
	queue_redraw()


func _draw() -> void:
	if state == null:
		return
	var hw := TILE_W / 2.0
	var hh := TILE_H / 2.0
	var now := Time.get_ticks_msec()
	for row in GameState.SIZE:
		for col in GameState.SIZE:
			var c := tile_center(row, col)
			var diamond := PackedVector2Array([
				c + Vector2(0, -hh), c + Vector2(hw, 0), c + Vector2(0, hh), c + Vector2(-hw, 0),
			])
			var color: Color = Palette.TILE_COLORS.get(state.get_tile(row, col), Palette.GRASS)
			if _flash_until.get(GameState.index_of(row, col), 0) > now:
				color = color.darkened(0.55)
			draw_colored_polygon(diamond, color)
			diamond.append(diamond[0])
			draw_polyline(diamond, OUTLINE, 1.0)


# --- Input -----------------------------------------------------------------

func _unhandled_input(event: InputEvent) -> void:
	if not input_enabled:
		return
	if event is InputEventScreenTouch:
		_on_touch(event)
	elif event is InputEventScreenDrag:
		_touches[event.index] = event.position
		if _touches.size() == 2:
			set_zoom(_pinch_start_zoom * _touch_distance() / _pinch_start_dist)
	elif event is InputEventMagnifyGesture:  # trackpad pinch
		set_zoom(zoom * event.factor)
	elif event is InputEventMouseButton:
		_on_mouse_button(event)


func _on_touch(event: InputEventScreenTouch) -> void:
	if event.pressed:
		_touches[event.index] = event.position
		if _touches.size() == 2:
			_pinching = true
			_pinch_start_dist = maxf(_touch_distance(), 1.0)
			_pinch_start_zoom = zoom
	else:
		_touches.erase(event.index)
		if _touches.is_empty() and _pinching:
			_pinching = false
			_block_taps_until = Time.get_ticks_msec() + PINCH_COOLDOWN_MS


func _on_mouse_button(event: InputEventMouseButton) -> void:
	if not event.pressed:
		if event.button_index == MOUSE_BUTTON_LEFT and _mouse_down:
			_mouse_down = false
			var is_tap := event.position.distance_to(_press_pos) <= TAP_SLOP
			if is_tap and not _pinching and Time.get_ticks_msec() >= _block_taps_until:
				_tap(event.position)
		return
	match event.button_index:
		MOUSE_BUTTON_LEFT:
			_mouse_down = true
			_press_pos = event.position
		MOUSE_BUTTON_WHEEL_UP:
			set_zoom(zoom + WHEEL_STEP)
		MOUSE_BUTTON_WHEEL_DOWN:
			set_zoom(zoom - WHEEL_STEP)


func _touch_distance() -> float:
	var points: Array = _touches.values()
	return (points[0] as Vector2).distance_to(points[1])


func _tap(screen_pos: Vector2) -> void:
	var cell := screen_to_tile(screen_pos)
	if cell.x < 0:
		return
	tile_tapped.emit(cell.x, cell.y, tile_screen_position(cell.x, cell.y))
