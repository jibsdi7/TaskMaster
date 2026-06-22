"""
Simulate what happens when frontend clicks Run button
"""
import requests
import time

BASE_URL = "http://localhost:8000"
WORKFLOW_ID = 9
TOKEN = "test-token-for-development"

print("="*80)
print("Simulating Frontend Run Button Click")
print("="*80)

print("\nSending POST request to execute workflow...")
print(f"URL: {BASE_URL}/api/workflows/{WORKFLOW_ID}/execute")
print(f"Headers: Authorization: Bearer {TOKEN}")
print(f"Body: {{}}")

start = time.time()
response = requests.post(
    f"{BASE_URL}/api/workflows/{WORKFLOW_ID}/execute",
    json={},
    headers={"Authorization": f"Bearer {TOKEN}"},
    timeout=120
)
duration = time.time() - start

print(f"\nResponse received in {duration:.2f} seconds")
print(f"Status Code: {response.status_code}")
print(f"\nResponse Body:")
print(response.text)

if response.status_code == 200:
    import json
    data = response.json()
    print(f"\nParsed Response:")
    print(json.dumps(data, indent=2))
    
    # Check if logs are included
    if 'logs' in data:
        print(f"\nLogs ({len(data['logs'])} entries):")
        for log in data['logs']:
            print(f"  [{log.get('level')}] {log.get('message')}")
    
    # Check for errors
    if 'error_message' in data and data['error_message']:
        print(f"\nERROR MESSAGE: {data['error_message']}")
    
    if 'result' in data and isinstance(data['result'], dict):
        if 'error' in data['result']:
            print(f"\nRESULT ERROR: {data['result']['error']}")

# Made with Bob
