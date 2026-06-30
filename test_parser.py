from backend.app.services.recorder import PlaywrightScriptParser
import json

# Workflow 24 script — blazedemo with dropdowns, fill, and press actions
script = """page.goto("https://blazedemo.com/index.php")
page.locator("select[name=\\"fromPort\\"]").select_option("Portland")
page.locator("select[name=\\"toPort\\"]").select_option("Berlin")
page.get_by_role("button", name="Find Flights").click()
page.get_by_role("row", name="Choose This Flight 9696 Aer").get_by_role("button").click()
page.get_by_placeholder("First Last").click()
page.get_by_placeholder("First Last").fill("Dibyendu")
page.get_by_placeholder("John Smith").click()
page.get_by_placeholder("Year").click()
page.get_by_placeholder("Year").press("Control+a")
page.get_by_placeholder("Year").fill("2026")
page.get_by_placeholder("Year").press("Tab")
page.get_by_placeholder("John Smith").fill("Dibyendu Dey")
page.get_by_role("button", name="Purchase Flight").click()"""

nodes = PlaywrightScriptParser.parse(script)
print(f"Total nodes parsed: {len(nodes)}\n")
for node in nodes:
    print(json.dumps(node, indent=2))
    print()

# Validate expected nodes
expected = [
    ("OPEN_URL",  "https://blazedemo.com/index.php"),
    ("SELECT",    "Portland"),       # fromPort dropdown
    ("SELECT",    "Berlin"),         # toPort dropdown
    ("CLICK",     None),             # Find Flights button
    ("CLICK",     None),             # Choose flight row button
    ("TYPE",      "Dibyendu"),       # First Last field
    ("TYPE",      "2026"),           # Year field
    ("TYPE",      "Dibyendu Dey"),   # John Smith field
    ("CLICK",     None),             # Purchase Flight button
]

print("\n--- Validation ---")
assert len(nodes) == len(expected), f"Expected {len(expected)} nodes, got {len(nodes)}"
for i, (node, (exp_type, exp_value)) in enumerate(zip(nodes, expected)):
    assert node["node_type"] == exp_type, \
        f"Node {i}: expected type '{exp_type}', got '{node['node_type']}'"
    if exp_value is not None:
        cfg = node["config"]
        actual_value = cfg.get("value") or cfg.get("url") or cfg.get("selector")
        assert exp_value in str(actual_value), \
            f"Node {i} ({exp_type}): expected value containing '{exp_value}', got '{actual_value}'"

print("All assertions passed ✓")

# Made with Bob
