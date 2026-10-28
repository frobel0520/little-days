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
	var preferences: Variant = data.get("settings", {})
	result.settings = {"quality": "auto", "sounds": false, "ambience": true}
	if preferences is Dictionary:
		if preferences.get("quality") is String and preferences.quality in ["auto", "low", "high"]: result.settings.quality = preferences.quality
		for option in ["sounds", "ambience"]:
			if preferences.get(option) is bool: result.settings[option] = preferences[option]
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

func backup_text(data: Dictionary) -> String:
	return JSON.stringify({"format": "little-days-backup", "version": 1, "save": data}, "  ")

func parse_backup(source: String, content: Dictionary) -> Dictionary:
	if source.to_utf8_buffer().size() > 1048576: return {}
	var parser := JSON.new()
	if parser.parse(source) != OK: return {}
	var envelope: Variant = parser.data
	if envelope is not Dictionary or envelope.get("format") is not String or envelope.format != "little-days-backup": return {}
	if not (envelope.get("version") is int or envelope.get("version") is float) or envelope.version != 1: return {}
	var data: Variant = envelope.get("save")
	if data is not Dictionary or data.get("levels") is not Dictionary: return {}
	if not (data.get("version") is int or data.get("version") is float) or data.version != 1: return {}
	var current_valid := false
	for chapter in content.chapters:
		if data.get("current") is String and data.current == chapter.id: current_valid = true
		if not data.levels.has(chapter.id): continue
		var entry: Variant = data.levels[chapter.id]
		if entry is not Dictionary or entry.get("state") is not Dictionary or entry.get("completed") is not bool: return {}
		var rules := preload("res://scripts/rules.gd").new(chapter)
		for id in entry.state:
			if rules.item(id).is_empty(): return {}
			var p: Variant = entry.state[id]
			if p is not Dictionary or p.get("surface") is not String: return {}
			for coordinate in ["x", "y", "orientation"]:
				if not (p.get(coordinate) is int or p.get(coordinate) is float) or not is_finite(float(p[coordinate])): return {}
			if p.orientation != floorf(p.orientation) or p.orientation < 0 or p.orientation > 3: return {}
			if rules.fit(id, p.surface, p.x, p.y, int(p.orientation)).is_empty(): return {}
	if not current_valid: return {}
	return sanitize(data, content)

func recovery(data: Dictionary = {}) -> Variant:
	var name := key() + "-before-import"
	if data.is_empty():
		return browser_read(name) if OS.has_feature("web") else JSON.parse_string(FileAccess.get_file_as_string("user://" + name + ".json")) if FileAccess.file_exists("user://" + name + ".json") else null
	var source := JSON.stringify(data)
	if OS.has_feature("web"):
		return JavaScriptBridge.eval("(() => { try { localStorage.setItem(%s,%s); return 'saved'; } catch (_) { return 'failed'; } })()" % [JSON.stringify(name), JSON.stringify(source)])
	var file := FileAccess.open("user://" + name + ".json", FileAccess.WRITE)
	if file == null: return "failed"
	file.store_string(source)
	return "saved"
