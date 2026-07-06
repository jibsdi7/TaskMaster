import re

# Test the execution-side selector parsing  
def _parse_single_selector_test(selector):
    # Check for :nth-match(N) modifier
    nth_index = None
    nth_match = re.search(r':nth-match\((\d+)\)$', selector)
    if nth_match:
        nth_index = int(nth_match.group(1))
        selector = selector[:nth_match.start()]
    
    # role=button[name="Find Flights"]
    role_match = re.match(r'role=(\w+)\[name=["\']([^"\']+)["\']\]', selector)
    if role_match:
        role, name = role_match.groups()
        return "get_by_role(" + role + ", name=" + name + ")"
    
    # role=button (without name)
    role_simple_match = re.match(r'role=(\w+)$', selector)
    if role_simple_match:
        role = role_simple_match.group(1)
        return "get_by_role(" + role + ")"
    
    # placeholder="First Last"
    placeholder_match = re.match(r'placeholder=["\']([^"\']+)["\']', selector)
    if placeholder_match:
        return "get_by_placeholder(" + placeholder_match.group(1) + ")"
    
    # label="Email"
    label_match = re.match(r'label=["\']([^"\']+)["\']', selector)
    if label_match:
        return "get_by_label(" + label_match.group(1) + ")"
    
    # text="Submit"
    text_match = re.match(r'text=["\']([^"\']+)["\']', selector)
    if text_match:
        return "get_by_text(" + text_match.group(1) + ")"
    
    # Fallback to CSS/XPath selector
    return "locator(" + selector + ")"

selectors = [
    'role=link[name="Dogs"]',
    'role=link[name="K9-BD-"]',
    'role=button[name="Open Menu"]',
    'role=link[name="Return to DOGS"]',
    '[data-test="username"]',
    'placeholder="First Last"',
    'text="Submit"',
]

print("Execution-side selector parsing:")
for s in selectors:
    result = _parse_single_selector_test(s)
    print("  Selector: " + s)
    print("  Parsed:   " + result)
    print()
