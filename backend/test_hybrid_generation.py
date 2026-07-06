"""Smoke test: hybrid workflow script generation."""
from app.services.script_generator import ScriptGenerator

# Simulate a hybrid workflow with both web and desktop nodes
nodes = [
    {"node_id": "n1", "node_type": "OPEN_URL",      "label": "Open PetStore",    "config": {"url": "https://petstore.com"}, "position_x": 100, "position_y": 100},
    {"node_id": "n2", "node_type": "CLICK",          "label": "Click Login",      "config": {"selector": "role=button[name=\"Login\"]"}, "position_x": 100, "position_y": 200},
    {"node_id": "n3", "node_type": "DESKTOP_HOTKEY", "label": "Copy URL",         "config": {"keys": "ctrl+c"}, "position_x": 100, "position_y": 300},
    {"node_id": "n4", "node_type": "DESKTOP_CLICK",  "label": "Click at (200,300)","config": {"x": 200, "y": 300, "button": "left", "clicks": 1}, "position_x": 100, "position_y": 400},
    {"node_id": "n5", "node_type": "DELAY",          "label": "Wait 1s",          "config": {"duration": 1000}, "position_x": 100, "position_y": 500},
    {"node_id": "n6", "node_type": "DESKTOP_LAUNCH_APP", "label": "Launch Notepad","config": {"app_path": "notepad.exe"}, "position_x": 100, "position_y": 600},
]
edges = [
    {"edge_id": "e1", "source_node_id": "n1", "target_node_id": "n2"},
    {"edge_id": "e2", "source_node_id": "n2", "target_node_id": "n3"},
    {"edge_id": "e3", "source_node_id": "n3", "target_node_id": "n4"},
    {"edge_id": "e4", "source_node_id": "n4", "target_node_id": "n5"},
    {"edge_id": "e5", "source_node_id": "n5", "target_node_id": "n6"},
]

print("=== WEB (Python/Playwright) ===")
print(ScriptGenerator.generate(nodes[:2], edges[:1], language="python"))

print("\n=== DESKTOP-ONLY ===")
print(ScriptGenerator.generate(nodes[2:], edges[3:], language="desktop"))

print("\n=== HYBRID (auto-detected) ===")
print(ScriptGenerator.generate(nodes, edges, language="hybrid"))
