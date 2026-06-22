"""
Test script to execute workflow 9 and display results
"""
import requests
import json
import time
import sys

# API configuration
BASE_URL = "http://localhost:8000"
WORKFLOW_ID = 9

# Development token (from security.py)
headers = {
    "Authorization": "Bearer dev-token",
    "Content-Type": "application/json"
}

print("=" * 80)
print("Testing Workflow 9 Execution")
print("=" * 80)

# Step 1: Get workflow details
print("\n1. Fetching workflow details...")
try:
    response = requests.get(f"{BASE_URL}/api/workflows/{WORKFLOW_ID}", headers=headers)
    if response.status_code == 200:
        workflow = response.json()
        print(f"   [OK] Workflow: {workflow['name']}")
        print(f"   [OK] Description: {workflow.get('description', 'N/A')}")
        print(f"   [OK] Nodes: {len(workflow.get('nodes', []))}")
        print(f"   [OK] Edges: {len(workflow.get('edges', []))}")
        
        print("\n   Nodes in workflow:")
        for node in workflow.get('nodes', []):
            print(f"     - {node['node_id']}: {node['node_type']} - {node['label']}")
    else:
        print(f"   [ERROR] Status: {response.status_code} - {response.text}")
        exit(1)
except Exception as e:
    print(f"   [ERROR] {str(e)}")
    exit(1)

# Step 2: Execute workflow
print("\n2. Executing workflow...")
print("   (This will open a browser and perform all actions)")
try:
    # Execute with optional URL
    payload = {}  # Can add {"url": "https://example.com"} if needed
    
    response = requests.post(
        f"{BASE_URL}/api/workflows/{WORKFLOW_ID}/execute",
        headers=headers,
        json=payload
    )
    
    if response.status_code == 200:
        result = response.json()
        print(f"   [OK] Execution completed!")
        print(f"   [OK] Run ID: {result.get('run_id')}")
        print(f"   [OK] Status: {result.get('status')}")
        print(f"   [OK] Duration: {result.get('duration_seconds', 0):.2f} seconds")
        print(f"   [OK] Logs: {result.get('logs_count', 0)} entries")
        
        run_id = result.get('run_id')
    else:
        print(f"   [ERROR] Status: {response.status_code}")
        print(f"   Response: {response.text}")
        exit(1)
except Exception as e:
    print(f"   [ERROR] {str(e)}")
    exit(1)

# Step 3: Get execution logs
print("\n3. Fetching execution logs...")
try:
    response = requests.get(
        f"{BASE_URL}/api/executions/{run_id}/logs",
        headers=headers
    )
    
    if response.status_code == 200:
        logs = response.json()
        print(f"   [OK] Retrieved {len(logs)} log entries")
        
        print("\n   Execution Log:")
        for log in logs:
            level = log.get('level', 'INFO')
            message = log.get('message', '')
            node_id = log.get('node_id', 'N/A')
            timestamp = log.get('created_at', '')
            
            icon = "[INFO]" if level == "INFO" else "[WARN]" if level == "WARNING" else "[ERROR]"
            print(f"     {icon} {message}")
            if node_id != 'N/A':
                print(f"           Node: {node_id}")
    else:
        print(f"   [WARN] Could not fetch logs: {response.status_code}")
except Exception as e:
    print(f"   [WARN] Error fetching logs: {str(e)}")

# Step 4: Get screenshots
print("\n4. Checking for screenshots...")
try:
    response = requests.get(
        f"{BASE_URL}/api/executions/{run_id}/screenshots",
        headers=headers
    )
    
    if response.status_code == 200:
        screenshots = response.json()
        count = screenshots.get('count', 0)
        print(f"   [OK] Found {count} screenshots")
        
        if count > 0:
            print("\n   Screenshots:")
            for screenshot in screenshots.get('screenshots', []):
                node_id = screenshot.get('node_id', 'N/A')
                path = screenshot.get('screenshot_path', 'N/A')
                print(f"     - Node {node_id}: {path}")
    else:
        print(f"   [WARN] Could not fetch screenshots: {response.status_code}")
except Exception as e:
    print(f"   [WARN] Error fetching screenshots: {str(e)}")

print("\n" + "=" * 80)
print("Test Complete!")
print("=" * 80)

# Made with Bob
