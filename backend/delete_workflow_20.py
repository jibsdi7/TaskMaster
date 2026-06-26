import sys
import os

# Set environment variable to use SQLite
os.environ['DATABASE_URL'] = 'sqlite:///./taskmaster.db'

sys.path.insert(0, os.path.dirname(__file__))

from app.db.database import SessionLocal
from app.db.models import Workflow, WorkflowNode, WorkflowEdge, WorkflowRun, WorkflowLog

db = SessionLocal()

try:
    # Find workflow 20
    wf = db.query(Workflow).filter(Workflow.id == 20).first()
    
    if not wf:
        print("Workflow 20 not found!")
    else:
        print(f"Deleting workflow: {wf.name}")
        
        # Delete related records manually (cascade delete)
        # 1. Delete workflow logs
        logs_deleted = db.query(WorkflowLog).filter(WorkflowLog.workflow_id == 20).delete()
        print(f"  - Deleted {logs_deleted} workflow logs")
        
        # 2. Delete workflow runs
        runs_deleted = db.query(WorkflowRun).filter(WorkflowRun.workflow_id == 20).delete()
        print(f"  - Deleted {runs_deleted} workflow runs")
        
        # 3. Delete workflow edges
        edges_deleted = db.query(WorkflowEdge).filter(WorkflowEdge.workflow_id == 20).delete()
        print(f"  - Deleted {edges_deleted} workflow edges")
        
        # 4. Delete workflow nodes
        nodes_deleted = db.query(WorkflowNode).filter(WorkflowNode.workflow_id == 20).delete()
        print(f"  - Deleted {nodes_deleted} workflow nodes")
        
        # 5. Delete workflow
        db.delete(wf)
        print(f"  - Deleted workflow")
        
        # Commit changes
        db.commit()
        print("\n✅ Workflow 20 deleted successfully!")
        print("\nYou can now re-record the workflow with the updated parser.")
        print("The new recording will have:")
        print("  - Proper SELECT nodes for dropdowns")
        print("  - Proper TYPE nodes with values for text inputs")
        print("  - Correct selectors without truncation")
        print("  - Support for .nth() modifiers")
        
except Exception as e:
    print(f"❌ Error: {e}")
    db.rollback()
finally:
    db.close()

# Made with Bob
