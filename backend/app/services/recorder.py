"""
Playwright Codegen Recorder Service
"""
import asyncio
import subprocess
import os
import tempfile
from typing import Dict, List, Any, Optional
from datetime import datetime
import re

from app.core.config import settings
from app.db.models import NodeType


class RecorderService:
    """Service for recording browser interactions using Playwright Codegen"""
    
    def __init__(self):
        self.process: Optional[subprocess.Popen] = None
        self.session_id: Optional[str] = None
        self.output_file: Optional[str] = None
        self.is_recording = False
        
    async def start(self, url: str, language: str = "python") -> Dict[str, Any]:
        """Start Playwright Codegen recording session"""
        if self.is_recording:
            raise Exception("Recording already in progress")
        
        # Generate session ID
        self.session_id = f"session_{datetime.utcnow().timestamp()}"
        
        # Create temporary file for output
        temp_dir = tempfile.gettempdir()
        self.output_file = os.path.join(temp_dir, f"{self.session_id}.py")
        
        # Build Playwright codegen command
        cmd = [
            "playwright",
            "codegen",
            url,
            "--target", language,
            "--output", self.output_file
        ]
        
        try:
            # Launch Playwright codegen
            self.process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                creationflags=subprocess.CREATE_NEW_CONSOLE if os.name == 'nt' else 0
            )
            
            # Wait a moment to check if process started successfully
            await asyncio.sleep(1)
            
            if self.process.poll() is not None:
                # Process already terminated
                stdout, stderr = self.process.communicate()
                raise Exception(f"Playwright failed to start: {stderr or stdout}")
            
            self.is_recording = True
            
            return {
                "session_id": self.session_id,
                "status": "recording",
                "url": url,
                "output_file": self.output_file,
                "message": "Playwright Codegen started. Perform your actions in the browser.",
                "command": " ".join(cmd)
            }
        except FileNotFoundError:
            raise Exception("Playwright not found. Please install: pip install playwright && playwright install chromium")
        except Exception as e:
            self.is_recording = False
            raise Exception(f"Failed to start Playwright: {str(e)}")
    
    async def stop(self) -> Dict[str, Any]:
        """Stop recording and return generated script"""
        if not self.is_recording:
            raise Exception("No recording in progress")
        
        # Terminate the process
        if self.process:
            self.process.terminate()
            try:
                self.process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                self.process.kill()
        
        self.is_recording = False
        
        # Read generated script
        script_content = ""
        if self.output_file and os.path.exists(self.output_file):
            with open(self.output_file, 'r') as f:
                script_content = f.read()
        
        result = {
            "session_id": self.session_id,
            "status": "stopped",
            "playwright_script": script_content,
            "message": "Recording stopped successfully"
        }
        
        # Reset state
        self.process = None
        self.session_id = None
        
        return result
    
    def is_active(self) -> bool:
        """Check if recording is active"""
        return self.is_recording
    
    def get_session_id(self) -> Optional[str]:
        """Get current session ID"""
        return self.session_id


class PlaywrightScriptParser:
    """Parser to convert Playwright scripts into workflow nodes"""
    
    @staticmethod
    def parse(script: str) -> List[Dict[str, Any]]:
        """Parse Playwright script into workflow nodes"""
        nodes = []
        lines = script.split('\n')
        node_id = 0
        
        # Pre-process to identify click+fill patterns
        i = 0
        skip_next_click = set()
        while i < len(lines):
            line = lines[i].strip()
            # Check if this is a click followed by fill on same selector
            if '.click()' in line and i + 1 < len(lines):
                next_line = lines[i + 1].strip()
                if '.fill(' in next_line:
                    # Extract selectors from both lines
                    click_selector = PlaywrightScriptParser._extract_selector(line)
                    fill_selector = PlaywrightScriptParser._extract_selector(next_line)
                    # If same selector, skip the click (it's just focusing the field)
                    if click_selector == fill_selector:
                        skip_next_click.add(i)
            i += 1
        
        # Parse lines
        for idx, line in enumerate(lines):
            line = line.strip()
            
            # Skip empty lines and comments
            if not line or line.startswith('#') or line.startswith('//'):
                continue
            
            # Parse page.goto()
            if 'page.goto' in line:
                url = PlaywrightScriptParser._extract_string(line)
                if url:
                    nodes.append({
                        "node_id": f"node_{node_id}",
                        "node_type": NodeType.OPEN_URL.value,
                        "label": f"Navigate to {url}",
                        "position_x": 100,
                        "position_y": 100 + (node_id * 100),
                        "config": {
                            "url": url,
                            "timeout": settings.PLAYWRIGHT_TIMEOUT
                        },
                        "metadata": {"original_line": line}
                    })
                    node_id += 1
            
            # Parse page.click() or .click()
            elif '.click()' in line:
                # Skip if this click is followed by fill on same selector
                if idx in skip_next_click:
                    continue
                    
                selector = PlaywrightScriptParser._extract_selector(line)
                # Extract better label from name parameter if available
                label = PlaywrightScriptParser._extract_label(line, selector, "Click")
                nodes.append({
                    "node_id": f"node_{node_id}",
                    "node_type": NodeType.CLICK.value,
                    "label": label,
                    "position_x": 100,
                    "position_y": 100 + (node_id * 100),
                    "config": {
                        "selector": selector,
                        "timeout": settings.PLAYWRIGHT_TIMEOUT
                    },
                    "metadata": {"original_line": line}
                })
                node_id += 1
            
            # Parse page.fill() or .fill()
            elif '.fill(' in line:
                selector = PlaywrightScriptParser._extract_selector(line)
                value = PlaywrightScriptParser._extract_fill_value(line)
                nodes.append({
                    "node_id": f"node_{node_id}",
                    "node_type": NodeType.TYPE.value,
                    "label": f"Fill {selector}",
                    "position_x": 100,
                    "position_y": 100 + (node_id * 100),
                    "config": {
                        "selector": selector,
                        "value": value,
                        "timeout": settings.PLAYWRIGHT_TIMEOUT
                    },
                    "metadata": {"original_line": line}
                })
                node_id += 1
            
            # Parse page.check() or .check()
            elif '.check()' in line:
                selector = PlaywrightScriptParser._extract_selector(line)
                nodes.append({
                    "node_id": f"node_{node_id}",
                    "node_type": NodeType.CLICK.value,
                    "label": f"Check {selector}",
                    "position_x": 100,
                    "position_y": 100 + (node_id * 100),
                    "config": {
                        "selector": selector,
                        "action": "check",
                        "timeout": settings.PLAYWRIGHT_TIMEOUT
                    },
                    "metadata": {"original_line": line}
                })
                node_id += 1
            
            # Parse page.selectOption() or .selectOption()
            elif '.selectOption(' in line or '.select_option(' in line:
                selector = PlaywrightScriptParser._extract_selector(line)
                value = PlaywrightScriptParser._extract_string(line, start_after='selectOption')
                nodes.append({
                    "node_id": f"node_{node_id}",
                    "node_type": NodeType.SELECT.value,
                    "label": f"Select {selector}",
                    "position_x": 100,
                    "position_y": 100 + (node_id * 100),
                    "config": {
                        "selector": selector,
                        "value": value,
                        "timeout": settings.PLAYWRIGHT_TIMEOUT
                    },
                    "metadata": {"original_line": line}
                })
                node_id += 1
            
            # Parse page.setInputFiles() or .setInputFiles()
            elif '.setInputFiles(' in line or '.set_input_files(' in line:
                selector = PlaywrightScriptParser._extract_selector(line)
                nodes.append({
                    "node_id": f"node_{node_id}",
                    "node_type": NodeType.UPLOAD_FILE.value,
                    "label": f"Upload file to {selector}",
                    "position_x": 100,
                    "position_y": 100 + (node_id * 100),
                    "config": {
                        "selector": selector,
                        "timeout": settings.PLAYWRIGHT_TIMEOUT
                    },
                    "metadata": {"original_line": line}
                })
                node_id += 1
        
        return nodes
    
    @staticmethod
    def _extract_string(line: str, start_after: Optional[str] = None) -> str:
        """Extract string from line"""
        # Match strings in quotes
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
        """Extract selector from Playwright line in proper format for execution"""
        # For chained locators like: page.get_by_role("row", name="X").get_by_role("button")
        # We need to extract the FULL chain, not just the first part
        
        # Check if this is a chained locator (multiple get_by_* calls)
        get_by_count = line.count('get_by_')
        
        if get_by_count > 1:
            # Chained locator - extract the full chain for better context
            # Example: get_by_role("row", name="Choose This Flight 4346").get_by_role("button")
            # We'll extract: "role=row[name='Choose This Flight 4346'] >> role=button"
            
            parts = []
            # Find all get_by_role calls with their parameters
            for match in re.finditer(r'get_by_role\(["\']([^"\']+)["\'](?:,\s*name=["\']([^"\']+)["\'])?\)', line):
                role = match.group(1)
                name = match.group(2)
                if name:
                    parts.append(f"role={role}[name='{name}']")
                else:
                    parts.append(f"role={role}")
            
            if parts:
                return " >> ".join(parts)
        
        # Single locator - extract with proper Playwright selector format
        
        # get_by_role with name parameter
        # Example: page.get_by_role("button", name="Find Flights") -> role=button[name="Find Flights"]
        role_name_match = re.search(r'get_by_role\(["\']([^"\']+)["\'],\s*name=["\']([^"\']+)["\']', line)
        if role_name_match:
            role = role_name_match.group(1)
            name = role_name_match.group(2)
            return f'role={role}[name="{name}"]'
        
        # get_by_placeholder
        # Example: page.get_by_placeholder("First Last") -> placeholder="First Last"
        placeholder_match = re.search(r'get_by_placeholder\(["\']([^"\']+)["\']', line)
        if placeholder_match:
            return f'placeholder="{placeholder_match.group(1)}"'
        
        # get_by_label
        # Example: page.get_by_label("Email") -> label="Email"
        label_match = re.search(r'get_by_label\(["\']([^"\']+)["\']', line)
        if label_match:
            return f'label="{label_match.group(1)}"'
        
        # get_by_text
        # Example: page.get_by_text("Submit") -> text="Submit"
        text_match = re.search(r'get_by_text\(["\']([^"\']+)["\']', line)
        if text_match:
            return f'text="{text_match.group(1)}"'
        
        # get_by_role without name
        # Example: page.get_by_role("button") -> role=button
        role_match = re.search(r'get_by_role\(["\']([^"\']+)["\']', line)
        if role_match:
            return f'role={role_match.group(1)}'
        
        # locator with CSS/XPath selector
        # Example: page.locator("#submit-btn") -> #submit-btn
        locator_match = re.search(r'locator\(["\']([^"\']+)["\']', line)
        if locator_match:
            return locator_match.group(1)
        
        # Fallback to generic string extraction
        return PlaywrightScriptParser._extract_string(line, None)
    
    @staticmethod
    def _extract_fill_value(line: str) -> str:
        """Extract fill value from line"""
        # Find the value passed to fill()
        match = re.search(r'\.fill\(["\']([^"\']+)["\']', line)
        if match:
            return match.group(1)
        return ""
    
    @staticmethod
    def _extract_label(line: str, selector: str, action: str) -> str:
        """Extract a descriptive label for the action"""
        # Check for name parameter in get_by_role
        name_match = re.search(r'name=["\']([^"\']+)["\']', line)
        if name_match:
            role_match = re.search(r'get_by_role\(["\']([^"\']+)["\']', line)
            role = role_match.group(1) if role_match else "element"
            return f"{action} {role}: {name_match.group(1)}"
        
        # Use selector as label if available
        if selector:
            return f"{action} {selector}"
        
        # Fallback to just action
        return action

# Made with Bob
