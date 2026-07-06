"""
Synchronous Workflow Execution Engine for Windows compatibility.
Uses Playwright's sync API for web nodes and PyAutoGUI for desktop nodes.
Browser is only launched when the workflow contains web nodes.
"""
import time
import subprocess as _subprocess
from typing import Dict, List, Any, Optional, Set
from datetime import datetime
from playwright.sync_api import sync_playwright, Browser, Page, BrowserContext
import os

from app.core.config import settings
from app.db.models import NodeType, WorkflowStatus
from app.services.self_healing import SelfHealingLocator

# ── Optional PyAutoGUI (desktop execution) ───────────────────────────────────
_PYAUTOGUI_AVAILABLE = False
try:
    import pyautogui as _pyautogui
    _pyautogui.FAILSAFE = True
    _pyautogui.PAUSE = 0.05
    _PYAUTOGUI_AVAILABLE = True
except ImportError:
    pass

_DESKTOP_NODE_TYPES = {
    NodeType.DESKTOP_CLICK.value,
    NodeType.DESKTOP_TYPE.value,
    NodeType.DESKTOP_HOTKEY.value,
    NodeType.DESKTOP_MOVE.value,
    NodeType.DESKTOP_DRAG.value,
    NodeType.DESKTOP_SCROLL.value,
    NodeType.DESKTOP_SCREENSHOT.value,
    NodeType.DESKTOP_FIND_IMAGE.value,
    NodeType.DESKTOP_LAUNCH_APP.value,
    NodeType.DESKTOP_CLOSE_APP.value,
    NodeType.DESKTOP_SWITCH_WINDOW.value,
}

_WEB_NODE_TYPES = {
    NodeType.OPEN_URL.value,
    NodeType.CLICK.value,
    NodeType.TYPE.value,
    NodeType.SELECT.value,
    NodeType.HOVER.value,
    NodeType.UPLOAD_FILE.value,
    NodeType.BACK.value,
    NodeType.REFRESH.value,
}


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
        run_id: str = None,
        step_delay_ms: int = 0,
    ) -> Dict[str, Any]:
        """Execute workflow synchronously"""
        self.step_delay_ms = max(0, step_delay_ms)
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

        # Only launch a browser if the workflow contains web nodes
        has_web_nodes = any(n.get("node_type") in _WEB_NODE_TYPES for n in nodes)

        try:
            if has_web_nodes:
                print(f"[EXECUTOR] Initializing browser (web nodes detected)...")
                self._init_browser()
                print(f"[EXECUTOR] Browser initialized successfully")
            else:
                print(f"[EXECUTOR] Desktop-only workflow — skipping browser launch")

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

            if has_web_nodes:
                print(f"[EXECUTOR] Closing browser...")
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

            # Only close browser if one was actually opened
            if has_web_nodes:
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

            # Inter-node delay for speed control (skip for DELAY nodes)
            if self.step_delay_ms > 0 and node.get("node_type") != "DELAY":
                time.sleep(self.step_delay_ms / 1000)

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

            # ── Desktop nodes (PyAutoGUI) ─────────────────────────────────
            elif node_type == NodeType.DESKTOP_CLICK.value:
                result = self._execute_desktop_click(config)

            elif node_type == NodeType.DESKTOP_TYPE.value:
                result = self._execute_desktop_type(config)

            elif node_type == NodeType.DESKTOP_HOTKEY.value:
                result = self._execute_desktop_hotkey(config)

            elif node_type == NodeType.DESKTOP_MOVE.value:
                result = self._execute_desktop_move(config)

            elif node_type == NodeType.DESKTOP_DRAG.value:
                result = self._execute_desktop_drag(config)

            elif node_type == NodeType.DESKTOP_SCROLL.value:
                result = self._execute_desktop_scroll(config)

            elif node_type == NodeType.DESKTOP_SCREENSHOT.value:
                result = self._execute_desktop_screenshot(config, node_id, run_id)

            elif node_type == NodeType.DESKTOP_FIND_IMAGE.value:
                result = self._execute_desktop_find_image(config)

            elif node_type == NodeType.DESKTOP_LAUNCH_APP.value:
                result = self._execute_desktop_launch_app(config)

            elif node_type == NodeType.DESKTOP_CLOSE_APP.value:
                result = self._execute_desktop_close_app(config)

            elif node_type == NodeType.DESKTOP_SWITCH_WINDOW.value:
                result = self._execute_desktop_switch_window(config)

            else:
                self._log("WARNING", f"Unknown node type: {node_type}", node_id,
                          node_type=node_type, node_label=node_label)

            screenshot_path = self._capture_screenshot(node_id, run_id)

            duration_ms = round((time.time() - node_start) * 1000)
            self._log("INFO", f"Node executed successfully: {node_label}", node_id,
                      node_type=node_type, node_label=node_label,
                      duration_ms=duration_ms, node_status="passed",
                      screenshot_path=screenshot_path)

            return result

        except Exception as e:
            duration_ms = round((time.time() - node_start) * 1000)
            self._log("ERROR", f"Node execution failed: {str(e)}", node_id,
                      node_type=node_type, node_label=node_label,
                      duration_ms=duration_ms, node_status="failed")
            # Capture error screenshot
            error_screenshot_path = self._capture_screenshot(f"{node_id}_error", run_id)
            self.logs[-1]["screenshot_path"] = error_screenshot_path
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
    
    @staticmethod
    def _is_strict_mode_violation(error: Exception) -> bool:
        """Return True when Playwright refuses because a selector matched >1 element."""
        return "strict mode violation" in str(error)

    def _resolve_strict_locator(self, locator, selector: str):
        """
        When a selector matches multiple elements, fall back to the first visible one.
        Logs a warning so the user knows the selector is ambiguous.
        """
        self._log(
            "WARNING",
            f"Selector '{selector}' matched multiple elements (strict mode violation). "
            "Using the first visible match. Consider making the selector more specific "
            "in the workflow node config.",
        )
        return locator.first

    def _execute_click(self, config: Dict[str, Any]) -> Any:
        """Execute click with self-healing selector fallback."""
        selector = config.get("selector")
        timeout = config.get("timeout", settings.PLAYWRIGHT_TIMEOUT)

        if not selector:
            self._log("WARNING", "Click node has no selector, skipping")
            return {"skipped": True, "reason": "No selector provided"}

        healer = SelfHealingLocator(self.page, self._log, timeout_ms=timeout)
        try:
            locator, used_selector, recovery_log = healer.find(selector)
            try:
                locator.click(timeout=timeout)
            except Exception as e:
                if self._is_strict_mode_violation(e):
                    locator = self._resolve_strict_locator(locator, used_selector)
                    locator.click(timeout=timeout)
                else:
                    raise
            return {
                "clicked": selector,
                "used_selector": used_selector,
                "self_healed": used_selector != selector,
                "recovery_log": recovery_log,
            }
        except Exception as e:
            # TargetClosedError — click triggered full-page navigation; the click worked.
            if "Target page, context or browser has been closed" in str(e):
                try:
                    self.page.wait_for_load_state("domcontentloaded", timeout=timeout)
                except Exception:
                    pass
                return {"clicked": selector, "navigated": True}
            self._log("ERROR", f"Click failed after self-healing: {str(e)}")
            raise

    def _execute_type(self, config: Dict[str, Any]) -> Any:
        """Execute type/fill with self-healing selector fallback."""
        selector = config.get("selector")
        value = config.get("value", "")
        timeout = config.get("timeout", settings.PLAYWRIGHT_TIMEOUT)

        healer = SelfHealingLocator(self.page, self._log, timeout_ms=timeout)
        try:
            locator, used_selector, recovery_log = healer.find(selector)
            try:
                locator.click(timeout=timeout)
            except Exception as e:
                if self._is_strict_mode_violation(e):
                    locator = self._resolve_strict_locator(locator, used_selector)
                    locator.click(timeout=timeout)
                else:
                    raise
            locator.press("Control+a")
            locator.fill(value)
            locator.press("Tab")
            return {
                "typed": value,
                "used_selector": used_selector,
                "self_healed": used_selector != selector,
                "recovery_log": recovery_log,
            }
        except Exception as e:
            self._log("ERROR", f"Type/fill failed after self-healing: {str(e)}")
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
    
    def _capture_screenshot(self, node_id: str, run_id: str) -> Optional[str]:
        """Capture screenshot — uses Playwright page if available, otherwise pyautogui."""
        screenshot_dir = os.path.join(settings.SCREENSHOT_DIR, run_id)
        os.makedirs(screenshot_dir, exist_ok=True)
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        screenshot_path = os.path.join(screenshot_dir, f"{node_id}_{timestamp}.png")

        if self.page:
            self.page.screenshot(path=screenshot_path, full_page=True)
        elif _PYAUTOGUI_AVAILABLE:
            _pyautogui.screenshot(screenshot_path)
        else:
            return None  # nothing to capture

        self.screenshots.append({
            "node_id": node_id,
            "path": screenshot_path,
            "timestamp": datetime.utcnow().isoformat()
        })
        return screenshot_path.replace("\\", "/")

    # ── Desktop execution helpers ─────────────────────────────────────────────

    def _require_pyautogui(self):
        if not _PYAUTOGUI_AVAILABLE:
            raise RuntimeError("pyautogui is not installed. Run: pip install pyautogui")

    def _execute_desktop_click(self, config: Dict[str, Any]) -> Any:
        self._require_pyautogui()
        x = config.get("x", 0)
        y = config.get("y", 0)
        btn = config.get("button", "left")
        clicks = config.get("clicks", 1)
        if clicks == 2:
            _pyautogui.doubleClick(x, y)
        else:
            _pyautogui.click(x, y, button=btn)
        return {"clicked": f"({x}, {y})", "button": btn, "clicks": clicks}

    def _execute_desktop_type(self, config: Dict[str, Any]) -> Any:
        self._require_pyautogui()
        text = config.get("text", "")
        try:
            import pyperclip
            pyperclip.copy(text)
            _pyautogui.hotkey("ctrl", "v")
        except ImportError:
            _pyautogui.typewrite(text, interval=0.05)
        return {"typed": text}

    def _execute_desktop_hotkey(self, config: Dict[str, Any]) -> Any:
        self._require_pyautogui()
        keys_raw = config.get("keys", "")
        keys = [k.strip() for k in keys_raw.split("+") if k.strip()]
        _pyautogui.hotkey(*keys)
        return {"hotkey": keys_raw}

    def _execute_desktop_move(self, config: Dict[str, Any]) -> Any:
        self._require_pyautogui()
        x = config.get("x", 0)
        y = config.get("y", 0)
        duration = config.get("duration", 0.25)
        _pyautogui.moveTo(x, y, duration=duration)
        return {"moved_to": f"({x}, {y})"}

    def _execute_desktop_drag(self, config: Dict[str, Any]) -> Any:
        self._require_pyautogui()
        from_x = config.get("from_x", 0)
        from_y = config.get("from_y", 0)
        to_x = config.get("to_x", 0)
        to_y = config.get("to_y", 0)
        duration = config.get("duration", 0.5)
        if from_x or from_y:
            _pyautogui.moveTo(from_x, from_y)
        _pyautogui.dragTo(to_x, to_y, duration=duration, button="left")
        return {"dragged_to": f"({to_x}, {to_y})"}

    def _execute_desktop_scroll(self, config: Dict[str, Any]) -> Any:
        self._require_pyautogui()
        x = config.get("x", 0)
        y = config.get("y", 0)
        dy = config.get("dy", -3)
        if x or y:
            _pyautogui.moveTo(x, y)
        _pyautogui.scroll(dy)
        return {"scrolled": dy}

    def _execute_desktop_screenshot(self, config: Dict[str, Any], node_id: str, run_id: str) -> Any:
        self._require_pyautogui()
        screenshot_dir = os.path.join(settings.SCREENSHOT_DIR, run_id)
        os.makedirs(screenshot_dir, exist_ok=True)
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        path = config.get("path") or os.path.join(screenshot_dir, f"desktop_{node_id}_{timestamp}.png")
        _pyautogui.screenshot(path)
        self.screenshots.append({"node_id": node_id, "path": path, "timestamp": datetime.utcnow().isoformat()})
        return {"screenshot_path": path}

    def _execute_desktop_find_image(self, config: Dict[str, Any]) -> Any:
        self._require_pyautogui()
        image_path = config.get("image_path", "")
        confidence = config.get("confidence", 0.9)
        try:
            location = _pyautogui.locateOnScreen(image_path, confidence=confidence)
            if location:
                _pyautogui.click(_pyautogui.center(location))
                return {"found": True, "location": str(location)}
            return {"found": False}
        except Exception as e:
            return {"found": False, "error": str(e)}

    def _execute_desktop_launch_app(self, config: Dict[str, Any]) -> Any:
        app_path = config.get("app_path", "")
        wait_after = config.get("wait_after_ms", 1500)
        _subprocess.Popen(app_path, shell=True)
        time.sleep(wait_after / 1000)
        return {"launched": app_path}

    def _execute_desktop_close_app(self, config: Dict[str, Any]) -> Any:
        window_title = config.get("window_title", "")
        try:
            import win32gui, win32con
            hwnd = win32gui.FindWindow(None, window_title)
            if hwnd:
                win32gui.PostMessage(hwnd, win32con.WM_CLOSE, 0, 0)
                return {"closed": window_title}
        except ImportError:
            pass
        self._require_pyautogui()
        _pyautogui.hotkey("alt", "f4")
        return {"closed_via": "alt+f4"}

    def _execute_desktop_switch_window(self, config: Dict[str, Any]) -> Any:
        window_title = config.get("window_title", "")
        try:
            import win32gui, win32con
            hwnd = win32gui.FindWindow(None, window_title)
            if hwnd:
                win32gui.ShowWindow(hwnd, win32con.SW_RESTORE)
                win32gui.SetForegroundWindow(hwnd)
                return {"focused": window_title}
        except ImportError:
            pass
        return {"focused": None, "error": "pywin32 not available"}

    
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