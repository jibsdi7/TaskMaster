"""
Debug workflow 9 execution - check edges and execution order
"""
import requests
import json

BASE_URL = "http://localhost:8000"
WORKFLOW_ID = 9
headers = {
    "Authorization": "Bearer dev-token",
    "Content-Type": "application/json"
}

print("=" * 80)
print("Debugging Workflow 9 Execution")
print("=" * 80)

# Get workflow
response = requests.get(f"{BASE_URL}/api/workflows/{WORKFLOW_ID}", headers=headers)
workflow = response.json()

print(f"\n[INFO] Workflow: {workflow['name']}")
print(f"[INFO] Total Nodes: {len(workflow.get('nodes', []))}")
print(f"[INFO] Total Edges: {len(workflow.get('edges', []))}")

# Display all nodes
print("\n" + "=" * 80)
print("NODES")
print("=" * 80)
for node in workflow.get('nodes', []):
    print(f"\nNode ID: {node['node_id']}")
    print(f"  Type: {node['node_type']}")
    print(f"  Label: {node['label']}")
    print(f"  Position: ({node['position_x']:.2f}, {node['position_y']:.2f})")
    print(f"  Config: {json.dumps(node.get('config', {}), indent=4)}")

# Display all edges
print("\n" + "=" * 80)
print("EDGES (Connections)")
print("=" * 80)
if workflow.get('edges'):
    for edge in workflow['edges']:
        print(f"\nEdge ID: {edge['edge_id']}")
        print(f"  From: {edge['source_node_id']} -> To: {edge['target_node_id']}")
        print(f"  Source Handle: {edge.get('source_handle', 'N/A')}")
        print(f"  Target Handle: {edge.get('target_handle', 'N/A')}")
else:
    print("\n[WARN] No edges found! Nodes are not connected.")

# Analyze execution flow
print("\n" + "=" * 80)
print("EXECUTION FLOW ANALYSIS")
print("=" * 80)

# Find entry nodes (nodes with no incoming edges)
all_node_ids = {node['node_id'] for node in workflow.get('nodes', [])}
target_node_ids = {edge['target_node_id'] for edge in workflow.get('edges', [])}
entry_nodes = all_node_ids - target_node_ids

print(f"\n[INFO] Entry Nodes (no incoming edges): {len(entry_nodes)}")
for node_id in entry_nodes:
    node = next((n for n in workflow['nodes'] if n['node_id'] == node_id), None)
    if node:
        print(f"  - {node_id}: {node['node_type']} - {node['label']}")

# Find nodes with no outgoing edges
source_node_ids = {edge['source_node_id'] for edge in workflow.get('edges', [])}
terminal_nodes = all_node_ids - source_node_ids

print(f"\n[INFO] Terminal Nodes (no outgoing edges): {len(terminal_nodes)}")
for node_id in terminal_nodes:
    node = next((n for n in workflow['nodes'] if n['node_id'] == node_id), None)
    if node:
        print(f"  - {node_id}: {node['node_type']} - {node['label']}")

# Check if OPEN_URL is an entry node
open_url_nodes = [n for n in workflow['nodes'] if n['node_type'] == 'OPEN_URL']
if open_url_nodes:
    open_url_node = open_url_nodes[0]
    is_entry = open_url_node['node_id'] in entry_nodes
    print(f"\n[INFO] OPEN_URL Node Status:")
    print(f"  - Is Entry Node: {is_entry}")
    if not is_entry:
        print(f"  - [WARN] OPEN_URL should be an entry node!")
        print(f"  - [WARN] It has incoming edges, which may cause execution issues")

print("\n" + "=" * 80)

# Made with Bob
