from app.services.recorder import PlaywrightScriptParser
from app.services.script_generator import ScriptGenerator

# Simulate what the user recorded
script = '''
import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context()
        page = await context.new_page()

        await page.goto("https://petstore.octoperf.com/actions/Catalog.action")
        await page.get_by_role("link", name="Dogs").click()
        await page.get_by_role("link", name="K9-BD-").click()
        await page.get_by_role("link", name="Return to DOGS").click()
        await page.get_by_role("link", name="K9-BD-").click()
        await page.get_by_role("link", name="Add to Cart").click()
'''

# Parse into nodes
nodes = PlaywrightScriptParser.parse(script)
print("=== Parsed nodes ===")
for n in nodes:
    print("  node_type=" + n['node_type'] + " selector=" + str(n['config'].get('selector', n['config'].get('url', ''))))

# Build sequential edges  
edges = []
for i in range(1, len(nodes)):
    edges.append({
        "edge_id": "edge_" + str(i),
        "source_node_id": nodes[i-1]["node_id"],
        "target_node_id": nodes[i]["node_id"],
    })

# Generate script from nodes
print("\n=== Generated Python script ===")
code = ScriptGenerator.generate(nodes=nodes, edges=edges, language="python", include_comments=True)
print(code)
