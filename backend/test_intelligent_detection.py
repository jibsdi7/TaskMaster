import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.services.recorder import PlaywrightScriptParser

# Test script with clicks on select and input elements
test_script = '''
page.goto("https://blazedemo.com/index.php")
page.locator("select[name=\\"fromPort\\"]").click()
page.get_by_placeholder("First Last").click()
page.get_by_placeholder("Year").click()
page.get_by_role("button", name="Submit").click()
'''

print("Testing intelligent node type detection...\n")
print("Input script:")
print(test_script)
print("\n" + "="*60 + "\n")

nodes = PlaywrightScriptParser.parse(test_script)

print(f"Parsed {len(nodes)} nodes:\n")
for node in nodes:
    node_type = node['node_type']
    label = node['label']
    selector = node['config'].get('selector', 'N/A')
    value = node['config'].get('value', 'N/A')
    
    print(f"Type: {node_type}")
    print(f"Label: {label}")
    print(f"Selector: {selector}")
    if value != 'N/A' and value != '':
        print(f"Value: {value}")
    print()

print("\nExpected results:")
print("- select[name=\"fromPort\"] should be SELECT type")
print("- placeholder=\"First Last\" should be TYPE type")
print("- placeholder=\"Year\" should be TYPE type")
print("- role=button should be CLICK type")

# Made with Bob
