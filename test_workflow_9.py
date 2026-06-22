import sys
sys.path.insert(0, 'backend')

from app.db.database import SessionLocal
from app.db.models import Workflow
import json

db = SessionLocal()
try:
    workflow = db.query(Workflow).filter(Workflow.id == 9).first()
    if workflow:
        print(f'Workflow ID: {workflow.id}')
        print(f'Name: {workflow.name}')
        print(f'Description: {workflow.description}')
        print(f'Nodes: {len(workflow.nodes)}')
        print(f'Edges: {len(workflow.edges)}')
        print('\nNodes:')
        for node in workflow.nodes:
            print(f'  - {node.node_id}: {node.node_type.value} - {node.label}')
            print(f'    Config: {json.dumps(node.config, indent=6)}')
    else:
        print('Workflow 9 not found')
        print('\nAvailable workflows:')
        workflows = db.query(Workflow).all()
        for wf in workflows:
            print(f'  - ID {wf.id}: {wf.name} ({len(wf.nodes)} nodes)')
finally:
    db.close()

# Made with Bob
