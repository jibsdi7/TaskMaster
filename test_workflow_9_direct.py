"""
Direct test of workflow 9 execution via API
"""
import requests
import time

# API endpoint
BASE_URL = "http://localhost:8000"
WORKFLOW_ID = 9

# Test token (development mode)
TOKEN = "test-token-for-development"

def test_workflow_execution():
    print("="*80)
    print("Testing Workflow 9 Execution")
    print("="*80)
    
    # Step 1: Get workflow details
    print("\n1. Fetching workflow details...")
    response = requests.get(
        f"{BASE_URL}/api/workflows/{WORKFLOW_ID}",
        headers={"Authorization": f"Bearer {TOKEN}"}
    )
    
    if response.status_code != 200:
        print(f"[FAIL] Failed to fetch workflow: {response.status_code}")
        print(response.text)
        return
    
    workflow = response.json()
    print(f"[OK] Workflow found: {workflow['name']}")
    print(f"  - Nodes: {len(workflow['nodes'])}")
    print(f"  - Edges: {len(workflow['edges'])}")
    
    # Step 2: Execute workflow
    print("\n2. Executing workflow...")
    print("   (Browser should open in a few seconds...)")
    
    start_time = time.time()
    response = requests.post(
        f"{BASE_URL}/api/workflows/{WORKFLOW_ID}/execute",
        json={},
        headers={"Authorization": f"Bearer {TOKEN}"},
        timeout=120  # 2 minute timeout
    )
    duration = time.time() - start_time
    
    print(f"\n3. Execution completed in {duration:.2f} seconds")
    print(f"   Status code: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"[OK] Execution successful!")
        print(f"  - Run ID: {result.get('run_id')}")
        print(f"  - Status: {result.get('status')}")
        print(f"  - Duration: {result.get('duration_seconds')}s")
        print(f"  - Logs count: {result.get('logs_count')}")
    else:
        print(f"[FAIL] Execution failed:")
        print(response.text)

if __name__ == "__main__":
    try:
        test_workflow_execution()
    except requests.exceptions.Timeout:
        print("\n[FAIL] Request timed out after 120 seconds")
    except Exception as e:
        print(f"\n[FAIL] Error: {e}")
        import traceback
        traceback.print_exc()

# Made with Bob
