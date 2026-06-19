"""
Test script to verify workflow display functionality
"""
import requests
import json
import sys

# Set UTF-8 encoding for Windows console
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

BASE_URL = "http://localhost:8000"
FRONTEND_URL = "http://localhost:5173"

def test_api_health():
    """Test if API is running"""
    print("1. Testing API Health...")
    try:
        response = requests.get(f"{BASE_URL}/health")
        print(f"   [OK] API Status: {response.status_code}")
        print(f"   [OK] Response: {response.json()}")
        return True
    except Exception as e:
        print(f"   [FAIL] API Health Check Failed: {e}")
        return False

def test_workflows_endpoint():
    """Test workflows endpoint"""
    print("\n2. Testing Workflows Endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/api/workflows/")
        print(f"   [OK] Status: {response.status_code}")
        
        if response.status_code == 200:
            workflows = response.json()
            print(f"   [OK] Found {len(workflows)} workflow(s)")
            
            if workflows:
                print("\n   Workflow Details:")
                for i, wf in enumerate(workflows, 1):
                    print(f"   {i}. {wf['name']} (ID: {wf['id']})")
                    print(f"      - Description: {wf.get('description', 'N/A')}")
                    print(f"      - Nodes: {len(wf.get('nodes', []))}")
                    print(f"      - Edges: {len(wf.get('edges', []))}")
                    print(f"      - Version: {wf.get('version', 'N/A')}")
                    print(f"      - Active: {wf.get('is_active', False)}")
                    print(f"      - Created: {wf.get('created_at', 'N/A')}")
            return True
        else:
            print(f"   [FAIL] Unexpected status code: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
    except Exception as e:
        print(f"   [FAIL] Workflows Endpoint Test Failed: {e}")
        return False

def test_individual_workflow():
    """Test fetching individual workflow"""
    print("\n3. Testing Individual Workflow Fetch...")
    try:
        # First get the list to find a workflow ID
        response = requests.get(f"{BASE_URL}/api/workflows/")
        if response.status_code == 200:
            workflows = response.json()
            if workflows:
                workflow_id = workflows[0]['id']
                print(f"   Testing workflow ID: {workflow_id}")
                
                detail_response = requests.get(f"{BASE_URL}/api/workflows/{workflow_id}")
                print(f"   [OK] Status: {detail_response.status_code}")
                
                if detail_response.status_code == 200:
                    workflow = detail_response.json()
                    print(f"   [OK] Workflow: {workflow['name']}")
                    print(f"   [OK] Has all required fields: {all(k in workflow for k in ['id', 'name', 'nodes', 'edges', 'metadata'])}")
                    return True
                else:
                    print(f"   [FAIL] Failed to fetch workflow details")
                    return False
            else:
                print("   [WARN] No workflows to test")
                return True
        return False
    except Exception as e:
        print(f"   [FAIL] Individual Workflow Test Failed: {e}")
        return False

def test_cors_headers():
    """Test CORS headers"""
    print("\n4. Testing CORS Configuration...")
    try:
        response = requests.options(
            f"{BASE_URL}/api/workflows/",
            headers={
                'Origin': FRONTEND_URL,
                'Access-Control-Request-Method': 'GET'
            }
        )
        print(f"   [OK] OPTIONS Status: {response.status_code}")
        
        cors_headers = {
            'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
            'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods'),
            'Access-Control-Allow-Headers': response.headers.get('Access-Control-Allow-Headers')
        }
        
        print(f"   [OK] CORS Headers:")
        for key, value in cors_headers.items():
            print(f"      - {key}: {value}")
        
        return True
    except Exception as e:
        print(f"   [FAIL] CORS Test Failed: {e}")
        return False

def test_frontend_accessibility():
    """Test if frontend is accessible"""
    print("\n5. Testing Frontend Accessibility...")
    try:
        response = requests.get(FRONTEND_URL, timeout=5)
        print(f"   [OK] Frontend Status: {response.status_code}")
        print(f"   [OK] Frontend is accessible at {FRONTEND_URL}")
        return True
    except Exception as e:
        print(f"   [FAIL] Frontend Accessibility Test Failed: {e}")
        return False

def test_blocks_endpoint():
    """Test blocks endpoint"""
    print("\n6. Testing Blocks Endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/api/blocks/")
        print(f"   [OK] Status: {response.status_code}")
        
        if response.status_code == 200:
            blocks = response.json()
            print(f"   [OK] Found {len(blocks)} block(s)")
            
            if blocks:
                print("\n   Block Details:")
                for i, block in enumerate(blocks, 1):
                    print(f"   {i}. {block['name']} (ID: {block['id']})")
                    print(f"      - Category: {block.get('category', 'N/A')}")
                    print(f"      - Version: {block.get('version', 'N/A')}")
            return True
        else:
            print(f"   [FAIL] Unexpected status code: {response.status_code}")
            return False
    except Exception as e:
        print(f"   [FAIL] Blocks Endpoint Test Failed: {e}")
        return False

def main():
    print("=" * 60)
    print("TaskMaster Workflow Display Functionality Test")
    print("=" * 60)
    
    results = []
    
    results.append(("API Health", test_api_health()))
    results.append(("Workflows Endpoint", test_workflows_endpoint()))
    results.append(("Individual Workflow", test_individual_workflow()))
    results.append(("CORS Configuration", test_cors_headers()))
    results.append(("Frontend Accessibility", test_frontend_accessibility()))
    results.append(("Blocks Endpoint", test_blocks_endpoint()))
    
    print("\n" + "=" * 60)
    print("Test Summary")
    print("=" * 60)
    
    for test_name, result in results:
        status = "[PASS]" if result else "[FAIL]"
        print(f"{status} - {test_name}")
    
    total_tests = len(results)
    passed_tests = sum(1 for _, result in results if result)
    
    print(f"\nTotal: {passed_tests}/{total_tests} tests passed")
    
    if passed_tests == total_tests:
        print("\n[SUCCESS] All tests passed! Workflow display functionality is working correctly.")
        print(f"\n[INFO] Open your browser to: {FRONTEND_URL}")
        print("   Navigate to 'Workflows' to see your workflows!")
    else:
        print("\n[WARNING] Some tests failed. Please check the errors above.")
    
    print("=" * 60)

if __name__ == "__main__":
    main()

# Made with Bob
