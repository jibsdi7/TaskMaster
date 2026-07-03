"""
Unit tests for the self-healing locator engine (no browser required).
Tests the strategy builder, selector text extraction, and recovery log structure.
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.services.self_healing import (
    _extract_text_from_selector,
    _extract_role_from_selector,
    SelfHealingLocator,
)

# ── helpers ──────────────────────────────────────────────────────────────────

def test_extract_text():
    cases = [
        ('role=link[name="Dogs"]',           "Dogs"),
        ('role=button[name="Add to Cart"]',  "Add to Cart"),
        ('text="Submit"',                    "Submit"),
        ('label="Email"',                    "Email"),
        ('placeholder="First Last"',         "First Last"),
        ('role=button',                      None),   # no name
        ('#my-id',                           None),   # CSS selector
    ]
    for sel, expected in cases:
        got = _extract_text_from_selector(sel)
        status = "OK" if got == expected else "FAIL"
        print(f"  {status} extract_text({sel!r}) -> {got!r}  (expected {expected!r})")
        assert got == expected, f"FAILED: {sel}"


def test_extract_role():
    cases = [
        ('role=link[name="Dogs"]',  "link"),
        ('role=button',             "button"),
        ('text="Submit"',           None),
        ('#id',                     None),
    ]
    for sel, expected in cases:
        got = _extract_role_from_selector(sel)
        status = "OK" if got == expected else "FAIL"
        print(f"  {status} extract_role({sel!r}) -> {got!r}  (expected {expected!r})")
        assert got == expected, f"FAILED: {sel}"


def test_strategy_builder():
    """Verify the strategy list for common selector formats."""
    logs = []
    def fake_log(level, msg, **kw):
        logs.append((level, msg, kw))

    class FakePage:
        def get_by_role(self, role, **kw):   return f"role_locator({role},{kw})"
        def get_by_label(self, t):           return f"label_locator({t})"
        def get_by_placeholder(self, t):     return f"placeholder_locator({t})"
        def get_by_text(self, t, **kw):      return f"text_locator({t},{kw})"
        def locator(self, sel):              return f"css_locator({sel})"

    healer = SelfHealingLocator(FakePage(), fake_log)

    # role=link[name="Dogs"] — should produce: primary, role=link, label, placeholder, text-exact, text-partial, xpath
    strategies = healer._build_strategies('role=link[name="Dogs"]')
    names = [s["name"] for s in strategies]
    print(f"  Strategies for role=link selector: {names}")
    assert "primary"      in names
    assert "role=link"    in names
    assert "label"        in names
    assert "placeholder"  in names
    assert "text-exact"   in names
    assert "text-partial" in names
    assert "xpath"        in names

    # text="Submit" — no role, should include generic role fallbacks
    strategies2 = healer._build_strategies('text="Submit"')
    names2 = [s["name"] for s in strategies2]
    print(f"  Strategies for text= selector:     {names2}")
    assert "primary"    in names2
    assert "role=link"  in names2
    assert "role=button" in names2
    assert "text-exact" in names2

    # CSS selector with no extractable text — only primary
    strategies3 = healer._build_strategies('#my-id')
    names3 = [s["name"] for s in strategies3]
    print(f"  Strategies for CSS selector:       {names3}")
    assert names3 == ["primary"]

    print("  Strategy builder: OK")


# ── run ───────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("=== self_healing unit tests ===")
    print()
    print("extract_text_from_selector:")
    test_extract_text()
    print()
    print("extract_role_from_selector:")
    test_extract_role()
    print()
    print("strategy_builder:")
    test_strategy_builder()
    print()
    print("All tests passed - OK")
