"""
End-to-End Test: Record, Edit, Verify, and Replay Workflow
Tests the complete workflow lifecycle with blazedemo.com
"""
import asyncio
import time
import requests
from playwright.async_api import async_playwright

BASE_URL = "http://localhost:8000"
FRONTEND_URL = "http://localhost:5173"
TEST_URL = "https://blazedemo.com/index.php"

# Test credentials
TOKEN = "test-token"
HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}

async def test_complete_workflow():
    """Test complete workflow: Record -> Edit -> Verify -> Replay"""
    
    print("\n" + "="*80)
    print("BLAZEDEMO E2E TEST: Record -> Edit -> Verify -> Replay")
    print("="*80)
    
    # Step 1: Start Recording
    print("\n[STEP 1] Starting recording session...")
    response = requests.post(
        f"{BASE_URL}/api/recorder/start",
        headers=HEADERS,
        json={"url": TEST_URL}
    )
    
    if response.status_code != 200:
        print(f"❌ Failed to start recording: {response.status_code}")
        print(f"Response: {response.text}")
        return False
    
    data = response.json()
    session_id = data.get("session_id")
    ws_url = data.get("ws_url")
    print(f"✅ Recording started - Session ID: {session_id}")
    print(f"   WebSocket URL: {ws_url}")
    
    # Step 2: Perform actions on the website
    print("\n[STEP 2] Performing actions on blazedemo.com...")
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context()
        page = await context.new_page()
        
        try:
            # Navigate to blazedemo
            print(f"   → Navigating to {TEST_URL}")
            await page.goto(TEST_URL)
            await page.wait_for_load_state("networkidle")
            await asyncio.sleep(2)
            
            # Select departure city
            print("   → Selecting departure city (Boston)")
            await page.select_option('select[name="fromPort"]', "Boston")
            await asyncio.sleep(1)
            
            # Select destination city
            print("   → Selecting destination city (London)")
            await page.select_option('select[name="toPort"]', "London")
            await asyncio.sleep(1)
            
            # Click Find Flights button
            print("   → Clicking 'Find Flights' button")
            await page.click('input[type="submit"]')
            await page.wait_for_load_state("networkidle")
            await asyncio.sleep(2)
            
            # Click on first flight
            print("   → Selecting first flight")
            await page.click('table tbody tr:first-child input[type="submit"]')
            await page.wait_for_load_state("networkidle")
            await asyncio.sleep(2)
            
            print("✅ Actions completed successfully")
            
        except Exception as e:
            print(f"❌ Error during actions: {e}")
            await browser.close()
            return False
        
        finally:
            await browser.close()
    
    # Step 3: Stop recording and save as workflow
    print("\n[STEP 3] Stopping recording and saving as workflow...")
    response = requests.post(
        f"{BASE_URL}/api/recorder/stop",
        headers=HEADERS,
        json={
            "session_id": session_id,
            "save_as_workflow": True,
            "workflow_name": "BlazeDemo Flight Booking",
            "project_id": 1
        }
    )
    
    if response.status_code != 200:
        print(f"❌ Failed to stop recording: {response.status_code}")
        print(f"Response: {response.text}")
        return False
    
    data = response.json()
    workflow_id = data.get("workflow_id")
    print(f"[OK] Recording stopped and saved - Workflow ID: {workflow_id}")
    
    # Step 4: Retrieve and verify workflow details
    print("\n[STEP 4] Retrieving workflow details...")
    response = requests.get(
        f"{BASE_URL}/api/workflows/{workflow_id}",
        headers=HEADERS
    )
    
    if response.status_code != 200:
        print(f"❌ Failed to retrieve workflow: {response.status_code}")
        return False
    
    workflow = response.json()
    nodes = workflow.get("nodes", [])
    edges = workflow.get("edges", [])
    
    print(f"[OK] Workflow retrieved: {workflow.get('name')}")
    print(f"   Total nodes: {len(nodes)}")
    print(f"   Total edges: {len(edges)}")
    
    # Step 5: Verify node details
    print("\n[STEP 5] Verifying node details...")
    print("-" * 80)
    
    has_open_url = False
    has_selects = False
    has_clicks = False
    missing_details = []
    
    for i, node in enumerate(nodes):
        node_type = node.get("node_type")
        label = node.get("label")
        config = node.get("config", {})
        
        print(f"\nNode {i+1}: {label}")
        print(f"   Type: {node_type}")
        print(f"   Config: {config}")
        
        # Check for OPEN_URL node
        if node_type == "OPEN_URL":
            has_open_url = True
            if not config.get("url"):
                missing_details.append(f"Node {i+1} ({label}): Missing URL")
        
        # Check for SELECT nodes
        elif node_type == "SELECT":
            has_selects = True
            if not config.get("selector"):
                missing_details.append(f"Node {i+1} ({label}): Missing selector")
            if not config.get("value"):
                missing_details.append(f"Node {i+1} ({label}): Missing value")
        
        # Check for CLICK nodes
        elif node_type == "CLICK":
            has_clicks = True
            if not config.get("selector"):
                missing_details.append(f"Node {i+1} ({label}): Missing selector")
        
        # Check for TYPE nodes
        elif node_type == "TYPE":
            if not config.get("selector"):
                missing_details.append(f"Node {i+1} ({label}): Missing selector")
            if not config.get("text"):
                missing_details.append(f"Node {i+1} ({label}): Missing text")
    
    print("\n" + "-" * 80)
    print("\n[VERIFICATION RESULTS]")
    print(f"   Has OPEN_URL node: {'[OK]' if has_open_url else '[MISSING]'}")
    print(f"   Has SELECT nodes: {'[OK]' if has_selects else '[MISSING]'}")
    print(f"   Has CLICK nodes: {'[OK]' if has_clicks else '[MISSING]'}")
    
    if missing_details:
        print("\n[WARNING] Missing Details Found:")
        for detail in missing_details:
            print(f"   - {detail}")
    else:
        print("\n[OK] All nodes have necessary details for replay")
    
    # Step 6: Execute/Replay the workflow
    print("\n[STEP 6] Replaying the workflow...")
    response = requests.post(
        f"{BASE_URL}/api/workflows/{workflow_id}/execute",
        headers=HEADERS,
        json={"url": TEST_URL}
    )
    
    if response.status_code != 200:
        print(f"[ERROR] Failed to execute workflow: {response.status_code}")
        print(f"Response: {response.text}")
        
        # Try to get more details from the error
        try:
            error_data = response.json()
            print(f"Error details: {error_data}")
        except:
            pass
        
        return False
    
    execution_data = response.json()
    run_id = execution_data.get("run_id")
    status = execution_data.get("status")
    
    print(f"[OK] Workflow execution started")
    print(f"   Run ID: {run_id}")
    print(f"   Status: {status}")
    
    # Wait for execution to complete
    print("\n   Waiting for execution to complete...")
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
                    logs_count = len(exec_details.get("logs", []))
                    print(f"   Duration: {duration:.2f} seconds")
                    print(f"   Logs: {logs_count} entries")
                    
                    # Show some logs
                    logs = exec_details.get("logs", [])
                    if logs:
                        print("\n   Recent logs:")
                        for log in logs[-5:]:
                            print(f"      [{log.get('level')}] {log.get('message')}")
                    
                    return True
                else:
                    error_msg = exec_details.get("error_message", "Unknown error")
                    print(f"   Error: {error_msg}")
                    return False
        
        time.sleep(2)
        print("   .", end="", flush=True)
    
    print("\n[WARNING] Execution timeout - check execution details manually")
    return False

if __name__ == "__main__":
    print("\n>> Starting BlazeDemo E2E Test...")
    print("Make sure backend and frontend servers are running!")
    print(f"Backend: {BASE_URL}")
    print(f"Frontend: {FRONTEND_URL}")
    
    success = asyncio.run(test_complete_workflow())
    
    print("\n" + "="*80)
    if success:
        print("[PASS] TEST PASSED: Complete workflow lifecycle successful!")
    else:
        print("[FAIL] TEST FAILED: Check errors above")
    print("="*80 + "\n")

# Made with Bob
