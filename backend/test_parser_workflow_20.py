import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.services.recorder import PlaywrightScriptParser

# The exact script from workflow 20
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

print("Parsing Playwright script...")
print("=" * 80)

nodes = PlaywrightScriptParser.parse(playwright_script)

print(f"\nTotal nodes parsed: {len(nodes)}\n")

for i, node in enumerate(nodes, 1):
    print(f"Node {i}:")
    print(f"  Type: {node['node_type']}")
    print(f"  Label: {node['label']}")
    if node.get('config'):
        config = node['config']
        if 'selector' in config:
            print(f"  Selector: {config['selector']}")
        if 'value' in config:
            print(f"  Value: {config['value']}")
        if 'url' in config:
            print(f"  URL: {config['url']}")
    print()

# Made with Bob
