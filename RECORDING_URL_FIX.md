# Recording URL Fix - Automatic OPEN_URL Node Injection

## Problem
When recording workflows using Playwright Codegen, the initial navigation to the URL is not captured as a node. This results in workflows that have action nodes (CLICK, TYPE, SELECT) but no OPEN_URL node at the beginning.

## Solution
Modified `backend/app/api/recorder.py` to automatically inject an OPEN_URL node at the beginning of recorded workflows if one doesn't exist.

## How It Works

### 1. Recording Process
When you start recording:
- You provide a URL (e.g., `https://blazedemo.com/index.php`)
- This URL is stored in `session['url']`
- Playwright Codegen opens and records your actions

### 2. Saving Workflow
When you stop recording and save as workflow:
- The system checks if any OPEN_URL node exists in the recorded actions
- If NO OPEN_URL node is found:
  - Automatically creates an OPEN_URL node with the recorded URL
  - Inserts it at position 0 (beginning of workflow)
  - Creates an edge connecting it to the first recorded action node

### 3. Result
Your workflow now has:
```
[OPEN_URL] → [Action 1] → [Action 2] → [Action 3] → ...
```

## Code Changes

### File: `backend/app/api/recorder.py` (lines 153-185)

```python
# Check if there's an OPEN_URL node, if not add one at the beginning
has_open_url = any(node.get("node_type") == models.NodeType.OPEN_URL for node in workflow_data["nodes"])

if not has_open_url and session.get("url"):
    # Insert OPEN_URL node at the beginning
    open_url_node = {
        "node_id": "open_url_start",
        "node_type": models.NodeType.OPEN_URL,
        "label": "Open URL",
        "config": {
            "url": session["url"],
            "timeout": 30000
        },
        "position": {"x": 100, "y": 100},
        "metadata": {"auto_generated": True, "source": "recorder"}
    }
    workflow_data["nodes"].insert(0, open_url_node)
    
    # Update edges to connect OPEN_URL to first original node
    if len(workflow_data["nodes"]) > 1:
        first_original_node_id = workflow_data["nodes"][1]["node_id"]
        new_edge = {
            "edge_id": "edge_open_url_start",
            "source_node_id": "open_url_start",
            "target_node_id": first_original_node_id
        }
        workflow_data["edges"].insert(0, new_edge)
```

## Testing

### Test New Recording
1. Go to http://localhost:5173
2. Click "New Workflow"
3. Enter workflow name: "Test with URL"
4. Enter URL: `https://blazedemo.com/index.php`
5. Click "Start Recording"
6. Perform some actions in the Playwright browser
7. Close Playwright Inspector
8. Go to Workflows → Edit the workflow
9. **Verify**: First node should be "Open URL" with the URL visible

### Existing Workflows
For workflows already recorded (like workflow 12):
- They will NOT have the OPEN_URL node automatically added
- When you click "Run", you'll be prompted to enter a URL
- The system will inject an OPEN_URL node dynamically during execution

## Benefits

1. **Complete Workflows**: Every recorded workflow now has a starting point
2. **Visible URL**: The URL is clearly visible in the workflow editor
3. **Editable**: You can edit the URL in the Node Inspector
4. **Reusable**: Workflows can be run on different URLs by editing the OPEN_URL node
5. **No Manual Work**: Automatic injection means no manual node creation needed

## Node Inspector Display

When you click on the OPEN_URL node in the editor, the Node Inspector shows:
- **Node Type**: OPEN_URL
- **Label**: Open URL
- **URL**: The recorded URL (editable)
- **Timeout**: 30000ms (editable)
- **Metadata**: Shows it was auto-generated from recorder

## Future Recordings

All new workflows recorded from now on will automatically include the OPEN_URL node at the beginning!