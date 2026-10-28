extends RefCounted
## Canonical placement format is identical to the earlier browser game.
var level: Dictionary

func _init(chapter: Dictionary) -> void:
	level = chapter

func item(id: String) -> Dictionary:
	for value in level.items:
		if value.id == id:
			return value
	return {}

func surface(id: String) -> Dictionary:
	for value in level.surfaces:
		if value.id == id:
			return value
	return {}

func dimensions(id: String, orientation: int) -> Vector2:
	var it := item(id)
	return Vector2(it.d, it.w) if posmod(orientation, 2) else Vector2(it.w, it.d)

func fit(id: String, support: String, x: float, y: float, orientation: int = 0) -> Dictionary:
	var s := surface(support)
	if s.is_empty() or item(id).is_empty() or not is_finite(x) or not is_finite(y):
		return {}
	var size := dimensions(id, orientation)
	if size.x > float(s.w) + 0.0001 or size.y > float(s.d) + 0.0001:
		return {}
	return {"surface": support, "x": clampf(x, s.x, s.x + s.w - size.x), "y": clampf(y, s.y, s.y + s.d - size.y), "orientation": posmod(orientation, 4)}

func initial() -> Dictionary:
	var result := {}
	for it in level.items:
		result[it.id] = fit(it.id, "box", it.initial.x, it.initial.y)
	return result

func restore(stored: Variant) -> Dictionary:
	var result := initial()
	if stored is not Dictionary:
		return result
	for id in result:
		var p: Variant = stored.get(id)
		if p is not Dictionary or p.get("surface") is not String:
			continue
		if not (p.get("x") is float or p.get("x") is int) or not (p.get("y") is float or p.get("y") is int):
			continue
		var angle: Variant = p.get("orientation", 0)
		if not (angle is float or angle is int) or not is_finite(float(angle)) or float(angle) != floorf(float(angle)):
			continue
		var fitted := fit(id, p.surface, p.x, p.y, int(angle))
		if not fitted.is_empty():
			result[id] = fitted
	return result

func world(id: String, placement: Dictionary) -> Vector3:
	var size := dimensions(id, int(placement.orientation))
	var s := surface(placement.surface)
	return Vector3(placement.x + size.x / 2 - 5.0, float(s.z) + 0.012, placement.y + size.y / 2 - 4.0)

func count(state: Dictionary) -> int:
	var total := 0
	for it in level.items:
		if state.has(it.id) and surface(state[it.id].surface).get("accepts", false):
			total += 1
	return total

func ready(state: Dictionary) -> bool:
	return count(state) == level.items.size()

func overlap(state: Dictionary, id: String, p: Dictionary) -> float:
	var size := dimensions(id, int(p.orientation))
	var result := 0.0
	for other_id in state:
		if other_id == id or state[other_id].surface != p.surface:
			continue
		var other: Dictionary = state[other_id]
		var other_size := dimensions(other_id, int(other.orientation))
		var area := maxf(0, minf(p.x + size.x, other.x + other_size.x) - maxf(p.x, other.x)) * maxf(0, minf(p.y + size.y, other.y + other_size.y) - maxf(p.y, other.y))
		result += area / minf(size.x * size.y, other_size.x * other_size.y)
	return result

func gentle(state: Dictionary, id: String, requested: Dictionary) -> Dictionary:
	var best := requested.duplicate()
	if requested.is_empty() or not surface(requested.surface).get("accepts", false): return best
	var score := overlap(state, id, best)
	if score < 0.01: return best
	var size := dimensions(id, int(requested.orientation))
	var offsets: Array[Vector2] = []
	# Continuous candidate positions come from the requested point and nearby edges.
	# No grid, rejected placement, required slot, or movement of other objects.
	for radius in [0.22, 0.45, 0.8, 1.2]:
		for angle in range(12):
			offsets.append(Vector2.from_angle(angle * TAU / 12) * radius)
	for other_id in state:
		var p: Dictionary = state[other_id]
		if other_id == id or p.surface != requested.surface: continue
		var other := dimensions(other_id, int(p.orientation))
		for x in [p.x - size.x - 0.04, p.x + other.x + 0.04]:
			offsets.append(Vector2(x - requested.x, 0))
			for y in [p.y - size.y - 0.04, p.y + other.y + 0.04]:
				offsets.append(Vector2(x - requested.x, y - requested.y))
		for y in [p.y - size.y - 0.04, p.y + other.y + 0.04]:
			offsets.append(Vector2(0, y - requested.y))
	var distance := 0.0
	for offset in offsets:
		var p := fit(id, requested.surface, requested.x + offset.x, requested.y + offset.y, int(requested.orientation))
		var next := overlap(state, id, p)
		var moved := Vector2(p.x - requested.x, p.y - requested.y).length_squared()
		if next < score - 0.0001 or (absf(next - score) < 0.0001 and moved < distance):
			best = p
			score = next
			distance = moved
	return best

func moment(state: Dictionary, completed: bool) -> Dictionary:
	var n := count(state)
	if level.has("catProgress"):
		var progress: Dictionary = level.catProgress
		if completed: return {"pose": "sleep", "text": progress.sleep}
		if n < progress.peekAt: return {"pose": "hidden", "text": progress.hidden}
		if n < progress.sitAt: return {"pose": "peek", "text": progress.peek}
		var resting: bool = state.get(level.get("restItem", ""), {}).get("surface", "box") != "box"
		return {"pose": "sit", "text": progress.rest if resting else progress.sit}
	match level.id:
		"home":
			if n < 2: return {"pose": "hidden", "text": "箱子裡偶爾傳來窸窣聲。"}
			if n < 4: return {"pose": "peek", "text": "奶油探出頭了。原來箱子裡還有一位新室友。"}
			return {"pose": "sleep" if completed else "sit", "text": "奶油把空箱子當成了自己的床。" if completed else ("奶油找到毯子，踩了踩，正在旁邊陪你整理。" if state.blanket.surface != "box" else "奶油爬出箱子，正在巡視你的新房間。")}
		"flowers":
			return {"pose": "sleep" if completed else "sit", "text": "芝麻找到了舊毛巾，安安穩穩地趴下了。" if completed else ("芝麻認得那條毛巾，正在旁邊陪你整理。" if state.towel.surface != "box" else "奶油也來了，芝麻只是輕輕甩了一下尾巴。" if n >= 3 else "芝麻坐在矮櫃旁，慢慢看著你整理。")}
		"books":
			if n < 4: return {"pose": "hidden", "text": "書架後面，露出一小截黑色尾巴。"}
			if n < 7: return {"pose": "peek", "text": "墨墨探出耳朵，還在觀察你。"}
			return {"pose": "sleep" if completed else "sit", "text": "墨墨願意留在你面前休息了。" if completed else ("墨墨聞了聞坐墊，安靜地留在閱讀角。" if state.cushion.surface != "box" else "墨墨走出書架，聞了聞閱讀角的新味道。")}
	return {"pose": "none", "text": "每件小物都可以再拿起來，換個喜歡的位置。"}
