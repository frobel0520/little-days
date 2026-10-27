extends Node3D
## A small, real 3D interaction study. Geometry is built here, not from sprites.

const SURFACE := 2.48
const HOME := [Vector3(-1.65, SURFACE, 0.2), Vector3(0.0, SURFACE, 0.65), Vector3(1.7, SURFACE, -0.35)]
const NAMES := ["早晨的陶杯", "還沒讀完的書", "窗邊的小綠植"]
const NOTES := ["有一點溫熱，也有一點份量。", "先替今天，留下一頁空白。", "轉個方向，讓新葉靠近陽光。"]
var objects: Array[Node3D] = []
var shadows: Array[MeshInstance3D] = []
var angles: Array[float] = [0.0, -0.22, 0.0]
var radii: Array[float] = [0.65, 0.88, 0.65]
var selected := -1
var dragging := false
var pointer_id := -1
var drag_offset := Vector3.ZERO
var destination := Vector3.ZERO
var origin := Vector3.ZERO
var origin_angle := 0.0
var velocity := Vector3.ZERO
var time := 0.0
var yaw := 0.68
var zoom := 10.7
var placements := 0
var sounds := false
var camera: Camera3D
var title: Label
var note: Label
var status: Label
var count_label: Label
var rotate_button: Button
var cancel_button: Button
var ui_root: Control
var info_panel: Panel
var header: VBoxContainer
var toolbar: GridContainer
var audio: AudioStreamPlayer
var generator: AudioStreamGenerator
var js_state: JavaScriptObject
var test_mode := false
var selection_ring: MeshInstance3D
var materials: Dictionary = {}
var motion_tweens: Dictionary = {}
var view_tween: Tween

func material(hex: String, roughness := 0.8) -> StandardMaterial3D:
	if materials.has(hex):
		return materials[hex]
	var m := StandardMaterial3D.new()
	m.albedo_color = Color(hex)
	m.roughness = roughness
	materials[hex] = m
	return m

func mesh(parent: Node3D, shape: Mesh, pos: Vector3, mat: Material) -> MeshInstance3D:
	var node := MeshInstance3D.new()
	node.mesh = shape
	node.material_override = mat
	parent.add_child(node)
	node.position = pos
	return node

func box(parent: Node3D, size: Vector3, pos: Vector3, color: String) -> MeshInstance3D:
	var shape := BoxMesh.new()
	shape.size = size
	return mesh(parent, shape, pos, material(color))

func cylinder(parent: Node3D, bottom: float, top: float, height: float, pos: Vector3, color: String) -> MeshInstance3D:
	var shape := CylinderMesh.new()
	shape.bottom_radius = bottom
	shape.top_radius = top
	shape.height = height
	shape.radial_segments = 48
	return mesh(parent, shape, pos, material(color))

func sphere(parent: Node3D, pos: Vector3, scale_v: Vector3, color: String) -> MeshInstance3D:
	var shape := SphereMesh.new()
	shape.radius = 1.0
	shape.height = 2.0
	var node := mesh(parent, shape, pos, material(color))
	node.scale = scale_v
	return node

func torus(parent: Node3D, inner: float, outer: float, pos: Vector3, color: String) -> MeshInstance3D:
	var shape := TorusMesh.new()
	shape.inner_radius = inner
	shape.outer_radius = outer
	shape.rings = 40
	shape.ring_segments = 16
	return mesh(parent, shape, pos, material(color))

func rounded_box(parent: Node3D, size: Vector3, pos: Vector3, radius: float, color: String) -> Node3D:
	var group := Node3D.new()
	parent.add_child(group)
	group.position = pos
	# One extruded rounded outline avoids coplanar overlapping box faces.
	var outline: Array[Vector3] = []
	for corner in range(4):
		var a := corner * PI / 2
		var center := Vector3((size.x / 2 - radius) * (1 if corner in [0, 3] else -1), 0, (size.z / 2 - radius) * (1 if corner in [0, 1] else -1))
		for step in range(9):
			var angle := a + step * PI / 16
			outline.append(center + Vector3(cos(angle), 0, sin(angle)) * radius)
	var surface := SurfaceTool.new()
	surface.begin(Mesh.PRIMITIVE_TRIANGLES)
	for i in range(outline.size()):
		var a := outline[i]
		var b := outline[(i + 1) % outline.size()]
		for v in [Vector3(0, size.y / 2, 0), a + Vector3.UP * size.y / 2, b + Vector3.UP * size.y / 2]:
			surface.set_normal(Vector3.UP)
			surface.add_vertex(v)
		for v in [Vector3(0, -size.y / 2, 0), b - Vector3.UP * size.y / 2, a - Vector3.UP * size.y / 2]:
			surface.set_normal(Vector3.DOWN)
			surface.add_vertex(v)
		var normal := Vector3(b.z - a.z, 0, a.x - b.x).normalized()
		for v in [a + Vector3.UP * size.y / 2, b - Vector3.UP * size.y / 2, b + Vector3.UP * size.y / 2, a + Vector3.UP * size.y / 2, a - Vector3.UP * size.y / 2, b - Vector3.UP * size.y / 2]:
			surface.set_normal(normal)
			surface.add_vertex(v)
	mesh(group, surface.commit(), Vector3.ZERO, material(color))
	return group

func _ready() -> void:
	build_room()
	build_objects()
	build_ui()
	build_audio()
	get_viewport().size_changed.connect(layout_ui)
	layout_ui()
	if OS.has_feature("web"):
		test_mode = str(JavaScriptBridge.eval("window.location.search")).contains("playtest=1")
		if test_mode:
			js_state = JavaScriptBridge.get_interface("window")
	update_camera()
	update_ui()

func build_room() -> void:
	var environment := WorldEnvironment.new()
	var env := Environment.new()
	env.background_mode = Environment.BG_COLOR
	env.background_color = Color("eee9df")
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color("fff2df")
	env.ambient_light_energy = 0.3
	env.tonemap_mode = Environment.TONE_MAPPER_LINEAR
	environment.environment = env
	add_child(environment)
	var sun := DirectionalLight3D.new()
	sun.rotation_degrees = Vector3(-52, -32, 0)
	sun.light_color = Color("fff0d0")
	sun.light_energy = 0.5
	sun.shadow_enabled = true
	sun.directional_shadow_max_distance = 25
	sun.directional_shadow_mode = DirectionalLight3D.SHADOW_ORTHOGONAL
	sun.shadow_bias = 0.03
	add_child(sun)
	box(self, Vector3(10.4, 0.18, 7.5), Vector3(0, -0.15, 0), "d9c9af")
	# Floor boards and a soft rug give the table a place in the room.
	for i in range(12):
		box(self, Vector3(0.012, 0.004, 7.4), Vector3(-4.9 + i * 0.86, -0.055, 0), "c6b69d")
	rounded_box(self, Vector3(7.8, 0.035, 4.9), Vector3(0, -0.035, 0.2), 0.35, "b8bea4")
	for x in [-3.6, 3.6]:
		box(self, Vector3(0.035, 0.01, 4.5), Vector3(x, -0.011, 0.2), "dfe0c9")
	box(self, Vector3(10.4, 4.8, 0.16), Vector3(0, 2.25, -3.7), "e4dccb")
	box(self, Vector3(0.16, 4.8, 7.5), Vector3(-5.1, 2.25, 0), "d4d5bd")
	box(self, Vector3(10.1, 0.15, 0.1), Vector3(0, 0.08, -3.55), "c7bda8")
	box(self, Vector3(0.1, 0.15, 7.3), Vector3(-4.98, 0.08, 0), "c7bda8")
	# Window and sill, all modeled geometry.
	box(self, Vector3(2.8, 2.25, 0.13), Vector3(-2.35, 3.12, -3.56), "b3c9c5")
	for x in [-3.83, -2.35, -0.87]:
		box(self, Vector3(0.12, 2.45, 0.18), Vector3(x, 3.12, -3.43), "f6eedb")
	for y in [1.93, 3.12, 4.31]:
		box(self, Vector3(3.05, 0.12, 0.18), Vector3(-2.35, y, -3.43), "f6eedb")
	box(self, Vector3(3.25, 0.15, 0.48), Vector3(-2.35, 1.85, -3.35), "c5ab83")
	# Small framed print.
	box(self, Vector3(1.15, 1.3, 0.12), Vector3(1.25, 3.35, -3.47), "ad8f6d")
	box(self, Vector3(0.99, 1.14, 0.03), Vector3(1.25, 3.35, -3.39), "f3e8d3")
	var print_sun := cylinder(self, 0.26, 0.26, 0.035, Vector3(1.25, 3.52, -3.35), "c9a475")
	print_sun.rotation.x = PI / 2
	box(self, Vector3(0.65, 0.05, 0.04), Vector3(1.25, 3.06, -3.35), "8e9b7c")
	# Thick tabletop, apron and legs.
	rounded_box(self, Vector3(6.8, 0.26, 3.8), Vector3(0, SURFACE - 0.13, 0), 0.2, "b58a60")
	rounded_box(self, Vector3(6.7, 0.055, 3.7), Vector3(0, SURFACE - 0.025, 0), 0.2, "d2af80")
	for x in [-2.85, 2.85]:
		for z in [-1.35, 1.35]:
			cylinder(self, 0.16, 0.13, 2.25, Vector3(x, 1.1, z), "9c7554")
	box(self, Vector3(5.95, 0.3, 0.11), Vector3(0, 2.08, 1.4), "a37d57")
	box(self, Vector3(5.95, 0.3, 0.11), Vector3(0, 2.08, -1.4), "a37d57")
	# Restrained wood grain.
	for z in [-1.3, -0.75, -0.15, 0.45, 1.1]:
		box(self, Vector3(5.9, 0.002, 0.009), Vector3(0.05, SURFACE + 0.004, z), "c3a174")
	camera = Camera3D.new()
	camera.projection = Camera3D.PROJECTION_ORTHOGONAL
	camera.current = true
	add_child(camera)
	selection_ring = torus(self, 0.61, 0.635, Vector3.ZERO, "f9e9ba")
	selection_ring.scale.y = 0.2
	selection_ring.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	selection_ring.visible = false

func build_objects() -> void:
	for i in range(3):
		var group := Node3D.new()
		group.name = ["Cup", "Book", "Plant"][i]
		add_child(group)
		group.position = HOME[i]
		group.rotation.y = angles[i]
		objects.append(group)
		var shadow_mat := StandardMaterial3D.new()
		shadow_mat.albedo_color = Color(0.20, 0.16, 0.10, 0.13)
		shadow_mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
		shadow_mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
		var shadow := cylinder(self, radii[i] * 0.75, radii[i] * 0.75, 0.002, HOME[i], "7a6649")
		shadow.material_override = shadow_mat
		shadow.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		shadows.append(shadow)
	# Ceramic mug: real hollow wall, rim, coffee and handle.
	var cup := objects[0]
	cylinder(cup, 0.30, 0.32, 0.08, Vector3(0, 0.04, 0), "e6ddc3")
	var wall := CylinderMesh.new()
	wall.bottom_radius = 0.32
	wall.top_radius = 0.37
	wall.height = 0.62
	wall.cap_top = false
	wall.radial_segments = 64
	var ceramic := material("e9dfc7", 0.28)
	ceramic.cull_mode = BaseMaterial3D.CULL_DISABLED
	mesh(cup, wall, Vector3(0, 0.37, 0), ceramic)
	cylinder(cup, 0.344, 0.344, 0.015, Vector3(0, 0.565, 0), "6c4936")
	var rim := torus(cup, 0.33, 0.38, Vector3(0, 0.68, 0), "f5ecd6")
	rim.scale.y = 0.6
	var handle := torus(cup, 0.13, 0.22, Vector3(0.43, 0.37, 0), "e9dfc7")
	handle.rotation.x = PI / 2
	handle.scale.y = 1.2
	# Clothbound book, visible paper block and page edges.
	var book := objects[1]
	rounded_box(book, Vector3(1.22, 0.07, 0.88), Vector3(0, 0.045, 0), 0.045, "667f76")
	box(book, Vector3(1.13, 0.23, 0.78), Vector3(0.025, 0.19, 0), "f2e5c8")
	rounded_box(book, Vector3(1.22, 0.07, 0.88), Vector3(0, 0.345, 0), 0.045, "81998a")
	box(book, Vector3(0.08, 0.29, 0.85), Vector3(-0.57, 0.2, 0), "667f76")
	for y in [0.12, 0.16, 0.21, 0.25]:
		box(book, Vector3(1.07, 0.008, 0.004), Vector3(0.045, y, 0.393), "d6c9ac")
	box(book, Vector3(0.06, 0.015, 0.88), Vector3(0.31, 0.389, 0), "d4ad78")
	box(book, Vector3(0.35, 0.008, 0.025), Vector3(-0.14, 0.384, -0.12), "d8d8b6")
	box(book, Vector3(0.23, 0.008, 0.016), Vector3(-0.14, 0.384, -0.04), "d8d8b6")
	# Terracotta pot and individually modeled leaves.
	var plant := objects[2]
	cylinder(plant, 0.25, 0.34, 0.45, Vector3(0, 0.24, 0), "bc8062")
	cylinder(plant, 0.36, 0.36, 0.09, Vector3(0, 0.46, 0), "d69a78")
	cylinder(plant, 0.30, 0.30, 0.015, Vector3(0, 0.51, 0), "65503b")
	for i in range(7):
		var a := i * TAU / 7
		var stem := cylinder(plant, 0.018, 0.012, 0.55, Vector3(sin(a) * 0.1, 0.76, cos(a) * 0.1), "69815a")
		stem.rotation = Vector3(cos(a) * 0.4, 0, -sin(a) * 0.4)
		var leaf := sphere(plant, Vector3(sin(a) * 0.28, 1.0 + (i % 2) * 0.12, cos(a) * 0.28), Vector3(0.13, 0.30, 0.045), "8a9f71" if i % 2 else "607e60")
		leaf.rotation = Vector3(cos(a) * 0.7, a, -sin(a) * 0.7)
	# Pick against simple generous volumes, not tiny mesh triangles.
	for i in range(3):
		var body := StaticBody3D.new()
		body.set_meta("item", i)
		objects[i].add_child(body)
		var collider := CollisionShape3D.new()
		var shape := BoxShape3D.new()
		shape.size = [Vector3(1.12, 0.78, 0.82), Vector3(1.25, 0.4, 0.9), Vector3(0.9, 1.42, 0.9)][i]
		collider.shape = shape
		collider.position.y = shape.size.y / 2
		body.add_child(collider)

func label(text: String, size: int, color := "626957") -> Label:
	var node := Label.new()
	node.text = text
	node.add_theme_font_size_override("font_size", size)
	node.add_theme_color_override("font_color", Color(color))
	node.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return node

func button(text: String, action: Callable) -> Button:
	var node := Button.new()
	node.text = text
	node.custom_minimum_size = Vector2(118, 52)
	node.pressed.connect(action)
	return node

func build_ui() -> void:
	var canvas := CanvasLayer.new()
	add_child(canvas)
	ui_root = Control.new()
	ui_root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	ui_root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	canvas.add_child(ui_root)
	var theme := Theme.new()
	theme.default_font = load("res://assets/tabletop-font.otf")
	theme.default_font_size = 17
	for state in ["normal", "hover", "pressed", "disabled", "focus"]:
		var style := StyleBoxFlat.new()
		style.bg_color = Color("f7f3e8" if state == "normal" else "e4e9d9")
		style.set_corner_radius_all(12)
		style.content_margin_left = 18
		style.content_margin_right = 18
		if state == "focus":
			style.bg_color = Color.TRANSPARENT
			style.set_border_width_all(2)
			style.border_color = Color("869579")
		theme.set_stylebox(state, "Button", style)
	theme.set_color("font_color", "Button", Color("5c6959"))
	theme.set_color("font_disabled_color", "Button", Color("a9ac9d"))
	ui_root.theme = theme
	info_panel = Panel.new()
	info_panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var card := StyleBoxFlat.new()
	card.bg_color = Color(0.933, 0.914, 0.875, 0.96)
	card.set_corner_radius_all(18)
	info_panel.add_theme_stylebox_override("panel", card)
	ui_root.add_child(info_panel)
	header = VBoxContainer.new()
	header.mouse_filter = Control.MOUSE_FILTER_IGNORE
	header.add_theme_constant_override("separation", 9)
	ui_root.add_child(header)
	header.add_child(label("L I T T L E   D A Y S     /     3 D   S T U D Y", 14, "89917b"))
	header.add_child(label("日光下的一張桌", 36))
	header.add_child(label("拿起一點日常，感受它的份量。", 17, "8b8d7b"))
	var info := VBoxContainer.new()
	info.position = Vector2(36, 190)
	info.name = "Info"
	info.mouse_filter = Control.MOUSE_FILTER_IGNORE
	info.add_theme_constant_override("separation", 8)
	ui_root.add_child(info)
	title = label("先挑一件喜歡的小物", 21)
	info.add_child(title)
	note = label("拖曳拿起 · 放手落桌", 15, "858b78")
	info.add_child(note)
	count_label = label("一杯茶，一本書，一點綠。", 15, "858b78")
	info.add_child(count_label)
	toolbar = GridContainer.new()
	toolbar.columns = 5
	toolbar.add_theme_constant_override("h_separation", 10)
	toolbar.add_theme_constant_override("v_separation", 8)
	ui_root.add_child(toolbar)
	rotate_button = button("轉向", rotate_item)
	toolbar.add_child(rotate_button)
	cancel_button = button("取消拿取", cancel_drag)
	toolbar.add_child(cancel_button)
	toolbar.add_child(button("換個角度", change_view))
	toolbar.add_child(button("重新擺好", reset_items))
	var sound_button := button("音效：關", func():
		sounds = not sounds
		toolbar.get_child(4).text = "音效：開" if sounds else "音效：關"
		if sounds:
			play_tone(0)
	)
	toolbar.add_child(sound_button)
	status = label("拖曳小物 · R 轉向 · Esc 取消 · 滾輪縮放", 15, "828874")
	status.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	ui_root.add_child(status)

func layout_ui() -> void:
	var size := get_viewport().get_visible_rect().size
	var compact := size.x < 800
	info_panel.position = Vector2(14, 12)
	info_panel.size = Vector2(size.x - 28 if compact else 350, 250 if compact else 280)
	toolbar.columns = 3 if compact else 5
	for control in toolbar.get_children():
		control.custom_minimum_size.x = 106 if compact else 118
	header.position = Vector2(26 if compact else 38, 24)
	header.get_child(1).add_theme_font_size_override("font_size", 28 if compact else 36)
	ui_root.get_node("Info").position = Vector2(26 if compact else 38, 150 if compact else 180)
	toolbar.position = Vector2((size.x - toolbar.get_combined_minimum_size().x) / 2, size.y - (166 if compact else 108))
	status.add_theme_font_size_override("font_size", 12 if compact else 15)
	status.text = "拖曳拿起 · 放手落桌 · 點按轉向" if compact else "拖曳小物 · R 轉向 · Esc 取消 · 滾輪縮放"
	status.position = Vector2(0, size.y - 42)
	status.size.x = size.x
	update_camera()

func update_camera() -> void:
	if not is_instance_valid(camera):
		return
	if is_instance_valid(view_tween):
		view_tween.kill()
	var size := get_viewport().get_visible_rect().size
	var aspect := size.x / maxf(size.y, 1)
	camera.size = zoom * maxf(1.0, 0.95 / aspect)
	camera.position = Vector3(sin(yaw) * 10.8, 9.6, cos(yaw) * 10.8)
	camera.look_at(Vector3(0, 1.8, 0))

func update_ui() -> void:
	title.text = NAMES[selected] if selected >= 0 else "先挑一件喜歡的小物"
	note.text = NOTES[selected] if selected >= 0 else "拖曳拿起 · 放手落桌"
	count_label.text = "已輕輕放下 %d 次" % placements if placements else "一杯茶，一本書，一點綠。"
	rotate_button.disabled = selected < 0
	cancel_button.disabled = not dragging
	selection_ring.visible = selected >= 0

func table_point(screen: Vector2) -> Variant:
	var plane := Plane(Vector3.UP, SURFACE)
	return plane.intersects_ray(camera.project_ray_origin(screen), camera.project_ray_normal(screen))

func pick(screen: Vector2) -> int:
	var start := camera.project_ray_origin(screen)
	var query := PhysicsRayQueryParameters3D.create(start, start + camera.project_ray_normal(screen) * 100)
	var hit := get_world_3d().direct_space_state.intersect_ray(query)
	return int(hit.collider.get_meta("item")) if not hit.is_empty() else -1

func begin_drag(index: int, screen: Vector2) -> void:
	stop_motion(index)
	selected = index
	dragging = true
	origin = objects[index].position
	origin.y = SURFACE
	origin_angle = angles[index]
	destination = origin
	var point = table_point(screen)
	drag_offset = origin - point if point != null else Vector3.ZERO
	drag_offset.y = 0
	velocity = Vector3.ZERO
	play_tone(1)
	status.text = "拖到喜歡的位置放手；拖到取消按鈕可放回。"
	update_ui()

func stop_motion(index: int) -> void:
	if motion_tweens.has(index) and motion_tweens[index].is_valid():
		motion_tweens[index].kill()
	objects[index].scale = Vector3.ONE

func move_drag(screen: Vector2) -> void:
	var point = table_point(screen)
	if point != null:
		destination = clamp_to_table(point + drag_offset, selected, angles[selected])

func clamp_to_table(pos: Vector3, index: int, angle: float) -> Vector3:
	# Keep the entire rotated footprint on the tabletop.
	var half_x: float = 0.62 if index == 1 else 0.56
	var half_z: float = 0.46 if index == 1 else 0.46
	var extent_x := absf(cos(angle)) * half_x + absf(sin(angle)) * half_z
	var extent_z := absf(sin(angle)) * half_x + absf(cos(angle)) * half_z
	return Vector3(clampf(pos.x, -3.28 + extent_x, 3.28 - extent_x), SURFACE, clampf(pos.z, -1.78 + extent_z, 1.78 - extent_z))

func finish_drag() -> void:
	if not dragging:
		return
	dragging = false
	pointer_id = -1
	var item := objects[selected]
	var landing_index := selected
	# Resolve crowded placements by gently returning to the last free spot.
	var free := true
	for i in range(objects.size()):
		if i != selected and Vector2(destination.x - objects[i].position.x, destination.z - objects[i].position.z).length() < radii[selected] + radii[i] - 0.16:
			free = false
	if not free:
		destination = origin
		angles[selected] = origin_angle
		status.text = "這裡有點擠，先放回剛才的位置。"
	else:
		placements += 1
		status.text = "放好了。再轉個方向，看看光落在哪裡。"
	var tween := create_tween().set_parallel(true)
	motion_tweens[selected] = tween
	tween.tween_property(item, "position", destination, 0.28).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
	tween.tween_property(item, "rotation:x", 0.0, 0.25)
	tween.tween_property(item, "rotation:z", 0.0, 0.25)
	tween.tween_property(item, "rotation:y", angles[selected], 0.25)
	tween.chain().tween_callback(func():
		play_tone(0)
		var settle := create_tween()
		motion_tweens[landing_index] = settle
		settle.tween_property(item, "scale", Vector3(1.015, 0.975, 1.015), 0.065)
		settle.tween_property(item, "scale", Vector3.ONE, 0.14)
	)
	update_ui()

func rotate_item() -> void:
	if selected < 0:
		return
	angles[selected] += PI / 2
	if dragging:
		destination = clamp_to_table(destination, selected, angles[selected])
	else:
		# Rotate in place, but reject a footprint that would hit another object.
		stop_motion(selected)
		var next := clamp_to_table(objects[selected].position, selected, angles[selected])
		for i in range(objects.size()):
			if i != selected and Vector2(next.x - objects[i].position.x, next.z - objects[i].position.z).length() < radii[selected] + radii[i] - 0.16:
				angles[selected] -= PI / 2
				status.text = "先移到空一點的地方，再轉向。"
				return
		var tween := create_tween().set_parallel(true)
		motion_tweens[selected] = tween
		tween.tween_property(objects[selected], "rotation:y", angles[selected], 0.25).set_trans(Tween.TRANS_SINE)
		tween.tween_property(objects[selected], "position", next, 0.25)

func cancel_drag() -> void:
	if dragging:
		destination = origin
		angles[selected] = origin_angle
		dragging = false
		pointer_id = -1
		var tween := create_tween().set_parallel(true)
		motion_tweens[selected] = tween
		tween.tween_property(objects[selected], "position", origin, 0.2)
		tween.tween_property(objects[selected], "rotation", Vector3(0, origin_angle, 0), 0.2)
	status.text = "回到原來的位置。慢慢來就好。"
	update_ui()

func reset_items() -> void:
	# Finish active animations before restoring a known arrangement.
	for tween in motion_tweens.values():
		if tween.is_valid():
			tween.kill()
	motion_tweens.clear()
	dragging = false
	pointer_id = -1
	selected = -1
	placements = 0
	angles = [0.0, -0.22, 0.0]
	for i in range(3):
		objects[i].position = HOME[i]
		objects[i].rotation = Vector3(0, angles[i], 0)
		objects[i].scale = Vector3.ONE
	status.text = "拖曳小物 · R 轉向 · Esc 取消 · 滾輪縮放"
	update_ui()

func change_view() -> void:
	if dragging:
		cancel_drag()
	yaw = -0.55 if yaw > 0 else 0.68
	if is_instance_valid(view_tween):
		view_tween.kill()
	view_tween = create_tween()
	var target := Vector3(sin(yaw) * 10.8, 9.6, cos(yaw) * 10.8)
	view_tween.tween_method(func(pos: Vector3):
		camera.position = pos
		camera.look_at(Vector3(0, 1.8, 0)), camera.position, target, 0.65).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_LEFT:
			if event.pressed:
				var index := pick(event.position)
				if index >= 0:
					begin_drag(index, event.position)
				else:
					selected = -1
					update_ui()
			elif dragging:
				finish_drag()
		elif event.pressed and event.button_index in [MOUSE_BUTTON_WHEEL_UP, MOUSE_BUTTON_WHEEL_DOWN]:
			zoom = clampf(zoom + (-0.5 if event.button_index == MOUSE_BUTTON_WHEEL_UP else 0.5), 8.5, 13.5)
			update_camera()
	elif event is InputEventMouseMotion and dragging:
		move_drag(event.position)
	elif event is InputEventKey and event.pressed and not event.echo:
		if event.keycode == KEY_R:
			rotate_item()
		elif event.keycode == KEY_ESCAPE:
			cancel_drag()

func _input(event: InputEvent) -> void:
	# A release over a UI button must also end a canvas drag.
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and not event.pressed and dragging:
		release_drag(event.position)
	if event is InputEventScreenTouch:
		# Emulated mouse handles the primary touch. Ignore extra fingers.
		if event.pressed and pointer_id == -1:
			pointer_id = event.index
		elif not event.pressed and event.index == pointer_id:
			pointer_id = -1
			if dragging:
				if event.canceled:
					cancel_drag()
				else:
					release_drag(event.position)

func release_drag(screen: Vector2) -> void:
	if cancel_button.get_global_rect().has_point(screen):
		cancel_drag()
	else:
		finish_drag()

func _notification(what: int) -> void:
	if what == NOTIFICATION_APPLICATION_FOCUS_OUT and dragging:
		cancel_drag()

func _process(delta: float) -> void:
	time += delta
	if dragging and selected >= 0:
		var item := objects[selected]
		var target := destination + Vector3.UP * 0.65
		var old := item.position
		item.position = item.position.lerp(target, 1 - exp(-18 * delta))
		velocity = (item.position - old) / maxf(delta, 0.001)
		item.rotation.x = lerp_angle(item.rotation.x, clampf(velocity.z * 0.025, -0.14, 0.14), 1 - exp(-12 * delta))
		item.rotation.z = lerp_angle(item.rotation.z, clampf(-velocity.x * 0.025, -0.14, 0.14), 1 - exp(-12 * delta))
		item.rotation.y = lerp_angle(item.rotation.y, angles[selected], 1 - exp(-12 * delta))
	for i in range(3):
		var pos := objects[i].position
		shadows[i].position = Vector3(pos.x, SURFACE + 0.008, pos.z)
		var elevation := maxf(0, pos.y - SURFACE)
		shadows[i].scale = Vector3(1 + elevation * 0.25, 1, 1 + elevation * 0.25)
	if selected >= 0:
		selection_ring.position = Vector3(objects[selected].position.x, SURFACE + 0.014, objects[selected].position.z)
		selection_ring.scale.x = radii[selected] / 0.61
		selection_ring.scale.z = radii[selected] / 0.61
	if test_mode and js_state != null:
		var viewport := get_viewport().get_visible_rect().size
		var state := {"selected": selected, "dragging": dragging, "placements": placements, "items": [], "camera": camera.position, "viewport_width": viewport.x, "viewport_height": viewport.y, "buttons": []}
		state.view_changing = is_instance_valid(view_tween) and view_tween.is_running()
		for i in range(3):
			var screen := camera.unproject_position(objects[i].position + Vector3.UP * (0.7 if i == 2 else 0.3))
			var base := camera.unproject_position(Vector3(objects[i].position.x, SURFACE, objects[i].position.z))
			state.items.append({"x": objects[i].position.x, "y": objects[i].position.y, "z": objects[i].position.z, "angle": objects[i].rotation.y, "screen_x": screen.x, "screen_y": screen.y, "base_x": base.x, "base_y": base.y})
		for control in toolbar.get_children():
			var center: Vector2 = control.global_position + control.size / 2
			state.buttons.append({"x": center.x, "y": center.y, "pressed": control.is_pressed()})
		js_state.tabletopState = JSON.stringify(state)

func build_audio() -> void:
	audio = AudioStreamPlayer.new()
	generator = AudioStreamGenerator.new()
	generator.mix_rate = 22050
	generator.buffer_length = 0.2
	audio.stream = generator
	add_child(audio)

func play_tone(kind: int) -> void:
	if not sounds:
		return
	audio.play()
	var playback := audio.get_stream_playback() as AudioStreamGeneratorPlayback
	if playback == null:
		return
	var frequency: float = [420.0, 220.0, 650.0][maxi(selected, 0)]
	if kind == 1:
		frequency *= 1.5
	var frames := mini(playback.get_frames_available(), 3300)
	for i in range(frames):
		var t := float(i) / 22050.0
		var wave := sin(t * TAU * frequency) * exp(-t * 38.0) * 0.16
		playback.push_frame(Vector2.ONE * wave)
