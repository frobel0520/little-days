"""Build and serve the game first; uses real mouse/touch input in Chromium.

python game/tests/browser_smoke.py [--mobile-only]
Optional environment: LITTLE_DAYS_BASE_URL, CHROMIUM_PATH.
"""
import json
import math
import os
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = os.environ.get("LITTLE_DAYS_BASE_URL", "http://127.0.0.1:4317")


def state(page):
    return json.loads(page.evaluate("window.littleDaysState"))


def wait(page, expression):
    page.wait_for_function("() => { const s = JSON.parse(window.littleDaysState); return " + expression + "; }", timeout=20000)


def ready(page):
    page.wait_for_function("window.littleDaysState !== undefined", timeout=90000)


def reveal(page, group, key):
    for _ in range(18):
        s = state(page)
        control = s[group][key]
        if group in ("buttons", "surface_buttons"):
            assert control["visible"] and not control["disabled"], (key, control)
            return control
        scroll = s["scroll"]
        if scroll["top"] + 8 < control["y"] < scroll["bottom"] - 8:
            assert not control["disabled"], (key, control)
            return control
        page.mouse.move(scroll["x"], scroll["y"])
        page.mouse.wheel(0, 130 if control["y"] >= scroll["bottom"] - 8 else -130)
        page.wait_for_timeout(160)
    raise AssertionError(("Cannot reach control", group, key, state(page)))


def click(page, group, key):
    control = reveal(page, group, key)
    page.mouse.move(control["x"], control["y"])
    page.mouse.down()
    page.wait_for_function("([group, key]) => JSON.parse(window.littleDaysState)[group][key].pressed", arg=[group, key], timeout=15000)
    page.mouse.up()


def choose(page, item):
    click(page, "item_buttons", item)
    page.wait_for_function("id => JSON.parse(window.littleDaysState).selected === id", arg=item, timeout=15000)


def place(page, item, support):
    choose(page, item)
    click(page, "surface_buttons", support)
    page.wait_for_function("([id, support]) => JSON.parse(window.littleDaysState).state[id].surface === support", arg=[item, support], timeout=15000)
    settle(page, item)


def settle(page, item):
    page.wait_for_function("id => { const s = JSON.parse(window.littleDaysState); return !s.dragging && Math.abs(s.items[id].y - s.items[id].expected_y) < 0.004; }", arg=item, timeout=20000)


def next_chapter(page, expected):
    click(page, "buttons", "next")
    page.wait_for_function("id => JSON.parse(window.littleDaysState).chapter === id", arg=expected, timeout=15000)


def collect_errors(page, errors):
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.on("console", lambda message: errors.append(message.text) if "SCRIPT ERROR" in message.text or "USER ERROR" in message.text else None)


with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=os.environ.get("CHROMIUM_PATH", "/usr/bin/chromium"), headless=True,
                                args=["--no-sandbox", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    errors = []
    if "--mobile-only" not in sys.argv:
        page = browser.new_page(viewport={"width": 1360, "height": 920})
        collect_errors(page, errors)
        page.goto(BASE + "/?playtest=1")
        ready(page)
        assert state(page)["chapter_count"] == 11 and state(page)["count"] == 0
        assert state(page)["buttons"]["finish"]["disabled"]
        assert page.evaluate("localStorage.getItem('little-days-godot-v1')") is None

        # Multiple heights, animated rotation and actual scene drag/cancel.
        place(page, "camera", "shelf-high")
        assert abs(state(page)["items"]["camera"]["y"] - 2.412) < 0.01
        click(page, "buttons", "rotate")
        wait(page, "s.state.camera.orientation === 1")
        wait(page, "Math.abs(s.items.camera.angle - Math.PI / 2) < 0.02")
        place(page, "camera", "desk")
        before = state(page)["state"]["camera"].copy()
        item = state(page)["items"]["camera"]
        page.mouse.move(item["screen_x"], item["screen_y"])
        page.mouse.down()
        wait(page, "s.dragging && s.selected === 'camera'")
        wait(page, "s.items.camera.y > s.items.camera.expected_y + 0.4")
        page.mouse.move(item["screen_x"] + 20, item["screen_y"] + 12, steps=4)
        page.keyboard.press("r")
        page.keyboard.press("Escape")
        wait(page, "!s.dragging")
        page.mouse.up()
        settle(page, "camera")
        assert state(page)["state"]["camera"] == before, {"before": before, "after": state(page)["state"]["camera"]}
        print("PASS: multi-height supports, continuous rotation, real 3D picking/lift and cancel")

        click(page, "buttons", "reset")
        wait(page, "s.modal === 'reset'")
        assert state(page)["state"]["camera"] == before
        click(page, "buttons", "dialog_close")
        wait(page, "s.modal === ''")
        click(page, "buttons", "reset")
        wait(page, "s.modal === 'reset'")
        click(page, "buttons", "dialog_next")
        wait(page, "s.count === 0 && s.modal === ''")
        click(page, "buttons", "undo")
        wait(page, "s.count === 1")
        settle(page, "camera")
        assert state(page)["state"]["camera"] == before
        print("PASS: reset confirmation and undo preserve the arrangement")

        # Complete every main story using normal item/furniture controls.
        chapters = ["home", "flowers", "books", "cafe", "rooftop", "courtyard"]
        for chapter_index, chapter in enumerate(chapters):
            assert state(page)["chapter"] == chapter
            if chapter == "courtyard":
                assert state(page)["revealed_items"] == []
                assert set(state(page)["cats"]) == {"cream", "sesame", "ink"}
            for item in list(state(page)["items"]):
                if state(page)["state"][item]["surface"] == "box":
                    place(page, item, "desk")
            wait(page, "s.ready && s.count === s.total")
            assert not state(page)["storage_failed"], state(page).get("storage_error")
            assert not state(page)["buttons"]["greet"]["disabled"]
            click(page, "buttons", "greet")
            cat = {"home": "cream", "flowers": "sesame", "books": "ink", "cafe": "sesame", "rooftop": "ink", "courtyard": "cream"}[chapter]
            page.wait_for_function("id => JSON.parse(window.littleDaysState).memories[id].includes('hello')", arg=cat)
            click(page, "buttons", "finish")
            wait(page, "s.modal === 'completion' && s.completed")
            if chapter == "courtyard":
                assert state(page)["revealed_items"] == ["today-photo"]
                assert state(page)["keepsake_visible"], 'The story payoff must be visible in the completion dialog'
                page.screenshot(path=str(Path(__file__).resolve().parents[2] / 'preview-fixed-photo-reveal.png'))
                assert '今天的合照' in state(page)["item_buttons"]["today-photo"]["text"]
                assert not state(page)["buttons"]["dialog_next"]["visible"]
            else:
                assert state(page)["buttons"]["dialog_next"]["visible"]
            click(page, "buttons", "dialog_close")
            wait(page, "s.modal === ''")
            page.screenshot(path=f"/tmp/little-days-{chapter}-complete.png")
            print("PASS main story:", chapter, "models/placement/completion/cat memories")
            if chapter_index < len(chapters) - 1:
                click(page, "buttons", "finish")
                wait(page, "s.modal === 'completion'")
                click(page, "buttons", "dialog_next")
                page.wait_for_function("id => JSON.parse(window.littleDaysState).chapter === id", arg=chapters[chapter_index + 1], timeout=15000)
        assert set(state(page)["met"]) == {"cream", "sesame", "ink"}
        click(page, "buttons", "notebook")
        wait(page, "s.modal === 'notebook'")
        assert '今天的合照' in state(page)["dialog_text"]
        assert '相冊的最後一頁還空著' not in state(page)["dialog_text"]
        click(page, "buttons", "dialog_close")
        page.reload()
        ready(page)
        assert state(page)["chapter"] == "courtyard" and state(page)["completed"] and state(page)["ready"]
        assert state(page)["revealed_items"] == ["today-photo"]
        assert set(state(page)["met"]) == {"cream", "sesame", "ink"}
        print("PASS: notebook epilogue, all encounters, keepsake photo and save/reload")

        # All five older small days load with real solid models and work independently.
        for index in range(5):
            next_chapter(page, f"small-{index}")
            s = state(page)
            assert all(item["meshes"] > 0 for item in s["items"].values())
            item = next(iter(s["items"]))
            place(page, item, "desk")
            assert state(page)["count"] == 1
            print("PASS small day:", index + 1, "3D models and placement")
        page.close()

        # First normal-mode visit imports, without overwriting, both previous save formats.
        context = browser.new_context(viewport={"width": 1360, "height": 920})
        context.add_init_script("""if (!sessionStorage.getItem('fixture')) {
          localStorage.setItem('little-days-cats-v1', JSON.stringify({current:'home',levels:{home:{state:{camera:{surface:'desk',x:1.3,y:1.6,orientation:1}},completed:false}},met:['cream'],memories:{cream:['hello']}}));
          localStorage.setItem('little-days-v2', JSON.stringify({completed:[0],layouts:{0:{book:{x:0.2,y:0.3,rotated:true}}}}));
          sessionStorage.setItem('fixture','1');
        }""")
        page = context.new_page()
        collect_errors(page, errors)
        # Inspect normal-mode migration through the saved JSON, never a write bridge.
        page.goto(BASE + "/")
        page.wait_for_function("localStorage.getItem('little-days-godot-v1') !== null", timeout=90000)
        migrated = page.evaluate("JSON.parse(localStorage.getItem('little-days-godot-v1'))")
        assert migrated["levels"]["home"]["state"]["camera"]["orientation"] == 1
        assert migrated["levels"]["home"]["state"]["camera"]["surface"] == "desk"
        assert migrated["memories"]["cream"] == ["hello"]
        assert migrated["levels"]["small-0"]["state"]["book"]["orientation"] == 1
        assert abs(migrated["levels"]["small-0"]["state"]["book"]["x"] - 0.94) < 0.001
        assert page.evaluate("JSON.parse(localStorage.getItem('little-days-cats-v1')).levels.home.state.camera.x") == 1.3
        print("PASS: original story and drawer saves imported; original data preserved")
        context.close()

    context = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=3, is_mobile=True, has_touch=True)
    page = context.new_page()
    collect_errors(page, errors)
    page.goto(BASE + "/?playtest=1")
    ready(page)
    s = state(page)
    assert s["viewport_width"] == 390
    assert s["scroll"]["bottom"] - s["scroll"]["top"] >= 80
    assert s["scene_rect"]["h"] >= 180
    assert s["buttons"]["finish"]["y"] < s["buttons"]["rotate"]["y"], "Mobile panel must not overlap footer"
    # Scroll controls stay usable while the full 3D room is visible above.
    place(page, "camera", "desk")
    assert state(page)["preview_visible"] and state(page)["selection_outline"]
    assert state(page)["surface_buttons"]["desk"]["y"] > state(page)["scroll"]["bottom"]
    original_placement = state(page)["state"]["camera"].copy()
    item = state(page)["items"]["camera"]
    client = context.new_cdp_session(page)
    client.send("Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": [{"x": item["screen_x"], "y": item["screen_y"]}]})
    wait(page, "s.dragging && s.selected === 'camera'")
    wait(page, "s.items.camera.y > s.items.camera.expected_y + 0.4")
    client.send("Input.dispatchTouchEvent", {"type": "touchMove", "touchPoints": [{"x": item["screen_x"] - 15, "y": item["screen_y"] + 10}]})
    page.wait_for_timeout(150)
    client.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []})
    settle(page, "camera")
    assert state(page)["state"]["camera"] != original_placement
    before = state(page)["state"]["camera"].copy()
    item = state(page)["items"]["camera"]
    client.send("Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": [{"x": item["screen_x"], "y": item["screen_y"]}]})
    wait(page, "s.dragging")
    cancel = state(page)["buttons"]["cancel"]
    client.send("Input.dispatchTouchEvent", {"type": "touchMove", "touchPoints": [{"x": cancel["x"], "y": cancel["y"]}]})
    client.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []})
    settle(page, "camera")
    assert state(page)["state"]["camera"] == before
    assert not state(page)["storage_failed"], state(page).get("storage_error")
    page.screenshot(path="/tmp/little-days-mobile.png")
    print("PASS mobile: responsive layout, pinned placement controls, preview, touch lift/drop and drag-to-cancel")
    page.set_viewport_size({"width":844,"height":390})
    wait(page, "s.viewport_width === 844 && s.scroll.bottom - s.scroll.top >= 80")
    assert state(page)["scene_rect"]["h"] >= 180
    click(page,"buttons","notebook")
    wait(page,"s.modal === 'notebook'")
    assert state(page)["buttons"]["dialog_close"]["font_focus"].startswith("37452d")
    click(page,"buttons","dialog_close")
    page.screenshot(path=str(Path(__file__).resolve().parents[2] / "preview-fixed-mobile-landscape.png"))
    print("PASS mobile: landscape reflow and readable dialog focus")
    assert not errors, errors
    print("PASS: no browser exceptions or Godot script errors")
    browser.close()
