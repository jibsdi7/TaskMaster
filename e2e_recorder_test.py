"""
End-to-End Recorder Test - Simplified
Tests: Start Recording → Perform Actions → Stop Recording → View Results
"""
import requests
import json

BASE_URL = "http://localhost:8000"
TOKEN = "test-token-for-development"

print("=" * 70)
print("  TaskMaster Recorder End-to-End Test")
print("=" * 70)
print(f"\nBackend: {BASE_URL}")
print(f"Token: {TOKEN}\n")

# Step 1: Start Recording
print("STEP 1: Starting recorder...")
print("-" * 70)

response = requests.post(
    f"{BASE_URL}/api/recorder/start",
    headers={
        "Authorization": f"Bearer {TOKEN}",
        "Content-Type": "application/json"
    },
    json={"url": "https://www.google.com"}
)

print(f"Status: {response.status_code}")
data = response.json()
print(f"Response:\n{json.dumps(data, indent=2)}")

if response.status_code == 200:
    print("\n✓ SUCCESS: Recording started!")
    print(f"  Session ID: {data.get('session_id')}")
    print(f"  URL: {data.get('url')}")
    print(f"  Message: {data.get('message')}")
    
    print("\n" + "=" * 70)
    print("  PLAYWRIGHT BROWSER SHOULD BE OPEN")
    print("=" * 70)
    print("\nPlease perform these actions in the Playwright browser:")
    print("  1. Wait for Google.com to load")
    print("  2. Click in the search box")
    print("  3. Type: Fifa world cup")
    print("  4. Press Enter or click 'Google Search' button")
    print("  5. Wait 2-3 seconds for results to load")
    
    input("\nPress Enter when you've completed the actions...")
    
    # Step 2: Stop Recording
    print("\n" + "=" * 70)
    print("STEP 2: Stopping recorder...")
    print("-" * 70)
    
    stop_response = requests.post(
        f"{BASE_URL}/api/recorder/stop",
        headers={
            "Authorization": f"Bearer {TOKEN}",
            "Content-Type": "application/json"
        },
        json={"save_as_workflow": False}
    )
    
    print(f"Status: {stop_response.status_code}")
    stop_data = stop_response.json()
    
    if stop_response.status_code == 200:
        actions_count = stop_data.get('actions_count', 0)
        actions = stop_data.get('actions', [])
        
        print(f"\n✓ SUCCESS: Recording stopped!")
        print(f"  Actions captured: {actions_count}")
        
        if actions:
            print("\n" + "=" * 70)
            print("  CAPTURED ACTIONS")
            print("=" * 70)
            
            for i, action in enumerate(actions, 1):
                print(f"\nAction {i}:")
                print(f"  Type: {action.get('type')}")
                
                selector = action.get('selector')
                if selector:
                    print(f"  Selector: {selector}")
                
                value = action.get('value')
                if value:
                    print(f"  Value: {value}")
                
                url = action.get('url')
                if url:
                    print(f"  URL: {url}")
                
                timestamp = action.get('timestamp')
                if timestamp:
                    print(f"  Timestamp: {timestamp}")
            
            # Step 3: Analyze Results
            print("\n" + "=" * 70)
            print("  TEST RESULTS")
            print("=" * 70)
            
            # Check for expected actions
            action_types = [a.get('type') for a in actions]
            
            print("\nExpected Actions:")
            print("  ✓ OPEN_URL (Google.com)")
            if 'OPEN_URL' in action_types:
                print("    FOUND")
            else:
                print("    MISSING")
            
            print("  ✓ TYPE (search query)")
            if 'TYPE' in action_types:
                print("    FOUND")
                # Check if 'Fifa world cup' was typed
                for action in actions:
                    if action.get('type') == 'TYPE' and action.get('value'):
                        print(f"    Value: {action.get('value')}")
            else:
                print("    MISSING")
            
            print("  ✓ CLICK (search button)")
            if 'CLICK' in action_types:
                print("    FOUND")
            else:
                print("    MISSING")
            
            # Final verdict
            print("\n" + "=" * 70)
            if len(actions) >= 3:
                print("  ✓✓✓ TEST PASSED ✓✓✓")
                print(f"  Successfully captured {len(actions)} actions!")
            elif len(actions) > 0:
                print("  ⚠ PARTIAL SUCCESS")
                print(f"  Captured {len(actions)} actions (expected 3+)")
            else:
                print("  ✗ TEST FAILED")
                print("  No actions captured")
            print("=" * 70)
            
        else:
            print("\n✗ WARNING: No actions captured")
            print("  Make sure you performed actions in the browser")
    else:
        print(f"\n✗ FAILED: {stop_data.get('detail')}")
else:
    print(f"\n✗ FAILED: {data.get('detail')}")

print("\n" + "=" * 70)
print("  END OF TEST")
print("=" * 70)

# Made with Bob
