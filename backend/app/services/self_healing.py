"""
Self-Healing Locator Engine
===========================
When a recorded selector fails at runtime, this module attempts a sequence of
fallback strategies derived from the original selector's text/role/label/placeholder
value, progressively broadening the search until the element is found.

Strategy order (most-specific → least-specific):
  1. Role  — get_by_role(role, name=text)
  2. Label — get_by_label(text)
  3. Placeholder — get_by_placeholder(text)
  4. Text (exact) — get_by_text(text, exact=True)
  5. Text (partial) — get_by_text(text, exact=False)
  6. XPath — //*/[contains(., text)] (last resort)

Every attempt is logged so the caller can surface healing activity in the UI.
A successful fallback selector is returned so callers can persist it.
"""
import re
from typing import Any, Callable, Dict, List, Optional, Tuple


# ──────────────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────────────

def _extract_text_from_selector(selector: str) -> Optional[str]:
    """Pull the human-readable text/name value out of any selector format."""
    # role=X[name="Y"]  or  role=X[name='Y']
    m = re.search(r'\[name=["\']([^"\']+)["\']\]', selector)
    if m:
        return m.group(1)

    # text="Y"  /  label="Y"  /  placeholder="Y"
    m = re.search(r'(?:text|label|placeholder)=["\']([^"\']+)["\']', selector)
    if m:
        return m.group(1)

    # bare role=X  — no text extractable
    return None


def _extract_role_from_selector(selector: str) -> Optional[str]:
    """Pull the ARIA role out of a role=X[...] selector."""
    m = re.match(r'^role=([^\[/\s]+)', selector)
    return m.group(1) if m else None


# ──────────────────────────────────────────────────────────────────────────────
# Core healing logic (sync)
# ──────────────────────────────────────────────────────────────────────────────

class SelfHealingLocator:
    """
    Wraps a Playwright sync Page and provides `find(selector)` which tries
    multiple strategies before giving up.

    Parameters
    ----------
    page       : playwright.sync_api.Page
    log_fn     : callable(level, message, **kwargs) — the executor's _log method
    timeout_ms : per-strategy timeout in milliseconds (default 5 000)
    """

    _ARIA_ROLES = (
        "button", "link", "textbox", "checkbox", "radio", "combobox",
        "listbox", "option", "menuitem", "tab", "heading", "img",
        "row", "cell", "columnheader", "rowheader",
    )

    def __init__(self, page: Any, log_fn: Callable, timeout_ms: int = 5_000):
        self.page = page
        self._log = log_fn
        self.timeout_ms = timeout_ms

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def find(self, selector: str) -> Tuple[Any, str, List[Dict]]:
        """
        Try to locate an element using the original selector and, on failure,
        a cascade of fallback strategies.

        Returns
        -------
        locator       : Playwright locator that matched
        used_selector : the selector string that worked (for persistence)
        recovery_log  : list of dicts describing each attempt
        """
        recovery_log: List[Dict] = []

        strategies = self._build_strategies(selector)

        for strategy in strategies:
            name = strategy["name"]
            locator = strategy["locator"]
            sel_str = strategy["selector_str"]

            try:
                # count() with a short timeout is the cheapest visibility probe
                locator.first.wait_for(state="attached", timeout=self.timeout_ms)
                count = locator.count()
                if count == 0:
                    raise RuntimeError("No elements matched")

                entry = {
                    "strategy": name,
                    "selector": sel_str,
                    "status": "success",
                    "matches": count,
                }
                recovery_log.append(entry)
                is_primary = name == "primary"
                if not is_primary:
                    self._log(
                        "WARNING",
                        f"Self-healing: primary selector failed, recovered using '{name}' "
                        f"(selector: {sel_str!r}, {count} match(es))",
                        healing_strategy=name,
                        healed_selector=sel_str,
                        original_selector=selector,
                    )
                else:
                    self._log(
                        "DEBUG",
                        f"Primary selector matched on first try: {sel_str!r}",
                        healing_strategy="primary",
                        healed_selector=sel_str,
                    )
                return locator, sel_str, recovery_log

            except Exception as exc:
                entry = {
                    "strategy": name,
                    "selector": sel_str,
                    "status": "failed",
                    "error": str(exc)[:120],
                }
                recovery_log.append(entry)
                self._log(
                    "DEBUG",
                    f"Self-healing attempt '{name}' failed: {str(exc)[:80]}",
                    healing_strategy=name,
                    attempted_selector=sel_str,
                )

        # All strategies exhausted
        attempts = ", ".join(s["name"] for s in strategies)
        raise RuntimeError(
            f"Self-healing exhausted all strategies ({attempts}) for selector: {selector!r}"
        )

    # ------------------------------------------------------------------
    # Strategy builder
    # ------------------------------------------------------------------

    def _build_strategies(self, selector: str) -> List[Dict]:
        """Return an ordered list of strategy dicts for the given selector."""
        strategies = []
        page = self.page

        # 0. Primary — always try the original selector first
        strategies.append({
            "name": "primary",
            "selector_str": selector,
            "locator": self._primary_locator(selector),
        })

        text = _extract_text_from_selector(selector)
        role = _extract_role_from_selector(selector)

        if not text:
            # Nothing to derive fallbacks from — return as-is
            return strategies

        # 1. Role (try all plausible ARIA roles with the extracted name)
        if role:
            # Same role, same name — already covered by primary; try without exact name match
            strategies.append({
                "name": f"role={role}",
                "selector_str": f'role={role}[name="{text}"]',
                "locator": page.get_by_role(role, name=text),
            })
        else:
            # No role in original selector — try common roles
            for r in ("link", "button", "menuitem", "tab", "option"):
                strategies.append({
                    "name": f"role={r}",
                    "selector_str": f'role={r}[name="{text}"]',
                    "locator": page.get_by_role(r, name=text),
                })

        # 2. Label
        strategies.append({
            "name": "label",
            "selector_str": f'label="{text}"',
            "locator": page.get_by_label(text),
        })

        # 3. Placeholder
        strategies.append({
            "name": "placeholder",
            "selector_str": f'placeholder="{text}"',
            "locator": page.get_by_placeholder(text),
        })

        # 4. Text exact
        strategies.append({
            "name": "text-exact",
            "selector_str": f'text="{text}"',
            "locator": page.get_by_text(text, exact=True),
        })

        # 5. Text partial (handles trimmed/wrapped text)
        strategies.append({
            "name": "text-partial",
            "selector_str": f'text="{text}"',
            "locator": page.get_by_text(text, exact=False),
        })

        # 6. XPath contains text (last resort — broadest possible match)
        xpath = f'//*[normalize-space(.)="{text}" or @aria-label="{text}" or @title="{text}"]'
        strategies.append({
            "name": "xpath",
            "selector_str": xpath,
            "locator": page.locator(xpath),
        })

        return strategies

    def _primary_locator(self, selector: str):
        """Build the primary locator from the stored selector string."""
        page = self.page

        # Chained selectors
        if " >> " in selector:
            parts = selector.split(" >> ")
            loc = self._single_locator(parts[0].strip())
            for part in parts[1:]:
                loc = loc.locator(self._single_locator(part.strip()))
            return loc

        return self._single_locator(selector)

    def _single_locator(self, selector: str):
        """Resolve a single (non-chained) selector string to a Playwright locator."""
        page = self.page

        nth_index = None
        nth_m = re.search(r':nth-match\((\d+)\)$', selector)
        if nth_m:
            nth_index = int(nth_m.group(1))
            selector = selector[:nth_m.start()]

        # role=X[name="Y"]
        m = re.match(r'^role=([^\[]+)\[name=["\']([^"\']+)["\']\]', selector)
        if m:
            loc = page.get_by_role(m.group(1), name=m.group(2))
            return loc.nth(nth_index) if nth_index is not None else loc

        # role=X
        m = re.match(r'^role=(\S+)$', selector)
        if m:
            loc = page.get_by_role(m.group(1))
            return loc.nth(nth_index) if nth_index is not None else loc

        # text="Y"
        m = re.match(r'^text=["\']([^"\']+)["\']$', selector)
        if m:
            return page.get_by_text(m.group(1))

        # placeholder="Y"
        m = re.match(r'^placeholder=["\']([^"\']+)["\']$', selector)
        if m:
            return page.get_by_placeholder(m.group(1))

        # label="Y"
        m = re.match(r'^label=["\']([^"\']+)["\']$', selector)
        if m:
            return page.get_by_label(m.group(1))

        # CSS / XPath fallback
        loc = page.locator(selector)
        return loc.nth(nth_index) if nth_index is not None else loc


# ──────────────────────────────────────────────────────────────────────────────
# Async variant (thin wrapper — reuses strategy logic, calls async API)
# ──────────────────────────────────────────────────────────────────────────────

class AsyncSelfHealingLocator:
    """
    Same logic as SelfHealingLocator but for the async Playwright API.

    Parameters
    ----------
    page       : playwright.async_api.Page
    log_fn     : async callable OR sync callable(level, message, **kwargs)
    timeout_ms : per-strategy timeout in milliseconds (default 5 000)
    """

    def __init__(self, page: Any, log_fn: Callable, timeout_ms: int = 5_000):
        self.page = page
        self._log = log_fn
        self.timeout_ms = timeout_ms
        # Reuse the sync helper just for strategy building (no IO at this point)
        self._sync_helper = SelfHealingLocator(page, log_fn, timeout_ms)

    async def find(self, selector: str) -> Tuple[Any, str, List[Dict]]:
        """Async version of SelfHealingLocator.find()."""
        recovery_log: List[Dict] = []
        strategies = self._sync_helper._build_strategies(selector)

        for strategy in strategies:
            name = strategy["name"]
            locator = strategy["locator"]
            sel_str = strategy["selector_str"]

            try:
                await locator.first.wait_for(state="attached", timeout=self.timeout_ms)
                count = await locator.count()
                if count == 0:
                    raise RuntimeError("No elements matched")

                recovery_log.append({"strategy": name, "selector": sel_str,
                                     "status": "success", "matches": count})
                if name != "primary":
                    self._log(
                        "WARNING",
                        f"Self-healing: primary selector failed, recovered using '{name}' "
                        f"(selector: {sel_str!r}, {count} match(es))",
                        healing_strategy=name,
                        healed_selector=sel_str,
                        original_selector=selector,
                    )
                return locator, sel_str, recovery_log

            except Exception as exc:
                recovery_log.append({"strategy": name, "selector": sel_str,
                                     "status": "failed", "error": str(exc)[:120]})
                self._log("DEBUG",
                          f"Self-healing attempt '{name}' failed: {str(exc)[:80]}",
                          healing_strategy=name, attempted_selector=sel_str)

        attempts = ", ".join(s["name"] for s in strategies)
        raise RuntimeError(
            f"Self-healing exhausted all strategies ({attempts}) for selector: {selector!r}"
        )

# Made with Bob
