extends RefCounted
const KEY := "little-days-godot-v1"
var playtest := false
var failed := false
var last_error := ""

func _init(test_mode: bool) -> void:
	playtest = test_mode

func key() -> String:
	return KEY + ("-playtest" if playtest else "")

func browser_read(name: String) -> Variant:
	var source: Variant = JavaScriptBridge.eval("(() => { try { return localStorage.getItem(%s); } catch (_) { return null; } })()" % JSON.stringify(name))
	return JSON.parse_string(source) if source is String else null

func load_data(content: Dictionary) -> Dictionary:
	var loaded: Variant = null
	if OS.has_feature("web"):
		loaded = browser_read(key())
	else:
		var path := "user://" + key() + ".json"
		if FileAccess.file_exists(path):
			loaded = JSON.parse_string(FileAccess.get_file_as_string(path))
	if loaded is Dictionary and (loaded.get("version") is int or loaded.get("version") is float) and float(loaded.version) == 1.0:
		return sanitize(loaded, content)
	var result := {"version": 1, "levels": {}, "met": [], "memories": {}, "current": "home"}
	if OS.has_feature("web") and not playtest:
		var old: Variant = browser_read("little-days-cats-v1")
		if old is Dictionary:
			result = sanitize(old, content)
		var room: Variant = browser_read("little-days-room-v1")
		if not result.levels.has("home") and room is Dictionary and room.get("state") is Dictionary:
			result.levels.home = room
		var drawers: Variant = browser_read("little-days-v2")
		if drawers is Dictionary:
			for chapter in content.chapters:
				if not chapter.has("legacy_index"):
					continue
				var layouts: Variant = drawers.get("layouts", {})
				var layout: Variant = layouts.get(str(int(chapter.legacy_index)), {}) if layouts is Dictionary else null
				if layout is not Dictionary:
					continue
				var placements := {}
				var scale: float = chapter.legacy_scale
				for id in layout:
					var p: Variant = layout[id]
					if p is Dictionary and (p.get("x") is float or p.get("x") is int) and (p.get("y") is float or p.get("y") is int):
						placements[id] = {"surface": "desk", "x": chapter.surfaces[0].x + p.x * scale, "y": chapter.surfaces[0].y + p.y * scale, "orientation": 1 if p.get("rotated") is bool and p.rotated else 0}
				result.levels[chapter.id] = {"state": placements, "completed": drawers.get("completed", []).has(int(chapter.legacy_index)) if drawers.get("completed") is Array else false}
	return sanitize(result, content)

func sanitize(data: Dictionary, content: Dictionary) -> Dictionary:
	var result := {"version": 1, "levels": {}, "met": [], "memories": {}, "current": "home"}
	for chapter in content.chapters:
		if data.get("current") is String and data.current == chapter.id:
			result.current = chapter.id
		var all_levels: Variant = data.get("levels", {})
		if all_levels is Dictionary and all_levels.get(chapter.id) is Dictionary:
			var entry: Dictionary = all_levels[chapter.id]
			result.levels[chapter.id] = {"state": entry.get("state", {}) if entry.get("state", {}) is Dictionary else {}, "completed": entry.get("completed") is bool and entry.completed}
	for id in content.cats:
		if data.get("met") is Array and data.met.has(id):
			result.met.append(id)
		var all_memories: Variant = data.get("memories", {})
		result.memories[id] = []
		if all_memories is Dictionary and all_memories.get(id) is Array:
			for memory in all_memories[id]:
				if memory is String and content.memories[id].has(memory) and not result.memories[id].has(memory):
					result.memories[id].append(memory)
	return result

func save(data: Dictionary) -> bool:
	data.version = 1
	var text := JSON.stringify(data)
	if OS.has_feature("web"):
		var outcome: Variant = JavaScriptBridge.eval("(() => { try { localStorage.setItem(%s, %s); return 'saved'; } catch (error) { return error.name; } })()" % [JSON.stringify(key()), JSON.stringify(text)])
		failed = outcome is not String or outcome != "saved"
		last_error = str(outcome) if failed else ""
	else:
		var file := FileAccess.open("user://" + key() + ".json", FileAccess.WRITE)
		failed = file == null
		last_error = str(FileAccess.get_open_error()) if failed else ""
		if file != null:
			file.store_string(text)
	return not failed
