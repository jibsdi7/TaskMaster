# Frontend Replay Functionality Test Guide

## Prerequisites
✅ Backend server running on http://localhost:8000
✅ Frontend server running on http://localhost:5173
✅ Workflow 9 exists in database with OPEN_URL node configured

## Test Steps

### Step 1: Access the Frontend
1. Open your browser
2. Navigate to: `http://localhost:5173`
3. You should see the TaskMaster application

### Step 2: Login (if required)
1. If you see a login page, use development credentials or register
2. Development mode may allow bypass (check DEV_AUTH_BYPASS in config)

### Step 3: Navigate to Workflows
1. Click on "Workflows" in the navigation menu
2. You should see a list of workflows
3. Look for "Test_1" (Workflow ID: 9)

### Step 4: Open Workflow Editor
1. Click on "Test_1" workflow to open it
2. You should see the React Flow canvas with nodes:
   - OPEN_URL node (Open URL)
   - 5 CLICK nodes (Action 1-5)
3. Nodes should be visually connected with edges

### Step 5: Execute Workflow (Replay)
1. Look for the **"Run" button** in the toolbar (top of the page)
2. Click the "Run" button
3. **Expected behavior**:
   - A browser window should open (Chromium)
   - Browser navigates to https://blazedemo.com/index.php
   - You should see the automation happening in real-time
   - Browser performs clicks on the page
   - Execution may fail on invalid selectors (this is expected)

### Step 6: Monitor Execution
Watch for:
- ✅ Browser window opens
- ✅ Page loads (blazedemo.com)
- ✅ Actions are performed
- ⚠️ May stop on invalid selector (node_1 has incomplete selector)

### Step 7: Check Execution Results
After execution completes:
1. Check for success/failure notification
2. Look for execution logs (if UI displays them)
3. Check execution history page

## Expected Results

### ✅ Success Indicators
- Browser window opens and is visible
- Page navigation occurs
- At least 2 nodes execute successfully:
  1. OPEN_URL - Navigate to blazedemo.com
  2. First CLICK - Action 1

### ⚠️ Known Issues
- Execution may fail at node_1 (Action 2) due to invalid selector: `select[name=\`
- This is a data quality issue, not an executor problem
- Browser will close after error

### Execution Timeline
```
0s    - Click Run button
1-2s  - Browser window opens
3-5s  - Page loads (blazedemo.com)
5-10s - First click executes
10s+  - Second click fails (invalid selector)
```

## Troubleshooting

### Browser Doesn't Open
**Check**:
1. Backend server is running
2. Check backend console for errors
3. Verify PLAYWRIGHT_HEADLESS=False in backend/app/core/config.py

### Execution Completes Too Fast (0 seconds)
**Possible causes**:
1. Nodes have invalid selectors
2. Browser running in headless mode
3. Check backend logs for errors

### "Run" Button Not Found
**Check**:
1. You're on the Workflow Editor page (not Workflow List)
2. Toolbar component is loaded
3. Check browser console for React errors

## Alternative: Test via API

If frontend testing is difficult, you can test via API:

```bash
# Using curl (PowerShell)
Invoke-WebRequest -Uri "http://localhost:8000/api/workflows/9/execute" `
  -Method POST `
  -Headers @{"Authorization"="Bearer dev-token"; "Content-Type"="application/json"} `
  -Body "{}"

# Or using Python script
python test_workflow_9_visible_browser.py
```

## Verification Checklist

- [ ] Frontend loads successfully
- [ ] Workflow list displays
- [ ] Workflow 9 (Test_1) is visible
- [ ] Workflow editor opens with nodes
- [ ] Run button is visible in toolbar
- [ ] Clicking Run triggers execution
- [ ] Browser window opens (visible)
- [ ] Page navigates to blazedemo.com
- [ ] At least one action executes
- [ ] Execution completes (success or failure)
- [ ] Results are displayed in UI

## Screenshots to Capture

1. **Workflow List** - showing Test_1
2. **Workflow Editor** - showing nodes and edges
3. **Toolbar** - showing Run button
4. **Browser Window** - during execution
5. **Execution Results** - after completion

## Success Criteria

✅ **Minimum Success**:
- Browser opens when Run is clicked
- Page navigates to URL
- At least 1 node executes

✅ **Full Success**:
- All nodes with valid selectors execute
- Execution logs are displayed
- Results are shown in UI

## Notes

- The workflow has some invalid selectors, so full execution may not complete
- This is expected and demonstrates error handling
- The important test is that the browser opens and automation starts
- Re-recording the workflow with valid selectors would allow full execution

## Next Steps After Testing

If replay works from frontend:
1. ✅ Mark Phase 5 as complete
2. Record new workflow with valid selectors
3. Test advanced features (branching, loops)
4. Move to Phase 6 (Screenshot Engine)

If replay doesn't work:
1. Check backend logs for errors
2. Verify API endpoint is accessible
3. Check browser console for frontend errors
4. Review network tab for failed requests