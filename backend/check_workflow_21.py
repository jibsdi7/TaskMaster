import sys
import os

# Set DATABASE_URL to use SQLite
backend_dir = os.path.dirname(os.path.abspath(__file__))
db_path = os.path.join(backend_dir, 'taskmaster.db')
os.environ['DATABASE_URL'] = f'sqlite:///{db_path}'

sys.path.insert(0, backend_dir)

from app.db.database import SessionLocal
from app.db.models import Workflow, WorkflowNode

db = SessionLocal()

workflow = db.query(Workflow).filter(Workflow.id == 21).first()
if workflow:
    print(f"Workflow 21: {workflow.name}")
    print(f"Created: {workflow.created_at}\n")
    nodes = db.query(WorkflowNode).filter(WorkflowNode.workflow_id == 21).order_by(WorkflowNode.position_y).all()
    for n in nodes:
        selector = n.config.get('selector', 'N/A')
        value = n.config.get('value', 'N/A')
        print(f"{n.node_type}: {n.label}")
        print(f"  Selector: {selector}")
        print(f"  Value: {value}\n")
else:
    print("Workflow 21 not found")

db.close()

# Made with Bob
