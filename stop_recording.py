import requests

response = requests.post(
    "http://localhost:8000/api/recorder/stop",
    headers={
        "Authorization": "Bearer test-token-for-development",
        "Content-Type": "application/json"
    },
    json={"save_as_workflow": False}
)

print(f"Status: {response.status_code}")
print(f"Response: {response.json()}")

# Made with Bob
