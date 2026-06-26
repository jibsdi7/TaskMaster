import sys
import os

# Set DATABASE_URL to use SQLite
backend_dir = os.path.dirname(os.path.abspath(__file__))
db_path = os.path.join(backend_dir, 'taskmaster.db')
os.environ['DATABASE_URL'] = f'sqlite:///{db_path}'

sys.path.insert(0, backend_dir)

from app.db.database import SessionLocal
from app.db.models import Workflow
from app.services.recorder import PlaywrightScriptParser

db = SessionLocal()

# Get workflow 21
workflow = db.query(Workflow).filter(Workflow.id == 21).first()
if not workflow:
    print("Workflow 21 not found")
    db.close()
    sys.exit(1)

print(f"Workflow 21: {workflow.name}")
print(f"Script length: {len(workflow.meta_data.get('playwright_script', ''))} chars\n")

# Get the script
script = workflow.meta_data.get('playwright_script', '')
if not script:
    print("No script found in workflow metadata")
    db.close()
    sys.exit(1)

# Parse it
print("Parsing script with updated parser...\n")
nodes = PlaywrightScriptParser.parse(script)

print(f"Parsed {len(nodes)} nodes:\n")
for node in nodes:
    node_type = node['node_type']
    label = node['label']
    selector = node['config'].get('selector', 'N/A')
    value = node['config'].get('value', 'N/A')
    
    print(f"{node_type}: {label}")
    print(f"  Selector: {selector}")
    if value != 'N/A':
        print(f"  Value: {value}")
    print()

db.close()

# Made with Bob
