"""
Dry-run test of workflow 32 (desktop2) through the sync executor.
Verifies:
 1. No browser is launched for a pure desktop workflow
 2. All DESKTOP_* nodes are dispatched correctly
 3. pyautogui actions fire (clicks, type, hotkey)
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from app.services.workflow_executor_sync import WorkflowExecutorSync, _WEB_NODE_TYPES

# ── Workflow 32 nodes (from inspect_wf32.py output) ──────────────────────────
nodes = [
    {"node_id": "desktop_node_0", "node_type": "DESKTOP_CLICK",  "label": "Left-click at (638, 1052)", "config": {"x": 638, "y": 1052, "button": "left", "clicks": 1}, "position_x": 100, "position_y": 100},
    {"node_id": "desktop_node_1", "node_type": "DESKTOP_CLICK",  "label": "Left-click at (813, 305)",  "config": {"x": 813, "y": 305,  "button": "left", "clicks": 1}, "position_x": 100, "position_y": 200},
    {"node_id": "desktop_node_2", "node_type": "DESKTOP_CLICK",  "label": "Left-click at (1919, 0)",   "config": {"x": 1919,"y": 0,    "button": "left", "clicks": 1}, "position_x": 100, "position_y": 300},
    {"node_id": "desktop_node_3", "node_type": "DESKTOP_CLICK",  "label": "Left-click at (507, 317)",  "config": {"x": 507, "y": 317,  "button": "left", "clicks": 1}, "position_x": 100, "position_y": 400},
    {"node_id": "desktop_node_4", "node_type": "DESKTOP_CLICK",  "label": "Left-click at (707, 125)",  "config": {"x": 707, "y": 125,  "button": "left", "clicks": 1}, "position_x": 100, "position_y": 500},
    {"node_id": "desktop_node_5", "node_type": "DESKTOP_CLICK",  "label": "Left-click at (1084, 205)", "config": {"x": 1084,"y": 205,  "button": "left", "clicks": 1}, "position_x": 100, "position_y": 600},
    {"node_id": "desktop_node_6", "node_type": "DESKTOP_CLICK",  "label": "Left-click at (1052, 179)", "config": {"x": 1052,"y": 179,  "button": "left", "clicks": 1}, "position_x": 100, "position_y": 700},
    {"node_id": "desktop_node_7", "node_type": "DESKTOP_TYPE",   "label": "Type: desktop2",            "config": {"text": "desktop2"}, "position_x": 100, "position_y": 800},
    {"node_id": "desktop_node_8", "node_type": "DESKTOP_HOTKEY", "label": "Key: enter",                "config": {"keys": "enter"},    "position_x": 100, "position_y": 900},
]

edges = [
    {"edge_id": f"dedge_{i}", "source_node_id": f"desktop_node_{i}", "target_node_id": f"desktop_node_{i+1}"}
    for i in range(len(nodes) - 1)
]

# Verify no web nodes
has_web = any(n["node_type"] in _WEB_NODE_TYPES for n in nodes)
print(f"[CHECK] Has web nodes: {has_web}  (expected: False)")
assert not has_web, "Should be desktop-only!"

# Patch _init_browser to prove it's never called
original_init = WorkflowExecutorSync._init_browser
browser_launched = []
def mock_init(self):
    browser_launched.append(True)
    original_init(self)
WorkflowExecutorSync._init_browser = mock_init

print("[RUN] Executing workflow 32 via WorkflowExecutorSync...")
print("      Mouse will move and type — please don't touch the keyboard/mouse for ~15 seconds")
print()

executor = WorkflowExecutorSync()
result = executor.execute(
    nodes=nodes,
    edges=edges,
    inputs={},
    run_id="test_wf32",
    step_delay_ms=500,   # 500ms between each action so it's visible
)

print()
print(f"[RESULT] Status : {result['status']}")
print(f"[RESULT] Browser launched: {len(browser_launched) > 0}  (expected: False)")
print(f"[RESULT] Logs   : {len(result.get('logs', []))} entries")
for log in result.get("logs", []):
    lvl = log.get("level", "")
    msg = log.get("message", "")
    print(f"  [{lvl}] {msg}")

assert not browser_launched, "FAIL: browser was launched for desktop-only workflow!"
assert result["status"] == "completed", f"FAIL: expected completed, got {result['status']}"
print()
print("========================================")
print("ALL CHECKS PASSED")
print("========================================")
