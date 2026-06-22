"""
Enhanced Workflow Execution Engine with Branching, Loops, and Parallel Execution
"""
import asyncio
import sys
from typing import Dict, List, Any, Optional, Set
from datetime import datetime
from playwright.async_api import async_playwright, Browser, Page, BrowserContext
import os
import time

from app.core.config import settings
from app.db.models import NodeType, WorkflowStatus

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
        run_id: str = None
    ) -> Dict[str, Any]:
        """Execute workflow with enhanced features"""
        if inputs is None:
            inputs = {}
        
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
        """Find nodes with no incoming edges"""
        all_nodes = {node.get("node_id") for node in nodes}
        target_nodes = {edge.get("target_node_id") for edge in edges}
        return list(all_nodes - target_nodes)
    
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
        
        # Store result in context
        self.execution_context.set_node_result(node_id, result)
        
        # Determine next nodes based on node type and result
        next_nodes = await self._determine_next_nodes(node, graph, result)
        
        # Check if next nodes should be executed in parallel
        config = node.get("config", {})
        parallel_next = config.get("parallelExecution", False)
        
        # Execute next nodes
        if next_nodes:
            await self._execute_from_nodes(
                next_nodes, nodes, graph, executed_nodes, run_id, parallel=parallel_next
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
        node_id = node.get("node_id")
        node_type = node.get("node_type")
        config = node.get("config", {})
        
        self._log("INFO", f"Executing node: {node.get('label')}", node_id)
        
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
            
            else:
                self._log("WARNING", f"Unknown node type: {node_type}", node_id)
            
            # Capture screenshot if enabled
            if config.get("screenshot", False):
                await self._capture_screenshot(node_id, run_id)
            
            self._log("INFO", f"Node executed successfully: {node.get('label')}", node_id)
            
            return result
            
        except Exception as e:
            self._log("ERROR", f"Node execution failed: {str(e)}", node_id)
            # Capture error screenshot
            await self._capture_screenshot(f"{node_id}_error", run_id)
            raise
    
    async def _execute_navigate(self, config: Dict[str, Any]) -> Any:
        """Execute navigation"""
        url = config.get("url")
        timeout = config.get("timeout", settings.PLAYWRIGHT_TIMEOUT)
        
        await self.page.goto(url, timeout=timeout)
        await self.page.wait_for_load_state("networkidle")
        return {"url": url}
    
    async def _execute_click(self, config: Dict[str, Any]) -> Any:
        """Execute click"""
        selector = config.get("selector")
        timeout = config.get("timeout", settings.PLAYWRIGHT_TIMEOUT)
        
        # Try different locator strategies
        try:
            await self.page.get_by_role("button", name=selector).click(timeout=timeout)
        except:
            try:
                await self.page.get_by_text(selector).click(timeout=timeout)
            except:
                await self.page.locator(selector).click(timeout=timeout)
        
        return {"clicked": selector}
    
    async def _execute_type(self, config: Dict[str, Any]) -> Any:
        """Execute type/fill"""
        selector = config.get("selector")
        value = config.get("value", "")
        timeout = config.get("timeout", settings.PLAYWRIGHT_TIMEOUT)
        
        # Try different locator strategies
        try:
            await self.page.get_by_role("textbox", name=selector).fill(value, timeout=timeout)
        except:
            try:
                await self.page.get_by_label(selector).fill(value, timeout=timeout)
            except:
                await self.page.locator(selector).fill(value, timeout=timeout)
        
        return {"typed": value}
    
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
    
    async def _capture_screenshot(self, node_id: str, run_id: str):
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
        await self.page.screenshot(path=screenshot_path, full_page=True)
        
        self.screenshots.append({
            "node_id": node_id,
            "path": screenshot_path,
            "timestamp": datetime.utcnow().isoformat()
        })
    
    def _log(self, level: str, message: str, node_id: str = None):
        """Add log entry"""
        self.logs.append({
            "level": level,
            "message": message,
            "node_id": node_id,
            "timestamp": datetime.utcnow().isoformat()
        })

# Made with Bob
