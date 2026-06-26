"""
Import Playwright script directly into workflow 20
"""
import sys
import os

# Get the absolute path to the backend directory
backend_dir = os.path.dirname(os.path.abspath(__file__))

# Set environment variable for SQLite with absolute path
db_path = os.path.join(backend_dir, 'taskmaster.db')
os.environ['DATABASE_URL'] = f'sqlite:///{db_path}'

sys.path.insert(0, backend_dir)

from app.db.database import SessionLocal
from app.db.models import Workflow, WorkflowNode, WorkflowEdge
from app.services.recorder import PlaywrightScriptParser

# Your Playwright script
playwright_script = '''from playwright.sync_api import Playwright, sync_playwright, expect


def run(playwright: Playwright) -> None:
    browser = playwright.chromium.launch(headless=False)
    context = browser.new_context()
    page = context.new_page()
    page.goto("https://blazedemo.com/index.php")
    page.locator("select[name=\\"fromPort\\"]").select_option("Philadelphia")
    page.locator("select[name=\\"toPort\\"]").select_option("London")
    page.get_by_role("button", name="Find Flights").click()
    page.get_by_role("cell", name="Choose This Flight").nth(3).click()
    page.get_by_placeholder("First Last").click()
    page.get_by_placeholder("First Last").fill("Dibyendu")
    page.get_by_placeholder("Year").click()
    page.get_by_placeholder("Year").press("Control+a")
    page.get_by_placeholder("Year").fill("2026")
    page.get_by_placeholder("Year").press("Tab")
    page.get_by_placeholder("John Smith").fill("Dibyendu Dey")
    page.get_by_role("button", name="Purchase Flight").click()

    # ---------------------
    context.close()
    browser.close()


with sync_playwright() as playwright:
    run(playwright)
'''

db = SessionLocal()

try:
    # Find workflow 20
    workflow = db.query(Workflow).filter(Workflow.id == 20).first()
    
    if not workflow:
        print(" Workflow 20 not found!")
        sys.exit(1)
    
    print(f"Found workflow: {workflow.name}")
    
    # Delete existing nodes and edges
    db.query(WorkflowEdge).filter(WorkflowEdge.workflow_id == 20).delete()
    db.query(WorkflowNode).filter(WorkflowNode.workflow_id == 20).delete()
    db.commit()
    print(" Deleted old nodes and edges")
    
    # Parse the Playwright script
    nodes = PlaywrightScriptParser.parse(playwright_script)
    print(f" Parsed {len(nodes)} nodes from script")
    
    # Create new nodes
    node_map = {}
    for i, node_data in enumerate(nodes):
        node = WorkflowNode(
            workflow_id=20,
            node_id=node_data['node_id'],
            node_type=node_data['node_type'],
            label=node_data['label'],
            position_x=node_data['position_x'],
            position_y=node_data['position_y'],
            config=node_data['config'],
            metadata=node_data.get('metadata', {})
        )
        db.add(node)
        node_map[node_data['node_id']] = node
        print(f"  + {node_data['node_type']}: {node_data['label']}")
    
    db.commit()
    print(" Created new nodes")
    
    # Create edges to connect nodes in sequence
    node_ids = [n['node_id'] for n in nodes]
    for i in range(len(node_ids) - 1):
        edge = WorkflowEdge(
            workflow_id=20,
            edge_id=f"edge_{i}",
            source_node_id=node_ids[i],
            target_node_id=node_ids[i + 1],
            source_handle=None,
            target_handle=None,
            config={},
            meta_data={}
        )
        db.add(edge)
    
    db.commit()
    print(f"✓ Created {len(node_ids) - 1} edges")
    
    print("\n Workflow 20 updated successfully!")
    print("\nNode Summary:")
    for node_data in nodes:
        config = node_data.get('config', {})
        value = config.get('value', '')
        if value:
            print(f"  {node_data['node_type']}: {node_data['label']} = '{value}'")
        else:
            print(f"  {node_data['node_type']}: {node_data['label']}")
    
except Exception as e:
    print(f" Error: {e}")
    db.rollback()
    import traceback
    traceback.print_exc()
finally:
    db.close()

# Made with Bob
