extends SceneTree
const Rules = preload("res://scripts/rules.gd")
const Art = preload("res://scripts/art.gd")
const Storage = preload("res://scripts/storage.gd")
var failures := 0

func check(condition: bool, message: String) -> void:
	if not condition:
		failures += 1
		push_error(message)

func _initialize() -> void:
	var content: Dictionary = JSON.parse_string(FileAccess.get_file_as_string("res://data/content.json"))
	var art := Art.new()
	var total := 0
	check(content.chapters.size() == 11, "Six story chapters and five small days must exist")
	for chapter in content.chapters:
		var rules := Rules.new(chapter)
		var state := rules.initial()
		var room: Node3D = art.room(chapter)
		check(room.get_child_count() > 0, "A modeled environment for " + chapter.id)
		room.free()
		check(not rules.ready(state), "Initial supplies cannot complete " + chapter.id)
		for it in chapter.items:
			total += 1
			var node: Node3D = art.item(it)
			var model: Node3D = node.get_child(0)
			check(model.get_child_count() > 0, "Nonempty 3D model: " + it.kind)
			var bounds := AABB()
			for i in range(model.get_child_count()):
				var child: MeshInstance3D = model.get_child(i)
				var current: AABB = model.transform * child.mesh.get_aabb()
				bounds = current if i == 0 else bounds.merge(current)
			check(bounds.size.is_equal_approx(Vector3(it.w, it.h, it.d)), "Natural model dimensions: " + it.id)
			check(absf(bounds.position.y) < 0.0001, "Model rests on its bottom: " + it.id)
			node.free()
			if it.has("reveal_on_complete"):
				var revealed_data: Dictionary = it.duplicate(true)
				revealed_data.motif = it.reveal_on_complete
				var revealed: Node3D = art.item(revealed_data)
				check(revealed.get_child(0).get_child_count() > 0, "Completed photo has a modeled keepsake")
				revealed.free()
			for surface in chapter.surfaces:
				for angle in range(4):
					var p := rules.fit(it.id, surface.id, -100, 100, angle)
					if p.is_empty():
						continue
					var size := rules.dimensions(it.id, angle)
					check(p.x >= surface.x and p.y >= surface.y and p.x + size.x <= surface.x + surface.w + 0.0001 and p.y + size.y <= surface.y + surface.d + 0.0001, "Clamp entire rotated footprint")
					check(absf(rules.world(it.id, p).y - surface.z - 0.012) < 0.0001, "Correct support height")
			var support: Dictionary = chapter.surfaces[0]
			state[it.id] = rules.gentle(state, it.id, rules.fit(it.id, support.id, support.x + 0.5, support.y + 0.5))
		check(rules.ready(state), "Every object can be homed without a unique packing solution: " + chapter.id)
		var damaged := {chapter.items[0].id: {"surface": "unknown", "x": "bad", "y": null, "orientation": []}}
		check(rules.restore(damaged) == rules.initial(), "Malformed save entries are ignored")
		check(rules.restore(state) == state, "Saved chapter placements round trip")
	for id in content.cats:
		for pose in ["hidden", "peek", "sit", "sleep"]:
			var cat := art.cat(content.cats[id], pose)
			check(cat.get_child_count() > 0, "3D cat model and pose: " + id)
			cat.free()
	var home := Rules.new(content.chapters[0])
	var pair := home.initial()
	pair.mug = home.fit("mug", "desk", 2.5, 2.0)
	var before: Dictionary = pair.mug.duplicate()
	var book_request := home.fit("book", "desk", 2.5, 2.0)
	pair.book = home.gentle(pair, "book", book_request)
	check(home.overlap(pair, "book", pair.book) < 0.001, "Nearby free tabletop space prevents model intersection")
	check(pair.mug == before and home.count(pair) == 2, "Spacing keeps existing objects and relaxed progress intact")
	var storage := Storage.new(true)
	var cleaned := storage.sanitize({"levels": [], "memories": {"cream": ["hello", "unknown", "hello"]}, "met": ["cream", "unknown"], "current": "bad"}, content)
	check(cleaned.memories.cream == ["hello"] and cleaned.met == ["cream"] and cleaned.current == "home", "Save metadata is validated")
	var invalid_completion := storage.sanitize({"levels": {"home": {"state": {}, "completed": "invalid"}}}, content)
	check(invalid_completion.levels.home.completed == false, "Malformed legacy completion cannot break the game")
	check(total == 85, "All 85 objects were modeled")
	print("Godot checks: %d solid models, 11 environments, 12 cat poses, photo variants, placement/rotation/height/completion/save validation; failures=%d" % [total, failures])
	quit(1 if failures else 0)
