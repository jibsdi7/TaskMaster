"""
Test script to verify workflow saving functionality
"""
import requests
import json

BASE_URL = "http://localhost:8000"

def test_workflow_save():
    print("=" * 60)
    print("Testing Workflow Save Functionality")
    print("=" * 60)
    
    # Step 1: Register a test user
    print("\n1. Registering test user...")
    register_data = {
        "email": "test@example.com",
        "username": "testuser",
        "password": "testpass123",
        "full_name": "Test User",
        "role": "developer"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/api/auth/register", json=register_data)
        if response.status_code == 201:
            print("✅ User registered successfully")
            user = response.json()
            print(f"   User ID: {user['id']}, Username: {user['username']}")
        elif response.status_code == 400:
            print("⚠️  User already exists, proceeding with login...")
        else:
            print(f"❌ Registration failed: {response.text}")
            return
    except Exception as e:
        print(f"❌ Error during registration: {e}")
        return
    
    # Step 2: Login
    print("\n2. Logging in...")
    login_data = {
        "username": "testuser",
        "password": "testpass123"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            data=login_data
        )
        if response.status_code == 200:
            print("✅ Login successful")
            tokens = response.json()
            access_token = tokens["access_token"]
            headers = {"Authorization": f"Bearer {access_token}"}
            print(f"   Access token: {access_token[:20]}...")
        else:
            print(f"❌ Login failed: {response.text}")
            return
    except Exception as e:
        print(f"❌ Error during login: {e}")
        return
    
    # Step 3: Create a project
    print("\n3. Creating a project...")
    project_data = {
        "name": "Test Project",
        "description": "Project for testing workflow save",
        "is_active": True
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/projects",
            json=project_data,
            headers=headers
        )
        if response.status_code == 201:
            print("✅ Project created successfully")
            project = response.json()
            project_id = project["id"]
            print(f"   Project ID: {project_id}, Name: {project['name']}")
        else:
            print(f"⚠️  Project creation response: {response.status_code}")
            print(f"   Response: {response.text}")
            # Try to get existing projects
            response = requests.get(f"{BASE_URL}/api/projects", headers=headers)
            if response.status_code == 200:
                projects = response.json()
                if projects:
                    project_id = projects[0]["id"]
                    print(f"   Using existing project ID: {project_id}")
                else:
                    print("❌ No projects available")
                    return
            else:
                print("❌ Could not get projects")
                return
    except Exception as e:
        print(f"❌ Error creating project: {e}")
        return
    
    # Step 4: Start recording
    print("\n4. Starting recording session...")
    record_data = {
        "url": "https://example.com",
        "language": "python"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/recorder/start",
            json=record_data,
            headers=headers
        )
        if response.status_code == 200:
            print("✅ Recording started")
            session = response.json()
            print(f"   Session ID: {session['session_id']}")
        else:
            print(f"❌ Recording start failed: {response.text}")
            return
    except Exception as e:
        print(f"❌ Error starting recording: {e}")
        return
    
    # Step 5: Stop recording and save workflow
    print("\n5. Stopping recording and saving workflow...")
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/recorder/stop",
            params={
                "save_as_workflow": True,
                "workflow_name": "Test Workflow",
                "project_id": project_id
            },
            headers=headers
        )
        if response.status_code == 200:
            print("✅ Recording stopped and workflow saved")
            result = response.json()
            print(f"   Actions count: {result['actions_count']}")
            print(f"   Workflow ID: {result.get('workflow_id')}")
        else:
            print(f"❌ Stop recording failed: {response.text}")
            return
    except Exception as e:
        print(f"❌ Error stopping recording: {e}")
        return
    
    # Step 6: List workflows
    print("\n6. Listing workflows...")
    try:
        response = requests.get(
            f"{BASE_URL}/api/workflows",
            headers=headers
        )
        if response.status_code == 200:
            workflows = response.json()
            print(f"✅ Found {len(workflows)} workflow(s)")
            for wf in workflows:
                print(f"   - ID: {wf['id']}, Name: {wf['name']}")
        else:
            print(f"❌ List workflows failed: {response.text}")
    except Exception as e:
        print(f"❌ Error listing workflows: {e}")
    
    print("\n" + "=" * 60)
    print("Test completed!")
    print("=" * 60)

if __name__ == "__main__":
    test_workflow_save()

# Made with Bob
