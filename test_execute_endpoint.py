import sys
sys.path.insert(0, 'backend')

from app.api import workflows

print(f"Router has {len(workflows.router.routes)} routes:")
for route in workflows.router.routes:
    print(f"  {list(route.methods)[0]} {route.path}")

print("\nExecute endpoint found:", any('execute' in route.path for route in workflows.router.routes))

# Made with Bob
