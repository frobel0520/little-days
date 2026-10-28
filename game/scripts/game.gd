extends Node
const Rules = preload("res://scripts/rules.gd")
const Art = preload("res://scripts/art.gd")
const Storage = preload("res://scripts/storage.gd")
const Interface = preload("res://scripts/interface.gd")
var content: Dictionary
var saved: Dictionary
var storage: RefCounted
var rules: RefCounted
var art := Art.new()
var chapter_index := 0
var chapter: Dictionary
var state: Dictionary
var completed := false
var selected := ""
var history: Array[Dictionary] = []
var objects: Dictionary = {}
var shadows: Dictionary = {}
var cats: Dictionary = {}
var animations: Dictionary = {}
var ui: Control
var scene_view: SubViewportContainer
var viewport: SubViewport
var stage: Node3D
var room: Node3D
var camera: Camera3D
var ring: MeshInstance3D
var selection_cage: Node3D
var cat_origins: Dictionary = {}
var dragging := false
var drag_moved := false
var drag_start := Vector2.ZERO
var drag_origin: Dictionary = {}
var drag_orientation := 0
var drag_offset := Vector2.ZERO
var candidate: Dictionary = {}
var lift_target := Vector3.ZERO
var hits_at_start: Array[String] = []
var previous_selection := ""
var panning := false
var pan_start := Vector2.ZERO
var pan_origin := Vector3.ZERO
var camera_pan := Vector3.ZERO
var yaw := 0.65
var zoom := 1.0
var view_tween: Tween
var greeting_until := 0
var sounds := false
var audio: AudioStreamPlayer
var test_mode := false
var browser: JavaScriptObject
var clock := 0.0
var world_environment: WorldEnvironment
var sunlight: DirectionalLight3D
var ambient_audio: AudioStreamPlayer
var pending_import: Dictionary = {}
var file_dialog: FileDialog
var web_window: JavaScriptObject
var frame_samples: Array[float] = []
var io_clock := 0.0
var interaction_count := 0
var suspended := false
var visibility_callback: JavaScriptObject

func _ready() -> void:
	content = JSON.parse_string(FileAccess.get_file_as_string("res://data/content.json"))
	if OS.has_feature("web"):
		web_window = JavaScriptBridge.get_interface("window")
		test_mode = str(JavaScriptBridge.eval("window.location.search")).contains("playtest=1")
		if test_mode:
			browser = JavaScriptBridge.get_interface("window")
	configure_display()
	storage = Storage.new(test_mode)
	saved = storage.load_data(content)
	sounds = saved.settings.sounds
	var canvas := CanvasLayer.new()
	add_child(canvas)
	ui = Interface.new()
	canvas.add_child(ui)
	ui.action.connect(on_action)
	scene_view = SubViewportContainer.new()
	scene_view.mouse_filter = Control.MOUSE_FILTER_IGNORE
	scene_view.stretch = true
	ui.add_child(scene_view)
	ui.move_child(scene_view, 0)
	viewport = SubViewport.new()
	viewport.own_world_3d = true
	viewport.handle_input_locally = false
	viewport.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	scene_view.add_child(viewport)
	stage = Node3D.new()
	viewport.add_child(stage)
	build_lighting()
	camera = Camera3D.new()
	camera.projection = Camera3D.PROJECTION_ORTHOGONAL
	camera.current = true
	stage.add_child(camera)
	audio = AudioStreamPlayer.new()
	audio.volume_db = -10
	add_child(audio)
	ambient_audio = AudioStreamPlayer.new()
	ambient_audio.volume_db = -23
	add_child(ambient_audio)
	file_dialog = FileDialog.new()
	file_dialog.access = FileDialog.ACCESS_FILESYSTEM
	file_dialog.filters = PackedStringArray(["*.json ; 進度備份"])
	add_child(file_dialog)
	file_dialog.file_selected.connect(on_file_selected)
	if web_window != null:
		visibility_callback = JavaScriptBridge.create_callback(func(args): set_suspended(bool(args[0])))
		JavaScriptBridge.eval("window.littleDaysBindVisibility=(cb)=>{const hidden=()=>cb(document.hidden);const blur=()=>cb(true);const focus=()=>cb(document.hidden);document.addEventListener('visibilitychange',hidden);window.addEventListener('blur',blur);window.addEventListener('focus',focus);window.littleDaysRemoveVisibility=()=>{document.removeEventListener('visibilitychange',hidden);window.removeEventListener('blur',blur);window.removeEventListener('focus',focus);};};")
		web_window.littleDaysBindVisibility(visibility_callback)
		set_suspended(bool(web_window.document.hidden))
	get_viewport().size_changed.connect(func(): call_deferred("layout"))
	for i in range(content.chapters.size()):
		if content.chapters[i].id == saved.current:
			chapter_index = i
	load_chapter(chapter_index, false)
	layout()

func build_lighting() -> void:
	var environment := WorldEnvironment.new()
	world_environment = environment
	var env := Environment.new()
	env.background_mode = Environment.BG_COLOR
	env.background_color = Color("f1ede3")
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color("fff3df")
	env.ambient_light_energy = 0.35
	env.tonemap_mode = Environment.TONE_MAPPER_LINEAR
	environment.environment = env
	stage.add_child(environment)
	var sun := DirectionalLight3D.new()
	sunlight = sun
	sun.rotation_degrees = Vector3(-55, -30, 0)
	sun.light_color = Color("fff0d5")
	sun.light_energy = 0.5
	sun.shadow_enabled = true
	sun.directional_shadow_mode = DirectionalLight3D.SHADOW_ORTHOGONAL
	sun.directional_shadow_max_distance = 24
	sun.shadow_bias = 0.04
	stage.add_child(sun)

func configure_display() -> void:
	if not OS.has_feature("web"):
		return
	# UI/input coordinates must use CSS pixels even on 2x/3x phone displays.
	var host := JavaScriptBridge.get_interface("window")
	var logical := Vector2i(int(host.innerWidth), int(host.innerHeight))
	var window := get_window()
	if window.content_scale_size != logical:
		window.content_scale_mode = Window.CONTENT_SCALE_MODE_CANVAS_ITEMS
		window.content_scale_aspect = Window.CONTENT_SCALE_ASPECT_IGNORE
		window.content_scale_size = logical

func layout() -> void:
	configure_display()
	ui.layout()
	scene_view.position = ui.scene_rect.position
	scene_view.size = ui.scene_rect.size
	update_camera()

func camera_target() -> Vector3:
	return Vector3(0, 1.1, 0) + camera_pan

func update_camera() -> void:
	if is_instance_valid(view_tween):
		view_tween.kill()
	var aspect: float = scene_view.size.x / maxf(scene_view.size.y, 1)
	camera.size = 10.6 * zoom * maxf(1, 1.25 / aspect)
	camera.position = camera_target() + Vector3(sin(yaw) * 12, 10.5, cos(yaw) * 12)
	camera.look_at(camera_target())

func kill_motion(id: String) -> void:
	if animations.has(id) and animations[id].is_valid():
		animations[id].kill()
	if objects.has(id):
		objects[id].scale = Vector3.ONE

func load_chapter(index: int, save_before := true) -> void:
	if save_before:
		cancel_drag()
		persist()
	for id in animations:
		kill_motion(id)
	animations.clear()
	for node in objects.values():
		node.free()
	for node in shadows.values():
		node.free()
	for node in cats.values():
		node.free()
	objects.clear()
	shadows.clear()
	cats.clear()
	cat_origins.clear()
	if is_instance_valid(room):
		room.free()
	if is_instance_valid(ring):
		ring.free()
	chapter_index = posmod(index, content.chapters.size())
	chapter = content.chapters[chapter_index]
	rules = Rules.new(chapter)
	state = rules.restore(saved.levels.get(chapter.id, {}).get("state", {}))
	completed = saved.levels.get(chapter.id, {}).get("completed", false)
	selected = ""
	history.clear()
	dragging = false
	panning = false
	camera_pan = Vector3.ZERO
	zoom = 1.0
	yaw = 0.65
	greeting_until = 0
	ui.close_dialog()
	room = art.room(chapter)
	stage.add_child(room)
	world_environment.environment.background_color = Color({"rooftop": "dfeaf0", "courtyard": "edf0df"}.get(chapter.id, "f1ede3"))
	sunlight.light_energy = {"cafe": 0.42, "rooftop": 0.55, "courtyard": 0.48}.get(chapter.id, 0.5)
	for it in chapter.items:
		var visual_data: Dictionary = it.duplicate(true)
		if completed and it.has("reveal_on_complete"):
			visual_data.motif = it.reveal_on_complete
		var node: Node3D = art.item(visual_data)
		stage.add_child(node)
		node.name = it.id
		objects[it.id] = node
		node.set_meta("revealed", completed and it.has("reveal_on_complete"))
		node.position = rules.world(it.id, state[it.id])
		node.rotation.y = int(state[it.id].orientation) * PI / 2
		var body := StaticBody3D.new()
		body.collision_layer = 1
		body.collision_mask = 0
		body.set_meta("item", it.id)
		node.add_child(body)
		var collision := CollisionShape3D.new()
		var shape := BoxShape3D.new()
		shape.size = Vector3(it.w + 0.04, maxf(it.h, 0.08), it.d + 0.04)
		collision.shape = shape
		collision.position.y = shape.size.y / 2
		body.add_child(collision)
		var shadow: MeshInstance3D = art.cylinder(stage, minf(it.w, it.d) * 0.47, minf(it.w, it.d) * 0.47, 0.002, node.position, "8b795b")
		var shadow_material := StandardMaterial3D.new()
		shadow_material.albedo_color = Color(0.25, 0.21, 0.15, 0.12)
		shadow_material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
		shadow_material.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
		shadow.material_override = shadow_material
		shadow.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		shadows[it.id] = shadow
	ring = art.torus(stage, 0.46, 0.485, Vector3.ZERO, "f9e1a5")
	ring.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	if is_instance_valid(selection_cage): selection_cage.free()
	selection_cage = Node3D.new()
	stage.add_child(selection_cage)
	var outline_material := StandardMaterial3D.new()
	outline_material.albedo_color = Color("9b7838")
	outline_material.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	outline_material.no_depth_test = true
	for axis in range(3):
		for a in [-1, 1]:
			for b in [-1, 1]:
				var from := Vector3.ZERO
				from[axis] = -0.5
				from[(axis + 1) % 3] = a * 0.5
				from[(axis + 2) % 3] = b * 0.5
				var to := from
				to[axis] = 0.5
				art.line(selection_cage, from, to, 0.009, "9b7838")
	for edge in selection_cage.get_children():
		edge.material_override = outline_material
		edge.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	ui.fill_chapter(chapter, content.chapters, chapter_index)
	sync_cats()
	refresh()
	persist()
	update_camera()
	tell("不急，先看看便條。每件小物都可以放到喜歡的位置。")
	apply_preferences()
	interaction_count = 0

func persist() -> void:
	saved.current = chapter.id
	saved.levels[chapter.id] = {"state": state.duplicate(true), "completed": completed}
	if not storage.save(saved):
		tell("這次進度暫時無法儲存。請保留此頁，確認瀏覽器允許本機儲存。")

func tell(value: String) -> void:
	ui.message.text = value

func refresh() -> void:
	var moment: Dictionary = rules.moment(state, completed)
	var cat_name: String = content.cats[chapter.cat].name if chapter.cat != null else ""
	ui.update(state, selected, rules, completed, dragging, not history.is_empty(), moment, cat_name, sounds)
	if greeting_until > Time.get_ticks_msec():
		ui.controls.greet.disabled = true
	ring.visible = not selected.is_empty()
	selection_cage.visible = ring.visible
	# Architectural cutaway keeps the lower shelf readable without moving objects.
	var lower_used := false
	for p in state.values():
		if p.surface == "shelf-low": lower_used = true
	for part in room.get_children():
		if part is MeshInstance3D and part.material_override.get_meta("shelf_canopy", false):
			part.material_override.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA_DEPTH_PRE_PASS if lower_used else BaseMaterial3D.TRANSPARENCY_DISABLED
			part.material_override.albedo_color.a = 0.18 if lower_used else 1.0
			part.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF if lower_used else GeometryInstance3D.SHADOW_CASTING_SETTING_ON

func choose(id: String) -> void:
	if not objects.has(id):
		return
	if dragging:
		cancel_drag()
	selected = id
	refresh()
	tell("選好了。拖動場景中的小物，或點家具名稱放下。")

func local_screen(screen: Vector2) -> Vector2:
	return (screen - scene_view.global_position) * Vector2(viewport.size) / scene_view.size

func projected(point: Vector3) -> Vector2:
	return camera.unproject_position(point) * scene_view.size / Vector2(viewport.size) + scene_view.global_position

func table_point(screen: Vector2, height: float) -> Variant:
	var local := local_screen(screen)
	return Plane(Vector3.UP, height).intersects_ray(camera.project_ray_origin(local), camera.project_ray_normal(local))

func hits(screen: Vector2) -> Array[String]:
	var local := local_screen(screen)
	var start := camera.project_ray_origin(local)
	var query := PhysicsRayQueryParameters3D.create(start, start + camera.project_ray_normal(local) * 100, 1)
	var result: Array[String] = []
	var excluded: Array[RID] = []
	for i in range(chapter.items.size()):
		query.exclude = excluded
		var hit := stage.get_world_3d().direct_space_state.intersect_ray(query)
		if hit.is_empty():
			break
		excluded.append(hit.rid)
		result.append(str(hit.collider.get_meta("item")))
	return result

func touch_hits(screen: Vector2) -> Array[String]:
	var direct := hits(screen)
	if not direct.is_empty() or get_viewport().get_visible_rect().size.x >= 900:
		return direct
	var nearby: Array[String] = []
	for offset in [Vector2(-9, 0), Vector2(9, 0), Vector2(0, -9), Vector2(0, 9), Vector2(-6, -6), Vector2(6, -6), Vector2(-6, 6), Vector2(6, 6)]:
		for id in hits(screen + offset):
			if not nearby.has(id): nearby.append(id)
	return nearby

func cat_at(screen: Vector2) -> String:
	var local := local_screen(screen)
	var start := camera.project_ray_origin(local)
	# An item in front of the cat keeps priority over greeting.
	var query := PhysicsRayQueryParameters3D.create(start, start + camera.project_ray_normal(local) * 100, 5)
	var hit := stage.get_world_3d().direct_space_state.intersect_ray(query)
	return str(hit.collider.get_meta("cat")) if not hit.is_empty() and hit.collider.has_meta("cat") else ""

func placement_at(screen: Vector2, id: String, orientation: int, offset := Vector2.ZERO) -> Dictionary:
	if not ui.scene_rect.has_point(screen):
		return {}
	var choices: Array[Dictionary] = []
	var local := local_screen(screen)
	var ray_origin := camera.project_ray_origin(local)
	var size: Vector2 = rules.dimensions(id, orientation)
	for surface in chapter.surfaces:
		var point: Variant = table_point(screen, surface.z)
		if point == null:
			continue
		var x: float = point.x + 5 + offset.x
		var y: float = point.z + 4 + offset.y
		if x >= surface.x - 0.12 and x <= surface.x + surface.w + 0.12 and y >= surface.y - 0.12 and y <= surface.y + surface.d + 0.12:
			var p: Dictionary = rules.fit(id, surface.id, x - size.x / 2, y - size.y / 2, orientation)
			if not p.is_empty():
				choices.append({"placement": p, "distance": ray_origin.distance_squared_to(point)})
	choices.sort_custom(func(a: Dictionary, b: Dictionary): return a.distance < b.distance)
	return choices[0].placement if not choices.is_empty() else {}

func begin_drag(id: String, screen: Vector2, clicked: Array[String]) -> void:
	kill_motion(id)
	previous_selection = selected
	selected = id
	drag_origin = state[id].duplicate(true)
	drag_orientation = int(drag_origin.orientation)
	drag_start = screen
	hits_at_start = clicked
	drag_moved = false
	dragging = true
	candidate = drag_origin.duplicate()
	lift_target = rules.world(id, drag_origin) + Vector3.UP * 0.55
	var point: Variant = table_point(screen, rules.surface(drag_origin.surface).z)
	var center: Vector3 = rules.world(id, drag_origin)
	drag_offset = Vector2(center.x - point.x, center.z - point.z) if point != null else Vector2.ZERO
	refresh()
	tell("拿起來了。拖到喜歡的表面；拖至「取消」放手可放回。")

func move_drag(screen: Vector2) -> void:
	drag_moved = drag_moved or screen.distance_to(drag_start) > 5
	candidate = placement_at(screen, selected, drag_orientation, drag_offset)
	if not candidate.is_empty():
		lift_target = rules.world(selected, candidate) + Vector3.UP * 0.55

func animate_home(id: String, placement: Dictionary, landing := true) -> void:
	kill_motion(id)
	var node: Node3D = objects[id]
	var rotation_target := node.rotation.y + wrapf(int(placement.orientation) * PI / 2 - node.rotation.y, -PI, PI)
	var tween := create_tween().set_parallel(true)
	animations[id] = tween
	tween.tween_property(node, "position", rules.world(id, placement), 0.24).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
	tween.tween_property(node, "rotation", Vector3(0, rotation_target, 0), 0.24).set_trans(Tween.TRANS_SINE)
	if landing:
		tween.chain().tween_callback(func():
			play_sound(rules.item(id).kind)
			var settle := create_tween()
			animations[id] = settle
			settle.tween_property(node, "scale", Vector3(1.015, 0.98, 1.015), 0.06)
			settle.tween_property(node, "scale", Vector3.ONE, 0.12)
		)

func release_drag(screen: Vector2) -> void:
	if not dragging:
		return
	if ui.controls.cancel.get_global_rect().has_point(screen):
		cancel_drag()
		return
	var id := selected
	dragging = false
	if not drag_moved:
		animate_home(id, drag_origin, false)
		if previous_selection == id and hits_at_start.size() > 1:
			selected = hits_at_start[(hits_at_start.find(id) + 1) % hits_at_start.size()]
		refresh()
		return
	if candidate.is_empty():
		animate_home(id, drag_origin, false)
		tell("這裡沒有放置表面，小物先回原處。慢慢挑就好。")
		refresh()
	else:
		commit(id, candidate)

func cancel_drag() -> void:
	if dragging:
		dragging = false
		animate_home(selected, drag_origin, false)
		candidate = {}
		refresh()
		tell("回到原來的位置。慢慢來就好。")
	panning = false

func commit(id: String, request: Dictionary) -> void:
	if request.is_empty():
		return
	history.append(state.duplicate(true))
	if history.size() > 80:
		history.pop_front()
	state[id] = rules.gentle(state, id, request)
	selected = id
	animate_home(id, state[id])
	var reaction: Dictionary = chapter.get("reactions", {}).get(id, {})
	if not reaction.is_empty() and state[id].surface != "box":
		remember(chapter.cat, reaction.memory)
	sync_cats()
	refresh()
	persist()
	if not reaction.is_empty() and state[id].surface != "box":
		ui.cat_status.text = reaction.text
	tell("都拿出來了，滿意時再按「今天收好了」。" if rules.ready(state) else "放好了，也可以再換個位置。")

func move_to(support: String) -> void:
	if selected.is_empty() or dragging:
		return
	var surface: Dictionary = rules.surface(support)
	var size: Vector2 = rules.dimensions(selected, int(state[selected].orientation))
	commit(selected, rules.fit(selected, support, surface.x + (surface.w - size.x) / 2, surface.y + (surface.d - size.y) / 2, int(state[selected].orientation)))

func rotate_item() -> void:
	if selected.is_empty():
		return
	if dragging:
		drag_orientation = posmod(drag_orientation + 1, 4)
		if not candidate.is_empty():
			var center: Vector3 = rules.world(selected, candidate)
			var size: Vector2 = rules.dimensions(selected, drag_orientation)
			candidate = rules.fit(selected, candidate.surface, center.x + 5 - size.x / 2, center.z + 4 - size.y / 2, drag_orientation)
			lift_target = rules.world(selected, candidate) + Vector3.UP * 0.55
	else:
		var p: Dictionary = state[selected]
		var center: Vector3 = rules.world(selected, p)
		var orientation := posmod(int(p.orientation) + 1, 4)
		var size: Vector2 = rules.dimensions(selected, orientation)
		commit(selected, rules.fit(selected, p.surface, center.x + 5 - size.x / 2, center.z + 4 - size.y / 2, orientation))

func remember(id: String, memory: String) -> void:
	if not saved.memories.has(id):
		saved.memories[id] = []
	if not saved.memories[id].has(memory):
		saved.memories[id].append(memory)

func record_encounter(id: String) -> void:
	if not saved.met.has(id):
		saved.met.append(id)

func sync_cats() -> void:
	cat_origins.clear()
	for id in cats:
		if cats[id].get_meta("pose") != "hidden": cat_origins[id] = cats[id].position
	for node in cats.values():
		node.free()
	cats.clear()
	if chapter.cat == null:
		return
	var moment: Dictionary = rules.moment(state, completed)
	var position := Vector3(0.2, 0.02, 2.4)
	if chapter.has("catStart"):
		position = Vector3(chapter.catStart.x - 5, chapter.catStart.z, chapter.catStart.y - 4)
	if chapter.id == "home" and moment.pose in ["hidden", "peek", "sleep"]:
		var box: Dictionary = rules.surface("box")
		position = Vector3(box.x + box.w / 2 - 5, box.z + 0.03, box.y + box.d / 2 - 4)
		if moment.pose == "peek":
			position = Vector3(box.x - 5.4, 0.12, box.y + box.d - 4.1)
	elif chapter.id == "books" and moment.pose in ["hidden", "peek"]:
		var shelf: Dictionary = rules.surface("shelf-low")
		position = Vector3(shelf.x - 4.5, shelf.z + 0.02, shelf.y - 3.5)
	else:
		var rest_id: String = chapter.get("restItem", {"home": "blanket", "flowers": "towel", "books": "cushion"}.get(chapter.id, ""))
		if state.has(rest_id) and state[rest_id].surface != "box":
			position = rules.world(rest_id, state[rest_id]) + Vector3.UP * (rules.item(rest_id).h + 0.015)
		elif chapter.id == "flowers":
			position = Vector3(-3.7, 0.02, 1.7)
	add_cat(chapter.cat, moment.pose, position)
	if moment.pose != "hidden":
		record_encounter(chapter.cat)
	if chapter.id in ["flowers", "books"] and rules.count(state) >= 3:
		add_cat("cream", "sleep", Vector3(3.8, 0.02, 3.25))
		record_encounter("cream")
	for visitor in chapter.get("visitors", []):
		if visitor.id == chapter.cat or rules.count(state) < visitor.get("appearAt", 0):
			continue
		var pose: String = visitor.pose
		if rules.count(state) >= visitor.get("settleAt", 9999):
			pose = visitor.get("settledPose", pose)
		add_cat(visitor.id, pose, Vector3(visitor.x - 5, visitor.z, visitor.y - 4))
		if pose != "hidden": record_encounter(visitor.id)

func add_cat(id: String, pose: String, position: Vector3) -> void:
	# Ground-level visitors should sit on a bench, not intersect its seat.
	if pose != "hidden" and position.y < 0.1:
		for support in chapter.surfaces:
			var inside: bool = position.x + 5 >= support.x and position.x + 5 < support.x + support.w and position.z + 4 >= support.y and position.z + 4 < support.y + support.d
			if inside and support.id in ["desk", "drawer", "floor"]:
				position.y = maxf(position.y, float(support.z) + 0.02)
	var node: Node3D = art.cat(content.cats[id], pose)
	stage.add_child(node)
	node.position = cat_origins.get(id, position)
	if not node.position.is_equal_approx(position):
		node.create_tween().tween_property(node, "position", position, 0.65).set_trans(Tween.TRANS_SINE)
	node.rotation.y = -0.25
	cats[id] = node
	if pose != "hidden":
		var body := StaticBody3D.new()
		body.collision_layer = 4
		body.collision_mask = 0
		body.set_meta("cat", id)
		node.add_child(body)
		var collision := CollisionShape3D.new()
		var shape := BoxShape3D.new()
		shape.size = Vector3(0.62, 0.78, 0.85)
		collision.shape = shape
		collision.position.y = 0.36
		body.add_child(collision)

func greet(cat_id := "") -> void:
	if cat_id.is_empty() and chapter.cat != null:
		cat_id = chapter.cat
	if cat_id.is_empty() or not cats.has(cat_id) or greeting_until > Time.get_ticks_msec():
		return
	var pose: String = cats[cat_id].get_meta("pose")
	var response: Variant = content.greetings[cat_id].get(pose)
	if response == null:
		return
	record_encounter(cat_id)
	remember(cat_id, "hello")
	greeting_until = Time.get_ticks_msec() + 1600
	persist()
	refresh()
	ui.cat_status.text = response
	tell(response)
	play_sound("letter")

func notebook() -> void:
	var lines: Array[String] = ["街角的貓咪筆記 · %d / 3\n" % saved.met.size()]
	for id in content.cats:
		if not saved.met.has(id):
			lines.append("還沒見面的鄰居\n在下一個街角，也許會聽見小小的腳步聲。\n")
			continue
		var cat: Dictionary = content.cats[id]
		lines.append(cat.name + " · " + cat.detail + "\n" + cat.habit)
		for memory in saved.memories.get(id, []):
			lines.append("・" + content.memories[id][memory])
		lines.append("發現了 %d 個小習慣，不用急著集滿。\n" % saved.memories.get(id, []).size())
	if saved.levels.get("courtyard", {}).get("completed", false):
		lines.append("相冊的最後一頁，終於多了一張今天的合照。旁邊還留著一點空白，給下一個平凡的日子。")
	elif saved.levels.get("books", {}).get("completed", false):
		lines.append("相冊的最後一頁還空著。下次，拍一張現在的牠們吧。")
	ui.show_dialog("notebook", "街角貓咪筆記", "\n".join(lines))

func finish() -> void:
	if dragging or not rules.ready(state):
		return
	completed = true
	reveal_keepsakes()
	sync_cats()
	refresh()
	persist()
	var has_next: bool = chapter.get("next") is String and not chapter.next.is_empty()
	ui.show_dialog("completion", "今天，也整理得好好的。", chapter.ending + "\n\n" + chapter.clue, has_next)
	if has_next: ui.controls.dialog_next.text = chapter.next
	for it in chapter.items:
		if it.has("reveal_on_complete"):
			var photo: Dictionary = it.duplicate(true)
			photo.motif = it.reveal_on_complete
			ui.show_keepsake(photo)

func reveal_keepsakes() -> void:
	for it in chapter.items:
		if not it.has("reveal_on_complete") or objects[it.id].get_meta("revealed", false):
			continue
		var data: Dictionary = it.duplicate(true)
		data.motif = it.reveal_on_complete
		var replacement: Node3D = art.item(data)
		var model: Node3D = replacement.get_child(0)
		replacement.remove_child(model)
		objects[it.id].get_child(0).free()
		objects[it.id].add_child(model)
		objects[it.id].move_child(model, 0)
		objects[it.id].set_meta("revealed", true)
		replacement.free()

func undo() -> void:
	if history.is_empty() or dragging:
		return
	state = history.pop_back()
	for id in state:
		animate_home(id, state[id], false)
	sync_cats()
	refresh()
	persist()
	tell("退回上一步，還可以再試試。")

func reset() -> void:
	cancel_drag()
	history.append(state.duplicate(true))
	state = rules.initial()
	selected = ""
	for id in state:
		animate_home(id, state[id], false)
	sync_cats()
	refresh()
	persist()
	tell("小物先回到箱子，已認識的貓與小習慣都還記得。")

func change_view() -> void:
	cancel_drag()
	if is_instance_valid(view_tween):
		view_tween.kill()
	yaw = -0.5 if yaw > 0 else 0.65
	view_tween = create_tween()
	var target := camera_target() + Vector3(sin(yaw) * 12, 10.5, cos(yaw) * 12)
	view_tween.tween_method(func(pos: Vector3):
		camera.position = pos
		camera.look_at(camera_target()), camera.position, target, 0.55).set_trans(Tween.TRANS_SINE)

func on_action(name: String, value: String) -> void:
	match name:
		"chapter": load_chapter(int(value))
		"previous": load_chapter(chapter_index - 1)
		"next": load_chapter(chapter_index + 1)
		"dialog_next":
			if ui.modal_kind == "import":
				confirm_import()
			elif ui.modal_kind == "reset":
				ui.close_dialog()
				reset()
			else: load_chapter(chapter_index + 1)
		"choose": choose(value)
		"surface": move_to(value)
		"rotate": rotate_item()
		"cancel":
			if dragging: cancel_drag()
			else:
				selected = ""
				refresh()
		"undo": undo()
		"reset": ui.show_dialog("reset", "重新整理這個房間？", "小物會回到箱子，貓咪筆記與過往完成紀錄會保留。你也可以用「撤銷」還原。", false); ui.controls.dialog_next.text = "確定重整"; ui.controls.dialog_next.show()
		"notebook": notebook()
		"settings": settings_menu()
		"export": export_backup()
		"import": import_backup()
		"recover":
			var previous: Variant = storage.recovery()
			if previous is Dictionary: prepare_import(storage.backup_text(previous))
			else: ui.show_dialog("notice", "尚無匯入前備份", "第一次匯入進度時，會自動保存目前的進度。")
		"quality":
			var options := ["auto", "low", "high"]
			saved.settings.quality = options[(options.find(saved.settings.quality) + 1) % 3]
			apply_preferences()
			persist()
			settings_menu()
		"settings_sound":
			on_action("sound", "")
			settings_menu()
		"ambience":
			saved.settings.ambience = not saved.settings.ambience
			apply_preferences()
			persist()
			settings_menu()
		"interact": interact()
		"item_story":
			if selected.is_empty():
				ui.show_dialog("item", chapter.author, chapter.letter)
			else:
				var it: Dictionary = rules.item(selected)
				ui.show_dialog("item", it.get("completedName", it.name) if completed else it.name, it.get("completedStory", it.story) if completed else it.story)
				if completed and it.has("reveal_on_complete"):
					var photo: Dictionary = it.duplicate(true)
					photo.motif = it.reveal_on_complete
					ui.show_keepsake(photo)
		"greet": greet()
		"finish": finish()
		"dialog_close": ui.close_dialog()
		"view": change_view()
		"zoom_in", "zoom_out":
			zoom = clampf(zoom * (0.85 if name == "zoom_in" else 1.17), 0.55, 1.7)
			update_camera()
		"sound":
			sounds = not sounds
			saved.settings.sounds = sounds
			apply_preferences()
			persist()
			refresh()
			if sounds: play_sound("mug")

func _input(event: InputEvent) -> void:
	if not is_instance_valid(ui):
		return
	if suspended and ((event is InputEventMouseButton and event.pressed) or (event is InputEventScreenTouch and event.pressed)):
		set_suspended(false)
	# Handle drag shortcuts before a queued pointer release can commit the move.
	if event is InputEventKey and event.pressed and not event.echo and dragging and not ui.dialog.visible:
		if event.keycode == KEY_ESCAPE:
			cancel_drag()
			get_viewport().set_input_as_handled()
			return
		if event.keycode == KEY_R:
			rotate_item()
			get_viewport().set_input_as_handled()
			return
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and not event.pressed:
		if dragging:
			release_drag(event.position)
		panning = false
	if event is InputEventScreenTouch and not event.pressed:
		if dragging:
			if event.canceled: cancel_drag()
			else: release_drag(event.position)
		panning = false

func _unhandled_input(event: InputEvent) -> void:
	if not is_instance_valid(ui):
		return
	if ui.dialog.visible:
		if event is InputEventKey and event.pressed and event.keycode == KEY_ESCAPE:
			ui.close_dialog()
		return
	if event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_LEFT and event.pressed and ui.scene_rect.has_point(event.position):
			var cat_id := cat_at(event.position) if selected.is_empty() else ""
			if not cat_id.is_empty():
				greet(cat_id)
				return
			var clicked := touch_hits(event.position)
			if not clicked.is_empty():
				begin_drag(selected if clicked.has(selected) else clicked[0], event.position, clicked)
			elif not selected.is_empty():
				var p := placement_at(event.position, selected, int(state[selected].orientation))
				if not p.is_empty():
					commit(selected, p)
			else:
				panning = true
				pan_start = event.position
				pan_origin = camera_pan
		elif event.pressed and event.button_index in [MOUSE_BUTTON_WHEEL_UP, MOUSE_BUTTON_WHEEL_DOWN] and ui.scene_rect.has_point(event.position):
			on_action("zoom_in" if event.button_index == MOUSE_BUTTON_WHEEL_UP else "zoom_out", "")
	elif event is InputEventMouseMotion:
		if dragging:
			move_drag(event.position)
		elif panning:
			var delta: Vector2 = event.position - pan_start
			var right := camera.global_basis.x
			var forward := Vector3(camera.global_basis.z.x, 0, camera.global_basis.z.z).normalized()
			camera_pan = pan_origin - right * delta.x * 0.015 * zoom - forward * delta.y * 0.015 * zoom
			camera_pan.y = 0
			camera_pan.x = clampf(camera_pan.x, -3, 3)
			camera_pan.z = clampf(camera_pan.z, -3, 3)
			update_camera()
	elif event is InputEventKey and event.pressed and not event.echo:
		match event.keycode:
			KEY_R: rotate_item()
			KEY_ESCAPE:
				if dragging: cancel_drag()
				else:
					selected = ""
					refresh()
			KEY_F:
				camera_pan = Vector3.ZERO
				zoom = 1.0
				update_camera()
			KEY_LEFT, KEY_RIGHT, KEY_UP, KEY_DOWN:
				if not selected.is_empty() and not dragging:
					var p: Dictionary = state[selected]
					var step := 0.25 if event.shift_pressed else 0.08
					var offset := Vector2(-step if event.keycode == KEY_LEFT else step if event.keycode == KEY_RIGHT else 0.0, -step if event.keycode == KEY_UP else step if event.keycode == KEY_DOWN else 0.0)
					commit(selected, rules.fit(selected, p.surface, p.x + offset.x, p.y + offset.y, int(p.orientation)))

func _notification(what: int) -> void:
	if what == NOTIFICATION_APPLICATION_FOCUS_OUT:
		set_suspended(true)
	elif what == NOTIFICATION_APPLICATION_FOCUS_IN:
		set_suspended(false)

func set_suspended(value: bool) -> void:
	suspended = value
	if value:
		if dragging: cancel_drag()
		if is_instance_valid(ambient_audio): ambient_audio.stream_paused = true
		if is_instance_valid(audio): audio.stop()
		Engine.max_fps = 10
	else:
		if is_instance_valid(ambient_audio): ambient_audio.stream_paused = false
		if is_instance_valid(sunlight) and not saved.is_empty(): apply_preferences()

func _exit_tree() -> void:
	if web_window != null: web_window.littleDaysRemoveVisibility()

func _process(delta: float) -> void:
	if not is_instance_valid(camera):
		return
	if not suspended and delta < 1.0:
		frame_samples.append(delta * 1000)
		if frame_samples.size() > 600: frame_samples.pop_front()
	io_clock += delta
	if web_window != null and io_clock > 0.25:
		io_clock = 0
		var incoming: Variant = web_window.littleDaysImport
		if incoming is String and not incoming.is_empty():
			web_window.littleDaysImport = ""
			prepare_import(incoming)
	clock += delta
	if dragging:
		var node: Node3D = objects[selected]
		var old := node.position
		node.position = old.lerp(lift_target, 1 - exp(-18 * delta))
		var velocity := (node.position - old) / maxf(delta, 0.001)
		node.rotation.x = lerp_angle(node.rotation.x, clampf(velocity.z * 0.025, -0.14, 0.14), 1 - exp(-12 * delta))
		node.rotation.z = lerp_angle(node.rotation.z, clampf(-velocity.x * 0.025, -0.14, 0.14), 1 - exp(-12 * delta))
		node.rotation.y = lerp_angle(node.rotation.y, drag_orientation * PI / 2, 1 - exp(-12 * delta))
	for id in shadows:
		var support: Dictionary = candidate if dragging and selected == id and not candidate.is_empty() else state[id]
		var y: float = rules.surface(support.surface).z + 0.006
		shadows[id].position = Vector3(objects[id].position.x, y, objects[id].position.z)
	if not selected.is_empty():
		var it: Dictionary = rules.item(selected)
		var pos: Vector3 = objects[selected].position
		var support: Dictionary = candidate if dragging and not candidate.is_empty() else state[selected]
		ring.position = Vector3(pos.x, rules.surface(support.surface).z + 0.02, pos.z)
		ring.scale = Vector3(maxf(it.w, it.d) * 1.05, 0.2, maxf(it.w, it.d) * 1.05)
		selection_cage.position = pos + Vector3.UP * (it.h / 2)
		selection_cage.rotation.y = objects[selected].rotation.y
		selection_cage.scale = Vector3(it.w + 0.08, maxf(it.h, 0.12) + 0.06, it.d + 0.08)
	for id in cats:
		var node: Node3D = cats[id]
		node.scale.y = 1 + sin(clock * 2.0) * 0.018
		if node.has_meta("head"):
			node.get_meta("head").rotation.y = sin(clock * 0.45) * 0.06 + (-0.12 if greeting_until > Time.get_ticks_msec() else 0.0)
		var blink := greeting_until > Time.get_ticks_msec() or fmod(clock + (1.5 if id == "cream" else 0), 4.5) > 4.35
		for eye in node.get_meta("eyes"):
			eye.scale.y = float(eye.get_meta("open_height")) * (0.13 if blink else 1.0)
	if greeting_until > 0 and greeting_until <= Time.get_ticks_msec():
		greeting_until = 0
		refresh()
	if test_mode and browser != null and not ui.layout_pending:
		inspect()

func inspect() -> void:
	var result: Dictionary = ui.inspect()
	result.chapter = chapter.id
	result.chapter_index = chapter_index
	result.chapter_count = content.chapters.size()
	result.count = rules.count(state)
	result.total = chapter.items.size()
	result.ready = rules.ready(state)
	result.completed = completed
	result.dragging = dragging
	result.selected = selected
	result.state = state
	result.met = saved.met
	result.memories = saved.memories
	result.cat_pose = rules.moment(state, completed).pose
	result.items = {}
	result.revealed_items = []
	result.cats = {}
	result.surfaces = {}
	result.view_changing = is_instance_valid(view_tween) and view_tween.is_running()
	result.camera = camera.position
	result.viewport_width = get_viewport().get_visible_rect().size.x
	result.viewport_height = get_viewport().get_visible_rect().size.y
	result.selection_outline = selection_cage.visible
	result.quality = saved.settings.quality
	result.audio_playing = audio.playing
	result.ambient_playing = ambient_audio.playing
	result.interaction_count = interaction_count
	result.pending_import = not pending_import.is_empty()
	result.suspended = suspended
	result.frame_limit = Engine.max_fps
	var sorted_frames := frame_samples.duplicate()
	sorted_frames.sort()
	result.frame_sample_count = frame_samples.size()
	result.frame_p95_ms = sorted_frames[int((sorted_frames.size() - 1) * 0.95)] if not sorted_frames.is_empty() else 0
	result.draw_calls = Performance.get_monitor(Performance.RENDER_TOTAL_DRAW_CALLS_IN_FRAME)
	result.storage_failed = storage.failed
	result.storage_error = storage.last_error
	result.dialog_text = ui.dialog_body.text if ui.dialog.visible else ""
	for it in chapter.items:
		var node: Node3D = objects[it.id]
		if node.get_meta("revealed", false): result.revealed_items.append(it.id)
		var screen := projected(node.position + Vector3.UP * maxf(it.h * 0.5, 0.04))
		var base := projected(rules.world(it.id, state[it.id]))
		result.items[it.id] = {"x": node.position.x, "y": node.position.y, "z": node.position.z, "angle": node.rotation.y, "screen_x": screen.x, "screen_y": screen.y, "base_x": base.x, "base_y": base.y, "kind": it.kind, "meshes": node.get_child(0).get_child_count(), "expected_y": rules.world(it.id, state[it.id]).y}
	for surface in chapter.surfaces:
		var screen := projected(Vector3(surface.x + surface.w / 2 - 5, surface.z, surface.y + surface.d / 2 - 4))
		result.surfaces[surface.id] = {"x": screen.x, "y": screen.y, "height": surface.z, "accepts": surface.accepts}
	for id in cats:
		var screen := projected(cats[id].position + Vector3.UP * 0.35)
		result.cats[id] = {"screen_x": screen.x, "screen_y": screen.y, "pose": cats[id].get_meta("pose")}
	browser.littleDaysState = JSON.stringify(result)

func play_sound(kind: String) -> void:
	if not sounds or suspended: return
	var material_kind: String = {"mug": "ceramic", "teapot": "ceramic", "vase": "ceramic", "bottle": "ceramic", "book": "paper", "books": "paper", "letter": "paper", "cloth": "cloth", "sweater": "cloth", "bag": "cloth", "windchime": "metal", "tin": "metal", "radio": "radio"}.get(kind, "wood")
	audio.stream = load("res://assets/audio/" + material_kind + ".wav")
	audio.play()

func apply_preferences() -> void:
	var low: bool = saved.settings.quality == "low" or (saved.settings.quality == "auto" and (get_viewport().get_visible_rect().size.x < 900 or get_viewport().get_visible_rect().size.y < 600))
	Engine.max_fps = 10 if suspended else (30 if low else 60)
	sunlight.shadow_enabled = not low
	viewport.positional_shadow_atlas_size = 1024 if low else 2048
	if not is_instance_valid(ambient_audio): return
	if not sounds: audio.stop()
	var kind: String = {"cafe": "rain", "rooftop": "wind", "courtyard": "birds", "flowers": "birds"}.get(chapter.get("id", ""), "wind")
	if sounds and saved.settings.ambience and not suspended:
		var stream: AudioStreamWAV = load("res://assets/audio/" + kind + ".wav")
		stream.loop_mode = AudioStreamWAV.LOOP_FORWARD
		stream.loop_end = stream.data.size() / 2
		if ambient_audio.stream != stream:
			ambient_audio.stream = stream
			ambient_audio.play()
		elif not ambient_audio.playing: ambient_audio.play()
	else: ambient_audio.stop()

func settings_menu() -> void:
	ui.show_dialog("settings", "慢慢玩的設定", "進度保存在這台裝置。匯出備份後，就能在另一台裝置匯入。音效可在這裡開啟。")
	ui.controls.settings_sound.text = "音效開" if sounds else "音效關"
	ui.controls.quality.text = "畫質：" + {"auto": "自動", "low": "省電", "high": "細緻"}[saved.settings.quality]
	ui.controls.ambience.text = "環境聲開" if saved.settings.ambience else "環境聲關"

func export_backup() -> void:
	persist()
	var source: String = storage.backup_text(saved)
	if OS.has_feature("web"):
		JavaScriptBridge.eval("(() => {const blob=new Blob([%s],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='little-days-progress.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);})()" % JSON.stringify(source))
		tell("已匯出進度備份，請保留下載的檔案。")
	else:
		file_dialog.file_mode = FileDialog.FILE_MODE_SAVE_FILE
		file_dialog.current_file = "little-days-progress.json"
		file_dialog.popup_centered_ratio(0.7)

func import_backup() -> void:
	if OS.has_feature("web"):
		JavaScriptBridge.eval("(() => {const input=document.createElement('input');input.type='file';input.accept='.json,application/json';input.onchange=async()=>{const file=input.files[0];if(!file)return;window.littleDaysImport=file.size>1048576?'invalid':await file.text();};input.click();})()")
	else:
		file_dialog.file_mode = FileDialog.FILE_MODE_OPEN_FILE
		file_dialog.popup_centered_ratio(0.7)

func on_file_selected(path: String) -> void:
	if file_dialog.file_mode == FileDialog.FILE_MODE_SAVE_FILE:
		var file := FileAccess.open(path, FileAccess.WRITE)
		if file != null: file.store_string(storage.backup_text(saved))
		tell("已匯出進度備份。" if file != null else "無法寫入檔案，請另選儲存位置。")
	else:
		var file := FileAccess.open(path, FileAccess.READ)
		prepare_import(file.get_as_text() if file != null and file.get_length() <= 1048576 else "invalid")

func prepare_import(source: String) -> void:
	pending_import = storage.parse_backup(source, content)
	if pending_import.is_empty():
		ui.show_dialog("notice", "無法匯入這份備份", "請選擇小日子匯出的有效進度檔。這次沒有更動目前的進度。")
		return
	ui.show_dialog("import", "要使用這份進度嗎？", "備份包含 %d 個日常的紀錄。目前的進度會先備份，可在設定中還原。" % pending_import.levels.size(), true)
	ui.controls.dialog_next.text = "備份目前進度並匯入"

func confirm_import() -> void:
	if pending_import.is_empty(): return
	persist()
	if storage.recovery(saved) != "saved" or not storage.save(pending_import):
		ui.show_dialog("notice", "目前無法儲存", "進度沒有切換，請先確認裝置允許本機儲存。")
		return
	saved = pending_import
	pending_import = {}
	sounds = saved.settings.sounds
	for i in range(content.chapters.size()):
		if content.chapters[i].id == saved.current:
			load_chapter(i, false)
			break
	tell("進度已匯入。需要時可在設定還原匯入前的進度。")

func interact() -> void:
	if selected.is_empty() or dragging: return
	var it: Dictionary = rules.item(selected)
	var model: Node3D = objects[selected].get_child(0)
	if model.has_meta("interaction") and model.get_meta("interaction").is_running(): return
	var base: Vector3 = model.rotation
	var tween := model.create_tween()
	model.set_meta("interaction", tween)
	tween.tween_property(model, "rotation:z", base.z + 0.07, 0.16)
	tween.tween_property(model, "rotation:z", base.z - 0.05, 0.24)
	tween.tween_property(model, "rotation:z", base.z, 0.24)
	interaction_count += 1
	play_sound(it.kind)
	var response: String = {"radio": "老歌輕輕響起，今天可以慢慢來。", "windchime": "風鈴輕輕晃了一下，留一點時間聽風。", "watering": "慢慢澆一點水，小苗還有很長的日子。", "camera": "替這個角落留一張照片，也不用站得整齊。", "cloth": "把皺褶輕輕撫平，這裡很適合休息。"}.get(it.kind, "輕輕碰了一下。這也是今天想留住的小事。")
	tell(response)
