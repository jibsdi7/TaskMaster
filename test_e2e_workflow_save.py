"""
End-to-End Test: Record workflow from blazedemo.com and verify it's saved and displayed
"""
import requests
import time
import json

BASE_URL = "http://localhost:8000"

def test_complete_workflow_cycle():
    """Test the complete workflow recording and saving cycle"""
    
    print("=" * 70)
    print("End-to-End Workflow Recording Test for blazedemo.com")
    print("=" * 70)
    
    # Step 1: Get default project
    print("\n[STEP 1] Getting default project...")
    try:
        response = requests.get(f"{BASE_URL}/api/projects/default")
        if response.status_code == 200:
            project = response.json()
            print(f"   [OK] Project: {project['name']} (ID: {project['id']})")
            project_id = project['id']
        else:
            print(f"   [FAIL] Failed to get project: {response.status_code}")
            return False
    except Exception as e:
        print(f"   [FAIL] Error: {e}")
        return False
    
    # Step 2: Start recording session
    print("\n[STEP 2] Starting recording session...")
    try:
        response = requests.post(
            f"{BASE_URL}/api/recorder/start",
            json={"url": "https://blazedemo.com/index.php"}
        )
        if response.status_code == 200:
            session_data = response.json()
            session_id = session_data['session_id']
            print(f"   [OK] Session started: {session_id}")
            print(f"   [OK] Browser launched: {session_data.get('browser_launched', False)}")
        else:
            print(f"   [FAIL] Failed to start recording: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
    except Exception as e:
        print(f"   [FAIL] Error: {e}")
        return False
    
    # Step 3: Wait for user to interact with the page
    print("\n[STEP 3] Recording session active...")
    print("   [INFO] Browser should be open at blazedemo.com")
    print("   [INFO] Perform some actions (click, type, etc.)")
    print("   [INFO] Waiting 10 seconds for interactions...")
    
    for i in range(10, 0, -1):
        print(f"   [{i}s remaining...]", end='\r')
        time.sleep(1)
    print("\n   [OK] Recording period complete")
    
    # Step 4: Stop recording and save workflow
    print("\n[STEP 4] Stopping recording and saving workflow...")
    try:
        response = requests.post(
            f"{BASE_URL}/api/recorder/stop",
            params={
                "save_as_workflow": True,
                "workflow_name": "Blazedemo E2E Test Workflow",
                "project_id": project_id
            }
        )
        if response.status_code == 200:
            result = response.json()
            workflow_id = result.get('workflow_id')
            action_count = result.get('action_count', 0)
            print(f"   [OK] Recording stopped")
            print(f"   [OK] Workflow saved with ID: {workflow_id}")
            print(f"   [OK] Actions recorded: {action_count}")
            
            if action_count == 0:
                print("   [WARN] No actions were recorded. Did you interact with the page?")
        else:
            print(f"   [FAIL] Failed to stop recording: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
    except Exception as e:
        print(f"   [FAIL] Error: {e}")
        return False
    
    # Step 5: Verify workflow was saved
    print("\n[STEP 5] Verifying workflow was saved...")
    try:
        response = requests.get(f"{BASE_URL}/api/workflows/{workflow_id}")
        if response.status_code == 200:
            workflow = response.json()
            print(f"   [OK] Workflow retrieved successfully")
            print(f"   [OK] Name: {workflow['name']}")
            print(f"   [OK] Description: {workflow.get('description', 'N/A')}")
            print(f"   [OK] Nodes: {len(workflow.get('nodes', []))}")
            print(f"   [OK] Edges: {len(workflow.get('edges', []))}")
            print(f"   [OK] Version: {workflow.get('version')}")
            print(f"   [OK] Active: {workflow.get('is_active')}")
            print(f"   [OK] Created: {workflow.get('created_at')}")
        else:
            print(f"   [FAIL] Failed to retrieve workflow: {response.status_code}")
            return False
    except Exception as e:
        print(f"   [FAIL] Error: {e}")
        return False
    
    # Step 6: Verify workflow appears in list
    print("\n[STEP 6] Verifying workflow appears in workflow list...")
    try:
        response = requests.get(f"{BASE_URL}/api/workflows/")
        if response.status_code == 200:
            workflows = response.json()
            print(f"   [OK] Total workflows in system: {len(workflows)}")
            
            # Find our workflow
            our_workflow = next((w for w in workflows if w['id'] == workflow_id), None)
            if our_workflow:
                print(f"   [OK] Our workflow found in list!")
                print(f"   [OK] Position in list: {workflows.index(our_workflow) + 1}")
            else:
                print(f"   [FAIL] Our workflow NOT found in list")
                return False
        else:
            print(f"   [FAIL] Failed to get workflow list: {response.status_code}")
            return False
    except Exception as e:
        print(f"   [FAIL] Error: {e}")
        return False
    
    # Step 7: Display workflow details
    print("\n[STEP 7] Workflow Details:")
    print("   " + "-" * 60)
    print(f"   Workflow ID: {workflow_id}")
    print(f"   Name: {workflow['name']}")
    print(f"   Description: {workflow.get('description', 'N/A')}")
    print(f"   Project ID: {workflow.get('project_id')}")
    print(f"   Creator ID: {workflow.get('creator_id')}")
    print(f"   Status: Active" if workflow.get('is_active') else "   Status: Inactive")
    print(f"   Version: {workflow.get('version')}")
    print(f"   Nodes: {len(workflow.get('nodes', []))}")
    print(f"   Edges: {len(workflow.get('edges', []))}")
    
    if workflow.get('metadata'):
        print(f"   Metadata:")
        for key, value in workflow['metadata'].items():
            print(f"      - {key}: {value}")
    
    print("   " + "-" * 60)
    
    print("\n" + "=" * 70)
    print("[SUCCESS] End-to-End Workflow Test Completed Successfully!")
    print("=" * 70)
    print(f"\n[INFO] Workflow ID {workflow_id} is now available in the system")
    print(f"[INFO] You can view it in the UI at: http://localhost:5173/workflows")
    print(f"[INFO] Direct link: http://localhost:5173/workflows/{workflow_id}/edit")
    
    return True

if __name__ == "__main__":
    success = test_complete_workflow_cycle()
    exit(0 if success else 1)

# Made with Bob
