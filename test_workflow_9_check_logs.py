"""
Check what logs are being returned from workflow execution
"""
import requests
import json

# API endpoint
BASE_URL = "http://localhost:8000"
WORKFLOW_ID = 9
TOKEN = "test-token-for-development"

def test_workflow_logs():
    print("="*80)
    print("Checking Workflow 9 Execution Logs")
    print("="*80)
    
    # Execute workflow
    print("\nExecuting workflow...")
    response = requests.post(
        f"{BASE_URL}/api/workflows/{WORKFLOW_ID}/execute",
        json={},
        headers={"Authorization": f"Bearer {TOKEN}"},
        timeout=120
    )
    
    if response.status_code == 200:
        result = response.json()
        print(f"\nExecution Result:")
        print(json.dumps(result, indent=2))
        
        # Check if there's an error in the result
        if 'result' in result and isinstance(result['result'], dict):
            if 'error' in result['result']:
                print(f"\n[ERROR FOUND IN RESULT]")
                print(f"Error: {result['result']['error']}")
                if 'traceback' in result['result']:
                    print(f"\nTraceback:\n{result['result']['traceback']}")
    else:
        print(f"[FAIL] Status code: {response.status_code}")
        print(response.text)

if __name__ == "__main__":
    test_workflow_logs()

# Made with Bob
