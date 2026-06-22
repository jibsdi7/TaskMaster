"""
Check and fix workflow 9 - ensure OPEN_URL node has a URL
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
print("Checking Workflow 9 Configuration")
print("=" * 80)

# Get workflow
response = requests.get(f"{BASE_URL}/api/workflows/{WORKFLOW_ID}", headers=headers)
if response.status_code != 200:
    print(f"[ERROR] Could not fetch workflow: {response.status_code}")
    exit(1)

workflow = response.json()
print(f"\n[OK] Workflow: {workflow['name']}")
print(f"[OK] Nodes: {len(workflow.get('nodes', []))}")

# Find OPEN_URL node
open_url_node = None
for node in workflow.get('nodes', []):
    if node['node_type'] == 'OPEN_URL':
        open_url_node = node
        break

if not open_url_node:
    print("\n[ERROR] No OPEN_URL node found in workflow!")
    exit(1)

print(f"\n[OK] Found OPEN_URL node: {open_url_node['node_id']}")
print(f"     Label: {open_url_node['label']}")
print(f"     Position: ({open_url_node['position_x']}, {open_url_node['position_y']})")
print(f"     Config: {json.dumps(open_url_node.get('config', {}), indent=6)}")

# Check if URL is present
config = open_url_node.get('config', {})
url = config.get('url')

if url:
    print(f"\n[OK] URL is configured: {url}")
    print("\n[INFO] No changes needed - workflow is properly configured")
else:
    print(f"\n[WARN] URL is missing or empty!")
    print("[INFO] Adding default URL: https://blazedemo.com/")
    
    # Update the node config
    open_url_node['config']['url'] = 'https://blazedemo.com/'
    open_url_node['config']['timeout'] = 30000
    
    # Prepare update payload
    update_payload = {
        "name": workflow['name'],
        "description": workflow.get('description'),
        "nodes": workflow['nodes'],
        "edges": workflow['edges'],
        "metadata": workflow.get('metadata', {})
    }
    
    # Update workflow
    print("\n[INFO] Updating workflow...")
    response = requests.put(
        f"{BASE_URL}/api/workflows/{WORKFLOW_ID}",
        headers=headers,
        json=update_payload
    )
    
    if response.status_code == 200:
        print("[OK] Workflow updated successfully!")
        updated_workflow = response.json()
        
        # Verify update
        for node in updated_workflow.get('nodes', []):
            if node['node_type'] == 'OPEN_URL':
                print(f"\n[OK] Verified - URL is now: {node['config'].get('url')}")
                break
    else:
        print(f"[ERROR] Failed to update workflow: {response.status_code}")
        print(f"Response: {response.text}")

print("\n" + "=" * 80)
print("Check Complete!")
print("=" * 80)

# Made with Bob
