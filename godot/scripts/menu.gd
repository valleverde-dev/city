extends Control
## Start / pause / exit screens. Emits `action` with the button id;
## main.gd decides what each action does.

signal action(id: String)

@onready var _title: Label = %MenuTitle
@onready var _subtitle: Label = %MenuSubtitle
@onready var _buttons: VBoxContainer = %MenuButtons

var screen := ""

const SCREENS := {
	"start": {
		"title": "City Builder",
		"subtitle": "Isometric prototype",
		"buttons": [["play", "Play", &"PrimaryButton"], ["load", "Load game", &""], ["exit", "Exit", &"DangerButton"]],
	},
	"pause": {
		"title": "Paused",
		"subtitle": "",
		"buttons": [
			["resume", "Resume", &"PrimaryButton"], ["save", "Save game", &""],
			["load", "Load game", &""], ["exit", "Exit", &"DangerButton"],
		],
	},
	"exit": {
		"title": "Disconnected",
		"subtitle": "Your game is saved automatically. You can close the app.",
		"buttons": [["back", "Back to start", &"PrimaryButton"]],
	},
}


func show_screen(id: String) -> void:
	screen = id
	var data: Dictionary = SCREENS[id]
	_title.text = data["title"]
	_subtitle.text = data["subtitle"]
	_subtitle.visible = data["subtitle"] != ""
	for child in _buttons.get_children():
		child.queue_free()
	var buttons: Array = data["buttons"].duplicate()
	# iOS apps must not quit themselves; offer "Quit" only on desktop.
	if id == "exit" and not OS.has_feature("mobile"):
		buttons.append(["quit", "Quit to desktop", &"DangerButton"])
	for entry: Array in buttons:
		var button := Button.new()
		button.text = entry[1]
		button.theme_type_variation = entry[2]
		button.custom_minimum_size = Vector2(0, 46)
		button.pressed.connect(action.emit.bind(entry[0]))
		_buttons.add_child(button)
	show()


func close() -> void:
	screen = ""
	hide()
