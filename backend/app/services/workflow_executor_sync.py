"""
Synchronous Workflow Execution Engine for Windows compatibility
Uses Playwright's sync API to avoid asyncio subprocess issues on Windows
"""
import time
from typing import Dict, List, Any, Optional, Set
from datetime import datetime
from playwright.sync_api import sync_playwright, Browser, Page, BrowserContext
import os

from app.core.config import settings
from app.db.models import NodeType, WorkflowStatus


class ExecutionContext:
    """Execution context for storing variables and state"""
    
    def __init__(self):
        self.variables: Dict[str, Any] = {}
        self.loop_counters: Dict[str, int] = {}
        self.node_results: Dict[str, Any] = {}
    
    def set_variable(self, name: str, value: Any):
        """Set a variable"""
        self.variables[name] = value
    
    def get_variable(self, name: str, default: Any = None) -> Any:
        """Get a variable"""
        return self.variables.get(name, default)
    
    def set_node_result(self, node_id: str, result: Any):
        """Store node execution result"""
        self.node_results[node_id] = result
    
    def get_node_result(self, node_id: str) -> Any:
        """Get node execution result"""
        return self.node_results.get(node_id)


class WorkflowExecutorSync:
    """Synchronous workflow execution engine for Windows"""
    
    def __init__(self):
        self.playwright = None
        self.browser: Optional[Browser] = None
        self.context: Optional[BrowserContext] = None
        self.page: Optional[Page] = None
        self.logs: List[Dict[str, Any]] = []
        self.screenshots: List[Dict[str, Any]] = []
        self.execution_context = ExecutionContext()
        
    def execute(
        self,
        nodes: List[Dict[str, Any]],
        edges: List[Dict[str, Any]],
        inputs: Dict[str, Any] = None,
        run_id: str = None
    ) -> Dict[str, Any]:
        """Execute workflow synchronously"""
        print(f"\n[EXECUTOR] Starting execution")
        print(f"[EXECUTOR] Nodes: {len(nodes)}")
        print(f"[EXECUTOR] Edges: {len(edges)}")
        print(f"[EXECUTOR] Run ID: {run_id}")
        
        if inputs is None:
            inputs = {}
        
        # Initialize execution context with inputs
        for key, value in inputs.items():
            self.execution_context.set_variable(key, value)
        
        start_time = datetime.utcnow()
        
        try:
            print(f"[EXECUTOR] Initializing browser...")
            # Initialize browser
            self._init_browser()
            print(f"[EXECUTOR] Browser initialized successfully")
            
            print(f"[EXECUTOR] Building execution graph...")
            # Build execution graph
            graph = self._build_graph(nodes, edges)
            print(f"[EXECUTOR] Graph built: {len(graph)} nodes")
            
            print(f"[EXECUTOR] Finding entry nodes...")
            # Find entry nodes (nodes with no incoming edges)
            entry_nodes = self._find_entry_nodes(nodes, edges)
            print(f"[EXECUTOR] Entry nodes: {entry_nodes}")
            
            print(f"[EXECUTOR] Starting execution from entry nodes...")
            # Execute workflow starting from entry nodes
            executed_nodes: Set[str] = set()
            self._execute_from_nodes(entry_nodes, nodes, graph, executed_nodes, run_id)
            print(f"[EXECUTOR] Execution completed. Executed {len(executed_nodes)} nodes")
            
            print(f"[EXECUTOR] Closing browser...")
            # Close browser
            self._close_browser()
            print(f"[EXECUTOR] Browser closed")
            
            end_time = datetime.utcnow()
            duration = (end_time - start_time).total_seconds()
            
            return {
                "status": WorkflowStatus.COMPLETED.value,
                "started_at": start_time,
                "completed_at": end_time,
                "duration_seconds": duration,
                "logs": self.logs,
                "screenshots": self.screenshots,
                "variables": self.execution_context.variables,
                "result": {"success": True}
            }
            
        except Exception as e:
            import traceback
            error_trace = traceback.format_exc()
            
            print(f"\n[EXECUTOR ERROR] Exception occurred!")
            print(f"[EXECUTOR ERROR] Error: {str(e)}")
            print(f"[EXECUTOR ERROR] Traceback:\n{error_trace}")
            
            end_time = datetime.utcnow()
            duration = (end_time - start_time).total_seconds()
            
            self._log("ERROR", f"Workflow execution failed: {str(e)}")
            self._log("ERROR", f"Traceback: {error_trace}")
            
            # Ensure browser is closed
            try:
                self._close_browser()
            except Exception as close_error:
                print(f"[EXECUTOR ERROR] Failed to close browser: {close_error}")
            
            return {
                "status": WorkflowStatus.FAILED.value,
                "started_at": start_time,
                "completed_at": end_time,
                "duration_seconds": duration,
                "logs": self.logs,
                "screenshots": self.screenshots,
                "error_message": str(e),
                "result": {"success": False, "error": str(e), "traceback": error_trace}
            }
    
    def _init_browser(self):
        """Initialize Playwright browser"""
        import sys
        import asyncio
        
        # Fix for Windows - use ProactorEventLoop
        if sys.platform == 'win32':
            asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
        
        self.playwright = sync_playwright().start()
        self.browser = self.playwright.chromium.launch(
            headless=settings.PLAYWRIGHT_HEADLESS
        )
        self.context = self.browser.new_context(
            viewport={"width": 1280, "height": 720}
        )
        self.page = self.context.new_page()
        
        self._log("INFO", "Browser initialized")
    
    def _close_browser(self):
        """Close Playwright browser"""
        try:
            if self.context:
                self.context.close()
            if self.browser:
                self.browser.close()
            if self.playwright:
                self.playwright.stop()
            
            self._log("INFO", "Browser closed")
        except Exception as e:
            self._log("WARNING", f"Error closing browser: {str(e)}")
    
    def _build_graph(
        self,
        nodes: List[Dict[str, Any]],
        edges: List[Dict[str, Any]]
    ) -> Dict[str, List[Dict[str, Any]]]:
        """Build adjacency list with edge metadata"""
        graph = {node.get("node_id"): [] for node in nodes}
        
        for edge in edges:
            source = edge.get("source_node_id")
            target = edge.get("target_node_id")
            if source in graph:
                graph[source].append({
                    "target": target,
                    "condition": edge.get("config", {}).get("condition"),
                    "edge_id": edge.get("edge_id")
                })
        
        return graph
    
    def _find_entry_nodes(
        self,
        nodes: List[Dict[str, Any]],
        edges: List[Dict[str, Any]]
    ) -> List[str]:
        """Return exactly ONE true root node — the topmost-leftmost node that
        has no incoming edge.

        When a user deletes a connecting edge (e.g. node_2->node_3), node_3
        loses its incoming edge and looks like a second root. Returning both
        node_0 and node_3 would cause the executor to run two independent
        chains. Instead we always pick a single root: the OPEN_URL node if
        one exists among the candidates, otherwise the node with the smallest
        canvas position (position_x + position_y). The executor then follows
        edges from that single root and raises an error when it hits a dead-end.
        """
        target_nodes = {edge.get("target_node_id") for edge in edges}
        node_map     = {n.get("node_id"): n for n in nodes}

        # Candidates: nodes with no incoming edge
        candidates = [n for n in nodes if n.get("node_id") not in target_nodes]

        if not candidates:
            # Every node has an incoming edge — cycle or empty; fall back to first node
            return [nodes[0].get("node_id")] if nodes else []

        if len(candidates) == 1:
            return [candidates[0].get("node_id")]

        # Multiple candidates — prefer OPEN_URL node first
        open_url_candidates = [n for n in candidates
                               if n.get("node_type") == "OPEN_URL"]
        if open_url_candidates:
            return [open_url_candidates[0].get("node_id")]

        # Otherwise pick the topmost-leftmost by canvas position
        candidates.sort(key=lambda n: (n.get("position_x", 0) + n.get("position_y", 0)))
        return [candidates[0].get("node_id")]
    
    def _execute_from_nodes(
        self,
        node_ids: List[str],
        nodes: List[Dict[str, Any]],
        graph: Dict[str, List[Dict[str, Any]]],
        executed_nodes: Set[str],
        run_id: str
    ):
        """Execute workflow from given nodes"""
        # Build set of node_ids that have NO outgoing edges at all in the graph
        # (used to distinguish intentional terminal nodes from dead-ends)
        all_node_ids = {n.get("node_id") for n in nodes}

        for node_id in node_ids:
            if node_id in executed_nodes:
                continue

            node = next((n for n in nodes if n.get("node_id") == node_id), None)
            if not node:
                continue

            # Execute node
            result = self._execute_node(node, run_id)
            executed_nodes.add(node_id)

            # Store result in context
            self.execution_context.set_node_result(node_id, result)

            # Determine next nodes
            next_nodes = self._determine_next_nodes(node, graph, result)

            if next_nodes:
                self._execute_from_nodes(next_nodes, nodes, graph, executed_nodes, run_id)
            else:
                # No outgoing edges from this node.
                # If there are still unexecuted nodes downstream that are
                # reachable via other entry-chains, this is a dead-end caused
                # by a missing edge — raise an error.
                unexecuted = all_node_ids - executed_nodes
                if unexecuted:
                    label = node.get("label", node_id)
                    self._log("ERROR",
                        f"Broken workflow: node '{label}' has no outgoing edge "
                        f"but {len(unexecuted)} node(s) are unreachable: "
                        f"{', '.join(sorted(unexecuted))}",
                        node_id,
                        node_type=node.get("node_type"),
                        node_label=label,
                        node_status="failed"
                    )
                    raise RuntimeError(
                        f"Missing edge after '{label}' — "
                        f"{len(unexecuted)} node(s) unreachable: "
                        f"{', '.join(sorted(unexecuted))}. "
                        f"Please reconnect the workflow in the editor."
                    )
    
    def _determine_next_nodes(
        self,
        node: Dict[str, Any],
        graph: Dict[str, List[Dict[str, Any]]],
        result: Dict[str, Any]
    ) -> List[str]:
        """Determine next nodes based on node type"""
        node_id = node.get("node_id")
        edges = graph.get(node_id, [])
        return [edge["target"] for edge in edges]
    
    def _execute_node(
        self,
        node: Dict[str, Any],
        run_id: str
    ) -> Any:
        """Execute a single node"""
        node_id = node.get("node_id")
        node_type = node.get("node_type")
        node_label = node.get("label", "")
        config = node.get("config", {})

        node_start = time.time()
        self._log("INFO", f"Executing node: {node_label}", node_id,
                  node_type=node_type, node_label=node_label)

        try:
            result = None

            if node_type == NodeType.OPEN_URL.value:
                result = self._execute_navigate(config)

            elif node_type == NodeType.CLICK.value:
                result = self._execute_click(config)

            elif node_type == NodeType.TYPE.value:
                result = self._execute_type(config)

            elif node_type == NodeType.SELECT.value:
                result = self._execute_select(config)

            elif node_type == NodeType.DELAY.value:
                result = self._execute_delay(config)

            else:
                self._log("WARNING", f"Unknown node type: {node_type}", node_id,
                          node_type=node_type, node_label=node_label)

            # Capture screenshot if enabled
            if config.get("screenshot", False):
                self._capture_screenshot(node_id, run_id)

            duration_ms = round((time.time() - node_start) * 1000)
            self._log("INFO", f"Node executed successfully: {node_label}", node_id,
                      node_type=node_type, node_label=node_label,
                      duration_ms=duration_ms, node_status="passed")

            return result

        except Exception as e:
            duration_ms = round((time.time() - node_start) * 1000)
            self._log("ERROR", f"Node execution failed: {str(e)}", node_id,
                      node_type=node_type, node_label=node_label,
                      duration_ms=duration_ms, node_status="failed")
            # Capture error screenshot
            self._capture_screenshot(f"{node_id}_error", run_id)
            raise
    
    def _execute_navigate(self, config: Dict[str, Any]) -> Any:
        """Execute navigation"""
        url = config.get("url")
        timeout = config.get("timeout", settings.PLAYWRIGHT_TIMEOUT)
        
        self.page.goto(url, timeout=timeout)
        self.page.wait_for_load_state("networkidle")
        return {"url": url}
    
    def _parse_selector(self, selector: str):
        """Parse Playwright selector format and return appropriate locator"""
        import re
        
        # Handle chained selectors with >> (e.g., "role=row[name='X'] >> role=button")
        if " >> " in selector:
            parts = selector.split(" >> ")
            locator = None
            
            for part in parts:
                part_locator = self._parse_single_selector(part.strip())
                if locator is None:
                    locator = part_locator
                else:
                    # Chain the locators
                    locator = locator.locator(part_locator)
            
            return locator
        
        # Single selector
        return self._parse_single_selector(selector)
    
    def _parse_single_selector(self, selector: str):
        """Parse a single Playwright selector"""
        import re
        
        # Check for :nth-match(N) modifier
        nth_index = None
        nth_match = re.search(r':nth-match\((\d+)\)$', selector)
        if nth_match:
            nth_index = int(nth_match.group(1))
            selector = selector[:nth_match.start()]  # Remove :nth-match from selector
        
        # role=button[name="Find Flights"]
        role_match = re.match(r'role=(\w+)\[name=["\']([^"\']+)["\']\]', selector)
        if role_match:
            role, name = role_match.groups()
            locator = self.page.get_by_role(role, name=name)
            if nth_index is not None:
                locator = locator.nth(nth_index)
            return locator
        
        # role=button (without name)
        role_simple_match = re.match(r'role=(\w+)$', selector)
        if role_simple_match:
            role = role_simple_match.group(1)
            locator = self.page.get_by_role(role)
            if nth_index is not None:
                locator = locator.nth(nth_index)
            return locator
        
        # placeholder="First Last"
        placeholder_match = re.match(r'placeholder=["\']([^"\']+)["\']', selector)
        if placeholder_match:
            placeholder = placeholder_match.group(1)
            return self.page.get_by_placeholder(placeholder)
        
        # label="Email"
        label_match = re.match(r'label=["\']([^"\']+)["\']', selector)
        if label_match:
            label = label_match.group(1)
            return self.page.get_by_label(label)
        
        # text="Submit"
        text_match = re.match(r'text=["\']([^"\']+)["\']', selector)
        if text_match:
            text = text_match.group(1)
            return self.page.get_by_text(text)
        
        # Fallback to CSS/XPath selector
        locator = self.page.locator(selector)
        if nth_index is not None:
            locator = locator.nth(nth_index)
        return locator
    
    def _execute_click(self, config: Dict[str, Any]) -> Any:
        """Execute click with support for Playwright selectors"""
        selector = config.get("selector")
        timeout = config.get("timeout", settings.PLAYWRIGHT_TIMEOUT)
        
        # Skip if no selector provided
        if not selector:
            self._log("WARNING", "Click node has no selector, skipping")
            return {"skipped": True, "reason": "No selector provided"}
        
        try:
            locator = self._parse_selector(selector)
            locator.click(timeout=timeout)
            return {"clicked": selector}
        except Exception as e:
            self._log("ERROR", f"Click failed: {str(e)}")
            raise
    
    def _execute_type(self, config: Dict[str, Any]) -> Any:
        """Execute type/fill with realistic user interaction"""
        selector = config.get("selector")
        value = config.get("value", "")
        timeout = config.get("timeout", settings.PLAYWRIGHT_TIMEOUT)
        
        try:
            locator = self._parse_selector(selector)
            
            # Simulate realistic user interaction:
            # 1. Click to focus the field
            locator.click(timeout=timeout)
            
            # 2. Select all existing content (Ctrl+A)
            locator.press("Control+a")
            
            # 3. Type the new value (this will replace selected content)
            locator.fill(value)
            
            # 4. Press Tab to move to next field (triggers validation/events)
            locator.press("Tab")
            
            return {"typed": value}
        except Exception as e:
            self._log("ERROR", f"Type/fill failed: {str(e)}")
            raise
    
    def _execute_select(self, config: Dict[str, Any]) -> Any:
        """Execute select option with Playwright selector support"""
        selector = config.get("selector")
        value = config.get("value", "")
        timeout = config.get("timeout", settings.PLAYWRIGHT_TIMEOUT)
        
        try:
            locator = self._parse_selector(selector)
            locator.select_option(value, timeout=timeout)
            return {"selected": value}
        except Exception as e:
            self._log("ERROR", f"Select failed: {str(e)}")
            raise
    
    def _execute_delay(self, config: Dict[str, Any]) -> Any:
        """Execute delay"""
        duration = config.get("duration", 1000)  # milliseconds
        time.sleep(duration / 1000)
        return {"delayed": duration}
    
    def _capture_screenshot(self, node_id: str, run_id: str):
        """Capture screenshot"""
        if not self.page:
            return
        
        # Create screenshots directory
        screenshot_dir = os.path.join(settings.SCREENSHOT_DIR, run_id)
        os.makedirs(screenshot_dir, exist_ok=True)
        
        # Generate screenshot path
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        screenshot_path = os.path.join(screenshot_dir, f"{node_id}_{timestamp}.png")
        
        # Capture screenshot
        self.page.screenshot(path=screenshot_path, full_page=True)
        
        self.screenshots.append({
            "node_id": node_id,
            "path": screenshot_path,
            "timestamp": datetime.utcnow().isoformat()
        })
    
    def _log(self, level: str, message: str, node_id: str = None, **kwargs):
        """Add log entry"""
        entry = {
            "level": level,
            "message": message,
            "node_id": node_id,
            "timestamp": datetime.utcnow().isoformat(),
        }
        entry.update(kwargs)
        self.logs.append(entry)

# Made with Bob