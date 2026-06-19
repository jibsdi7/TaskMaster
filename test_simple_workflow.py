"""Simple test to create, edit and run a workflow"""
import requests
import json

BASE_URL = "http://localhost:8000"

# No token needed in DEV_AUTH_BYPASS mode
headers = {
    "Content-Type": "application/json"
}

print("=" * 60)
print("TaskMaster Simple Workflow Test")
print("=" * 60)

# Step 1: Create a project
print("\n[1/5] Creating project...")
project_data = {
    "name": "Test Project",
    "description": "Project for testing"
}

try:
    response = requests.post(f"{BASE_URL}/api/projects", headers=headers, json=project_data)
    if response.status_code == 200:
        project = response.json()
        project_id = project['id']
        print(f"SUCCESS: Project created (ID: {project_id})")
    else:
        print(f"INFO: Using default project_id=1")
        project_id = 1
except Exception as e:
    print(f"INFO: Using default project_id=1 ({e})")
    project_id = 1

# Step 1.5: Try to create a project first
print("\n[1.5/5] Creating project...")
try:
    project_response = requests.post(
        f"{BASE_URL}/api/projects",
        headers=headers,
        json={"name": "Test Project", "description": "Test project for workflows"}
    )
    if project_response.status_code == 200 or project_response.status_code == 201:
        project_id = project_response.json()['id']
        print(f"SUCCESS: Project created (ID: {project_id})")
    else:
        print(f"INFO: Using default project_id=1 ({project_response.status_code})")
        project_id = 1
except Exception as e:
    print(f"INFO: Using default project_id=1 ({e})")
    project_id = 1

# Step 2: Create a simple workflow
print("\n[2/5] Creating workflow...")
workflow_data = {
    "name": "BlazeDemo Test",
    "description": "Simple BlazeDemo workflow",
    "project_id": project_id,
    "nodes": [
        {
            "node_id": "start",
            "node_type": "OPEN_URL",
            "label": "Open BlazeDemo",
            "position_x": 100,
            "position_y": 100,
            "config": {"url": "https://blazedemo.com/index.php"},
            "metadata": {}
        }
    ],
    "edges": []
}

response = requests.post(f"{BASE_URL}/api/workflows", headers=headers, json=workflow_data)
print(f"Response status: {response.status_code}")
print(f"Response body: {response.text[:500]}")  # First 500 chars

if response.status_code == 200 or response.status_code == 201:
    workflow = response.json()
    workflow_id = workflow['id']
    print(f"SUCCESS: Workflow created (ID: {workflow_id})")
    print(f"   Name: {workflow['name']}")
    print(f"   Nodes: {len(workflow['nodes'])}")
else:
    print(f"FAILED: {response.status_code} - {response.text}")
    exit(1)

# Step 3: Edit workflow to add delay
print("\n[3/5] Editing workflow to add delay node...")
updated_data = {
    "name": "BlazeDemo Test (with delay)",
    "description": "Updated with delay",
    "project_id": project_id,
    "nodes": [
        {
            "node_id": "start",
            "node_type": "OPEN_URL",
            "label": "Open BlazeDemo",
            "position_x": 100,
            "position_y": 100,
            "config": {"url": "https://blazedemo.com/index.php"},
            "metadata": {}
        },
        {
            "node_id": "delay1",
            "node_type": "DELAY",
            "label": "Wait 3 seconds",
            "position_x": 300,
            "position_y": 100,
            "config": {"duration": 3000},
            "metadata": {}
        }
    ],
    "edges": [
        {
            "edge_id": "e1",
            "source_node_id": "start",
            "target_node_id": "delay1",
            "config": {},
            "metadata": {}
        }
    ]
}

response = requests.put(f"{BASE_URL}/api/workflows/{workflow_id}", headers=headers, json=updated_data)
if response.status_code == 200:
    workflow = response.json()
    print(f"SUCCESS: Workflow updated")
    print(f"   Name: {workflow['name']}")
    print(f"   Nodes: {len(workflow['nodes'])}")
    print(f"   Edges: {len(workflow['edges'])}")
else:
    print(f"FAILED: {response.status_code} - {response.text}")
    exit(1)

# Step 4: Run the workflow
print("\n[4/5] Running workflow...")
response = requests.post(f"{BASE_URL}/api/workflows/{workflow_id}/execute", headers=headers, json={})
if response.status_code == 200:
    result = response.json()
    run_id = result.get('run_id')
    print(f"SUCCESS: Workflow execution started")
    print(f"   Run ID: {run_id}")
    print(f"   Status: {result.get('status', 'N/A')}")
else:
    print(f"FAILED: {response.status_code} - {response.text}")
    run_id = None

# Step 5: Check execution status
if run_id:
    print("\n[5/5] Checking execution status...")
    response = requests.get(f"{BASE_URL}/api/executions/{run_id}", headers=headers)
    if response.status_code == 200:
        execution = response.json()
        print(f"SUCCESS: Execution details retrieved")
        print(f"   Status: {execution.get('status', 'N/A')}")
    else:
        print(f"INFO: Could not fetch execution details")

print("\n" + "=" * 60)
print("TEST COMPLETED!")
print("=" * 60)
print(f"\nWorkflow ID: {workflow_id}")
print(f"View at: http://localhost:5173/workflows/{workflow_id}")
if run_id:
    print(f"Execution at: http://localhost:5173/executions/{run_id}")

# Made with Bob
