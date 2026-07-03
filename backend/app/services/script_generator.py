"""
Playwright Script Generator
"""
import re
from typing import Dict, List, Any
from collections import deque
from app.db.models import NodeType


def _selector_to_python_locator(selector: str) -> str:
    """Convert a structured selector string (as stored in node config) to a
    Python Playwright locator expression that targets the correct element.

    Supported formats (produced by PlaywrightScriptParser._extract_selector):
      role=link[name="Dogs"]          -> page.get_by_role("link", name="Dogs")
      role=button[name="Find Flights"]-> page.get_by_role("button", name="Find Flights")
      role=button                     -> page.get_by_role("button")
      text="Submit"                   -> page.get_by_text("Submit")
      placeholder="First Last"        -> page.get_by_placeholder("First Last")
      label="Email"                   -> page.get_by_label("Email")
      anything else (CSS / XPath)     -> page.locator("<selector>")
    """
    # role=X[name="Y"] or role=X[name='Y']
    m = re.match(r'^role=([^\[]+)\[name=["\']([^"\']+)["\']\]', selector)
    if m:
        return f'page.get_by_role("{m.group(1)}", name="{m.group(2)}")'

    # role=X (no name)
    m = re.match(r'^role=(\S+)$', selector)
    if m:
        return f'page.get_by_role("{m.group(1)}")'

    # text="Y" or text='Y'
    m = re.match(r'^text=["\']([^"\']+)["\']$', selector)
    if m:
        return f'page.get_by_text("{m.group(1)}")'

    # placeholder="Y"
    m = re.match(r'^placeholder=["\']([^"\']+)["\']$', selector)
    if m:
        return f'page.get_by_placeholder("{m.group(1)}")'

    # label="Y"
    m = re.match(r'^label=["\']([^"\']+)["\']$', selector)
    if m:
        return f'page.get_by_label("{m.group(1)}")'

    # fallback: CSS / XPath / nth-match etc.
    escaped = selector.replace('"', '\\"')
    return f'page.locator("{escaped}")'


def _selector_to_js_locator(selector: str) -> str:
    """Same as _selector_to_python_locator but for JavaScript/TypeScript."""
    m = re.match(r'^role=([^\[]+)\[name=["\']([^"\']+)["\']\]', selector)
    if m:
        return f"page.getByRole('{m.group(1)}', {{ name: '{m.group(2)}' }})"

    m = re.match(r'^role=(\S+)$', selector)
    if m:
        return f"page.getByRole('{m.group(1)}')"

    m = re.match(r'^text=["\']([^"\']+)["\']$', selector)
    if m:
        return f"page.getByText('{m.group(1)}')"

    m = re.match(r'^placeholder=["\']([^"\']+)["\']$', selector)
    if m:
        return f"page.getByPlaceholder('{m.group(1)}')"

    m = re.match(r'^label=["\']([^"\']+)["\']$', selector)
    if m:
        return f"page.getByLabel('{m.group(1)}')"

    escaped = selector.replace("'", "\\'")
    return f"page.locator('{escaped}')"


def topological_sort(nodes: List[Dict[str, Any]], edges: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Return nodes sorted in execution order (topological sort via Kahn's algorithm).
    Nodes with no incoming edges come first, preserving the flow graph order.
    Any nodes not reachable through the graph are appended at the end."""
    node_map = {n["node_id"]: n for n in nodes}
    
    # Build in-degree count and adjacency list
    in_degree = {nid: 0 for nid in node_map}
    adjacency: Dict[str, List[str]] = {nid: [] for nid in node_map}
    
    for edge in edges:
        src = edge.get("source_node_id")
        tgt = edge.get("target_node_id")
        if src in node_map and tgt in node_map:
            adjacency[src].append(tgt)
            in_degree[tgt] += 1
    
    # Start with all nodes that have no incoming edges
    queue = deque(nid for nid, deg in in_degree.items() if deg == 0)
    sorted_ids: List[str] = []
    
    while queue:
        nid = queue.popleft()
        sorted_ids.append(nid)
        for neighbour in adjacency[nid]:
            in_degree[neighbour] -= 1
            if in_degree[neighbour] == 0:
                queue.append(neighbour)
    
    # Append any nodes not reached (disconnected nodes) preserving original order
    reached = set(sorted_ids)
    for n in nodes:
        if n["node_id"] not in reached:
            sorted_ids.append(n["node_id"])
    
    return [node_map[nid] for nid in sorted_ids if nid in node_map]


class ScriptGenerator:
    """Generate Playwright scripts from workflow nodes"""
    
    @staticmethod
    def generate(
        nodes: List[Dict[str, Any]],
        edges: List[Dict[str, Any]],
        language: str = "python",
        include_comments: bool = True
    ) -> str:
        """Generate Playwright script from workflow"""
        # Sort nodes in graph execution order before generating code
        ordered_nodes = topological_sort(nodes, edges)
        if language == "python":
            return ScriptGenerator._generate_python(ordered_nodes, edges, include_comments)
        elif language == "javascript":
            return ScriptGenerator._generate_javascript(ordered_nodes, edges, include_comments)
        elif language == "typescript":
            return ScriptGenerator._generate_typescript(ordered_nodes, edges, include_comments)
        else:
            raise ValueError(f"Unsupported language: {language}")
    
    @staticmethod
    def _generate_python(
        nodes: List[Dict[str, Any]],
        edges: List[Dict[str, Any]],
        include_comments: bool
    ) -> str:
        """Generate Python Playwright script"""
        lines = []
        
        # Header
        if include_comments:
            lines.append("# Generated by FlowWeaver")
            lines.append("# Playwright Python Script")
            lines.append("")
        
        lines.append("import asyncio")
        lines.append("from playwright.async_api import async_playwright")
        lines.append("")
        lines.append("async def run():")
        lines.append("    async with async_playwright() as p:")
        lines.append("        browser = await p.chromium.launch(headless=False)")
        lines.append("        context = await browser.new_context()")
        lines.append("        page = await context.new_page()")
        lines.append("")
        
        # Generate code for each node
        for node in nodes:
            node_type = node.get("node_type")
            config = node.get("config", {})
            label = node.get("label", "")

            # Block section header (injected by _resolve_block_nodes)
            if include_comments and node.get("_block_start"):
                lines.append(f"        # ── Block: {node['_block_start']} ──")

            if include_comments and label:
                lines.append(f"        # {label}")

            if node_type == NodeType.OPEN_URL.value:
                url = config.get("url", "")
                lines.append(f'        await page.goto("{url}")')

            elif node_type == NodeType.CLICK.value:
                selector = config.get("selector", "")
                locator = _selector_to_python_locator(selector)
                lines.append(f'        await {locator}.click()')

            elif node_type == NodeType.TYPE.value:
                selector = config.get("selector", "")
                value = config.get("value", "")
                locator = _selector_to_python_locator(selector)
                lines.append(f'        await {locator}.fill("{value}")')

            elif node_type == NodeType.SELECT.value:
                selector = config.get("selector", "")
                value = config.get("value", "")
                lines.append(f'        await page.locator("{selector}").select_option("{value}")')

            elif node_type == NodeType.HOVER.value:
                selector = config.get("selector", "")
                lines.append(f'        await page.locator("{selector}").hover()')

            elif node_type == NodeType.UPLOAD_FILE.value:
                selector = config.get("selector", "")
                lines.append(f'        await page.locator("{selector}").set_input_files("path/to/file")')

            elif node_type == NodeType.DELAY.value:
                duration = config.get("duration", 1000) / 1000
                lines.append(f"        await page.wait_for_timeout({int(duration * 1000)})")

            elif node_type == NodeType.BACK.value:
                lines.append("        await page.go_back()")

            elif node_type == NodeType.REFRESH.value:
                lines.append("        await page.reload()")

            elif node_type == NodeType.BLOCK.value or node_type == "_BLOCK_COMMENT":
                # Unresolved BLOCK node — emit a clear placeholder
                lines.append(f'        # TODO: inline block "{label}" here')

            lines.append("")
        
        # Footer
        lines.append("        await browser.close()")
        lines.append("")
        lines.append("asyncio.run(run())")
        
        return "\n".join(lines)
    
    @staticmethod
    def _generate_javascript(
        nodes: List[Dict[str, Any]],
        edges: List[Dict[str, Any]],
        include_comments: bool
    ) -> str:
        """Generate JavaScript Playwright script"""
        lines = []
        
        # Header
        if include_comments:
            lines.append("// Generated by FlowWeaver")
            lines.append("// Playwright JavaScript Script")
            lines.append("")
        
        lines.append("const { chromium } = require('playwright');")
        lines.append("")
        lines.append("(async () => {")
        lines.append("  const browser = await chromium.launch({ headless: false });")
        lines.append("  const context = await browser.newContext();")
        lines.append("  const page = await context.newPage();")
        lines.append("")
        
        # Generate code for each node
        for node in nodes:
            node_type = node.get("node_type")
            config = node.get("config", {})
            label = node.get("label", "")

            if include_comments and node.get("_block_start"):
                lines.append(f"  // ── Block: {node['_block_start']} ──")

            if include_comments and label:
                lines.append(f"  // {label}")

            if node_type == NodeType.OPEN_URL.value:
                url = config.get("url", "")
                lines.append(f"  await page.goto('{url}');")

            elif node_type == NodeType.CLICK.value:
                selector = config.get("selector", "")
                locator = _selector_to_js_locator(selector)
                lines.append(f"  await {locator}.click();")

            elif node_type == NodeType.TYPE.value:
                selector = config.get("selector", "")
                value = config.get("value", "")
                locator = _selector_to_js_locator(selector)
                lines.append(f"  await {locator}.fill('{value}');")

            elif node_type == NodeType.SELECT.value:
                selector = config.get("selector", "")
                value = config.get("value", "")
                lines.append(f"  await page.locator('{selector}').selectOption('{value}');")

            elif node_type == NodeType.HOVER.value:
                selector = config.get("selector", "")
                lines.append(f"  await page.locator('{selector}').hover();")

            elif node_type == NodeType.UPLOAD_FILE.value:
                selector = config.get("selector", "")
                lines.append(f"  await page.locator('{selector}').setInputFiles('path/to/file');")

            elif node_type == NodeType.DELAY.value:
                duration = config.get("duration", 1000)
                lines.append(f"  await page.waitForTimeout({duration});")

            elif node_type == NodeType.BACK.value:
                lines.append("  await page.goBack();")

            elif node_type == NodeType.REFRESH.value:
                lines.append("  await page.reload();")

            elif node_type == NodeType.BLOCK.value or node_type == "_BLOCK_COMMENT":
                lines.append(f"  // TODO: inline block '{label}' here")

            lines.append("")
        
        # Footer
        lines.append("  await browser.close();")
        lines.append("})();")
        
        return "\n".join(lines)
    
    @staticmethod
    def _generate_typescript(
        nodes: List[Dict[str, Any]],
        edges: List[Dict[str, Any]],
        include_comments: bool
    ) -> str:
        """Generate TypeScript Playwright script"""
        lines = []
        
        # Header
        if include_comments:
            lines.append("// Generated by FlowWeaver")
            lines.append("// Playwright TypeScript Script")
            lines.append("")
        
        lines.append("import { chromium } from 'playwright';")
        lines.append("")
        lines.append("(async () => {")
        lines.append("  const browser = await chromium.launch({ headless: false });")
        lines.append("  const context = await browser.newContext();")
        lines.append("  const page = await context.newPage();")
        lines.append("")
        
        # Generate code for each node
        for node in nodes:
            node_type = node.get("node_type")
            config = node.get("config", {})
            label = node.get("label", "")

            if include_comments and node.get("_block_start"):
                lines.append(f"  // ── Block: {node['_block_start']} ──")

            if include_comments and label:
                lines.append(f"  // {label}")

            if node_type == NodeType.OPEN_URL.value:
                url = config.get("url", "")
                lines.append(f"  await page.goto('{url}');")

            elif node_type == NodeType.CLICK.value:
                selector = config.get("selector", "")
                locator = _selector_to_js_locator(selector)
                lines.append(f"  await {locator}.click();")

            elif node_type == NodeType.TYPE.value:
                selector = config.get("selector", "")
                value = config.get("value", "")
                locator = _selector_to_js_locator(selector)
                lines.append(f"  await {locator}.fill('{value}');")

            elif node_type == NodeType.SELECT.value:
                selector = config.get("selector", "")
                value = config.get("value", "")
                lines.append(f"  await page.locator('{selector}').selectOption('{value}');")

            elif node_type == NodeType.HOVER.value:
                selector = config.get("selector", "")
                lines.append(f"  await page.locator('{selector}').hover();")

            elif node_type == NodeType.UPLOAD_FILE.value:
                selector = config.get("selector", "")
                lines.append(f"  await page.locator('{selector}').setInputFiles('path/to/file');")

            elif node_type == NodeType.DELAY.value:
                duration = config.get("duration", 1000)
                lines.append(f"  await page.waitForTimeout({duration});")

            elif node_type == NodeType.BACK.value:
                lines.append("  await page.goBack();")

            elif node_type == NodeType.REFRESH.value:
                lines.append("  await page.reload();")

            elif node_type == NodeType.BLOCK.value or node_type == "_BLOCK_COMMENT":
                lines.append(f"  // TODO: inline block '{label}' here")

            lines.append("")
        
        # Footer
        lines.append("  await browser.close();")
        lines.append("})();")
        
        return "\n".join(lines)

# Made with Bob
