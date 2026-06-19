"""Test Development Mode workflow saving"""
import requests

BASE_URL = "http://localhost:8000"

print("Testing Development Mode Workflow Saving...")
print("=" * 60)

# No authentication needed in dev mode!
headers = {}

# 1. Get or create default project
print("\n1. Getting default project...")
r = requests.get(f"{BASE_URL}/api/projects/default", headers=headers)
print(f"Status: {r.status_code}")
if r.status_code == 200:
    project = r.json()
    print(f"Project: {project['name']} (ID: {project['id']})")
    project_id = project['id']
else:
    print(f"Error: {r.text}")
    exit(1)

# 2. Start recording
print("\n2. Starting recording...")
r = requests.post(f"{BASE_URL}/api/recorder/start",
    json={"url": "https://blazedemo.com/index.php", "language": "python"},
    headers=headers
)
print(f"Status: {r.status_code}")
if r.status_code == 200:
    print(f"Session: {r.json()['session_id']}")
else:
    print(f"Error: {r.text}")
    exit(1)

# 3. Stop and save workflow
print("\n3. Stopping and saving workflow...")
r = requests.post(f"{BASE_URL}/api/recorder/stop",
    params={
        "save_as_workflow": True,
        "workflow_name": "Test Blazedemo Workflow"
    },
    headers=headers
)
print(f"Status: {r.status_code}")
if r.status_code == 200:
    result = r.json()
    print(f"Actions: {result['actions_count']}")
    print(f"Workflow ID: {result.get('workflow_id')}")
    workflow_id = result.get('workflow_id')
else:
    print(f"Error: {r.text}")
    exit(1)

# 4. List workflows
print("\n4. Listing workflows...")
r = requests.get(f"{BASE_URL}/api/workflows", headers=headers)
print(f"Status: {r.status_code}")
if r.status_code == 200:
    workflows = r.json()
    print(f"Found {len(workflows)} workflow(s):")
    for wf in workflows:
        print(f"  - {wf['name']} (ID: {wf['id']})")
else:
    print(f"Error: {r.text}")

# 5. Get workflow details if we have an ID
if workflow_id:
    print(f"\n5. Getting workflow {workflow_id} details...")
    r = requests.get(f"{BASE_URL}/api/workflows/{workflow_id}", headers=headers)
    print(f"Status: {r.status_code}")
    if r.status_code == 200:
        wf = r.json()
        print(f"Workflow: {wf['name']}")
        print(f"Nodes: {len(wf.get('nodes', []))}")
        print(f"Edges: {len(wf.get('edges', []))}")

print("\n" + "=" * 60)
print("Test Complete!")

# Made with Bob
