"""
Test workflow 9 execution with VISIBLE browser using API data
"""
import sys
sys.path.insert(0, 'backend')

import requests
import uuid
from app.services.workflow_executor_sync import WorkflowExecutorSync

BASE_URL = "http://localhost:8000"
WORKFLOW_ID = 9
headers = {
    "Authorization": "Bearer dev-token",
    "Content-Type": "application/json"
}

print("=" * 80)
print("Testing Workflow 9 - VISIBLE Browser Execution")
print("=" * 80)

# Get workflow from API
print("\n[INFO] Fetching workflow from API...")
response = requests.get(f"{BASE_URL}/api/workflows/{WORKFLOW_ID}", headers=headers)
if response.status_code != 200:
    print(f"[ERROR] Could not fetch workflow: {response.status_code}")
    exit(1)

workflow = response.json()
print(f"[OK] Loaded workflow: {workflow['name']}")
print(f"[OK] Nodes: {len(workflow.get('nodes', []))}")
print(f"[OK] Edges: {len(workflow.get('edges', []))}")

# Display nodes
print("\n" + "=" * 80)
print("Workflow Nodes")
print("=" * 80)
for node in workflow.get('nodes', []):
    print(f"\n  {node['node_id']}: {node['node_type']}")
    print(f"    Label: {node['label']}")
    print(f"    Config: {node.get('config', {})}")

# Display edges
print("\n" + "=" * 80)
print("Workflow Edges")
print("=" * 80)
for edge in workflow.get('edges', []):
    print(f"  {edge['source_node_id']} -> {edge['target_node_id']}")

# Prepare data for executor
nodes_data = workflow.get('nodes', [])
edges_data = workflow.get('edges', [])

# Execute with visible browser
print("\n" + "=" * 80)
print("Starting Execution")
print("=" * 80)
print("\n[INFO] Browser will open and show all actions!")
print("[INFO] Watch the browser window...")
print()

run_id = str(uuid.uuid4())
print(f"[INFO] Run ID: {run_id}")

try:
    executor = WorkflowExecutorSync()
    
    print("[INFO] Executing workflow...")
    result = executor.execute(
        nodes=nodes_data,
        edges=edges_data,
        inputs={},
        run_id=run_id
    )
    
    print("\n" + "=" * 80)
    print("Execution Complete!")
    print("=" * 80)
    
    print(f"\n[OK] Status: {result.get('status')}")
    print(f"[OK] Duration: {result.get('duration_seconds', 0):.2f} seconds")
    print(f"[OK] Logs: {len(result.get('logs', []))} entries")
    print(f"[OK] Screenshots: {len(result.get('screenshots', []))} captured")
    
    # Display logs
    print("\n" + "=" * 80)
    print("Execution Logs")
    print("=" * 80)
    for i, log in enumerate(result.get('logs', []), 1):
        level = log.get('level', 'INFO')
        message = log.get('message', '')
        node_id = log.get('node_id', 'N/A')
        print(f"\n{i}. [{level}] {message}")
        if node_id and node_id != 'N/A':
            print(f"   Node: {node_id}")
    
    # Display screenshots
    screenshots = result.get('screenshots', [])
    if screenshots:
        print("\n" + "=" * 80)
        print(f"Screenshots Captured ({len(screenshots)})")
        print("=" * 80)
        for screenshot in screenshots:
            print(f"\n  Node: {screenshot.get('node_id')}")
            print(f"  Path: {screenshot.get('path')}")
            print(f"  Time: {screenshot.get('timestamp')}")
    
    # Check for errors
    error_logs = [log for log in result.get('logs', []) if log.get('level') == 'ERROR']
    if error_logs:
        print("\n" + "=" * 80)
        print(f"ERRORS FOUND ({len(error_logs)})")
        print("=" * 80)
        for log in error_logs:
            print(f"\n  {log.get('message')}")
            if log.get('node_id'):
                print(f"  Node: {log.get('node_id')}")
    
except Exception as e:
    print(f"\n[ERROR] Execution failed: {str(e)}")
    import traceback
    print("\nFull Traceback:")
    print(traceback.format_exc())

print("\n" + "=" * 80)
print("Test Complete!")
print("=" * 80)

# Made with Bob
