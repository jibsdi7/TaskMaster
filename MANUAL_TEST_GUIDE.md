# Manual E2E Test Guide: BlazeDemo Workflow

This guide walks through testing the complete workflow lifecycle manually.

## Prerequisites
- Backend server running on http://localhost:8000
- Frontend server running on http://localhost:5173
- Both servers should be started

## Test Steps

### Step 1: Record a Workflow

1. Open browser and navigate to: http://localhost:5173
2. Login (DEV_AUTH_BYPASS is enabled, any credentials work)
3. Click on "Workflows" in the navigation
4. Click "New Workflow" button
5. Enter workflow name: "BlazeDemo Flight Booking"
6. Enter URL: https://blazedemo.com/index.php
7. Click "Start Recording"

**A new browser window will open with Playwright Inspector**

8. In the Playwright browser, perform these actions:
   - Select "Boston" from the departure city dropdown
   - Select "London" from the destination city dropdown
   - Click the "Find Flights" button
   - Wait for the flights page to load
   - Click "Choose This Flight" on the first flight
   - Wait for the purchase page to load

9. Close the Playwright Inspector window
10. The workflow should be automatically saved

### Step 2: Edit the Workflow

1. In the Workflows list, find "BlazeDemo Flight Booking"
2. Click the "Edit" button (pencil icon)
3. The workflow canvas should display with nodes:
   - SELECT nodes for departure/destination cities
   - CLICK nodes for buttons
4. Verify each node has:
   - **Selector**: CSS selector for the element
   - **Value** (for SELECT nodes): The selected value
   - **Timeout**: Default 30000ms

### Step 3: Verify Node Details

Check that nodes contain necessary information:

**SELECT Node (Departure City)**
- Type: SELECT
- Selector: `select[name="fromPort"]`
- Value: `Boston`
- Timeout: 30000

**SELECT Node (Destination City)**
- Type: SELECT  
- Selector: `select[name="toPort"]`
- Value: `London`
- Timeout: 30000

**CLICK Node (Find Flights)**
- Type: CLICK
- Selector: `input[type="submit"]`
- Timeout: 30000

**CLICK Node (Choose Flight)**
- Type: CLICK
- Selector: `table tbody tr:first-child input[type="submit"]` or similar
- Timeout: 30000

### Step 4: Replay the Workflow

1. Go back to the Workflows list
2. Find "BlazeDemo Flight Booking"
3. Click the "Run" button (play icon)
4. When prompted, enter URL: `https://blazedemo.com/index.php`
5. Click OK

**The workflow will execute:**
- A new browser window opens
- Navigates to BlazeDemo
- Selects Boston as departure
- Selects London as destination
- Clicks Find Flights
- Selects first flight
- Completes successfully

6. You'll be redirected to the Execution Details page
7. Verify:
   - Status: COMPLETED
   - Duration: Shows execution time
   - Logs: Shows each step executed
   - Screenshots: May show captured screenshots

## Expected Results

✅ **Recording**: Workflow saved with all action nodes
✅ **Editing**: All nodes visible with correct selectors and values
✅ **Verification**: Each node has necessary config (selector, value, timeout)
✅ **Replay**: Workflow executes successfully and completes all actions

## Common Issues

### Issue: Nodes missing selectors
**Solution**: The recorder may not capture selectors for some elements. Edit the node and add the selector manually.

### Issue: Workflow fails during replay
**Solution**: 
- Check if selectors are correct
- Verify the website structure hasn't changed
- Increase timeout values if needed
- Ensure URL is correct

### Issue: No OPEN_URL node
**Solution**: The system now automatically adds an OPEN_URL node if missing when you provide a URL during execution.

## Automated Test

For automated testing, run:
```bash
python test_blazedemo_automated.py
```

This will:
1. Create a workflow programmatically
2. Verify node structure
3. Execute the workflow
4. Check execution results