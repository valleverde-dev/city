class_name Palette
extends RefCounted
## Syndicate-style terminal palette, shared by the grid, the HUD and the theme.
## Mirrors the CSS variables in web-prototype/src/index.html.

const BG := Color("#060a10")
const PANEL := Color(8 / 255.0, 14 / 255.0, 20 / 255.0, 0.93)
const INK := Color("#d9fbff")
const SUB := Color("#5f8690")
const GRASS := Color("#2d3b30")
const ROAD := Color("#15171c")
const HOUSE := Color("#ffb020")
const SHOP := Color("#00c2ff")
const PARK := Color("#39ff6a")
const ACCENT := Color("#00e5ff")
const DANGER := Color("#ff2e4d")
const BORDER := Color(0.0, 229 / 255.0, 1.0, 0.28)

## Fill color of each tile type.
const TILE_COLORS := {
	"grass": GRASS,
	"road": ROAD,
	"house": HOUSE,
	"shop": SHOP,
	"park": PARK,
}


## Color strip shown on top of each toolbar button ("grass" is the Demolish tool).
static func tool_color(tool_id: String) -> Color:
	if tool_id == "grass":
		return DANGER
	return TILE_COLORS.get(tool_id, INK)
