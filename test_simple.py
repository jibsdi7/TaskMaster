"""Simple test for workflow saving"""
import requests

BASE_URL = "http://localhost:8000"

print("Testing workflow save...")

# Register
print("\n1. Register user...")
r = requests.post(f"{BASE_URL}/api/auth/register", json={
    "email": "test@test.com",
    "username": "test",
    "password": "test12345",
    "full_name": "Test",
    "role": "developer"
})
print(f"Register: {r.status_code}")
if r.status_code not in [200, 201, 400]:
    print(f"Error: {r.text}")
    exit(1)

# Login
print("\n2. Login...")
r = requests.post(f"{BASE_URL}/api/auth/login", data={
    "username": "test",
    "password": "test12345"
})
print(f"Login: {r.status_code}")
if r.status_code != 200:
    print(f"Error: {r.text}")
    exit(1)

token = r.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}
print(f"Token: {token[:20]}...")

# Check if projects endpoint exists
print("\n3. Checking projects endpoint...")
r = requests.get(f"{BASE_URL}/api/projects", headers=headers)
print(f"Projects GET: {r.status_code}")

# If no projects endpoint, we need to check the schema
if r.status_code == 404:
    print("Projects endpoint not found, checking workflows directly...")
    
# Start recording
print("\n4. Start recording...")
r = requests.post(f"{BASE_URL}/api/recorder/start", 
    json={"url": "https://example.com", "language": "python"},
    headers=headers
)
print(f"Start: {r.status_code}")
if r.status_code != 200:
    print(f"Error: {r.text}")
    exit(1)

# Stop recording (without saving as workflow first)
print("\n5. Stop recording...")
r = requests.post(f"{BASE_URL}/api/recorder/stop", headers=headers)
print(f"Stop: {r.status_code}")
if r.status_code == 200:
    result = r.json()
    print(f"Actions: {result.get('actions_count', 0)}")
    print(f"Workflow ID: {result.get('workflow_id')}")
else:
    print(f"Error: {r.text}")

print("\nDone!")

# Made with Bob
