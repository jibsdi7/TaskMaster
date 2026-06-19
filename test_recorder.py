"""
Test script for recorder API
"""
import requests
import json

# Test configuration
BASE_URL = "http://localhost:8000"
TEST_TOKEN = "test-token-for-development"
TEST_URL = "https://example.com"

def test_start_recording():
    """Test starting a recording session"""
    print("=" * 60)
    print("Testing Recorder API - Start Recording")
    print("=" * 60)
    
    url = f"{BASE_URL}/api/recorder/start"
    headers = {
        "Authorization": f"Bearer {TEST_TOKEN}",
        "Content-Type": "application/json"
    }
    data = {
        "url": TEST_URL,
        "language": "python"
    }
    
    print(f"\n1. Sending POST request to: {url}")
    print(f"   Headers: {json.dumps(headers, indent=2)}")
    print(f"   Body: {json.dumps(data, indent=2)}")
    
    try:
        response = requests.post(url, headers=headers, json=data)
        
        print(f"\n2. Response Status: {response.status_code}")
        print(f"   Response Body: {json.dumps(response.json(), indent=2)}")
        
        if response.status_code == 200:
            print("\n✅ SUCCESS: Recording started successfully!")
            return response.json()
        else:
            print(f"\n❌ FAILED: {response.json().get('detail', 'Unknown error')}")
            return None
            
    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        return None

def test_get_status():
    """Test getting recording status"""
    print("\n" + "=" * 60)
    print("Testing Recorder API - Get Status")
    print("=" * 60)
    
    url = f"{BASE_URL}/api/recorder/status"
    headers = {
        "Authorization": f"Bearer {TEST_TOKEN}"
    }
    
    print(f"\n1. Sending GET request to: {url}")
    
    try:
        response = requests.get(url, headers=headers)
        
        print(f"\n2. Response Status: {response.status_code}")
        print(f"   Response Body: {json.dumps(response.json(), indent=2)}")
        
        if response.status_code == 200:
            print("\n✅ SUCCESS: Status retrieved successfully!")
            return response.json()
        else:
            print(f"\n❌ FAILED: {response.json().get('detail', 'Unknown error')}")
            return None
            
    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        return None

def test_stop_recording():
    """Test stopping a recording session"""
    print("\n" + "=" * 60)
    print("Testing Recorder API - Stop Recording")
    print("=" * 60)
    
    url = f"{BASE_URL}/api/recorder/stop"
    headers = {
        "Authorization": f"Bearer {TEST_TOKEN}",
        "Content-Type": "application/json"
    }
    data = {
        "save_as_workflow": False
    }
    
    print(f"\n1. Sending POST request to: {url}")
    
    try:
        response = requests.post(url, headers=headers, json=data)
        
        print(f"\n2. Response Status: {response.status_code}")
        print(f"   Response Body: {json.dumps(response.json(), indent=2)}")
        
        if response.status_code == 200:
            print("\n✅ SUCCESS: Recording stopped successfully!")
            return response.json()
        else:
            print(f"\n❌ FAILED: {response.json().get('detail', 'Unknown error')}")
            return None
            
    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        return None

if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("TaskMaster Recorder API Test Suite")
    print("=" * 60)
    print(f"Base URL: {BASE_URL}")
    print(f"Test Token: {TEST_TOKEN}")
    print(f"Test URL: {TEST_URL}")
    
    # Test 1: Start recording
    result = test_start_recording()
    
    if result:
        # Test 2: Get status
        input("\n\nPress Enter to check recording status...")
        test_get_status()
        
        # Test 3: Stop recording
        input("\n\nPress Enter to stop recording...")
        test_stop_recording()
    
    print("\n" + "=" * 60)
    print("Test Suite Complete")
    print("=" * 60)

# Made with Bob
