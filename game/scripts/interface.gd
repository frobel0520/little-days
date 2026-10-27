extends Control
signal action(name: String, value: String)
var controls: Dictionary = {}
var item_buttons: Dictionary = {}
var surface_buttons: Dictionary = {}
var chapter_picker: OptionButton
var heading: Label
var mission: RichTextLabel
var counter: Label
var story: RichTextLabel
var cat_status: Label
var message: Label
var sidebar: PanelContainer
var scroll: ScrollContainer
var items_grid: GridContainer
var surfaces_grid: GridContainer
var footer: GridContainer
var dialog: Control
var dialog_title: Label
var dialog_body: RichTextLabel
var modal_kind := ""
var scene_rect := Rect2()
var chapter: Dictionary
var layout_pending := true

func text(value: String, font_size := 16) -> Label:
	var label := Label.new()
	label.text = value
	label.add_theme_font_size_override("font_size", font_size)
	label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return label

func rich(height: float) -> RichTextLabel:
	var label := RichTextLabel.new()
	label.custom_minimum_size.y = height
	label.scroll_active = true
	label.bbcode_enabled = false
	label.add_theme_font_size_override("normal_font_size", 13)
	return label

func button(key: String, value: String, target: String = "") -> Button:
	var result := Button.new()
	result.text = value
	result.custom_minimum_size = Vector2(0, 38)
	result.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	result.pressed.connect(func(): action.emit(key, target))
	if target.is_empty():
		controls[key] = result
	return result

func _ready() -> void:
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	var theme_data := Theme.new()
	theme_data.default_font = load("res://assets/game-font.otf")
	theme_data.default_font_size = 14
	for state in ["normal", "hover", "pressed", "disabled", "focus"]:
		var style := StyleBoxFlat.new()
		style.bg_color = Color("f8f5eb" if state == "normal" else "e3e9d8")
		style.set_corner_radius_all(10)
		style.set_content_margin_all(8)
		if state == "focus":
			style.bg_color = Color.TRANSPARENT
			style.set_border_width_all(2)
			style.border_color = Color("8c9c7a")
		theme_data.set_stylebox(state, "Button", style)
		theme_data.set_stylebox(state, "OptionButton", style)
	theme_data.set_color("font_color", "Label", Color("616b57"))
	theme_data.set_color("default_color", "RichTextLabel", Color("777f69"))
	for type in ["Button", "OptionButton"]:
		theme_data.set_color("font_color", type, Color("606c56"))
		theme_data.set_color("font_disabled_color", type, Color("a5ad98"))
	theme = theme_data
	heading = text("小日子收納 · 街角的貓", 26)
	add_child(heading)
	heading.position = Vector2(18, 10)
	chapter_picker = OptionButton.new()
	chapter_picker.fit_to_longest_item = false
	chapter_picker.clip_text = true
	chapter_picker.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	chapter_picker.item_selected.connect(func(index: int): action.emit("chapter", str(index)))
	add_child(chapter_picker)
	var previous := button("previous", "上一個")
	add_child(previous)
	var next := button("next", "下一個")
	add_child(next)
	var notes := button("notebook", "貓咪筆記")
	add_child(notes)
	sidebar = PanelContainer.new()
	var paper := StyleBoxFlat.new()
	paper.bg_color = Color("ecebde")
	paper.set_corner_radius_all(16)
	paper.set_content_margin_all(12)
	sidebar.add_theme_stylebox_override("panel", paper)
	add_child(sidebar)
	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 6)
	sidebar.add_child(column)
	scroll = ScrollContainer.new()
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	column.add_child(scroll)
	var content := VBoxContainer.new()
	content.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	content.add_theme_constant_override("separation", 8)
	scroll.add_child(content)
	mission = rich(66)
	content.add_child(mission)
	counter = text("替小物找個家", 16)
	content.add_child(counter)
	items_grid = GridContainer.new()
	items_grid.columns = 3
	items_grid.add_theme_constant_override("h_separation", 5)
	items_grid.add_theme_constant_override("v_separation", 5)
	content.add_child(items_grid)
	story = rich(74)
	content.add_child(story)
	content.add_child(text("選好小物，也可以直接放到", 13))
	surfaces_grid = GridContainer.new()
	surfaces_grid.columns = 3
	surfaces_grid.add_theme_constant_override("h_separation", 5)
	surfaces_grid.add_theme_constant_override("v_separation", 5)
	content.add_child(surfaces_grid)
	cat_status = text("", 12)
	cat_status.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	cat_status.custom_minimum_size.y = 34
	column.add_child(cat_status)
	var finish_row := HBoxContainer.new()
	finish_row.add_theme_constant_override("separation", 6)
	column.add_child(finish_row)
	finish_row.add_child(button("greet", "輕聲打招呼"))
	finish_row.add_child(button("finish", "今天收好了"))
	footer = GridContainer.new()
	footer.add_theme_constant_override("h_separation", 5)
	footer.add_theme_constant_override("v_separation", 5)
	add_child(footer)
	for spec in [["rotate", "轉向"], ["cancel", "取消"], ["undo", "撤銷"], ["reset", "重整"], ["view", "換角度"], ["sound", "音效關"], ["zoom_out", "縮小"], ["zoom_in", "放大"]]:
		footer.add_child(button(spec[0], spec[1]))
	message = text("不急，每件小物都會找到自己的位置。", 12)
	message.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	add_child(message)
	build_dialog()
	get_viewport().size_changed.connect(layout)
	layout()
	settle_layout()

func settle_layout() -> void:
	# Text containers update their cached minimums after the initial layout pass.
	layout_pending = true
	await get_tree().process_frame
	await get_tree().process_frame
	layout()
	layout_pending = false

func build_dialog() -> void:
	dialog = Control.new()
	dialog.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(dialog)
	var backdrop := ColorRect.new()
	backdrop.color = Color(0.25, 0.3, 0.23, 0.55)
	backdrop.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	dialog.add_child(backdrop)
	var panel := PanelContainer.new()
	panel.name = "Paper"
	var style := StyleBoxFlat.new()
	style.bg_color = Color("f8f3e6")
	style.set_corner_radius_all(20)
	style.set_content_margin_all(24)
	panel.add_theme_stylebox_override("panel", style)
	dialog.add_child(panel)
	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 14)
	panel.add_child(column)
	dialog_title = text("貓咪筆記", 24)
	column.add_child(dialog_title)
	dialog_body = rich(100)
	dialog_body.size_flags_vertical = Control.SIZE_EXPAND_FILL
	dialog_body.add_theme_font_size_override("normal_font_size", 17)
	column.add_child(dialog_body)
	column.add_child(button("dialog_next", "下一個日常"))
	column.add_child(button("dialog_close", "回到房間"))
	dialog.hide()

func layout() -> void:
	var screen := get_viewport_rect().size
	var compact := screen.x < 900
	var header_height := 106.0 if compact else 98.0
	var footer_height := 110.0 if compact else 72.0
	heading.add_theme_font_size_override("font_size", 23 if compact else 28)
	chapter_picker.position = Vector2(18, 53)
	chapter_picker.size = Vector2(maxf(150, screen.x - 204) if compact else 480, 38)
	controls.previous.position = Vector2(screen.x - 174 if compact else 508, 53)
	controls.previous.size = Vector2(74, 38)
	controls.next.position = Vector2(screen.x - 94 if compact else 588, 53)
	controls.next.size = Vector2(74, 38)
	controls.notebook.position = Vector2(screen.x - 112, 10)
	controls.notebook.size = Vector2(94, 36)
	if compact:
		var panel_height := minf(310, screen.y * 0.37)
		sidebar.position = Vector2(12, screen.y - footer_height - panel_height)
		sidebar.size = Vector2(screen.x - 24, panel_height - 8)
		scene_rect = Rect2(0, header_height, screen.x, maxf(130, sidebar.position.y - header_height - 6))
	else:
		sidebar.position = Vector2(screen.x - 342, header_height)
		sidebar.size = Vector2(328, screen.y - header_height - footer_height - 10)
		scene_rect = Rect2(0, header_height, screen.x - 354, screen.y - header_height - footer_height - 8)
	footer.columns = 4 if compact else 8
	footer.position = Vector2(12, screen.y - footer_height + 2)
	footer.size = Vector2(screen.x - 24, footer_height - 32)
	message.position = Vector2(16, screen.y - 28)
	message.size = Vector2(screen.x - 32, 26)
	var panel: PanelContainer = dialog.get_node("Paper")
	panel.size = Vector2(minf(screen.x - 32, 650), minf(screen.y - 60, 640))
	panel.position = (screen - panel.size) / 2

func fill_chapter(data: Dictionary, chapters: Array, index: int) -> void:
	chapter = data
	chapter_picker.clear()
	for value in chapters:
		chapter_picker.add_item(value.number + " · " + value.title)
	chapter_picker.select(index)
	mission.text = data.author + "\n" + data.letter
	for child in items_grid.get_children():
		child.free()
	for child in surfaces_grid.get_children():
		child.free()
	item_buttons.clear()
	surface_buttons.clear()
	for it in data.items:
		var control := button("choose", it.get("shortName", it.name), it.id)
		control.add_theme_font_size_override("font_size", 12)
		control.clip_text = true
		control.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
		control.tooltip_text = it.name + "\n" + it.story
		items_grid.add_child(control)
		item_buttons[it.id] = control
	for surface in data.surfaces:
		if surface.accepts:
			var control := button("surface", surface.name, surface.id)
			control.add_theme_font_size_override("font_size", 12)
			surfaces_grid.add_child(control)
			surface_buttons[surface.id] = control
	scroll.scroll_vertical = 0
	settle_layout()

func update(state: Dictionary, selected: String, rules: RefCounted, completed: bool, dragging: bool, can_undo: bool, moment: Dictionary, cat_name: String, sounds: bool) -> void:
	counter.text = "%s · %d / %d" % [chapter.place, rules.count(state), chapter.items.size()]
	for it in chapter.items:
		var control: Button = item_buttons[it.id]
		var item_name: String = it.get("completedName", it.get("shortName", it.name)) if completed else it.get("shortName", it.name)
		control.text = ("✓ " if state[it.id].surface != "box" else "") + item_name
		var hint_name: String = it.get("completedName", it.name) if completed else it.name
		var hint_story: String = it.get("completedStory", it.story) if completed else it.story
		control.tooltip_text = hint_name + "\n" + hint_story
		control.modulate = Color("c6d6b0") if selected == it.id else Color.WHITE
	var selected_item: Dictionary = rules.item(selected)
	if selected_item.is_empty():
		story.text = "先挑一件小物。拖曳拿起，也可以用家具按鈕放下。"
	else:
		var name_value: String = selected_item.get("completedName", selected_item.name) if completed else selected_item.name
		var story_value: String = selected_item.get("completedStory", selected_item.story) if completed else selected_item.story
		story.text = name_value + "\n" + story_value
	for control in surface_buttons.values():
		control.disabled = selected.is_empty() or dragging
	controls.rotate.disabled = selected.is_empty()
	controls.cancel.disabled = selected.is_empty()
	controls.undo.disabled = not can_undo or dragging
	controls.finish.disabled = not rules.ready(state) or dragging
	controls.finish.text = "再欣賞今天" if completed and rules.ready(state) else "今天收好了"
	controls.greet.disabled = moment.pose in ["hidden", "none"]
	controls.greet.text = "和%s打招呼" % cat_name if not cat_name.is_empty() else "慢慢整理就好"
	controls.sound.text = "音效開" if sounds else "音效關"
	cat_status.text = (cat_name + " · " if not cat_name.is_empty() else "") + moment.text

func show_dialog(kind: String, title_value: String, body: String, can_next := false) -> void:
	modal_kind = kind
	dialog_title.text = title_value
	dialog_body.text = body
	controls.dialog_next.visible = can_next
	controls.dialog_next.text = "下一個日常"
	dialog.show()
	controls.dialog_close.grab_focus()

func close_dialog() -> void:
	dialog.hide()
	modal_kind = ""

func control_state(control: Control) -> Dictionary:
	var rect := control.get_global_rect()
	return {"x": rect.get_center().x, "y": rect.get_center().y, "visible": control.is_visible_in_tree(), "disabled": control.disabled if control is BaseButton else false, "pressed": control.is_pressed() if control is BaseButton else false, "text": control.text if control is Button else ""}

func inspect() -> Dictionary:
	var result := {"buttons": {}, "item_buttons": {}, "surface_buttons": {}, "scroll": {"x": scroll.get_global_rect().get_center().x, "y": scroll.get_global_rect().get_center().y, "top": scroll.global_position.y, "bottom": scroll.global_position.y + scroll.size.y}, "modal": modal_kind, "message": message.text}
	for key in controls:
		result.buttons[key] = control_state(controls[key])
	for key in item_buttons:
		result.item_buttons[key] = control_state(item_buttons[key])
	for key in surface_buttons:
		result.surface_buttons[key] = control_state(surface_buttons[key])
	return result
