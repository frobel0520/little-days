extends RefCounted
## Procedural solid geometry; materials and primitives are shared across chapters.
var materials: Dictionary = {}

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
	shape.radial_segments = 24
	return mesh(parent, shape, pos, material(color))

func sphere(parent: Node3D, pos: Vector3, scale_v: Vector3, color: String) -> MeshInstance3D:
	var shape := SphereMesh.new()
	shape.radius = 1.0
	shape.height = 2.0
	shape.radial_segments = 20
	shape.rings = 12
	var node := mesh(parent, shape, pos, material(color))
	node.scale = scale_v
	return node

func torus(parent: Node3D, inner: float, outer: float, pos: Vector3, color: String) -> MeshInstance3D:
	var shape := TorusMesh.new()
	shape.inner_radius = inner
	shape.outer_radius = outer
	shape.rings = 28
	shape.ring_segments = 10
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

func gather(node: Node3D, transform: Transform3D, batches: Dictionary, bounds: Array) -> void:
	var current := transform * node.transform
	if node is MeshInstance3D:
		var instance := node as MeshInstance3D
		bounds.append(current * instance.mesh.get_aabb())
		for surface_index in range(instance.mesh.get_surface_count()):
			var mat: Material = instance.material_override
			if mat == null:
				mat = material("e6dcc7")
			var key := mat.get_instance_id()
			if not batches.has(key):
				var tool := SurfaceTool.new()
				tool.begin(Mesh.PRIMITIVE_TRIANGLES)
				batches[key] = {"tool": tool, "material": mat}
			batches[key].tool.append_from(instance.mesh, surface_index, current)
	for child in node.get_children():
		if child is Node3D:
			gather(child, current, batches, bounds)

func bake(root: Node3D) -> AABB:
	var batches := {}
	var bounds: Array = []
	for child in root.get_children():
		gather(child, Transform3D.IDENTITY, batches, bounds)
	for child in root.get_children():
		child.free()
	var box_bounds := AABB()
	var first := true
	for batch in batches.values():
		var baked: ArrayMesh = batch.tool.commit()
		mesh(root, baked, Vector3.ZERO, batch.material)
		box_bounds = baked.get_aabb() if first else box_bounds.merge(baked.get_aabb())
		first = false
	return box_bounds

func line(parent: Node3D, from: Vector3, to: Vector3, radius: float, color: String) -> void:
	var segment := cylinder(parent, radius, radius, from.distance_to(to), (from + to) / 2, color)
	segment.quaternion = Quaternion(Vector3.UP, (to - from).normalized())

func book(parent: Node3D, offset: Vector3, color: String) -> Node3D:
	var group := Node3D.new()
	parent.add_child(group)
	group.position = offset
	rounded_box(group, Vector3(1.12, 0.055, 0.82), Vector3(0, 0.03, 0), 0.035, color)
	box(group, Vector3(1.04, 0.19, 0.73), Vector3(0.02, 0.14, 0), "f3e8ce")
	rounded_box(group, Vector3(1.12, 0.055, 0.82), Vector3(0, 0.26, 0), 0.035, color)
	box(group, Vector3(0.06, 0.23, 0.81), Vector3(-0.53, 0.14, 0), color)
	for y in [0.1, 0.15, 0.2]:
		box(group, Vector3(1.0, 0.006, 0.004), Vector3(0.035, y, 0.367), "d6c9ac")
	box(group, Vector3(0.045, 0.008, 0.8), Vector3(0.29, 0.291, 0), "d1b17e")
	box(group, Vector3(0.35, 0.008, 0.02), Vector3(-0.13, 0.291, -0.12), "e2dfc6")
	return group

func plant(parent: Node3D, flowers: bool, color: String) -> void:
	cylinder(parent, 0.23, 0.32, 0.42, Vector3(0, 0.23, 0), "b77d61")
	cylinder(parent, 0.34, 0.34, 0.08, Vector3(0, 0.43, 0), "d69979")
	cylinder(parent, 0.28, 0.28, 0.02, Vector3(0, 0.48, 0), "65503b")
	for i in range(5):
		var angle := i * TAU / 5
		var top := Vector3(sin(angle) * 0.23, 0.92 + (i % 2) * 0.16, cos(angle) * 0.23)
		line(parent, Vector3(0, 0.45, 0), top, 0.014, "6d855a")
		var leaf := sphere(parent, top - Vector3(0, 0.1, 0), Vector3(0.12, 0.23, 0.045), "839e70" if i % 2 else "617f60")
		leaf.rotation = Vector3(cos(angle) * 0.7, angle, -sin(angle) * 0.7)
		if flowers:
			for petal in range(5):
				var a := petal * TAU / 5
				sphere(parent, top + Vector3(sin(a) * 0.10, 0.04, cos(a) * 0.10), Vector3(0.11, 0.06, 0.11), color)
			sphere(parent, top + Vector3.UP * 0.08, Vector3.ONE * 0.065, "edcf88")

func item(data: Dictionary) -> Node3D:
	var root := Node3D.new()
	var model := Node3D.new()
	root.add_child(model)
	var color: String = data.color.trim_prefix("#")
	match data.kind:
		"book":
			book(model, Vector3.ZERO, color)
		"books":
			book(model, Vector3.ZERO, "aaba9e")
			var second := book(model, Vector3(0.02, 0.30, 0), "d5b297")
			second.rotation.y = 0.09
			var third := book(model, Vector3(-0.02, 0.60, 0), color)
			third.rotation.y = -0.07
		"mug":
			cylinder(model, 0.29, 0.30, 0.07, Vector3(0, 0.04, 0), color)
			var wall := CylinderMesh.new()
			wall.bottom_radius = 0.30
			wall.top_radius = 0.35
			wall.height = 0.60
			wall.cap_top = false
			wall.radial_segments = 40
			var ceramic := material(color, 0.3)
			ceramic.cull_mode = BaseMaterial3D.CULL_DISABLED
			mesh(model, wall, Vector3(0, 0.35, 0), ceramic)
			cylinder(model, 0.325, 0.325, 0.015, Vector3(0, 0.54, 0), "674b36")
			var lip := torus(model, 0.31, 0.36, Vector3(0, 0.66, 0), "f4e7cc")
			lip.scale.y = 0.55
			var handle := torus(model, 0.13, 0.21, Vector3(0.41, 0.35, 0), color)
			handle.rotation.x = PI / 2
		"plant", "flowers":
			plant(model, data.kind == "flowers", color)
		"camera":
			rounded_box(model, Vector3(1.15, 0.68, 0.52), Vector3(0, 0.36, 0), 0.08, color)
			box(model, Vector3(1.05, 0.12, 0.5), Vector3(0, 0.63, 0), "dfd9c8")
			for spec in [[0.25, 0.15, "767b6b"], [0.20, 0.18, "d9d6c4"], [0.15, 0.2, "4d6263"]]:
				var lens := cylinder(model, spec[0], spec[0], spec[1], Vector3(0.05, 0.36, 0.30 + spec[1] / 2), spec[2])
				lens.rotation.x = PI / 2
			box(model, Vector3(0.24, 0.14, 0.08), Vector3(-0.33, 0.55, 0.29), "e9e3cd")
			cylinder(model, 0.07, 0.07, 0.06, Vector3(0.36, 0.73, 0), "68756b")
		"tin", "lunch":
			rounded_box(model, Vector3(1.1, 0.48, 0.8), Vector3(0, 0.25, 0), 0.08, color)
			rounded_box(model, Vector3(1.16, 0.10, 0.86), Vector3(0, 0.53, 0), 0.085, "e5d9b9")
			box(model, Vector3(0.26, 0.025, 0.15), Vector3(0, 0.59, 0), color)
			box(model, Vector3(0.12, 0.15, 0.025), Vector3(0, 0.45, 0.42), "aa9675")
		"letter":
			rounded_box(model, Vector3(1.2, 0.045, 0.72), Vector3(0, 0.025, 0), 0.025, color)
			line(model, Vector3(-0.55, 0.05, -0.32), Vector3(0, 0.05, 0.12), 0.009, "cbb897")
			line(model, Vector3(0.55, 0.05, -0.32), Vector3(0, 0.05, 0.12), 0.009, "cbb897")
			var seal := cylinder(model, 0.07, 0.07, 0.01, Vector3(0, 0.06, 0.12), "c18a77")
			seal.scale.z = 0.85
		"cloth", "sweater":
			for layer in range(3):
				rounded_box(model, Vector3(1.12, 0.13, 0.86), Vector3(layer * 0.012, 0.09 + layer * 0.12, 0), 0.10, color)
			for x in [-0.42, 0.42]:
				box(model, Vector3(0.035, 0.012, 0.72), Vector3(x, 0.403, 0), "e7dfc9")
			if data.kind == "sweater":
				var collar := torus(model, 0.10, 0.16, Vector3(0, 0.42, -0.25), "d5d8bc")
				collar.scale.y = 0.25
		"vase", "bottle":
			cylinder(model, 0.25, 0.31, 0.54, Vector3(0, 0.28, 0), color)
			cylinder(model, 0.31, 0.13, 0.24, Vector3(0, 0.67, 0), color)
			cylinder(model, 0.13, 0.13, 0.22, Vector3(0, 0.89, 0), color)
			var rim := torus(model, 0.10, 0.145, Vector3(0, 1.0, 0), "dce9d6")
			rim.scale.y = 0.45
			cylinder(model, 0.10, 0.10, 0.01, Vector3(0, 0.95, 0), "718d7d")
			if data.kind == "bottle":
				cylinder(model, 0.15, 0.15, 0.12, Vector3(0, 1.04, 0), "d3b184")
				box(model, Vector3(0.34, 0.25, 0.015), Vector3(0, 0.40, 0.30), "f2e6c8")
		"watering":
			cylinder(model, 0.28, 0.34, 0.55, Vector3(0, 0.3, 0), color)
			line(model, Vector3(0.24, 0.21, 0), Vector3(0.73, 0.61, 0), 0.08, color)
			var spout := cylinder(model, 0.12, 0.15, 0.06, Vector3(0.75, 0.63, 0), "d9dfc1")
			spout.rotation.z = -0.8
			var handle := torus(model, 0.22, 0.27, Vector3(-0.25, 0.48, 0), color)
			handle.rotation.x = PI / 2
		"teapot":
			sphere(model, Vector3(0, 0.35, 0), Vector3(0.36, 0.32, 0.30), color)
			cylinder(model, 0.22, 0.24, 0.08, Vector3(0, 0.07, 0), color)
			cylinder(model, 0.25, 0.20, 0.06, Vector3(0, 0.64, 0), "e7dfc3")
			sphere(model, Vector3(0, 0.71, 0), Vector3.ONE * 0.06, "aab99b")
			line(model, Vector3(0.25, 0.26, 0), Vector3(0.58, 0.53, 0), 0.085, color)
			var lip := cylinder(model, 0.09, 0.09, 0.035, Vector3(0.59, 0.55, 0), "e7dfc3")
			lip.rotation.z = -0.8
			var handle := torus(model, 0.17, 0.23, Vector3(-0.35, 0.37, 0), color)
			handle.rotation.x = PI / 2
		"radio":
			rounded_box(model, Vector3(1.18, 0.68, 0.44), Vector3(0, 0.35, 0), 0.065, color)
			box(model, Vector3(0.63, 0.40, 0.025), Vector3(-0.17, 0.34, 0.235), "877e66")
			for i in range(6):
				box(model, Vector3(0.53, 0.012, 0.012), Vector3(-0.17, 0.19 + i * 0.06, 0.256), "c4b18d")
			box(model, Vector3(0.24, 0.08, 0.025), Vector3(0.36, 0.56, 0.24), "eee0b7")
			for y in [0.22, 0.40]:
				var knob := cylinder(model, 0.065, 0.065, 0.06, Vector3(0.36, y, 0.26), "e5d7b3")
				knob.rotation.x = PI / 2
			line(model, Vector3(-0.38, 0.70, 0), Vector3(-0.20, 1.02, 0), 0.014, "9d9b88")
		"basket":
			rounded_box(model, Vector3(1.10, 0.10, 0.78), Vector3(0, 0.05, 0), 0.08, color)
			for side in [-1, 1]:
				for i in range(5):
					box(model, Vector3(0.07, 0.42, 0.06), Vector3(-0.48 + i * 0.24, 0.25, side * 0.37), color)
				for y in [0.15, 0.29, 0.44]:
					box(model, Vector3(1.10, 0.05, 0.06), Vector3(0, y, side * 0.37), "d9bd92")
				box(model, Vector3(0.07, 0.38, 0.70), Vector3(side * 0.52, 0.24, 0), color)
				var handle := torus(model, 0.24, 0.28, Vector3(0, 0.58, side * 0.31), "b1946b")
				handle.rotation.x = PI / 2
		"windchime":
			line(model, Vector3(0, 0.62, 0), Vector3(0, 1.05, 0), 0.012, "c5b893")
			var bell := CylinderMesh.new()
			bell.bottom_radius = 0.25
			bell.top_radius = 0.045
			bell.height = 0.32
			bell.cap_bottom = false
			bell.radial_segments = 32
			mesh(model, bell, Vector3(0, 0.57, 0), material(color))
			var rim := torus(model, 0.225, 0.26, Vector3(0, 0.41, 0), "d8e0cb")
			rim.scale.y = 0.4
			line(model, Vector3(0, 0.57, 0), Vector3(0, 0.15, 0), 0.012, "b6a57f")
			sphere(model, Vector3(0, 0.39, 0), Vector3.ONE * 0.055, "9fae9b")
			box(model, Vector3(0.17, 0.28, 0.018), Vector3(0, 0.15, 0), "e9dbc3")
			box(model, Vector3(0.07, 0.06, 0.022), Vector3(0, 0.17, 0.012), "a4bca6")
		"frame":
			box(model, Vector3(1.0, 0.84, 0.10), Vector3(0, 0.44, 0), color)
			box(model, Vector3(0.84, 0.67, 0.025), Vector3(0, 0.44, 0.067), "f2e3c4")
			if data.get("motif", "people") != "blank":
				for i in range(3):
					var cat_photo: bool = data.get("motif", "people") == "cats"
					var ink: String = ["dfa469", "d8c5a9", "555b59"][i] if cat_photo else ["b68b62", "8b9b7c", "c7a36d"][i]
					var x := -0.24 + i * 0.24
					sphere(model, Vector3(x, 0.40, 0.09), Vector3(0.09, 0.13, 0.02), ink)
					sphere(model, Vector3(x, 0.58, 0.09), Vector3(0.075, 0.065, 0.02), ink if cat_photo else "d7b591")
					if cat_photo:
						for side in [-1, 1]:
							var ear := cylinder(model, 0.035, 0, 0.07, Vector3(x + side * 0.045, 0.65, 0.09), ink)
							ear.scale.z = 0.3
							box(model, Vector3(0.018, 0.012, 0.008), Vector3(x + side * 0.025, 0.59, 0.115), "e7d7a5" if i == 2 else "5f6654")
			var stand := box(model, Vector3(0.12, 0.60, 0.10), Vector3(0, 0.3, -0.2), "a78d6e")
			stand.rotation.x = -0.35
		"bookend":
			rounded_box(model, Vector3(0.7, 0.10, 0.65), Vector3(0, 0.05, 0), 0.04, color)
			rounded_box(model, Vector3(0.13, 0.8, 0.65), Vector3(-0.26, 0.43, 0), 0.04, color)
			var arch := torus(model, 0.17, 0.23, Vector3(0.02, 0.31, 0), "a58b6b")
			arch.rotation.x = PI / 2
		"light":
			cylinder(model, 0.34, 0.34, 0.08, Vector3(0, 0.05, 0), "9b8d6e")
			line(model, Vector3(0, 0.09, 0), Vector3(0, 0.72, 0), 0.035, "a18c69")
			cylinder(model, 0.37, 0.18, 0.33, Vector3(0, 0.86, 0), color)
			cylinder(model, 0.31, 0.31, 0.01, Vector3(0, 0.69, 0), "fff0bd")
		"bag", "pouch":
			rounded_box(model, Vector3(0.9, 0.82, 0.55), Vector3(0, 0.42, 0), 0.08, color)
			for z in [-0.20, 0.20]:
				var handle := torus(model, 0.20, 0.24, Vector3(0, 0.92, z), "a99070")
				handle.rotation.x = PI / 2
			box(model, Vector3(0.33, 0.24, 0.025), Vector3(0, 0.45, 0.29), "eee0c4")
		"pencils":
			for i in range(5):
				var pen := cylinder(model, 0.035, 0.035, 1.4, Vector3((i - 2) * 0.10, 0.05, 0), ["b7826f", "d8b670", "8fa885", "8faab6", "b7a5ba"][i])
				pen.rotation.x = PI / 2
				var nib := cylinder(model, 0.035, 0, 0.14, Vector3((i - 2) * 0.1, 0.05, -0.77), "bda179")
				nib.rotation.x = -PI / 2
		"glasses":
			for x in [-0.29, 0.29]:
				var lens := torus(model, 0.20, 0.225, Vector3(x, 0.08, 0), color)
				lens.scale.y = 0.7
				line(model, Vector3(x * 1.7, 0.08, 0), Vector3(x * 1.6, 0.08, -0.45), 0.018, color)
			line(model, Vector3(-0.08, 0.08, 0), Vector3(0.08, 0.08, 0), 0.018, color)
		"apple":
			sphere(model, Vector3(0, 0.34, 0), Vector3(0.36, 0.34, 0.34), color)
			line(model, Vector3(0, 0.64, 0), Vector3(0.04, 0.77, 0), 0.025, "816c4f")
			var leaf := sphere(model, Vector3(0.15, 0.73, 0), Vector3(0.16, 0.035, 0.07), "8fa579")
			leaf.rotation.z = 0.25
		"sandwich":
			for spec in [[0.06, "e8ce96"], [0.13, "96ae7b"], [0.18, "d89578"], [0.23, "e8ce96"]]:
				var bread := PrismMesh.new()
				bread.size = Vector3(0.9, 0.07, 0.75)
				mesh(model, bread, Vector3(0, spec[0], 0), material(spec[1]))
		"cookie":
			for i in range(3):
				var x := (i - 1) * 0.43
				cylinder(model, 0.29, 0.29, 0.09, Vector3(x, 0.08 + i * 0.025, 0), color)
				for j in range(4):
					var a := j * TAU / 4
					sphere(model, Vector3(x + sin(a) * 0.13, 0.14 + i * 0.025, cos(a) * 0.13), Vector3(0.035, 0.012, 0.03), "916e4e")
		"shoes":
			for x in [-0.28, 0.28]:
				rounded_box(model, Vector3(0.4, 0.10, 1.0), Vector3(x, 0.06, 0), 0.12, "e6d9be")
				sphere(model, Vector3(x, 0.23, 0.04), Vector3(0.20, 0.20, 0.46), color)
				for z in [-0.1, 0.0, 0.1]:
					line(model, Vector3(x - 0.12, 0.40, z), Vector3(x + 0.12, 0.40, z), 0.012, "f3e6cf")
		_:
			push_error("Missing 3D model for kind: " + str(data.kind))
	var bounds := bake(model)
	assert(bounds.size.x > 0 and bounds.size.y > 0 and bounds.size.z > 0, "Empty item model")
	model.scale = Vector3(float(data.w) / bounds.size.x, float(data.h) / bounds.size.y, float(data.d) / bounds.size.z)
	model.position = Vector3(-bounds.get_center().x * model.scale.x, -bounds.position.y * model.scale.y, -bounds.get_center().z * model.scale.z)
	return root

func cat(data: Dictionary, pose: String) -> Node3D:
	var root := Node3D.new()
	var body := Node3D.new()
	root.add_child(body)
	var color: String = data.color.trim_prefix("#")
	var accent: String = data.accent.trim_prefix("#")
	var sleeping := pose == "sleep"
	if pose != "hidden":
		sphere(body, Vector3(0, 0.27, 0), Vector3(0.26, 0.34 if not sleeping else 0.22, 0.34), color)
		sphere(body, Vector3(0, 0.52 if not sleeping else 0.32, 0.18), Vector3(0.25, 0.22, 0.21), color)
		for x in [-0.15, 0.15]:
			var ear := cylinder(body, 0.12, 0, 0.22, Vector3(x, 0.75 if not sleeping else 0.55, 0.15), color)
			ear.scale.z = 0.5
			sphere(body, Vector3(x * 0.7, 0.09, 0.23), Vector3(0.10, 0.075, 0.12), accent)
		if color != "555b59":
			sphere(body, Vector3(0, 0.30, 0.28), Vector3(0.16, 0.20, 0.09), accent)
			if color == "f0ddc5":
				sphere(body, Vector3(-0.17, 0.62 if not sleeping else 0.42, 0.16), Vector3(0.10, 0.13, 0.18), "786f5b")
	for i in range(7):
		var a := i * 0.38
		var b := (i + 1) * 0.38
		line(body, Vector3(sin(a) * 0.37, 0.09 + i * 0.01, -cos(a) * 0.37), Vector3(sin(b) * 0.37, 0.10 + i * 0.01, -cos(b) * 0.37), 0.055, color)
	bake(body)
	var eyes: Array[MeshInstance3D] = []
	if pose != "hidden":
		var y := 0.55 if not sleeping else 0.35
		for x in [-0.085, 0.085]:
			eyes.append(sphere(root, Vector3(x, y, 0.373), Vector3(0.024, 0.03 if not sleeping else 0.006, 0.014), "4c5144" if color != "555b59" else "d4cf8d"))
		if color != "555b59":
			sphere(root, Vector3(0, y - 0.065, 0.393), Vector3(0.027, 0.018, 0.014), "b88a7a")
	root.set_meta("eyes", eyes)
	for eye in eyes:
		eye.set_meta("open_height", eye.scale.y)
	root.set_meta("pose", pose)
	return root

func room(level: Dictionary) -> Node3D:
	var room_root := Node3D.new()
	var palette: Array = {"home": ["e5ddca", "d1d2bb", "b9bea4"], "flowers": ["e4d9c4", "c3cbb0", "b8c5a4"], "books": ["d5d8c3", "c7bda9", "c1baa6"], "cafe": ["ded6c8", "b6c1b0", "c9baa4"], "rooftop": ["d3d4c6", "c6cbba", "b9c4a0"], "courtyard": ["decdb2", "cbbd9f", "b9c1a3"]}.get(level.id, ["e7dfd0", "d1d4bd", "c1c6ac"])
	var outdoors: bool = level.id in ["rooftop", "courtyard"]
	box(room_root, Vector3(10.4, 0.18, 8.4), Vector3(0, -0.13, 0), "cfba98")
	for i in range(13):
		box(room_root, Vector3(0.012, 0.004, 8.3), Vector3(-4.8 + i * 0.8, -0.035, 0), "b8a58a")
	var wall_height := 0.72 if outdoors else 3.6
	box(room_root, Vector3(10.4, wall_height, 0.13), Vector3(0, wall_height / 2 - 0.1, -4.10), palette[0])
	box(room_root, Vector3(0.13, wall_height, 8.4), Vector3(-5.10, wall_height / 2 - 0.1, 0), palette[1])
	box(room_root, Vector3(10.2, 0.14, 0.10), Vector3(0, 0.04, -4.0), "c1b496")
	box(room_root, Vector3(0.10, 0.14, 8.1), Vector3(-5.0, 0.04, 0), "c1b496")
	if not outdoors:
		box(room_root, Vector3(2.5, 1.8, 0.12), Vector3(-2.6, 2.25, -4.0), "b8cfc9" if level.id != "cafe" else "a9bec4")
		for x in [-3.9, -2.6, -1.3]:
			box(room_root, Vector3(0.10, 1.95, 0.16), Vector3(x, 2.25, -3.9), "f3ead5")
		for y in [1.32, 2.25, 3.18]:
			box(room_root, Vector3(2.7, 0.10, 0.16), Vector3(-2.6, y, -3.9), "f3ead5")
		box(room_root, Vector3(2.9, 0.13, 0.35), Vector3(-2.6, 1.24, -3.83), "b5966f")
	for s in level.surfaces:
		var center := Vector3(s.x + s.w / 2 - 5, s.z, s.y + s.d / 2 - 4)
		if s.id == "box":
			box(room_root, Vector3(s.w, 0.10, s.d), center - Vector3.UP * 0.05, "bd9c72")
			for x in [-1, 1]:
				box(room_root, Vector3(0.06, 0.42, s.d), center + Vector3(x * s.w / 2, 0.17, 0), "c5a87f")
			for z in [-1, 1]:
				box(room_root, Vector3(s.w, 0.30, 0.06), center + Vector3(0, 0.11, z * s.d / 2), "ceb18a")
			var flap := box(room_root, Vector3(s.w, 0.04, 0.42), center + Vector3(0, 0.29, -s.d / 2 - 0.18), "d7bb92")
			flap.rotation.x = -0.25
		elif s.id == "floor":
			rounded_box(room_root, Vector3(s.w, 0.035, s.d), center - Vector3.UP * 0.025, 0.20, palette[2])
			for x in [-1, 1]:
				box(room_root, Vector3(0.025, 0.003, s.d - 0.3), center + Vector3(x * (s.w / 2 - 0.15), -0.004, 0), "e5dfc6")
		else:
			var tabletop_color := "ceb08a" if level.id != "flowers" else "c1b18c"
			if level.has("legacy_index"):
				tabletop_color = {"desk": "cbb18b", "picnic": "c2a17a", "travel": "a7b5a0", "craft": "c4b9c6", "home": "c7ab86"}.get(level.theme, tabletop_color)
			rounded_box(room_root, Vector3(s.w, 0.13, s.d), center - Vector3.UP * 0.07, 0.07, tabletop_color)
			if s.id == "shelf-high":
				for x in [-1, 1]:
					box(room_root, Vector3(0.09, s.z, s.d), Vector3(center.x + x * s.w / 2, s.z / 2 - 0.05, center.z), "a78d69")
			else:
				for x in [-1, 1]:
					for z in [-1, 1]:
						cylinder(room_root, 0.07, 0.055, maxf(s.z - 0.13, 0.08), Vector3(center.x + x * (s.w / 2 - 0.12), (s.z - 0.13) / 2, center.z + z * (s.d / 2 - 0.12)), "a58a64")
			if s.id == "desk":
				for z in [-0.25, 0.25]:
					box(room_root, Vector3(s.w - 0.3, 0.003, 0.008), center + Vector3(0, 0, z * s.d), "b59a75")
				if level.has("legacy_index"):
					var rim_color: String = {"picnic": "a58a65", "travel": "839681", "craft": "a99aa9", "home": "b79870"}.get(level.theme, "b39772")
					for x in [-1, 1]:
						box(room_root, Vector3(0.08, 0.23, s.d), center + Vector3(x * s.w / 2, 0.08, 0), rim_color)
					for z in [-1, 1]:
						box(room_root, Vector3(s.w, 0.23, 0.08), center + Vector3(0, 0.08, z * s.d / 2), rim_color)
					if level.theme == "picnic":
						for i in range(12):
							for z in [-1, 1]:
								box(room_root, Vector3(0.06, 0.27, 0.09), center + Vector3(-s.w / 2 + i * s.w / 11, 0.07, z * s.d / 2), "d4b68c")
					elif level.theme == "travel":
						var handle := torus(room_root, 0.19, 0.25, center + Vector3(0, 0.02, s.d / 2 + 0.18), "7a856e")
						handle.scale.y = 0.6
						for x in [-s.w * 0.3, s.w * 0.3]:
							box(room_root, Vector3(0.19, 0.28, 0.12), center + Vector3(x, 0.04, s.d / 2), "d3bc8e")
			elif s.id == "drawer" and level.id == "home":
				for x in [-1, 1]:
					box(room_root, Vector3(0.06, 0.20, s.d), center + Vector3(x * s.w / 2, 0.08, 0), "b79a74")
				for z in [-1, 1]:
					box(room_root, Vector3(s.w, 0.13, 0.06), center + Vector3(0, 0.045, z * s.d / 2), "c2a780")
				sphere(room_root, center + Vector3(0, 0.06, s.d / 2 + 0.06), Vector3(0.07, 0.045, 0.045), "9b805d")
	# Fixed decorative props distinguish the story spaces.
	if level.id == "flowers":
		for x in [-3.8, -2.5, -1.2]:
			var pot := Node3D.new()
			room_root.add_child(pot)
			pot.position = Vector3(x, 0.0, -3.25)
			pot.scale = Vector3.ONE * 0.75
			plant(pot, true, "d7aa9e")
	elif level.id == "books":
		for i in range(6):
			var volume := book(room_root, Vector3(1.65 + i * 0.3, 1.36, -3.0), ["a5b596", "c3aa8e", "9fafb5"][i % 3])
			volume.rotation.z = PI / 2
			volume.scale = Vector3.ONE * 0.7
	elif level.id == "cafe":
		box(room_root, Vector3(1.5, 1.2, 0.10), Vector3(0.2, 2.2, -3.96), "a38e6f")
		box(room_root, Vector3(1.32, 1.02, 0.02), Vector3(0.2, 2.2, -3.89), "697a68")
		for i in range(4):
			box(room_root, Vector3(0.75 - i * 0.12, 0.015, 0.014), Vector3(0.06, 2.5 - i * 0.18, -3.86), "dce0c6")
		for i in range(7):
			line(room_root, Vector3(-3.7 + i * 0.35, 2.8, -3.91), Vector3(-3.74 + i * 0.35, 2.62, -3.91), 0.008, "e2e8dc")
		box(room_root, Vector3(3.6, 0.75, 0.52), Vector3(-2.8, 0.36, -3.35), "b49873")
		rounded_box(room_root, Vector3(3.75, 0.09, 0.63), Vector3(-2.8, 0.78, -3.35), 0.06, "d5bc96")
		for x in [-3.8, -3.2, -2.6]:
			cylinder(room_root, 0.14, 0.14, 0.32, Vector3(x, 0.99, -3.35), "d6ccb0")
	elif level.id == "rooftop":
		for x in [-4.4, -0.4]:
			cylinder(room_root, 0.045, 0.045, 2.8, Vector3(x, 1.4, -3.25), "a8ac9d")
		line(room_root, Vector3(-4.4, 2.7, -3.25), Vector3(-0.4, 2.7, -3.25), 0.012, "b2a78a")
		for i in range(5):
			box(room_root, Vector3(0.5, 0.52, 0.025), Vector3(-4.0 + i * 0.72, 2.42, -3.25), ["c4b0a4", "acc5c2", "d6c595"][i % 3])
		for x in range(-5, 6):
			box(room_root, Vector3(0.035, 0.7, 0.035), Vector3(x * 0.93, 1.0, -4.05), "929e91")
		box(room_root, Vector3(10.3, 0.045, 0.05), Vector3(0, 1.35, -4.05), "929e91")
		for x in [1.7, 3.1]:
			var pot := Node3D.new()
			room_root.add_child(pot)
			pot.position = Vector3(x, 0, -3.4)
			pot.scale = Vector3.ONE * 0.75
			plant(pot, false, "96ae82")
	elif level.id == "courtyard":
		for row in range(3):
			for i in range(11):
				box(room_root, Vector3(0.87, 0.15, 0.035), Vector3(-4.7 + i * 0.9 + (row % 2) * 0.3, 0.1 + row * 0.18, -4.0), "cbb397")
		line(room_root, Vector3(-4.4, 2.7, -3.55), Vector3(3.7, 2.4, -3.55), 0.012, "a49d7a")
		for i in range(10):
			sphere(room_root, Vector3(-4.2 + i * 0.85, 2.6 - i * 0.03, -3.55), Vector3.ONE * 0.065, "f1dab0")
		cylinder(room_root, 0.14, 0.10, 2.2, Vector3(-4.3, 1.1, -3.1), "a58a64")
		for pos in [Vector3(-4.3, 2.6, -3.1), Vector3(-3.8, 2.3, -3.2), Vector3(-4.7, 2.2, -3.0)]:
			sphere(room_root, pos, Vector3(0.7, 0.55, 0.65), "9caf83")
	else:
		box(room_root, Vector3(0.85, 0.9, 0.08), Vector3(0.2, 2.5, -3.98), "b49b76")
		box(room_root, Vector3(0.71, 0.76, 0.02), Vector3(0.2, 2.5, -3.92), "eee2c7")
		var print_sun := cylinder(room_root, 0.19, 0.19, 0.025, Vector3(0.2, 2.6, -3.89), "c8a477")
		print_sun.rotation.x = PI / 2
	bake(room_root)
	return room_root
