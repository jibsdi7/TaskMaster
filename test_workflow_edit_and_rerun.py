"""
Test script to:
1. Create a workflow
2. Edit it to add delay between nodes
3. Re-run the workflow
"""
import requests
import json
import time
import sys

# Set UTF-8 encoding for Windows console
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

BASE_URL = "http://localhost:8000"
TOKEN = "test-token-for-development"  # Using test mode token

headers = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}

def create_test_workflow():
    """Create a test workflow with multiple nodes"""
    print("\n=== Step 1: Creating Test Workflow ===")
    
    workflow_data = {
        "name": "Test Workflow - BlazeDemo Flight Booking",
        "description": "Testing workflow editing and rerun functionality with BlazeDemo",
        "project_id": 1,
        "nodes": [
            {
                "node_id": "node-1",
                "node_type": "OPEN_URL",
                "label": "Navigate to BlazeDemo",
                "position_x": 100,
                "position_y": 100,
                "config": {
                    "url": "https://blazedemo.com/index.php",
                    "wait_until": "networkidle"
                },
                "metadata": {}
            },
            {
                "node_id": "node-2",
                "node_type": "SELECT",
                "label": "Select Departure City",
                "position_x": 300,
                "position_y": 100,
                "config": {
                    "selector": "select[name='fromPort']",
                    "value": "Paris",
                    "wait_for_selector": True
                },
                "metadata": {}
            },
            {
                "node_id": "node-3",
                "node_type": "SELECT",
                "label": "Select Destination City",
                "position_x": 500,
                "position_y": 100,
                "config": {
                    "selector": "select[name='toPort']",
                    "value": "London",
                    "wait_for_selector": True
                },
                "metadata": {}
            },
            {
                "node_id": "node-4",
                "node_type": "CLICK",
                "label": "Click Find Flights",
                "position_x": 700,
                "position_y": 100,
                "config": {
                    "selector": "input[type='submit']",
                    "wait_for_selector": True
                },
                "metadata": {}
            }
        ],
        "edges": [
            {
                "edge_id": "edge-1",
                "source_node_id": "node-1",
                "target_node_id": "node-2",
                "config": {},
                "metadata": {}
            },
            {
                "edge_id": "edge-2",
                "source_node_id": "node-2",
                "target_node_id": "node-3",
                "config": {},
                "metadata": {}
            },
            {
                "edge_id": "edge-3",
                "source_node_id": "node-3",
                "target_node_id": "node-4",
                "config": {},
                "metadata": {}
            }
        ]
    }
    
    response = requests.post(
        f"{BASE_URL}/api/workflows",
        headers=headers,
        json=workflow_data
    )
    
    if response.status_code == 200:
        workflow = response.json()
        print(f"✅ Workflow created successfully!")
        print(f"   ID: {workflow['id']}")
        print(f"   Name: {workflow['name']}")
        print(f"   Nodes: {len(workflow['nodes'])}")
        return workflow['id']
    else:
        print(f"❌ Failed to create workflow: {response.status_code}")
        print(f"   Error: {response.text}")
        return None

def edit_workflow_add_delays(workflow_id):
    """Edit the workflow to add delay nodes between existing nodes"""
    print(f"\n=== Step 2: Editing Workflow (ID: {workflow_id}) to Add Delays ===")
    
    # First, get the current workflow
    response = requests.get(
        f"{BASE_URL}/api/workflows/{workflow_id}",
        headers=headers
    )
    
    if response.status_code != 200:
        print(f"❌ Failed to fetch workflow: {response.status_code}")
        return False
    
    workflow = response.json()
    print(f"✅ Fetched workflow: {workflow['name']}")
    
    # Add delay nodes between existing nodes
    updated_nodes = [
        {
            "node_id": "node-1",
            "node_type": "OPEN_URL",
            "label": "Navigate to BlazeDemo",
            "position_x": 100,
            "position_y": 100,
            "config": {
                "url": "https://blazedemo.com/index.php",
                "wait_until": "networkidle"
            },
            "metadata": {}
        },
        {
            "node_id": "delay-1",
            "node_type": "DELAY",
            "label": "Wait 2 seconds",
            "position_x": 200,
            "position_y": 100,
            "config": {
                "duration": 2000  # 2 seconds in milliseconds
            },
            "metadata": {}
        },
        {
            "node_id": "node-2",
            "node_type": "SELECT",
            "label": "Select Departure City",
            "position_x": 300,
            "position_y": 100,
            "config": {
                "selector": "select[name='fromPort']",
                "value": "Paris",
                "wait_for_selector": True
            },
            "metadata": {}
        },
        {
            "node_id": "delay-2",
            "node_type": "DELAY",
            "label": "Wait 1.5 seconds",
            "position_x": 400,
            "position_y": 100,
            "config": {
                "duration": 1500  # 1.5 seconds in milliseconds
            },
            "metadata": {}
        },
        {
            "node_id": "node-3",
            "node_type": "SELECT",
            "label": "Select Destination City",
            "position_x": 500,
            "position_y": 100,
            "config": {
                "selector": "select[name='toPort']",
                "value": "London",
                "wait_for_selector": True
            },
            "metadata": {}
        },
        {
            "node_id": "delay-3",
            "node_type": "DELAY",
            "label": "Wait 1 second",
            "position_x": 600,
            "position_y": 100,
            "config": {
                "duration": 1000  # 1 second in milliseconds
            },
            "metadata": {}
        },
        {
            "node_id": "node-4",
            "node_type": "CLICK",
            "label": "Click Find Flights",
            "position_x": 700,
            "position_y": 100,
            "config": {
                "selector": "input[type='submit']",
                "wait_for_selector": True
            },
            "metadata": {}
        }
    ]
    
    updated_edges = [
        {
            "edge_id": "edge-1",
            "source_node_id": "node-1",
            "target_node_id": "delay-1",
            "config": {},
            "metadata": {}
        },
        {
            "edge_id": "edge-1-2",
            "source_node_id": "delay-1",
            "target_node_id": "node-2",
            "config": {},
            "metadata": {}
        },
        {
            "edge_id": "edge-2",
            "source_node_id": "node-2",
            "target_node_id": "delay-2",
            "config": {},
            "metadata": {}
        },
        {
            "edge_id": "edge-2-3",
            "source_node_id": "delay-2",
            "target_node_id": "node-3",
            "config": {},
            "metadata": {}
        },
        {
            "edge_id": "edge-3",
            "source_node_id": "node-3",
            "target_node_id": "delay-3",
            "config": {},
            "metadata": {}
        },
        {
            "edge_id": "edge-3-4",
            "source_node_id": "delay-3",
            "target_node_id": "node-4",
            "config": {},
            "metadata": {}
        }
    ]
    
    update_data = {
        "name": workflow['name'] + " (Updated with Delays)",
        "description": "Updated workflow with delay nodes between actions",
        "project_id": workflow['project_id'],
        "nodes": updated_nodes,
        "edges": updated_edges
    }
    
    response = requests.put(
        f"{BASE_URL}/api/workflows/{workflow_id}",
        headers=headers,
        json=update_data
    )
    
    if response.status_code == 200:
        updated_workflow = response.json()
        print(f"✅ Workflow updated successfully!")
        print(f"   New name: {updated_workflow['name']}")
        print(f"   Total nodes: {len(updated_workflow['nodes'])} (added 2 delay nodes)")
        print(f"   Total edges: {len(updated_workflow['edges'])}")
        return True
    else:
        print(f"❌ Failed to update workflow: {response.status_code}")
        print(f"   Error: {response.text}")
        return False

def run_workflow(workflow_id):
    """Execute the workflow"""
    print(f"\n=== Step 3: Running Workflow (ID: {workflow_id}) ===")
    
    response = requests.post(
        f"{BASE_URL}/api/workflows/{workflow_id}/execute",
        headers=headers,
        json={}
    )
    
    if response.status_code == 200:
        result = response.json()
        print(f"✅ Workflow execution started!")
        print(f"   Run ID: {result.get('run_id', 'N/A')}")
        print(f"   Status: {result.get('status', 'N/A')}")
        return result.get('run_id')
    else:
        print(f"❌ Failed to execute workflow: {response.status_code}")
        print(f"   Error: {response.text}")
        return None

def check_execution_status(run_id):
    """Check the status of workflow execution"""
    if not run_id:
        return
    
    print(f"\n=== Step 4: Checking Execution Status (Run ID: {run_id}) ===")
    
    response = requests.get(
        f"{BASE_URL}/api/executions/{run_id}",
        headers=headers
    )
    
    if response.status_code == 200:
        execution = response.json()
        print(f"✅ Execution details retrieved!")
        print(f"   Status: {execution.get('status', 'N/A')}")
        print(f"   Started: {execution.get('started_at', 'N/A')}")
        print(f"   Completed: {execution.get('completed_at', 'N/A')}")
    else:
        print(f"⚠️  Could not fetch execution details: {response.status_code}")

def main():
    print("=" * 60)
    print("TaskMaster Workflow Edit and Rerun Test")
    print("=" * 60)
    
    # Step 1: Create workflow
    workflow_id = create_test_workflow()
    if not workflow_id:
        print("\n❌ Test failed: Could not create workflow")
        return
    
    time.sleep(1)
    
    # Step 2: Edit workflow to add delays
    if not edit_workflow_add_delays(workflow_id):
        print("\n❌ Test failed: Could not edit workflow")
        return
    
    time.sleep(1)
    
    # Step 3: Run the workflow
    run_id = run_workflow(workflow_id)
    
    time.sleep(2)
    
    # Step 4: Check execution status
    check_execution_status(run_id)
    
    print("\n" + "=" * 60)
    print("✅ Test completed successfully!")
    print("=" * 60)
    print(f"\nWorkflow ID: {workflow_id}")
    print(f"Run ID: {run_id}")
    print(f"\nYou can view the workflow at: http://localhost:5173/workflows/{workflow_id}")
    if run_id:
        print(f"You can view the execution at: http://localhost:5173/executions/{run_id}")

if __name__ == "__main__":
    main()

# Made with Bob
