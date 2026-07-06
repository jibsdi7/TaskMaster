from app.services.desktop_recorder import DesktopRecorderService, PyAutoGUIScriptParser
print('[OK] desktop_recorder imports')

script = """
import pyautogui
pyautogui.click(100, 200)
pyautogui.typewrite('Hello World', interval=0.05)
pyautogui.hotkey('ctrl', 'c')
pyautogui.scroll(-3)
pyautogui.moveTo(500, 400)
pyautogui.dragTo(600, 300)
pyautogui.screenshot('test.png')
import subprocess
subprocess.Popen(r'notepad.exe')
import time
time.sleep(1.5)
"""
nodes = PyAutoGUIScriptParser.parse(script)
print(f'[OK] PyAutoGUIScriptParser: {len(nodes)} nodes')
for n in nodes:
    print(f"  {n['node_type']:30s} | {n['label']}")
