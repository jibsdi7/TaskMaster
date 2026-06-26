import sys
import os

# Change to backend directory
os.chdir(os.path.dirname(__file__))

# Set environment variable to use SQLite
os.environ['DATABASE_URL'] = 'sqlite:///./taskmaster.db'

sys.path.insert(0, os.path.dirname(__file__))

from app.db.database import SessionLocal
from app.db.models import Workflow, WorkflowNode

db = SessionLocal()

wf = db.query(Workflow).filter(Workflow.id == 20).first()
print(f'Workflow 20: {wf.name if wf else "NOT FOUND"}')
print()

if wf:
    nodes = db.query(WorkflowNode).filter(WorkflowNode.workflow_id == 20).order_by(WorkflowNode.position_y).all()
    for n in nodes:
        print(f'Node {n.id}: {n.node_type}')
        print(f'  Label: {n.label}')
        config = n.config if hasattr(n, 'config') else {}
        if config:
            print(f'  Selector: {config.get("selector", "N/A")}')
            print(f'  Value: {config.get("value", "N/A")}')
        print()

db.close()

# Made with Bob
