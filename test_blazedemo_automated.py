"""
Automated E2E Test: Create and Execute BlazeDemo Workflow
Tests workflow execution without manual recording
"""
import time
import requests

BASE_URL = "http://localhost:8000"
TEST_URL = "https://blazedemo.com/index.php"

# Test credentials
TOKEN = "test-token"
HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}

def test_workflow_execution():
    """Test workflow creation and execution"""
    
    print("\n" + "="*80)
    print("BLAZEDEMO AUTOMATED TEST: Create and Execute Workflow")
    print("="*80)
    
    # Step 1: Create a project
    print("\n[STEP 1] Creating project...")
    response = requests.post(
        f"{BASE_URL}/api/projects",
        headers=HEADERS,
        json={"name": "Test Project", "description": "Automated test project"}
    )
    
    if response.status_code not in [200, 201]:
        print(f"[ERROR] Failed to create project: {response.status_code}")
        return False
    
    project_id = response.json().get("id")
    print(f"[OK] Project created - ID: {project_id}")
    
    # Step 2: Create workflow with nodes
    print("\n[STEP 2] Creating workflow with nodes...")
    
    workflow_data = {
        "name": "BlazeDemo Flight Booking Test",
        "description": "Automated test workflow for BlazeDemo",
        "project_id": project_id,
        "nodes": [
            {
                "node_id": "node_0",
                "node_type": "SELECT",
                "label": "Select Departure City",
                "position_x": 100,
                "position_y": 100,
                "config": {
                    "selector": "select[name=\"fromPort\"]",
                    "value": "Boston",
                    "timeout": 30000
                }
            },
            {
                "node_id": "node_1",
                "node_type": "SELECT",
                "label": "Select Destination City",
                "position_x": 100,
                "position_y": 200,
                "config": {
                    "selector": "select[name=\"toPort\"]",
                    "value": "London",
                    "timeout": 30000
                }
            },
            {
                "node_id": "node_2",
                "node_type": "CLICK",
                "label": "Click Find Flights",
                "position_x": 100,
                "position_y": 300,
                "config": {
                    "selector": "input[type=\"submit\"]",
                    "timeout": 30000
                }
            },
            {
                "node_id": "node_3",
                "node_type": "CLICK",
                "label": "Choose First Flight",
                "position_x": 100,
                "position_y": 400,
                "config": {
                    "selector": "table tbody tr:first-child input[type=\"submit\"]",
                    "timeout": 30000
                }
            }
        ],
        "edges": [
            {
                "edge_id": "edge_0",
                "source_node_id": "node_0",
                "target_node_id": "node_1"
            },
            {
                "edge_id": "edge_1",
                "source_node_id": "node_1",
                "target_node_id": "node_2"
            },
            {
                "edge_id": "edge_2",
                "source_node_id": "node_2",
                "target_node_id": "node_3"
            }
        ]
    }
    
    response = requests.post(
        f"{BASE_URL}/api/workflows",
        headers=HEADERS,
        json=workflow_data
    )
    
    if response.status_code not in [200, 201]:
        print(f"[ERROR] Failed to create workflow: {response.status_code}")
        print(f"Response: {response.text}")
        return False
    
    workflow_id = response.json().get("id")
    print(f"[OK] Workflow created - ID: {workflow_id}")
    
    # Step 3: Verify workflow structure
    print("\n[STEP 3] Verifying workflow structure...")
    response = requests.get(
        f"{BASE_URL}/api/workflows/{workflow_id}",
        headers=HEADERS
    )
    
    if response.status_code != 200:
        print(f"[ERROR] Failed to retrieve workflow: {response.status_code}")
        return False
    
    workflow = response.json()
    nodes = workflow.get("nodes", [])
    edges = workflow.get("edges", [])
    
    print(f"[OK] Workflow retrieved: {workflow.get('name')}")
    print(f"   Total nodes: {len(nodes)}")
    print(f"   Total edges: {len(edges)}")
    
    # Verify node details
    print("\n[VERIFICATION] Checking node details...")
    print("-" * 80)
    
    for i, node in enumerate(nodes):
        node_type = node.get("node_type")
        label = node.get("label")
        config = node.get("config", {})
        
        print(f"\nNode {i+1}: {label}")
        print(f"   Type: {node_type}")
        print(f"   Selector: {config.get('selector', 'MISSING')}")
        
        if node_type == "SELECT":
            print(f"   Value: {config.get('value', 'MISSING')}")
        
        print(f"   Timeout: {config.get('timeout', 'MISSING')}")
        
        # Check for required fields
        if not config.get('selector'):
            print(f"   [WARNING] Missing selector!")
        if node_type == "SELECT" and not config.get('value'):
            print(f"   [WARNING] Missing value!")
    
    print("\n" + "-" * 80)
    
    # Step 4: Execute workflow
    print("\n[STEP 4] Executing workflow...")
    response = requests.post(
        f"{BASE_URL}/api/workflows/{workflow_id}/execute",
        headers=HEADERS,
        json={"url": TEST_URL}
    )
    
    if response.status_code != 200:
        print(f"[ERROR] Failed to execute workflow: {response.status_code}")
        print(f"Response: {response.text}")
        return False
    
    execution_data = response.json()
    run_id = execution_data.get("run_id")
    status = execution_data.get("status")
    
    print(f"[OK] Workflow execution started")
    print(f"   Run ID: {run_id}")
    print(f"   Status: {status}")
    
    # Step 5: Monitor execution
    print("\n[STEP 5] Monitoring execution...")
    max_wait = 60  # 60 seconds timeout
    start_time = time.time()
    
    while time.time() - start_time < max_wait:
        response = requests.get(
            f"{BASE_URL}/api/executions/{run_id}",
            headers=HEADERS
        )
        
        if response.status_code == 200:
            exec_details = response.json()
            current_status = exec_details.get("status")
            
            if current_status in ["COMPLETED", "FAILED"]:
                print(f"\n[OK] Execution finished with status: {current_status}")
                
                if current_status == "COMPLETED":
                    duration = exec_details.get("duration_seconds", 0)
                    logs = exec_details.get("logs", [])
                    
                    print(f"   Duration: {duration:.2f} seconds")
                    print(f"   Total logs: {len(logs)}")
                    
                    # Show logs
                    if logs:
                        print("\n   Execution logs:")
                        for log in logs:
                            level = log.get('level', 'INFO')
                            message = log.get('message', '')
                            print(f"      [{level}] {message}")
                    
                    print("\n[SUCCESS] Workflow executed successfully!")
                    return True
                else:
                    error_msg = exec_details.get("error_message", "Unknown error")
                    print(f"   Error: {error_msg}")
                    
                    # Show error logs
                    logs = exec_details.get("logs", [])
                    if logs:
                        print("\n   Error logs:")
                        for log in logs:
                            if log.get('level') == 'ERROR':
                                print(f"      {log.get('message', '')}")
                    
                    return False
        
        time.sleep(2)
        print("   .", end="", flush=True)
    
    print("\n[WARNING] Execution timeout - check execution details manually")
    return False

if __name__ == "__main__":
    print("\n>> Starting BlazeDemo Automated Test...")
    print("Make sure backend server is running!")
    print(f"Backend: {BASE_URL}")
    
    success = test_workflow_execution()
    
    print("\n" + "="*80)
    if success:
        print("[PASS] TEST PASSED: Workflow execution successful!")
    else:
        print("[FAIL] TEST FAILED: Check errors above")
    print("="*80 + "\n")

# Made with Bob
