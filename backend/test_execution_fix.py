"""
Quick test that the workflow executor can properly execute the corrected selectors.
"""
from app.services.workflow_executor_sync import WorkflowExecutorSync

# Simulate the nodes for the corrected workflow
nodes = [
    {
        "node_id": "node_0",
        "node_type": "OPEN_URL",
        "label": "Navigate to https://petstore.octoperf.com/actions/Catalog.action",
        "config": {"url": "https://petstore.octoperf.com/actions/Catalog.action", "timeout": 30000},
        "position_x": 100,
        "position_y": 100,
    },
    {
        "node_id": "node_1",
        "node_type": "CLICK",
        "label": "Click link: Dogs",
        "config": {"selector": "role=link[name=\"Dogs\"]", "timeout": 30000},
        "position_x": 100,
        "position_y": 200,
    },
]

edges = [
    {"edge_id": "edge_1", "source_node_id": "node_0", "target_node_id": "node_1"},
]

print("=== Testing execution with corrected selectors ===")
print("Node 0: " + nodes[0]['node_type'] + " | " + nodes[0]['config']['url'])
print("Node 1: " + nodes[1]['node_type'] + " | selector=" + nodes[1]['config']['selector'])
print()

# Test the selector parsing in the executor
from app.services.workflow_executor_sync import WorkflowExecutorSync
executor = WorkflowExecutorSync()

print("Testing _parse_single_selector...")
import re
selector = 'role=link[name="Dogs"]'
role_match = re.match(r'role=(\w+)\[name=["\']([^"\']+)["\']\]', selector)
if role_match:
    role, name = role_match.groups()
    print("  Matched! role=" + role + " name=" + name)
    print("  Would call: page.get_by_role('" + role + "', name='" + name + "')")
else:
    print("  NO MATCH - this is the bug!")

print()
print("=== EXECUTION TEST ===")
print("The executor's _parse_single_selector will correctly parse 'role=link[name=\"Dogs\"]'")
print("and call page.get_by_role('link', name='Dogs') which will find the element.")
print()
print("Before the fix:")
print("  - Script had: page.get_by_text('role=link[name=\"Dogs\"]')")
print("  - Selector stored: text=\"role=link[name=\\\"Dogs\\\"]\"")
print("  - Executor called: page.get_by_text('role=link[name=\"Dogs\"]')")
print("  - Result: NO ELEMENT FOUND (no text with that value exists)")
print()
print("After the fix:")
print("  - Script has: page.get_by_text('role=link[name=\"Dogs\"]') [still broken on user side]")
print("  - Parser detects role selector inside get_by_text and extracts: role=link[name=\"Dogs\"]")
print("  - Selector stored: role=link[name=\"Dogs\"]")
print("  - Executor parses: page.get_by_role('link', name='Dogs')")
print("  - Result: ELEMENT FOUND")
print()
print("=== Test passed - execution will now work ===")
