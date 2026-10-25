extends MarginContainer
## Keeps the UI out of the notch / home indicator on iPhone and iPad.


func _ready() -> void:
	get_viewport().size_changed.connect(_apply)
	_apply()


func _apply() -> void:
	var margins := [0.0, 0.0, 0.0, 0.0]  # left, top, right, bottom
	if OS.has_feature("mobile"):
		var safe := DisplayServer.get_display_safe_area()
		var window := DisplayServer.window_get_size()
		if safe.size.x > 0 and window.x > 0:
			# Safe area is in device pixels; convert to the stretched UI space.
			var k := get_viewport_rect().size / Vector2(window)
			margins = [
				safe.position.x * k.x, safe.position.y * k.y,
				(window.x - safe.end.x) * k.x, (window.y - safe.end.y) * k.y,
			]
	add_theme_constant_override("margin_left", int(margins[0]))
	add_theme_constant_override("margin_top", int(margins[1]))
	add_theme_constant_override("margin_right", int(margins[2]))
	add_theme_constant_override("margin_bottom", int(margins[3]))
