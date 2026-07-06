"""
Full desktop recorder smoke test — runs under the venv Python.
Tests:
  1. _PYNPUT_AVAILABLE / _PYAUTOGUI_AVAILABLE flags
  2. DesktopRecorderService start / stop (3-second live capture)
  3. PyAutoGUIScriptParser round-trip
  4. DesktopScriptGenerator desktop + hybrid output
  5. ScriptGenerator auto-detection
"""
import sys, os, time
sys.path.insert(0, os.path.dirname(__file__))  # ensure app/ is importable

# ── 1. Import flags ──────────────────────────────────────────────────────────
from app.services.desktop_recorder import (
    DesktopRecorderService,
    PyAutoGUIScriptParser,
    _PYNPUT_AVAILABLE,
    _PYAUTOGUI_AVAILABLE,
)
print(f"[1] pynput available   : {_PYNPUT_AVAILABLE}")
print(f"[1] pyautogui available: {_PYAUTOGUI_AVAILABLE}")
assert _PYNPUT_AVAILABLE,   "FAIL: pynput not available in venv"
assert _PYAUTOGUI_AVAILABLE,"FAIL: pyautogui not available in venv"

# ── 2. Live recording: 3-second capture ─────────────────────────────────────
print("\n[2] Starting live desktop recording for 3 seconds...")
print("    Move your mouse around and press a key to generate events.")
recorder = DesktopRecorderService()
result = recorder.start(session_id="smoke_test")
assert result["status"] == "recording", f"Expected 'recording', got {result['status']}"
print(f"    Session: {result['session_id']}")

time.sleep(3)

stop_result = recorder.stop()
actions = stop_result["actions"]
print(f"    Captured {len(actions)} action(s) in 3 seconds")
for a in actions[:5]:
    print(f"      {a['node_type']:25s} | {a['label']}")
if len(actions) > 5:
    print(f"      ... and {len(actions)-5} more")
assert stop_result["status"] == "stopped"
print("[2] PASS")

# ── 3. PyAutoGUI script parser ───────────────────────────────────────────────
print("\n[3] Testing PyAutoGUIScriptParser...")
sample_script = """
import pyautogui, time, subprocess
pyautogui.click(100, 200)
pyautogui.typewrite('Hello World', interval=0.05)
pyautogui.hotkey('ctrl', 'c')
pyautogui.scroll(-3, 400, 300)
pyautogui.moveTo(500, 400)
pyautogui.dragTo(600, 300)
pyautogui.screenshot('test.png')
subprocess.Popen(r'notepad.exe')
time.sleep(1.5)
"""
nodes = PyAutoGUIScriptParser.parse(sample_script)
print(f"    Parsed {len(nodes)} nodes from sample script")
for n in nodes:
    print(f"      {n['node_type']:25s} | {n['label']}")
assert len(nodes) >= 7, f"Expected >=7 nodes, got {len(nodes)}"
print("[3] PASS")

# ── 4. Script generator ──────────────────────────────────────────────────────
print("\n[4] Testing DesktopScriptGenerator...")
from app.services.desktop_script_generator import DesktopScriptGenerator

desktop_out = DesktopScriptGenerator.generate(nodes, mode="desktop")
assert "pyautogui.click(100, 200)" in desktop_out, "click not in desktop output"
assert "def run():" in desktop_out
print("    Desktop mode: OK")

# Hybrid test with a mixed node list
mixed_nodes = [
    {"node_id": "n1", "node_type": "OPEN_URL", "label": "Open site",
     "config": {"url": "https://example.com"}, "position_x": 100, "position_y": 100},
    {"node_id": "n2", "node_type": "DESKTOP_CLICK", "label": "Desktop click",
     "config": {"x": 200, "y": 300, "button": "left", "clicks": 1},
     "position_x": 100, "position_y": 200},
]
hybrid_out = DesktopScriptGenerator.generate(mixed_nodes, mode="hybrid")
assert "async def run():" in hybrid_out, "hybrid should be async"
assert "await _page.goto" in hybrid_out, "web node should emit Playwright"
assert "pyautogui.click(200, 300)" in hybrid_out, "desktop node missing"
print("    Hybrid mode: OK")
print("[4] PASS")

# ── 5. ScriptGenerator auto-detection ───────────────────────────────────────
print("\n[5] Testing ScriptGenerator auto-detection...")
from app.services.script_generator import ScriptGenerator

# Pure desktop workflow -> should produce PyAutoGUI script
desktop_script = ScriptGenerator.generate(nodes[:4], [], language="python")
assert "pyautogui" in desktop_script, "Pure desktop workflow should auto-route to PyAutoGUI"
print("    Auto-detect desktop: OK")

# Hybrid language parameter
hybrid_script = ScriptGenerator.generate(mixed_nodes, [], language="hybrid")
assert "pyautogui" in hybrid_script
assert "playwright" in hybrid_script.lower()
print("    Explicit hybrid: OK")
print("[5] PASS")

print("\n========================================")
print("ALL TESTS PASSED - Desktop recording OK")
print("========================================")
