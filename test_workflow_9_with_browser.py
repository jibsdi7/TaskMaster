"""
Test workflow 9 execution with visible browser and detailed logging
"""
import sys
sys.path.insert(0, 'backend')

from app.services.workflow_executor_sync import WorkflowExecutorSync
from app.db.database import SessionLocal
from app.db.models import Workflow
import uuid
import json

print("=" * 80)
print("Testing Workflow 9 - Direct Executor Test with Visible Browser")
print("=" * 80)

# Get workflow from database
db = SessionLocal()
try:
    workflow = db.query(Workflow).filter(Workflow.id == 9).first()
    if not workflow:
        print("[ERROR] Workflow 9 not found!")
        exit(1)
    
    print(f"\n[OK] Loaded workflow: {workflow.name}")
    print(f"[OK] Nodes: {len(workflow.nodes)}")
    print(f"[OK] Edges: {len(workflow.edges)}")
    
    # Prepare nodes and edges
    nodes_data = []
    for node in workflow.nodes:
        node_dict = {
            "node_id": node.node_id,
            "node_type": node.node_type.value,
            "label": node.label,
            "config": node.config or {},
            "metadata": node.meta_data or {}
        }
        nodes_data.append(node_dict)
        print(f"\n  Node: {node.node_id}")
        print(f"    Type: {node.node_type.value}")
        print(f"    Label: {node.label}")
        print(f"    Config: {json.dumps(node.config, indent=6)}")
    
    edges_data = []
    for edge in workflow.edges:
        edge_dict = {
            "edge_id": edge.edge_id,
            "source_node_id": edge.source_node_id,
            "target_node_id": edge.target_node_id
        }
        edges_data.append(edge_dict)
    
    print(f"\n[INFO] Edges: {len(edges_data)}")
    for edge in edges_data:
        print(f"  {edge['source_node_id']} -> {edge['target_node_id']}")
    
finally:
    db.close()

# Execute workflow with visible browser
print("\n" + "=" * 80)
print("Starting Execution - Browser will open")
print("=" * 80)

run_id = str(uuid.uuid4())
print(f"\n[INFO] Run ID: {run_id}")
print("[INFO] Initializing executor...")

executor = WorkflowExecutorSync()

print("[INFO] Executing workflow...")
print("[INFO] Watch the browser window for automation!")
print()

try:
    result = executor.execute(
        nodes=nodes_data,
        edges=edges_data,
        inputs={},
        run_id=run_id
    )
    
    print("\n" + "=" * 80)
    print("Execution Complete!")
    print("=" * 80)
    
    print(f"\n[OK] Status: {result.get('status')}")
    print(f"[OK] Duration: {result.get('duration_seconds', 0):.2f} seconds")
    print(f"[OK] Logs: {len(result.get('logs', []))} entries")
    print(f"[OK] Screenshots: {len(result.get('screenshots', []))} captured")
    
    # Display logs
    print("\n" + "=" * 80)
    print("Execution Logs")
    print("=" * 80)
    for log in result.get('logs', []):
        level = log.get('level', 'INFO')
        message = log.get('message', '')
        node_id = log.get('node_id', 'N/A')
        print(f"\n[{level}] {message}")
        if node_id != 'N/A':
            print(f"  Node: {node_id}")
    
    # Display screenshots
    if result.get('screenshots'):
        print("\n" + "=" * 80)
        print("Screenshots Captured")
        print("=" * 80)
        for screenshot in result.get('screenshots', []):
            print(f"\n  Node: {screenshot.get('node_id')}")
            print(f"  Path: {screenshot.get('path')}")
    
    # Display variables
    if result.get('variables'):
        print("\n" + "=" * 80)
        print("Variables")
        print("=" * 80)
        for key, value in result.get('variables', {}).items():
            print(f"  {key}: {value}")
    
except Exception as e:
    print(f"\n[ERROR] Execution failed: {str(e)}")
    import traceback
    print("\nTraceback:")
    print(traceback.format_exc())

print("\n" + "=" * 80)
print("Test Complete!")
print("=" * 80)

# Made with Bob
