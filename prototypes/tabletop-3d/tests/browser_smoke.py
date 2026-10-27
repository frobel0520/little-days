"""Real browser input tests. Requires Python Playwright and a running dev server.

python prototypes/tabletop-3d/tests/browser_smoke.py
Optional: TABLETOP_BASE_URL, CHROMIUM_PATH. Build the Web export first.
"""
import json
import math
import os
import sys
from playwright.sync_api import sync_playwright

BASE = os.environ.get("TABLETOP_BASE_URL", "http://127.0.0.1:4317")


def state(page):
    return json.loads(page.evaluate("window.tabletopState"))


def point(page, x, y):
    s = state(page)
    rect = page.locator("canvas").bounding_box()
    return (rect["x"] + x * rect["width"] / s["viewport_width"],
            rect["y"] + y * rect["height"] / s["viewport_height"])


def item_point(page, index):
    item = state(page)["items"][index]
    return point(page, item["screen_x"], item["screen_y"])


def button_point(page, index):
    button = state(page)["buttons"][index]
    return point(page, button["x"], button["y"])


def wait(page, expression):
    page.wait_for_function(f"JSON.parse(window.tabletopState).{expression}", timeout=10000)


def settled(page):
    page.wait_for_function("""() => {
      const s = JSON.parse(window.tabletopState);
      return !s.dragging && s.items.every(item => Math.abs(item.y - 2.48) < 0.005);
    }""", timeout=15000)
    s = state(page)
    assert not s["dragging"]
    assert all(abs(item["y"] - 2.48) < 0.01 for item in s["items"]), s
    return s


with sync_playwright() as p:
    browser = p.chromium.launch(
        executable_path=os.environ.get("CHROMIUM_PATH", "/usr/bin/chromium"),
        headless=True,
        args=["--no-sandbox", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
    )
    errors = []
    if "--mobile-only" not in sys.argv:
        page = browser.new_page(viewport={"width": 1280, "height": 860})
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.on("console", lambda msg: errors.append(msg.text) if "SCRIPT ERROR" in msg.text else None)
        page.goto(BASE + "/tabletop-3d/index.html?playtest=1")
        page.wait_for_function("window.tabletopState !== undefined", timeout=90000)
        page.wait_for_timeout(400)
        original = state(page)

        # Actual picking, lift, movement, in-hand rotation and release.
        x, y = item_point(page, 0)
        page.mouse.move(x, y)
        page.mouse.down()
        wait(page, "dragging === true")
        wait(page, "items[0].y > 3.0")
        assert state(page)["items"][0]["y"] > 3.0
        page.mouse.move(x - 65, y + 15, steps=12)
        page.keyboard.press("r")
        page.wait_for_function("Math.abs(JSON.parse(window.tabletopState).items[0].angle - Math.PI / 2) < 0.02", timeout=15000)
        assert abs(state(page)["items"][0]["angle"] - math.pi / 2) < 0.1
        page.mouse.up()
        s = settled(page)
        assert s["placements"] == 1
        assert abs(s["items"][0]["x"] - original["items"][0]["x"]) > 0.2
        print("PASS desktop: ray picking, lift, drag, continuous rotation, landing")

        # Cancel returns position AND orientation, without registering a placement.
        before = state(page)
        x, y = item_point(page, 1)
        page.mouse.move(x, y)
        page.mouse.down()
        wait(page, "dragging === true")
        page.mouse.move(x + 80, y - 35, steps=8)
        page.keyboard.press("r")
        page.keyboard.press("Escape")
        page.mouse.up()
        s = settled(page)
        for key in ["x", "y", "z", "angle"]:
            assert abs(s["items"][1][key] - before["items"][1][key]) < 0.01
        assert s["placements"] == 1
        print("PASS desktop: cancel restores position and orientation")

        # Attempting to place on another object must return to the free origin.
        before = state(page)
        a, b = before["items"][0], before["items"][2]
        x, y = item_point(page, 0)
        dx, dy = point(page, b["base_x"], b["base_y"])
        ax, ay = point(page, a["base_x"], a["base_y"])
        page.mouse.move(x, y)
        page.mouse.down()
        wait(page, "dragging === true")
        page.mouse.move(x + dx - ax, y + dy - ay, steps=15)
        page.mouse.up()
        s = settled(page)
        assert abs(s["items"][0]["x"] - a["x"]) < 0.01
        assert abs(s["items"][0]["z"] - a["z"]) < 0.01
        assert s["placements"] == 1
        print("PASS desktop: crowded placement returns safely")

        # An extreme drag is clamped; the object cannot fall off the table.
        x, y = item_point(page, 0)
        page.mouse.move(x, y)
        page.mouse.down()
        wait(page, "dragging === true")
        page.mouse.move(40, 550, steps=10)
        page.mouse.up()
        s = settled(page)
        assert abs(s["items"][0]["x"]) < 2.85 and abs(s["items"][0]["z"]) < 1.4
        print("PASS desktop: tabletop edge bounds")

        camera_before = s["camera"]
        page.mouse.click(*button_point(page, 2), delay=150)
        page.wait_for_function("before => JSON.parse(window.tabletopState).camera !== before", arg=camera_before, timeout=15000)
        wait(page, "view_changing === false")
        page.mouse.click(*button_point(page, 3), delay=150)
        wait(page, "placements === 0 && JSON.parse(window.tabletopState).selected === -1")
        s = settled(page)
        assert s["placements"] == 0 and s["selected"] == -1
        for i in range(3):
            assert abs(s["items"][i]["x"] - original["items"][i]["x"]) < 0.01
        page.screenshot(path="/tmp/tabletop-desktop.png")
        print("PASS desktop: camera change and reset")
        page.close()

    # Touch events travel through Chromium's actual touch input path.
    context = browser.new_context(viewport={"width": 390, "height": 844},
                                  device_scale_factor=1, is_mobile=True, has_touch=True)
    page = context.new_page()
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.goto(BASE + "/tabletop-3d/index.html?playtest=1")
    page.wait_for_function("window.tabletopState !== undefined", timeout=90000)
    page.wait_for_timeout(400)
    assert state(page)["viewport_width"] == 390, "Mobile must not be a tiny letterboxed desktop"
    for button in state(page)["buttons"]:
        x, y = point(page, button["x"], button["y"])
        assert 0 < x < 390 and 0 < y < 844
    client = context.new_cdp_session(page)
    x, y = item_point(page, 0)
    client.send("Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": [{"x": x, "y": y}]})
    wait(page, "dragging === true")
    wait(page, "items[0].y > 3.0")
    assert state(page)["items"][0]["y"] > 3.0
    client.send("Input.dispatchTouchEvent", {"type": "touchMove", "touchPoints": [{"x": x - 15, "y": y + 6}]})
    page.wait_for_timeout(100)
    client.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []})
    s = settled(page)
    assert s["placements"] == 1
    angle = s["items"][0]["angle"]
    x, y = button_point(page, 0)
    client.send("Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": [{"x": x, "y": y}]})
    wait(page, "buttons[0].pressed === true")
    client.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []})
    page.wait_for_function("angle => Math.abs(JSON.parse(window.tabletopState).items[0].angle - angle - Math.PI / 2) < 0.02", arg=angle, timeout=15000)
    assert abs(state(page)["items"][0]["angle"] - angle - math.pi / 2) < 0.02
    before = state(page)
    x, y = item_point(page, 1)
    client.send("Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": [{"x": x, "y": y}]})
    wait(page, "dragging === true")
    x, y = button_point(page, 1)
    client.send("Input.dispatchTouchEvent", {"type": "touchMove", "touchPoints": [{"x": x, "y": y}]})
    client.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []})
    s = settled(page)
    assert s["placements"] == before["placements"]
    for key in ["x", "y", "z", "angle"]:
        assert abs(s["items"][1][key] - before["items"][1][key]) < 0.01
    page.screenshot(path="/tmp/tabletop-mobile.png")
    print("PASS mobile: portrait layout, touch lift/drag/release, rotate, drag-to-cancel")
    assert not errors, errors
    print("PASS: no browser exceptions or Godot script errors")
    browser.close()
