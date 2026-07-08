"""
Desktop Recorder Service — records user desktop interactions using pynput.
The recorder runs in a background thread, captures mouse and keyboard events,
and serialises them into the same JSON node format used by the web recorder.

Dependencies: pynput (mouse + keyboard listener), pyautogui (execution / screenshot)
"""
from __future__ import annotations

import os
import threading
import time
from datetime import datetime
from typing import Any, Dict, List, Optional

# ── Lazy imports so the backend starts even without pyautogui/pynput installed ──
_PYNPUT_AVAILABLE = False
_PYAUTOGUI_AVAILABLE = False

try:
    from pynput import mouse as _pynput_mouse, keyboard as _pynput_keyboard
    _PYNPUT_AVAILABLE = True
except ImportError:
    pass

try:
    import pyautogui as _pyautogui  # noqa: F401
    _PYAUTOGUI_AVAILABLE = True
except ImportError:
    pass


# ── Helpers ────────────────────────────────────────────────────────────────────

def _ts() -> str:
    return datetime.utcnow().isoformat()


def _node(node_type: str, label: str, config: Dict[str, Any], node_id: int) -> Dict[str, Any]:
    return {
        "node_id": f"desktop_node_{node_id}",
        "node_type": node_type,
        "label": label,
        "position_x": 100,
        "position_y": 100 + node_id * 100,
        "config": config,
        "metadata": {"recorded_at": _ts(), "source": "desktop_recorder"},
    }


# ── Main recorder class ────────────────────────────────────────────────────────

class DesktopRecorderService:
    """Record desktop interactions (mouse + keyboard) and produce workflow nodes."""

    # Minimum pixel distance a mouse must travel before a MOVE event is recorded
    MOVE_THRESHOLD_PX: int = 30
    # Minimum time between consecutive key strokes before treating them as a new TYPE node
    TYPE_MERGE_WINDOW_S: float = 2.0

    def __init__(self) -> None:
        self.session_id: Optional[str] = None
        self.is_recording: bool = False
        self._actions: List[Dict[str, Any]] = []
        self._node_counter: int = 0

        # pynput listeners
        self._mouse_listener: Any = None
        self._keyboard_listener: Any = None

        # internal tracking
        self._last_mouse_pos: Optional[tuple] = None
        self._typing_buffer: str = ""
        self._last_key_time: float = 0.0
        self._pressed_keys: set = set()
        self._lock = threading.Lock()

    # ── Public API ─────────────────────────────────────────────────────────────

    def start(self, session_id: Optional[str] = None) -> Dict[str, Any]:
        if self.is_recording:
            raise RuntimeError("Desktop recording already in progress")
        if not _PYNPUT_AVAILABLE:
            raise RuntimeError(
                "pynput is not installed. Run: pip install pynput"
            )

        self.session_id = session_id or f"desktop_{int(time.time())}"
        self._actions = []
        self._node_counter = 0
        self._typing_buffer = ""
        self._last_key_time = 0.0
        self._pressed_keys = set()
        self._last_mouse_pos = None

        self._mouse_listener = _pynput_mouse.Listener(
            on_click=self._on_click,
            on_scroll=self._on_scroll,
            on_move=self._on_move,
        )
        self._keyboard_listener = _pynput_keyboard.Listener(
            on_press=self._on_key_press,
            on_release=self._on_key_release,
        )
        self._mouse_listener.start()
        self._keyboard_listener.start()
        self.is_recording = True

        return {
            "session_id": self.session_id,
            "status": "recording",
            "message": "Desktop recording started. Perform actions on your desktop.",
        }

    def stop(self) -> Dict[str, Any]:
        if not self.is_recording:
            raise RuntimeError("No desktop recording in progress")

        self._flush_typing_buffer()

        if self._mouse_listener:
            self._mouse_listener.stop()
        if self._keyboard_listener:
            self._keyboard_listener.stop()

        self.is_recording = False
        actions = list(self._actions)

        return {
            "session_id": self.session_id,
            "status": "stopped",
            "actions": actions,
            "actions_count": len(actions),
            "message": "Desktop recording stopped.",
        }

    def get_actions(self) -> List[Dict[str, Any]]:
        return list(self._actions)

    # ── Internal event handlers ────────────────────────────────────────────────

    def _on_click(self, x: int, y: int, button: Any, pressed: bool) -> None:
        if not pressed:
            return  # only record on press-down
        self._flush_typing_buffer()
        with self._lock:
            btn_name = str(button).replace("Button.", "")
            if btn_name == "left":
                click_type = "left"
                label = f"Left-click at ({x}, {y})"
            elif btn_name == "right":
                click_type = "right"
                label = f"Right-click at ({x}, {y})"
            else:
                click_type = "middle"
                label = f"Middle-click at ({x}, {y})"

            self._append(_node(
                "DESKTOP_CLICK",
                label,
                {"x": x, "y": y, "button": click_type, "clicks": 1},
                self._node_counter,
            ))

    def _on_scroll(self, x: int, y: int, dx: int, dy: int) -> None:
        with self._lock:
            direction = "down" if dy < 0 else "up"
            amount = abs(dy)
            self._append(_node(
                "DESKTOP_SCROLL",
                f"Scroll {direction} at ({x}, {y})",
                {"x": x, "y": y, "dx": dx, "dy": dy, "direction": direction, "amount": amount},
                self._node_counter,
            ))

    def _on_move(self, x: int, y: int) -> None:
        with self._lock:
            if self._last_mouse_pos is None:
                self._last_mouse_pos = (x, y)
                return
            lx, ly = self._last_mouse_pos
            dist = ((x - lx) ** 2 + (y - ly) ** 2) ** 0.5
            if dist >= self.MOVE_THRESHOLD_PX:
                self._last_mouse_pos = (x, y)
                # Only record moves if they are significant (dragging handled separately)

    def _on_key_press(self, key: Any) -> None:
        now = time.time()
        try:
            char = key.char
            if char is not None:
                # Regular printable key — merge into typing buffer
                elapsed = now - self._last_key_time
                if elapsed > self.TYPE_MERGE_WINDOW_S and self._typing_buffer:
                    self._flush_typing_buffer()
                self._typing_buffer += char
                self._last_key_time = now
                return
        except AttributeError:
            pass

        # Special / modifier key
        self._flush_typing_buffer()
        key_name = self._key_to_str(key)
        self._pressed_keys.add(key_name)

    def _on_key_release(self, key: Any) -> None:
        key_name = self._key_to_str(key)
        if key_name in self._pressed_keys:
            self._pressed_keys.discard(key_name)
            # If any modifier + another key combination was released, record hotkey
            modifiers = {"ctrl", "shift", "alt", "cmd"}
            held = {k for k in self._pressed_keys if k in modifiers}
            if held:
                combo = "+".join(sorted(held) + [key_name])
                with self._lock:
                    self._append(_node(
                        "DESKTOP_HOTKEY",
                        f"Hotkey: {combo}",
                        {"keys": combo},
                        self._node_counter,
                    ))
            elif key_name not in modifiers:
                # Standalone special key (Enter, Escape, Tab, arrows …)
                with self._lock:
                    self._append(_node(
                        "DESKTOP_HOTKEY",
                        f"Key: {key_name}",
                        {"keys": key_name},
                        self._node_counter,
                    ))

    # ── Helpers ────────────────────────────────────────────────────────────────

    def _flush_typing_buffer(self) -> None:
        if not self._typing_buffer:
            return
        with self._lock:
            text = self._typing_buffer
            self._typing_buffer = ""
            self._append(_node(
                "DESKTOP_TYPE",
                f"Type: {text[:40]}{'…' if len(text) > 40 else ''}",
                {"text": text},
                self._node_counter,
            ))

    def _append(self, action: Dict[str, Any]) -> None:
        self._node_counter += 1
        self._actions.append(action)

    @staticmethod
    def _key_to_str(key: Any) -> str:
        """Convert a pynput key to a readable string."""
        try:
            return key.char or str(key)
        except AttributeError:
            name = str(key).replace("Key.", "")
            # Normalise common modifier names
            mapping = {
                "ctrl_l": "ctrl", "ctrl_r": "ctrl",
                "shift_l": "shift", "shift_r": "shift",
                "alt_l": "alt", "alt_r": "alt",
                "cmd_l": "cmd", "cmd_r": "cmd",
            }
            return mapping.get(name, name)


# ── Script parser for PyAutoGUI-generated scripts ────────────────────────────

class PyAutoGUIScriptParser:
    """Parse a PyAutoGUI Python script into IBMTaskWeaver workflow nodes."""

    @staticmethod
    def parse(script: str) -> List[Dict[str, Any]]:
        import re

        nodes: List[Dict[str, Any]] = []
        node_id = 0

        for raw_line in script.splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#"):
                continue

            node: Optional[Dict[str, Any]] = None

            # pyautogui.click(x, y) or pyautogui.click(x, y, button='right')
            m = re.search(r'pyautogui\.click\((\d+),\s*(\d+)(?:.*?button=["\'](\w+)["\'])?\)', line)
            if m:
                x, y, btn = int(m.group(1)), int(m.group(2)), m.group(3) or "left"
                node = _node("DESKTOP_CLICK", f"{btn.capitalize()}-click at ({x}, {y})",
                             {"x": x, "y": y, "button": btn, "clicks": 1}, node_id)

            # pyautogui.doubleClick(x, y)
            elif re.search(r'pyautogui\.doubleClick\(', line):
                m2 = re.search(r'pyautogui\.doubleClick\((\d+),\s*(\d+)\)', line)
                if m2:
                    x, y = int(m2.group(1)), int(m2.group(2))
                    node = _node("DESKTOP_CLICK", f"Double-click at ({x}, {y})",
                                 {"x": x, "y": y, "button": "left", "clicks": 2}, node_id)

            # pyautogui.typewrite('text') / pyautogui.write('text')
            elif re.search(r'pyautogui\.(typewrite|write)\(', line):
                m2 = re.search(r'pyautogui\.(?:typewrite|write)\(["\']([^"\']*)["\']', line)
                if m2:
                    text = m2.group(1)
                    node = _node("DESKTOP_TYPE", f"Type: {text[:40]}", {"text": text}, node_id)

            # pyautogui.hotkey('ctrl', 'c')
            elif re.search(r'pyautogui\.hotkey\(', line):
                keys = re.findall(r'["\']([^"\']+)["\']', line)
                combo = "+".join(keys)
                node = _node("DESKTOP_HOTKEY", f"Hotkey: {combo}", {"keys": combo}, node_id)

            # pyautogui.press('key')
            elif re.search(r'pyautogui\.press\(', line):
                m2 = re.search(r'pyautogui\.press\(["\']([^"\']+)["\']', line)
                if m2:
                    key = m2.group(1)
                    node = _node("DESKTOP_HOTKEY", f"Key: {key}", {"keys": key}, node_id)

            # pyautogui.scroll(amount, x, y)
            elif re.search(r'pyautogui\.scroll\(', line):
                m2 = re.search(r'pyautogui\.scroll\((-?\d+)(?:,\s*(\d+),\s*(\d+))?\)', line)
                if m2:
                    dy = int(m2.group(1))
                    x = int(m2.group(2)) if m2.group(2) else 0
                    y = int(m2.group(3)) if m2.group(3) else 0
                    direction = "up" if dy > 0 else "down"
                    node = _node("DESKTOP_SCROLL", f"Scroll {direction}",
                                 {"x": x, "y": y, "dy": dy, "direction": direction, "amount": abs(dy)}, node_id)

            # pyautogui.moveTo(x, y)
            elif re.search(r'pyautogui\.moveTo\(', line):
                m2 = re.search(r'pyautogui\.moveTo\((\d+),\s*(\d+)\)', line)
                if m2:
                    x, y = int(m2.group(1)), int(m2.group(2))
                    node = _node("DESKTOP_MOVE", f"Move to ({x}, {y})",
                                 {"x": x, "y": y}, node_id)

            # pyautogui.dragTo(x, y) or pyautogui.drag(x, y)
            elif re.search(r'pyautogui\.drag(?:To)?\(', line):
                m2 = re.search(r'pyautogui\.drag(?:To)?\((\d+),\s*(\d+)\)', line)
                if m2:
                    x, y = int(m2.group(1)), int(m2.group(2))
                    node = _node("DESKTOP_DRAG", f"Drag to ({x}, {y})",
                                 {"to_x": x, "to_y": y}, node_id)

            # time.sleep(n)
            elif re.search(r'time\.sleep\(', line):
                m2 = re.search(r'time\.sleep\(([0-9.]+)\)', line)
                if m2:
                    secs = float(m2.group(1))
                    node = _node("DELAY", f"Wait {secs}s",
                                 {"duration": int(secs * 1000)}, node_id)

            # subprocess.Popen / os.startfile — launch app
            elif re.search(r'subprocess\.Popen|os\.startfile', line):
                m2 = re.search(r'["\']([^"\']+)["\']', line)
                app = m2.group(1) if m2 else "application"
                node = _node("DESKTOP_LAUNCH_APP", f"Launch {app}",
                             {"app_path": app}, node_id)

            if node:
                nodes.append(node)
                node_id += 1

        return nodes


# Made with Bob
