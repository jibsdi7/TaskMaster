"""
Test workflow 11 execution
"""
import requests
import json

BASE_URL = "http://localhost:8000"
WORKFLOW_ID = 11
TOKEN = "test-token-for-development"

print("="*80)
print(f"Testing Workflow {WORKFLOW_ID} Execution")
print("="*80)

# Get workflow details
print("\n1. Fetching workflow...")
response = requests.get(
    f"{BASE_URL}/api/workflows/{WORKFLOW_ID}",
    headers={"Authorization": f"Bearer {TOKEN}"}
)

if response.status_code != 200:
    print(f"[FAIL] Failed to fetch workflow: {response.status_code}")
    print(response.text)
    exit(1)

workflow = response.json()
print(f"[OK] Workflow: {workflow['name']}")
print(f"     Nodes: {len(workflow['nodes'])}")
print(f"     Edges: {len(workflow['edges'])}")

# Show nodes
print("\nNodes:")
for node in workflow['nodes']:
    print(f"  - {node['label']} ({node['node_type']})")
    if node.get('config'):
        if 'url' in node['config']:
            print(f"    URL: {node['config']['url']}")
        if 'selector' in node['config']:
            print(f"    Selector: {node['config']['selector']}")

# Execute workflow
print("\n2. Executing workflow...")
print("   (Browser should open...)")

response = requests.post(
    f"{BASE_URL}/api/workflows/{WORKFLOW_ID}/execute",
    json={},
    headers={"Authorization": f"Bearer {TOKEN}"},
    timeout=120
)

print(f"\n3. Response:")
print(f"   Status: {response.status_code}")
print(f"   Body: {response.text}")

if response.status_code == 200:
    result = response.json()
    print(f"\n[OK] Execution completed")
    print(f"     Duration: {result.get('duration_seconds')}s")
    print(f"     Status: {result.get('status')}")
else:
    print(f"\n[FAIL] Execution failed")

# Made with Bob
