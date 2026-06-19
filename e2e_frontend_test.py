"""
End-to-End Frontend Test for TaskMaster
Tests the complete workflow: Record → Stop → View Actions
"""
import requests
import time
import json

BASE_URL = "http://localhost:8000"
FRONTEND_URL = "http://localhost:5174"
TOKEN = "test-token-for-development"

def print_section(title):
    print("\n" + "=" * 70)
    print(f"  {title}")
    print("=" * 70)

def test_api_health():
    """Test 1: Verify API is running"""
    print_section("TEST 1: API Health Check")
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            print("SUCCESS: Backend API is running")
            return True
        else:
            print("FAILED: Backend API not responding correctly")
            return False
    except Exception as e:
        print(f"FAILED: Cannot connect to backend - {e}")
        return False

def test_authentication():
    """Test 2: Verify test mode authentication"""
    print_section("TEST 2: Authentication Test")
    try:
        response = requests.get(
            f"{BASE_URL}/api/workflows",
            headers={"Authorization": f"Bearer {TOKEN}"},
            timeout=5
        )
        print(f"Status: {response.status_code}")
        if response.status_code in [200, 404]:  # 404 is ok if no workflows exist
            print("SUCCESS: Authentication working (test mode)")
            return True
        else:
            print(f"FAILED: Authentication failed - {response.json()}")
            return False
    except Exception as e:
        print(f"FAILED: Authentication test error - {e}")
        return False

def test_start_recording():
    """Test 3: Start recording session"""
    print_section("TEST 3: Start Recording")
    try:
        response = requests.post(
            f"{BASE_URL}/api/recorder/start",
            headers={
                "Authorization": f"Bearer {TOKEN}",
                "Content-Type": "application/json"
            },
            json={"url": "https://www.google.com"},
            timeout=10
        )
        print(f"Status: {response.status_code}")
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        if response.status_code == 200:
            print("\nSUCCESS: Recording started!")
            print(f"Session ID: {data.get('session_id')}")
            print(f"URL: {data.get('url')}")
            print("\nA Playwright browser should have opened.")
            print("Please perform these actions in the browser:")
            print("  1. Wait for Google.com to load")
            print("  2. Click in the search box")
            print("  3. Type: Fifa world cup")
            print("  4. Press Enter or click Search")
            print("  5. Wait 2-3 seconds for results")
            return True
        else:
            print(f"FAILED: {data.get('detail')}")
            return False
    except Exception as e:
        print(f"FAILED: {e}")
        return False

def test_stop_recording():
    """Test 4: Stop recording and get actions"""
    print_section("TEST 4: Stop Recording")
    try:
        response = requests.post(
            f"{BASE_URL}/api/recorder/stop",
            headers={
                "Authorization": f"Bearer {TOKEN}",
                "Content-Type": "application/json"
            },
            json={"save_as_workflow": False},
            timeout=10
        )
        print(f"Status: {response.status_code}")
        data = response.json()
        
        if response.status_code == 200:
            actions_count = data.get('actions_count', 0)
            actions = data.get('actions', [])
            
            print(f"\nSUCCESS: Recording stopped!")
            print(f"Actions captured: {actions_count}")
            
            if actions:
                print("\nCaptured Actions:")
                for i, action in enumerate(actions, 1):
                    action_type = action.get('type', 'UNKNOWN')
                    selector = action.get('selector', 'N/A')
                    value = action.get('value', '')
                    url = action.get('url', '')
                    
                    print(f"\n  Action {i}:")
                    print(f"    Type: {action_type}")
                    if selector and selector != 'N/A':
                        print(f"    Selector: {selector}")
                    if value:
                        print(f"    Value: {value}")
                    if url:
                        print(f"    URL: {url}")
            
            return True, actions
        else:
            print(f"FAILED: {data.get('detail')}")
            return False, []
    except Exception as e:
        print(f"FAILED: {e}")
        return False, []

def test_workflow_creation(actions):
    """Test 5: Create workflow from captured actions"""
    print_section("TEST 5: Create Workflow")
    
    if not actions:
        print("SKIPPED: No actions to create workflow")
        return False
    
    try:
        # Convert actions to workflow nodes
        nodes = []
        edges = []
        
        for i, action in enumerate(actions):
            node = {
                "node_id": f"node_{i}",
                "node_type": action.get('type', 'UNKNOWN'),
                "label": f"{action.get('type')} - {action.get('selector', 'N/A')}",
                "position_x": 100,
                "position_y": 100 + (i * 150),
                "config": {
                    "selector": action.get('selector'),
                    "value": action.get('value'),
                    "url": action.get('url'),
                    "timeout": 5000
                }
            }
            nodes.append(node)
            
            # Create edge to next node
            if i > 0:
                edge = {
                    "edge_id": f"edge_{i-1}_{i}",
                    "source_node_id": f"node_{i-1}",
                    "target_node_id": f"node_{i}"
                }
                edges.append(edge)
        
        workflow_data = {
            "name": "Google FIFA World Cup Search",
            "description": "Recorded workflow: Search for FIFA World Cup on Google",
            "project_id": 1,
            "nodes": nodes,
            "edges": edges
        }
        
        print(f"Creating workflow with {len(nodes)} nodes and {len(edges)} edges...")
        
        response = requests.post(
            f"{BASE_URL}/api/workflows",
            headers={
                "Authorization": f"Bearer {TOKEN}",
                "Content-Type": "application/json"
            },
            json=workflow_data,
            timeout=10
        )
        
        print(f"Status: {response.status_code}")
        
        if response.status_code in [200, 201]:
            data = response.json()
            workflow_id = data.get('id')
            print(f"\nSUCCESS: Workflow created!")
            print(f"Workflow ID: {workflow_id}")
            print(f"Workflow Name: {data.get('name')}")
            return True, workflow_id
        else:
            print(f"FAILED: {response.json().get('detail')}")
            return False, None
    except Exception as e:
        print(f"FAILED: {e}")
        return False, None

def test_workflow_execution(workflow_id):
    """Test 6: Execute the workflow"""
    print_section("TEST 6: Execute Workflow")
    
    if not workflow_id:
        print("SKIPPED: No workflow ID to execute")
        return False
    
    try:
        print(f"Executing workflow ID: {workflow_id}...")
        
        response = requests.post(
            f"{BASE_URL}/api/workflows/{workflow_id}/run",
            headers={
                "Authorization": f"Bearer {TOKEN}",
                "Content-Type": "application/json"
            },
            timeout=10
        )
        
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            run_id = data.get('run_id')
            print(f"\nSUCCESS: Workflow execution started!")
            print(f"Run ID: {run_id}")
            print(f"Status: {data.get('status')}")
            
            # Wait a bit for execution
            print("\nWaiting 5 seconds for execution...")
            time.sleep(5)
            
            # Check execution status
            status_response = requests.get(
                f"{BASE_URL}/api/executions/{run_id}",
                headers={"Authorization": f"Bearer {TOKEN}"},
                timeout=10
            )
            
            if status_response.status_code == 200:
                status_data = status_response.json()
                print(f"\nExecution Status: {status_data.get('status')}")
                print(f"Logs: {len(status_data.get('logs', []))} entries")
            
            return True
        else:
            print(f"FAILED: {response.json().get('detail')}")
            return False
    except Exception as e:
        print(f"FAILED: {e}")
        return False

def main():
    """Run all tests"""
    print("\n" + "=" * 70)
    print("  TaskMaster End-to-End Frontend Test")
    print("=" * 70)
    print(f"\nBackend URL: {BASE_URL}")
    print(f"Frontend URL: {FRONTEND_URL}")
    print(f"Test Token: {TOKEN}")
    
    results = {
        "passed": 0,
        "failed": 0,
        "skipped": 0
    }
    
    # Test 1: API Health
    if test_api_health():
        results["passed"] += 1
    else:
        results["failed"] += 1
        print("\nAborting: Backend not available")
        return
    
    # Test 2: Authentication
    if test_authentication():
        results["passed"] += 1
    else:
        results["failed"] += 1
        print("\nAborting: Authentication failed")
        return
    
    # Test 3: Start Recording
    if test_start_recording():
        results["passed"] += 1
        
        # Wait for user to perform actions
        input("\nPress Enter when you've completed the actions in the browser...")
        
        # Test 4: Stop Recording
        success, actions = test_stop_recording()
        if success:
            results["passed"] += 1
            
            # Test 5: Create Workflow
            success, workflow_id = test_workflow_creation(actions)
            if success:
                results["passed"] += 1
                
                # Test 6: Execute Workflow
                if test_workflow_execution(workflow_id):
                    results["passed"] += 1
                else:
                    results["failed"] += 1
            else:
                results["failed"] += 1
        else:
            results["failed"] += 1
    else:
        results["failed"] += 1
    
    # Final Summary
    print_section("TEST SUMMARY")
    print(f"Passed: {results['passed']}")
    print(f"Failed: {results['failed']}")
    print(f"Skipped: {results['skipped']}")
    print(f"Total: {results['passed'] + results['failed'] + results['skipped']}")
    
    if results['failed'] == 0:
        print("\nALL TESTS PASSED!")
    else:
        print(f"\n{results['failed']} TEST(S) FAILED")
    
    print("\n" + "=" * 70)

if __name__ == "__main__":
    main()

# Made with Bob
