"""
Test the Playwright script parser with the user's script
"""
import sys
sys.path.insert(0, 'backend')

from app.services.recorder import PlaywrightScriptParser

# User's Playwright script
script = '''
from playwright.sync_api import Playwright, sync_playwright, expect


def run(playwright: Playwright) -> None:
    browser = playwright.chromium.launch(headless=False)
    context = browser.new_context()
    page = context.new_page()
    page.goto("https://blazedemo.com/index.php")
    page.get_by_role("button", name="Find Flights").click()
    page.get_by_role("row", name="Choose This Flight 4346").get_by_role("button").click()
    page.get_by_role("button", name="Purchase Flight").click()

    # ---------------------
    context.close()
    browser.close()


with sync_playwright() as playwright:
    run(playwright)
'''

print("="*80)
print("Testing Playwright Script Parser")
print("="*80)

# Parse the script
nodes = PlaywrightScriptParser.parse(script)

print(f"\nParsed {len(nodes)} nodes:\n")

for i, node in enumerate(nodes, 1):
    print(f"{i}. {node['label']}")
    print(f"   Type: {node['node_type']}")
    print(f"   Selector: {node['config'].get('selector', 'N/A')}")
    if 'url' in node['config']:
        print(f"   URL: {node['config']['url']}")
    print()

print("="*80)
print("Expected Output:")
print("1. Navigate to https://blazedemo.com/index.php")
print("2. Click button: Find Flights")
print("3. Click button: (from nested selector)")
print("4. Click button: Purchase Flight")
print("="*80)

# Made with Bob
