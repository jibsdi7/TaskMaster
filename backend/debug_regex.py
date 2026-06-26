import re

line = r'    page.locator("select[name=\"fromPort\"]").select_option("Philadelphia")'

print(f"Original line: {line}")
print()

# Try different regex patterns
patterns = [
    (r'locator\(["\'](.+?)["\']', "Non-greedy .+?"),
    (r'locator\(["\']([^"\']*(?:\\.[^"\']*)*)["\']', "Original complex pattern"),
    (r'locator\((["\'])(.+?)\1', "Backreference pattern"),
    (r'locator\("([^"]*(?:\\"[^"]*)*)"\)', "Double quote specific"),
]

for pattern, desc in patterns:
    match = re.search(pattern, line)
    if match:
        print(f"{desc}:")
        print(f"  Pattern: {pattern}")
        print(f"  Match: {match.group(0)}")
        print(f"  Captured: {match.group(1) if match.lastindex >= 1 else 'N/A'}")
        if match.lastindex >= 2:
            print(f"  Captured 2: {match.group(2)}")
    else:
        print(f"{desc}: NO MATCH")
    print()

# Made with Bob
