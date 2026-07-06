from app.services.recorder import PlaywrightScriptParser
from app.services.script_generator import _selector_to_python_locator

# Simulate what Playwright codegen would generate for petstore clicks
lines = [
    'await page.get_by_role("link", name="Dogs").click()',
    'await page.get_by_role("link", name="K9-BD-").click()',
    'await page.get_by_role("link", name="Return to DOGS").click()',
    'await page.get_by_role("link", name="Add to Cart").click()',
]

print("=== _extract_selector output ===")
for line in lines:
    sel = PlaywrightScriptParser._extract_selector(line)
    label = PlaywrightScriptParser._extract_label(line, sel, 'Click')
    print(f'Line:  {line}')
    print(f'Sel:   {sel}')
    print(f'Label: {label}')
    print()

print("=== _selector_to_python_locator output ===")
selectors = [
    'role=link[name="Dogs"]',
    'role=link[name="K9-BD-"]',
    'role=link[name="Return to DOGS"]',
    'role=link[name="Add to Cart"]',
]
for s in selectors:
    print(f'Selector: {s}')
    print(f'Locator:  {_selector_to_python_locator(s)}')
    print()

# Also test the full script parsing
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

print("=== Full script parse ===")
nodes = PlaywrightScriptParser.parse(script)
for n in nodes:
    print(f"node_type={n['node_type']} label={n['label']}")
    print(f"  config={n['config']}")
    print()
