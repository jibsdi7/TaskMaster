"""
Test workflow 11 with direct executor
"""
import sys
sys.path.insert(0, 'backend')

from app.services.workflow_executor_sync import WorkflowExecutorSync
import requests

BASE_URL = "http://localhost:8000"
WORKFLOW_ID = 11
TOKEN = "test-token-for-development"

print("="*80)
print(f"Testing Workflow {WORKFLOW_ID} with Direct Executor")
print("="*80)

# Fetch workflow
response = requests.get(
    f"{BASE_URL}/api/workflows/{WORKFLOW_ID}",
    headers={"Authorization": f"Bearer {TOKEN}"}
)

workflow = response.json()
print(f"\nWorkflow: {workflow['name']}")
print(f"Nodes: {len(workflow['nodes'])}")

# Prepare nodes - REORDER to put OPEN_URL first
nodes_data = []
edges_data = []

# First, add OPEN_URL node
for node in workflow["nodes"]:
    if node["node_type"] == "OPEN_URL":
        nodes_data.append({
            "node_id": node["node_id"],
            "node_type": node["node_type"],
            "label": node["label"],
            "config": node.get("config", {}),
            "metadata": node.get("metadata", {})
        })
        break

# Then add other nodes
for node in workflow["nodes"]:
    if node["node_type"] != "OPEN_URL":
        nodes_data.append({
            "node_id": node["node_id"],
            "node_type": node["node_type"],
            "label": node["label"],
            "config": node.get("config", {}),
            "metadata": node.get("metadata", {})
        })

# Add edges
for edge in workflow["edges"]:
    edges_data.append({
        "edge_id": edge["edge_id"],
        "source_node_id": edge["source_node_id"],
        "target_node_id": edge["target_node_id"]
    })

print(f"\nReordered nodes:")
for i, node in enumerate(nodes_data, 1):
    print(f"{i}. {node['label']} ({node['node_type']})")
    if 'url' in node['config']:
        print(f"   URL: {node['config']['url']}")
    if 'selector' in node['config']:
        print(f"   Selector: {node['config']['selector']}")

print(f"\n\nExecuting workflow...")
executor = WorkflowExecutorSync()
result = executor.execute(
    nodes=nodes_data,
    edges=edges_data,
    inputs={},
    run_id="test-11"
)

print(f"\nResult:")
print(f"Status: {result.get('status')}")
print(f"Duration: {result.get('duration_seconds')}s")
print(f"Logs: {len(result.get('logs', []))}")

if result.get('error_message'):
    print(f"\nError: {result.get('error_message')}")

print(f"\nLogs:")
for log in result.get('logs', [])[:10]:  # First 10 logs
    print(f"  [{log.get('level')}] {log.get('message')}")

# Made with Bob
