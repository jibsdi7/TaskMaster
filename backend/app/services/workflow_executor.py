"""
Enhanced Workflow Execution Engine with Branching, Loops, and Parallel Execution.
Supports both Web (Playwright) and Desktop (PyAutoGUI) node types for hybrid automation.
"""
import asyncio
import re
from app.services.workflow_executor_sync import _is_sensitive_node, MASKED  # shared masking helpers
import sys
from typing import Dict, List, Any, Optional, Set
from datetime import datetime
from playwright.async_api import async_playwright, Browser, Page, BrowserContext
import os
import time

from app.core.config import settings
from app.db.models import NodeType, WorkflowStatus
from app.services.self_healing import AsyncSelfHealingLocator

# ── Optional PyAutoGUI import (desktop execution) ────────────────────────────
_PYAUTOGUI_AVAILABLE = False
try:
    import pyautogui as _pyautogui
    _pyautogui.FAILSAFE = True
    _pyautogui.PAUSE = 0.05
    _PYAUTOGUI_AVAILABLE = True
except ImportError:
    pass

_SUBPROCESS_AVAILABLE = True
import subprocess as _subprocess


def _resolve_single_locator(page, selector: str):
    """Resolve a single (non-chained) structured selector to a Playwright locator."""
    # :nth-match(N) modifier
    nth_index = None
    nth_m = re.search(r':nth-match\((\d+)\)$', selector)
    if nth_m:
        nth_index = int(nth_m.group(1))
        selector = selector[:nth_m.start()]

    # role=X[name="Y"]
    m = re.match(r'^role=([^\[]+)\[name=["\']([^"\']+)["\']\]', selector)
    if m:
        locator = page.get_by_role(m.group(1), name=m.group(2))
        return locator.nth(nth_index) if nth_index is not None else locator

    # role=X (no name)
    m = re.match(r'^role=(\S+)$', selector)
    if m:
        locator = page.get_by_role(m.group(1))
        return locator.nth(nth_index) if nth_index is not None else locator

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

    # fallback: CSS / XPath
    locator = page.locator(selector)
    return locator.nth(nth_index) if nth_index is not None else locator


def _resolve_locator(page, selector: str):
    """Return the correct Playwright locator object for a structured selector string.
    Supports chained selectors (role=X >> role=Y) and all formats from _extract_selector.
    """
    if " >> " in selector:
        parts = selector.split(" >> ")
        locator = _resolve_single_locator(page, parts[0].strip())
        for part in parts[1:]:
            locator = locator.locator(_resolve_single_locator(page, part.strip()))
        return locator
    return _resolve_single_locator(page, selector)

# Fix for Windows asyncio subprocess issue
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())


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


class WorkflowExecutor:
    """Enhanced DAG-based workflow execution engine"""
    
    def __init__(self):
        self.playwright = None
        self.browser: Optional[Browser] = None
        self.context: Optional[BrowserContext] = None
        self.page: Optional[Page] = None
        self.logs: List[Dict[str, Any]] = []
        self.screenshots: List[Dict[str, Any]] = []
        self.execution_context = ExecutionContext()
        
    async def execute(
        self,
        nodes: List[Dict[str, Any]],
        edges: List[Dict[str, Any]],
        inputs: Dict[str, Any] = None,
        run_id: str = None,
        step_delay_ms: int = 0,
    ) -> Dict[str, Any]:
        """Execute workflow with enhanced features"""
        if inputs is None:
            inputs = {}

        self.step_delay_ms = max(0, step_delay_ms)

        # Initialize execution context with inputs
        for key, value in inputs.items():
            self.execution_context.set_variable(key, value)
        
        start_time = datetime.utcnow()
        
        try:
            # Initialize browser
            await self._init_browser()
            
            # Build execution graph
            graph = self._build_graph(nodes, edges)
            
            # Find entry nodes (nodes with no incoming edges)
            entry_nodes = self._find_entry_nodes(nodes, edges)
            
            # Execute workflow starting from entry nodes
            executed_nodes: Set[str] = set()
            await self._execute_from_nodes(entry_nodes, nodes, graph, executed_nodes, run_id)
            
            # Close browser
            await self._close_browser()
            
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
            end_time = datetime.utcnow()
            duration = (end_time - start_time).total_seconds()
            
            self._log("ERROR", f"Workflow execution failed: {str(e)}")
            
            # Ensure browser is closed
            await self._close_browser()
            
            return {
                "status": WorkflowStatus.FAILED.value,
                "started_at": start_time,
                "completed_at": end_time,
                "duration_seconds": duration,
                "logs": self.logs,
                "screenshots": self.screenshots,
                "error_message": str(e),
                "result": {"success": False, "error": str(e)}
            }
    
    async def _init_browser(self):
        """Initialize Playwright browser"""
        self.playwright = await async_playwright().start()
        self.browser = await self.playwright.chromium.launch(
            headless=settings.PLAYWRIGHT_HEADLESS
        )
        self.context = await self.browser.new_context(
            viewport={"width": 1280, "height": 720}
        )
        self.page = await self.context.new_page()
        
        self._log("INFO", "Browser initialized")
    
    async def _close_browser(self):
        """Close Playwright browser"""
        if self.context:
            await self.context.close()
        if self.browser:
            await self.browser.close()
        if self.playwright:
            await self.playwright.stop()
        
        self._log("INFO", "Browser closed")
    
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
        would cause the executor to run two independent chains. Instead we
        always pick a single root: the OPEN_URL node if one exists among the
        candidates, otherwise the node with the smallest canvas position
        (position_x + position_y). The executor then follows edges from that
        single root and raises an error when it hits a dead-end.
        """
        target_nodes = {edge.get("target_node_id") for edge in edges}

        # Candidates: nodes with no incoming edge
        candidates = [n for n in nodes if n.get("node_id") not in target_nodes]

        if not candidates:
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
    
    async def _execute_from_nodes(
        self,
        node_ids: List[str],
        nodes: List[Dict[str, Any]],
        graph: Dict[str, List[Dict[str, Any]]],
        executed_nodes: Set[str],
        run_id: str,
        parallel: bool = False
    ):
        """Execute workflow from given nodes with optional parallel execution"""
        if parallel and len(node_ids) > 1:
            # Execute nodes in parallel
            tasks = []
            for node_id in node_ids:
                if node_id not in executed_nodes:
                    node = next((n for n in nodes if n.get("node_id") == node_id), None)
                    if node:
                        tasks.append(self._execute_single_node_flow(
                            node, nodes, graph, executed_nodes, run_id
                        ))
            
            if tasks:
                await asyncio.gather(*tasks)
        else:
            # Execute nodes sequentially
            for node_id in node_ids:
                if node_id in executed_nodes:
                    continue
                
                node = next((n for n in nodes if n.get("node_id") == node_id), None)
                if not node:
                    continue
                
                await self._execute_single_node_flow(node, nodes, graph, executed_nodes, run_id)
    
    async def _execute_single_node_flow(
        self,
        node: Dict[str, Any],
        nodes: List[Dict[str, Any]],
        graph: Dict[str, List[Dict[str, Any]]],
        executed_nodes: Set[str],
        run_id: str
    ):
        """Execute a single node and its downstream flow"""
        node_id = node.get("node_id")

        # Execute node with retry logic
        result = await self._execute_node_with_retry(node, run_id)
        executed_nodes.add(node_id)

        # Inter-node delay for speed control (skip for DELAY nodes — they manage their own wait)
        if self.step_delay_ms > 0 and node.get("node_type") != "DELAY":
            await asyncio.sleep(self.step_delay_ms / 1000)

        # Store result in context
        self.execution_context.set_node_result(node_id, result)

        # Determine next nodes based on node type and result
        next_nodes = await self._determine_next_nodes(node, graph, result)

        # Check if next nodes should be executed in parallel
        config = node.get("config", {})
        parallel_next = config.get("parallelExecution", False)

        if next_nodes:
            await self._execute_from_nodes(
                next_nodes, nodes, graph, executed_nodes, run_id, parallel=parallel_next
            )
        else:
            # Dead-end check: if unexecuted nodes remain, a connecting edge is missing
            all_node_ids = {n.get("node_id") for n in nodes}
            unexecuted = all_node_ids - executed_nodes
            if unexecuted:
                label = node.get("label", node_id)
                self._log("ERROR",
                    f"Broken workflow: node '{label}' has no outgoing edge "
                    f"but {len(unexecuted)} node(s) are unreachable: "
                    f"{', '.join(sorted(str(x) for x in unexecuted))}",
                    node_id,
                    node_type=node.get("node_type"),
                    node_label=label,
                    node_status="failed"
                )
                raise RuntimeError(
                    f"Missing edge after '{label}' — "
                    f"{len(unexecuted)} node(s) unreachable: "
                    f"{', '.join(sorted(str(x) for x in unexecuted))}. "
                    f"Please reconnect the workflow in the editor."
                )
    
    async def _execute_node_with_retry(
        self,
        node: Dict[str, Any],
        run_id: str,
        max_retries: int = None
    ) -> Dict[str, Any]:
        """Execute node with exponential backoff retry"""
        node_id = node.get("node_id")
        config = node.get("config", {})
        max_retries = max_retries or config.get("retryCount", 3)
        
        for attempt in range(max_retries + 1):
            try:
                result = await self._execute_node(node, run_id)
                return {"success": True, "result": result, "attempts": attempt + 1}
            
            except Exception as e:
                if attempt < max_retries:
                    # Exponential backoff: 2^attempt seconds
                    wait_time = 2 ** attempt
                    self._log(
                        "WARNING",
                        f"Node execution failed (attempt {attempt + 1}/{max_retries + 1}). "
                        f"Retrying in {wait_time}s... Error: {str(e)}",
                        node_id
                    )
                    await asyncio.sleep(wait_time)
                else:
                    self._log("ERROR", f"Node execution failed after {max_retries + 1} attempts: {str(e)}", node_id)
                    raise
    
    async def _determine_next_nodes(
        self,
        node: Dict[str, Any],
        graph: Dict[str, List[Dict[str, Any]]],
        result: Dict[str, Any]
    ) -> List[str]:
        """Determine next nodes based on node type and execution result"""
        node_id = node.get("node_id")
        node_type = node.get("node_type")
        config = node.get("config", {})
        
        # Get outgoing edges
        edges = graph.get(node_id, [])
        
        # Handle conditional branching
        if node_type == NodeType.IF_CONDITION.value:
            condition_result = await self._evaluate_condition(config, result)
            
            # Find true/false branches
            for edge in edges:
                edge_condition = edge.get("condition")
                if edge_condition == "true" and condition_result:
                    return [edge["target"]]
                elif edge_condition == "false" and not condition_result:
                    return [edge["target"]]
            
            return []
        
        # Handle loop
        elif node_type == NodeType.LOOP.value:
            loop_count = self.execution_context.loop_counters.get(node_id, 0)
            max_iterations = config.get("maxIterations", 10)
            
            if loop_count < max_iterations:
                self.execution_context.loop_counters[node_id] = loop_count + 1
                # Return loop body nodes
                return [edge["target"] for edge in edges if edge.get("condition") == "loop_body"]
            else:
                # Exit loop
                self.execution_context.loop_counters[node_id] = 0
                return [edge["target"] for edge in edges if edge.get("condition") == "loop_exit"]
        
        # Default: return all next nodes
        return [edge["target"] for edge in edges]
    
    async def _evaluate_condition(
        self,
        config: Dict[str, Any],
        result: Dict[str, Any]
    ) -> bool:
        """Evaluate conditional expression"""
        condition_type = config.get("conditionType", "element_exists")
        
        if condition_type == "element_exists":
            selector = config.get("selector")
            try:
                element = await self.page.locator(selector).first
                return element is not None
            except:
                return False
        
        elif condition_type == "variable_equals":
            var_name = config.get("variableName")
            expected_value = config.get("expectedValue")
            actual_value = self.execution_context.get_variable(var_name)
            return actual_value == expected_value
        
        elif condition_type == "custom":
            # Evaluate custom expression (simplified)
            expression = config.get("expression", "")
            try:
                # Safe evaluation with limited scope
                return eval(expression, {"__builtins__": {}}, self.execution_context.variables)
            except:
                return False
        
        return False
    
    async def _execute_node(
        self,
        node: Dict[str, Any],
        run_id: str
    ) -> Any:
        """Execute a single node"""
        import time as _time
        node_id = node.get("node_id")
        node_type = node.get("node_type")
        node_label = node.get("label", "")
        config = node.get("config", {})

        node_start = _time.time()
        self._log("INFO", f"Executing node: {node_label}", node_id,
                  node_type=node_type, node_label=node_label)

        try:
            result = None

            if node_type == NodeType.OPEN_URL.value:
                result = await self._execute_navigate(config)

            elif node_type == NodeType.CLICK.value:
                result = await self._execute_click(config)

            elif node_type == NodeType.TYPE.value:
                result = await self._execute_type(config)

            elif node_type == NodeType.SELECT.value:
                result = await self._execute_select(config)

            elif node_type == NodeType.HOVER.value:
                result = await self._execute_hover(config)

            elif node_type == NodeType.UPLOAD_FILE.value:
                result = await self._execute_upload(config)

            elif node_type == NodeType.DELAY.value:
                result = await self._execute_delay(config)

            elif node_type == NodeType.BACK.value:
                result = await self._execute_back()

            elif node_type == NodeType.REFRESH.value:
                result = await self._execute_refresh()

            elif node_type == NodeType.VARIABLE.value:
                result = await self._execute_variable(config)

            elif node_type == NodeType.API_REQUEST.value:
                result = await self._execute_api_request(config)

            elif node_type == NodeType.IF_CONDITION.value:
                result = {"condition_node": True}

            elif node_type == NodeType.LOOP.value:
                result = {"loop_node": True}

            # ── Desktop nodes (PyAutoGUI) ─────────────────────────────────────
            elif node_type == NodeType.DESKTOP_CLICK.value:
                result = await self._execute_desktop_click(config)

            elif node_type == NodeType.DESKTOP_TYPE.value:
                result = await self._execute_desktop_type(config)

            elif node_type == NodeType.DESKTOP_HOTKEY.value:
                result = await self._execute_desktop_hotkey(config)

            elif node_type == NodeType.DESKTOP_MOVE.value:
                result = await self._execute_desktop_move(config)

            elif node_type == NodeType.DESKTOP_DRAG.value:
                result = await self._execute_desktop_drag(config)

            elif node_type == NodeType.DESKTOP_SCROLL.value:
                result = await self._execute_desktop_scroll(config)

            elif node_type == NodeType.DESKTOP_SCREENSHOT.value:
                result = await self._execute_desktop_screenshot(config, node_id, run_id)

            elif node_type == NodeType.DESKTOP_FIND_IMAGE.value:
                result = await self._execute_desktop_find_image(config)

            elif node_type == NodeType.DESKTOP_LAUNCH_APP.value:
                result = await self._execute_desktop_launch_app(config)

            elif node_type == NodeType.DESKTOP_CLOSE_APP.value:
                result = await self._execute_desktop_close_app(config)

            elif node_type == NodeType.DESKTOP_SWITCH_WINDOW.value:
                result = await self._execute_desktop_switch_window(config)

            else:
                self._log("WARNING", f"Unknown node type: {node_type}", node_id,
                          node_type=node_type, node_label=node_label)

            screenshot_path = await self._capture_screenshot(node_id, run_id)

            duration_ms = round((_time.time() - node_start) * 1000)
            self._log("INFO", f"Node executed successfully: {node_label}", node_id,
                      node_type=node_type, node_label=node_label,
                      duration_ms=duration_ms, node_status="passed",
                      screenshot_path=screenshot_path)

            return result

        except Exception as e:
            duration_ms = round((_time.time() - node_start) * 1000)
            self._log("ERROR", f"Node execution failed: {str(e)}", node_id,
                      node_type=node_type, node_label=node_label,
                      duration_ms=duration_ms, node_status="failed")
            # Capture error screenshot
            error_screenshot_path = await self._capture_screenshot(f"{node_id}_error", run_id)
            self.logs[-1]["screenshot_path"] = error_screenshot_path
            raise
    
    async def _execute_navigate(self, config: Dict[str, Any]) -> Any:
        """Execute navigation"""
        url = config.get("url")
        timeout = config.get("timeout", settings.PLAYWRIGHT_TIMEOUT)
        
        await self.page.goto(url, timeout=timeout)
        await self.page.wait_for_load_state("networkidle")
        return {"url": url}
    
    async def _execute_click(self, config: Dict[str, Any]) -> Any:
        """Execute click with self-healing selector fallback."""
        selector = config.get("selector")
        timeout = config.get("timeout", settings.PLAYWRIGHT_TIMEOUT)

        if not selector:
            self._log("WARNING", "Click node has no selector, skipping")
            return {"skipped": True, "reason": "No selector provided"}

        healer = AsyncSelfHealingLocator(self.page, self._log, timeout_ms=timeout)
        try:
            locator, used_selector, recovery_log = await healer.find(selector)
            await locator.click(timeout=timeout)
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
                    await self.page.wait_for_load_state("domcontentloaded", timeout=timeout)
                except Exception:
                    pass
                return {"clicked": selector, "navigated": True}
            self._log("ERROR", f"Click failed after self-healing: {str(e)}")
            raise

    async def _execute_type(self, config: Dict[str, Any]) -> Any:
        """Execute type/fill with self-healing selector fallback."""
        selector = config.get("selector")
        value = config.get("value", "")
        timeout = config.get("timeout", settings.PLAYWRIGHT_TIMEOUT)
        sensitive = _is_sensitive_node(config.get("label", ""), selector)
        display_value = MASKED if sensitive else value

        healer = AsyncSelfHealingLocator(self.page, self._log, timeout_ms=timeout)
        try:
            locator, used_selector, recovery_log = await healer.find(selector)
            await locator.fill(value, timeout=timeout)
            return {
                "typed": display_value,
                "used_selector": used_selector,
                "self_healed": used_selector != selector,
                "recovery_log": recovery_log,
            }
        except Exception as e:
            self._log("ERROR", f"Type/fill failed after self-healing: {str(e)}")
            raise
    
    async def _execute_select(self, config: Dict[str, Any]) -> Any:
        """Execute select option"""
        selector = config.get("selector")
        value = config.get("value", "")
        timeout = config.get("timeout", settings.PLAYWRIGHT_TIMEOUT)
        
        await self.page.locator(selector).select_option(value, timeout=timeout)
        return {"selected": value}
    
    async def _execute_hover(self, config: Dict[str, Any]) -> Any:
        """Execute hover"""
        selector = config.get("selector")
        timeout = config.get("timeout", settings.PLAYWRIGHT_TIMEOUT)
        
        await self.page.locator(selector).hover(timeout=timeout)
        return {"hovered": selector}
    
    async def _execute_upload(self, config: Dict[str, Any]) -> Any:
        """Execute file upload"""
        selector = config.get("selector")
        file_path = config.get("file_path", "")
        timeout = config.get("timeout", settings.PLAYWRIGHT_TIMEOUT)
        
        if file_path:
            await self.page.locator(selector).set_input_files(file_path, timeout=timeout)
        
        return {"uploaded": file_path}
    
    async def _execute_delay(self, config: Dict[str, Any]) -> Any:
        """Execute delay"""
        duration = config.get("duration", 1000)  # milliseconds
        await asyncio.sleep(duration / 1000)
        return {"delayed": duration}
    
    async def _execute_back(self) -> Any:
        """Execute back navigation"""
        await self.page.go_back()
        return {"action": "back"}
    
    async def _execute_refresh(self) -> Any:
        """Execute page refresh"""
        await self.page.reload()
        return {"action": "refresh"}
    
    async def _execute_variable(self, config: Dict[str, Any]) -> Any:
        """Execute variable operation"""
        operation = config.get("operation", "set")
        var_name = config.get("variableName")
        
        if operation == "set":
            value = config.get("value")
            self.execution_context.set_variable(var_name, value)
            return {"variable": var_name, "value": value}
        
        elif operation == "get":
            value = self.execution_context.get_variable(var_name)
            return {"variable": var_name, "value": value}
        
        return {}
    
    async def _execute_api_request(self, config: Dict[str, Any]) -> Any:
        """Execute API request"""
        import aiohttp
        
        method = config.get("method", "GET")
        url = config.get("url")
        headers = config.get("headers", {})
        body = config.get("body")
        
        async with aiohttp.ClientSession() as session:
            async with session.request(method, url, headers=headers, json=body) as response:
                data = await response.json()
                
                # Store response in variable if specified
                var_name = config.get("responseVariable")
                if var_name:
                    self.execution_context.set_variable(var_name, data)
                
                return {"status": response.status, "data": data}
    
    async def _capture_screenshot(self, node_id: str, run_id: str) -> Optional[str]:
        """Capture screenshot"""
        if not self.page:
            return None
        
        # Create screenshots directory
        screenshot_dir = os.path.join(settings.SCREENSHOT_DIR, run_id)
        os.makedirs(screenshot_dir, exist_ok=True)
        
        # Generate screenshot path
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        screenshot_path = os.path.join(screenshot_dir, f"{node_id}_{timestamp}.png")
        
        # Capture screenshot
        await self.page.screenshot(path=screenshot_path, full_page=True)
        
        self.screenshots.append({
            "node_id": node_id,
            "path": screenshot_path,
            "timestamp": datetime.utcnow().isoformat()
        })
        return screenshot_path.replace("\\", "/")
    
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

    # ── Desktop execution helpers (run in executor to avoid blocking event loop) ──

    def _require_pyautogui(self):
        if not _PYAUTOGUI_AVAILABLE:
            raise RuntimeError(
                "pyautogui is not installed. Run: pip install pyautogui"
            )

    async def _execute_desktop_click(self, config: Dict[str, Any]) -> Any:
        self._require_pyautogui()
        x = config.get("x", 0)
        y = config.get("y", 0)
        btn = config.get("button", "left")
        clicks = config.get("clicks", 1)
        loop = asyncio.get_event_loop()
        if clicks == 2:
            await loop.run_in_executor(None, lambda: _pyautogui.doubleClick(x, y))
        else:
            await loop.run_in_executor(None, lambda: _pyautogui.click(x, y, button=btn))
        return {"clicked": f"({x}, {y})", "button": btn, "clicks": clicks}

    async def _execute_desktop_type(self, config: Dict[str, Any]) -> Any:
        self._require_pyautogui()
        text = config.get("text", "")
        loop = asyncio.get_event_loop()
        # typewrite handles printable chars; for arbitrary unicode use pyperclip+hotkey
        try:
            import pyperclip
            pyperclip.copy(text)
            await loop.run_in_executor(None, lambda: _pyautogui.hotkey("ctrl", "v"))
        except ImportError:
            await loop.run_in_executor(None, lambda: _pyautogui.typewrite(text, interval=0.05))
        return {"typed": text}

    async def _execute_desktop_hotkey(self, config: Dict[str, Any]) -> Any:
        self._require_pyautogui()
        keys_raw = config.get("keys", "")
        keys = [k.strip() for k in keys_raw.split("+") if k.strip()]
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, lambda: _pyautogui.hotkey(*keys))
        return {"hotkey": keys_raw}

    async def _execute_desktop_move(self, config: Dict[str, Any]) -> Any:
        self._require_pyautogui()
        x = config.get("x", 0)
        y = config.get("y", 0)
        duration = config.get("duration", 0.25)
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, lambda: _pyautogui.moveTo(x, y, duration=duration))
        return {"moved_to": f"({x}, {y})"}

    async def _execute_desktop_drag(self, config: Dict[str, Any]) -> Any:
        self._require_pyautogui()
        from_x = config.get("from_x", 0)
        from_y = config.get("from_y", 0)
        to_x = config.get("to_x", 0)
        to_y = config.get("to_y", 0)
        duration = config.get("duration", 0.5)
        loop = asyncio.get_event_loop()
        if from_x or from_y:
            await loop.run_in_executor(None, lambda: _pyautogui.moveTo(from_x, from_y))
        await loop.run_in_executor(
            None, lambda: _pyautogui.dragTo(to_x, to_y, duration=duration, button="left")
        )
        return {"dragged_to": f"({to_x}, {to_y})"}

    async def _execute_desktop_scroll(self, config: Dict[str, Any]) -> Any:
        self._require_pyautogui()
        x = config.get("x", 0)
        y = config.get("y", 0)
        dy = config.get("dy", -3)
        loop = asyncio.get_event_loop()
        if x or y:
            await loop.run_in_executor(None, lambda: _pyautogui.moveTo(x, y))
        await loop.run_in_executor(None, lambda: _pyautogui.scroll(dy))
        return {"scrolled": dy}

    async def _execute_desktop_screenshot(
        self, config: Dict[str, Any], node_id: str, run_id: str
    ) -> Any:
        self._require_pyautogui()
        screenshot_dir = os.path.join(settings.SCREENSHOT_DIR, run_id)
        os.makedirs(screenshot_dir, exist_ok=True)
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        path = config.get("path") or os.path.join(screenshot_dir, f"desktop_{node_id}_{timestamp}.png")
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, lambda: _pyautogui.screenshot(path))
        self.screenshots.append({"node_id": node_id, "path": path, "timestamp": datetime.utcnow().isoformat()})
        return {"screenshot_path": path}

    async def _execute_desktop_find_image(self, config: Dict[str, Any]) -> Any:
        self._require_pyautogui()
        image_path = config.get("image_path", "")
        confidence = config.get("confidence", 0.9)
        loop = asyncio.get_event_loop()
        try:
            location = await loop.run_in_executor(
                None, lambda: _pyautogui.locateOnScreen(image_path, confidence=confidence)
            )
            if location:
                center = _pyautogui.center(location)
                await loop.run_in_executor(None, lambda: _pyautogui.click(center))
                return {"found": True, "location": str(location)}
            return {"found": False}
        except Exception as e:
            return {"found": False, "error": str(e)}

    async def _execute_desktop_launch_app(self, config: Dict[str, Any]) -> Any:
        app_path = config.get("app_path", "")
        wait_after = config.get("wait_after_ms", 1500)
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, lambda: _subprocess.Popen(app_path, shell=True))
        await asyncio.sleep(wait_after / 1000)
        return {"launched": app_path}

    async def _execute_desktop_close_app(self, config: Dict[str, Any]) -> Any:
        window_title = config.get("window_title", "")
        loop = asyncio.get_event_loop()
        try:
            import win32gui
            import win32con
            hwnd = await loop.run_in_executor(None, lambda: win32gui.FindWindow(None, window_title))
            if hwnd:
                win32gui.PostMessage(hwnd, win32con.WM_CLOSE, 0, 0)
                return {"closed": window_title}
        except ImportError:
            pass
        # Fallback: Alt+F4
        self._require_pyautogui()
        await loop.run_in_executor(None, lambda: _pyautogui.hotkey("alt", "f4"))
        return {"closed_via": "alt+f4"}

    async def _execute_desktop_switch_window(self, config: Dict[str, Any]) -> Any:
        window_title = config.get("window_title", "")
        loop = asyncio.get_event_loop()
        try:
            import win32gui
            hwnd = await loop.run_in_executor(None, lambda: win32gui.FindWindow(None, window_title))
            if hwnd:
                import win32con
                win32gui.ShowWindow(hwnd, win32con.SW_RESTORE)
                win32gui.SetForegroundWindow(hwnd)
                return {"focused": window_title}
        except ImportError:
            pass
        return {"focused": None, "error": "pywin32 not available"}

# Made with Bob
