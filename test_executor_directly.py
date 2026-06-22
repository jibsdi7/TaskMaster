"""
Test the executor directly without going through the API
"""
import sys
sys.path.insert(0, 'backend')

from app.services.workflow_executor_sync import WorkflowExecutorSync
from app.db.models import NodeType
import requests

# Get workflow data from API
BASE_URL = "http://localhost:8000"
WORKFLOW_ID = 9
TOKEN = "test-token-for-development"

print("="*80)
print("Testing Executor Directly")
print("="*80)

# Fetch workflow
print("\n1. Fetching workflow...")
response = requests.get(
    f"{BASE_URL}/api/workflows/{WORKFLOW_ID}",
    headers={"Authorization": f"Bearer {TOKEN}"}
)

if response.status_code != 200:
    print(f"Failed to fetch workflow: {response.status_code}")
    sys.exit(1)

workflow = response.json()
print(f"Workflow: {workflow['name']}")
print(f"Nodes: {len(workflow['nodes'])}")
print(f"Edges: {len(workflow['edges'])}")

# Prepare nodes and edges
nodes_data = [
    {
        "node_id": node["node_id"],
        "node_type": node["node_type"],
        "label": node["label"],
        "config": node.get("config", {}),
        "metadata": node.get("metadata", {})
    }
    for node in workflow["nodes"]
]

edges_data = [
    {
        "edge_id": edge["edge_id"],
        "source_node_id": edge["source_node_id"],
        "target_node_id": edge["target_node_id"]
    }
    for edge in workflow["edges"]
]

print(f"\n2. Executing workflow directly...")
print(f"First node: {nodes_data[0]}")

# Execute
executor = WorkflowExecutorSync()
result = executor.execute(
    nodes=nodes_data,
    edges=edges_data,
    inputs={},
    run_id="test-run-123"
)

print(f"\n3. Execution Result:")
print(f"Status: {result.get('status')}")
print(f"Duration: {result.get('duration_seconds')}s")
print(f"Logs: {len(result.get('logs', []))}")

if result.get('error_message'):
    print(f"\nERROR: {result.get('error_message')}")

print(f"\nLogs:")
for log in result.get('logs', []):
    print(f"  [{log.get('level')}] {log.get('message')}")

if result.get('result', {}).get('error'):
    print(f"\nDetailed Error:")
    print(result['result']['error'])
    if 'traceback' in result['result']:
        print(f"\nTraceback:")
        print(result['result']['traceback'])

# Made with Bob
