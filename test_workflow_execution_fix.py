import requests
import time

print("Waiting for server to reload...")
time.sleep(3)

print("\nTesting workflow execution with thread pool fix...")
r = requests.post(
    'http://localhost:8000/api/workflows/9/execute',
    headers={
        'Authorization': 'Bearer test-token',
        'Content-Type': 'application/json'
    },
    json={'url': 'https://blazedemo.com/index.php'}
)

print(f'Status Code: {r.status_code}')

if r.status_code == 200:
    data = r.json()
    print(f'Run ID: {data.get("run_id")}')
    print(f'Status: {data.get("status")}')
    print(f'Duration: {data.get("duration_seconds")}s')
    print(f'Logs Count: {data.get("logs_count")} entries')
    
    # Show first few logs
    logs = data.get("logs", [])
    if logs:
        print("\nFirst 3 logs:")
        for log in logs[:3]:
            print(f'  [{log.get("level")}] {log.get("message")[:100]}')
    
    print("\n✅ SUCCESS! Browser should have launched and executed the workflow.")
else:
    print(f'Error: {r.text}')

# Made with Bob
