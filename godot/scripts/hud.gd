extends VBoxContainer
## Top bar (title, population, coins, rotate, menu) and bottom toolbar.

signal tool_selected(tool_id: String)
signal rotate_pressed
signal menu_pressed

@onready var _population: Label = %Population
@onready var _coins: Label = %Coins
@onready var _hint: Label = %Hint
@onready var _tools: HBoxContainer = %Tools

var _tool_group := ButtonGroup.new()


func _ready() -> void:
	%RotateButton.pressed.connect(rotate_pressed.emit)
	%PauseButton.pressed.connect(menu_pressed.emit)


## Builds one toggle button per tool. `selected` starts pressed.
func setup(tools: Array[Dictionary], selected: String) -> void:
	for tool in tools:
		var button := Button.new()
		var cost: int = tool["cost"]
		button.text = tool["label"] + (" · %d" % cost if cost > 0 else "")
		button.toggle_mode = true
		button.button_group = _tool_group
		button.theme_type_variation = &"ToolButton"
		button.custom_minimum_size = Vector2(88, 44)
		button.button_pressed = tool["id"] == selected
		button.pressed.connect(tool_selected.emit.bind(tool["id"]))
		# Colored strip on top of the button, like the web toolbar.
		var strip := ColorRect.new()
		strip.color = Palette.tool_color(tool["id"])
		strip.mouse_filter = Control.MOUSE_FILTER_IGNORE
		strip.set_anchors_and_offsets_preset(Control.PRESET_TOP_WIDE)
		strip.offset_bottom = 3
		button.add_child(strip)
		_tools.add_child(button)


func refresh(population: int, coins: int) -> void:
	_population.text = "POP %d" % population
	_coins.text = "$ %d" % coins


## Where toasts ("saved", "loaded"...) appear: just below the top bar.
func toast_position() -> Vector2:
	return _hint.get_global_rect().get_center()
