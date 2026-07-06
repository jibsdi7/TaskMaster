"""
Verify workflow_executor_sync fixes:
 1. No browser launched for desktop-only workflow
 2. Desktop nodes execute correctly
 3. No stale 'Browser closed' log on desktop-only failure
Uses safe coordinates only (no screen corners).
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from app.services.workflow_executor_sync import WorkflowExecutorSync, _WEB_NODE_TYPES

# Safe desktop nodes — avoid (0,0), (screen_w,0) corners for fail-safe
nodes = [
    {"node_id": "n0", "node_type": "DESKTOP_MOVE",   "label": "Move to centre", "config": {"x": 960, "y": 540}, "position_x": 100, "position_y": 100},
    {"node_id": "n1", "node_type": "DESKTOP_CLICK",  "label": "Click centre",   "config": {"x": 960, "y": 540, "button": "left", "clicks": 1}, "position_x": 100, "position_y": 200},
    {"node_id": "n2", "node_type": "DESKTOP_HOTKEY", "label": "Key: win",       "config": {"keys": "win"},       "position_x": 100, "position_y": 300},
    {"node_id": "n3", "node_type": "DELAY",          "label": "Wait 500ms",     "config": {"duration": 500},     "position_x": 100, "position_y": 400},
    {"node_id": "n4", "node_type": "DESKTOP_HOTKEY", "label": "Key: escape",    "config": {"keys": "escape"},    "position_x": 100, "position_y": 500},
]

edges = [
    {"edge_id": f"e{i}", "source_node_id": f"n{i}", "target_node_id": f"n{i+1}"}
    for i in range(len(nodes) - 1)
]

# ── Check 1: no web nodes detected ──────────────────────────────────────────
has_web = any(n["node_type"] in _WEB_NODE_TYPES for n in nodes)
print(f"[1] Has web nodes: {has_web}  — expected False")
assert not has_web

# ── Check 2: mock _init_browser to confirm it is NEVER called ────────────────
browser_called = []
orig = WorkflowExecutorSync._init_browser
WorkflowExecutorSync._init_browser = lambda self: browser_called.append(True) or orig(self)

print("[2] Running executor...")
executor = WorkflowExecutorSync()
result = executor.execute(nodes=nodes, edges=edges, inputs={}, run_id="test_safe", step_delay_ms=300)

print(f"    Status : {result['status']}")
print(f"    Browser launched: {bool(browser_called)}  — expected False")

for log in result.get("logs", []):
    lvl = log["level"]
    msg = log["message"]
    # Ensure no stale "Browser closed" log appears for desktop-only runs
    assert "Browser closed" not in msg or lvl != "INFO", \
        f"FAIL: stale browser log in desktop-only run: {msg}"
    print(f"  [{lvl}] {msg[:100]}")

assert not browser_called, "FAIL: browser was launched for desktop-only workflow"
assert result["status"] == "completed", f"FAIL: got status={result['status']}\n{result.get('error_message','')}"

print()
print("========================================")
print("ALL CHECKS PASSED")
print("========================================")
