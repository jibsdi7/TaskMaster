"""
Test parser with chained locators
"""
import sys
sys.path.insert(0, 'backend')

from app.services.recorder import PlaywrightScriptParser

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
    context.close()
    browser.close()

with sync_playwright() as playwright:
    run(playwright)
'''

print("="*80)
print("Testing Playwright Script Parser with Chained Locators")
print("="*80)

nodes = PlaywrightScriptParser.parse(script)

print(f"\nParsed {len(nodes)} nodes:\n")

for i, node in enumerate(nodes, 1):
    print(f"{i}. {node['label']}")
    print(f"   Type: {node['node_type']}")
    if 'url' in node['config']:
        print(f"   URL: {node['config']['url']}")
    if 'selector' in node['config']:
        print(f"   Selector: {node['config']['selector']}")
    print()

print("\nExpected selectors:")
print("1. Navigate to https://blazedemo.com/index.php")
print("2. Find Flights")
print("3. row:Choose This Flight 4346 > button")
print("4. Purchase Flight")

# Made with Bob
