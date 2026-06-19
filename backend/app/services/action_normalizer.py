"""
Action Normalizer Service
Converts Playwright actions into canonical JSON format
"""
from typing import Dict, Any, List
from datetime import datetime
import uuid


class ActionNormalizer:
    """Normalize Playwright actions to canonical format"""
    
    @staticmethod
    def normalize(action: Dict[str, Any]) -> Dict[str, Any]:
        """
        Normalize a single action to canonical format
        
        Args:
            action: Raw action data
            
        Returns:
            Normalized action in canonical format
        """
        action_id = action.get("id") or f"action_{uuid.uuid4().hex[:8]}"
        timestamp = action.get("timestamp") or datetime.utcnow().isoformat()
        
        return {
            "id": action_id,
            "type": action.get("type", "unknown"),
            "selector": action.get("selector", ""),
            "value": action.get("value"),
            "url": action.get("url"),
            "timestamp": timestamp,
            "metadata": action.get("metadata", {})
        }
    
    @staticmethod
    def normalize_batch(actions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Normalize a batch of actions
        
        Args:
            actions: List of raw actions
            
        Returns:
            List of normalized actions
        """
        return [ActionNormalizer.normalize(action) for action in actions]
    
    @staticmethod
    def from_playwright_script(script_line: str, line_number: int) -> Dict[str, Any]:
        """
        Convert a Playwright script line to canonical action format
        
        Args:
            script_line: Single line from Playwright script
            line_number: Line number in script
            
        Returns:
            Normalized action
        """
        action = {
            "id": f"action_{line_number}",
            "timestamp": datetime.utcnow().isoformat(),
            "metadata": {
                "original_line": script_line,
                "line_number": line_number
            }
        }
        
        # Parse different action types
        if "page.goto" in script_line or ".goto(" in script_line:
            action["type"] = "navigate"
            action["url"] = ActionNormalizer._extract_string(script_line)
            
        elif ".click()" in script_line:
            action["type"] = "click"
            action["selector"] = ActionNormalizer._extract_selector(script_line)
            
        elif ".fill(" in script_line:
            action["type"] = "type"
            action["selector"] = ActionNormalizer._extract_selector(script_line)
            action["value"] = ActionNormalizer._extract_fill_value(script_line)
            
        elif ".check()" in script_line:
            action["type"] = "check"
            action["selector"] = ActionNormalizer._extract_selector(script_line)
            
        elif ".uncheck()" in script_line:
            action["type"] = "uncheck"
            action["selector"] = ActionNormalizer._extract_selector(script_line)
            
        elif ".selectOption(" in script_line or ".select_option(" in script_line:
            action["type"] = "select"
            action["selector"] = ActionNormalizer._extract_selector(script_line)
            action["value"] = ActionNormalizer._extract_string(script_line, start_after="selectOption")
            
        elif ".hover()" in script_line:
            action["type"] = "hover"
            action["selector"] = ActionNormalizer._extract_selector(script_line)
            
        elif ".setInputFiles(" in script_line or ".set_input_files(" in script_line:
            action["type"] = "upload"
            action["selector"] = ActionNormalizer._extract_selector(script_line)
            
        elif ".dblclick()" in script_line:
            action["type"] = "double_click"
            action["selector"] = ActionNormalizer._extract_selector(script_line)
            
        elif ".press(" in script_line:
            action["type"] = "press_key"
            action["selector"] = ActionNormalizer._extract_selector(script_line)
            action["value"] = ActionNormalizer._extract_string(script_line, start_after="press")
            
        else:
            action["type"] = "unknown"
            action["selector"] = ""
        
        return action
    
    @staticmethod
    def _extract_string(line: str, start_after: str | None = None) -> str:
        """Extract string from line"""
        import re
        
        if start_after:
            idx = line.find(start_after)
            if idx != -1:
                line = line[idx:]
        
        match = re.search(r'["\']([^"\']+)["\']', line)
        if match:
            return match.group(1)
        return ""
    
    @staticmethod
    def _extract_selector(line: str) -> str:
        """Extract selector from Playwright line"""
        import re
        
        patterns = [
            r'getByRole\(["\']([^"\']+)["\']',
            r'getByLabel\(["\']([^"\']+)["\']',
            r'getByText\(["\']([^"\']+)["\']',
            r'getByPlaceholder\(["\']([^"\']+)["\']',
            r'getByTestId\(["\']([^"\']+)["\']',
            r'locator\(["\']([^"\']+)["\']',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, line)
            if match:
                return match.group(1)
        
        return ActionNormalizer._extract_string(line)
    
    @staticmethod
    def _extract_fill_value(line: str) -> str:
        """Extract fill value from line"""
        import re
        
        match = re.search(r'\.fill\(["\']([^"\']+)["\']', line)
        if match:
            return match.group(1)
        return ""


# Made with Bob