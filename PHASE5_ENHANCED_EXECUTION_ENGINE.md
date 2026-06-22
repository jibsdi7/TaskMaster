# Phase 5: Enhanced Workflow Execution Engine - Documentation

## Overview
Phase 5 introduces significant enhancements to the TaskMaster workflow execution engine, adding advanced control flow, retry logic, parallel execution, and cross-platform compatibility.

## New Features

### 1. Dual Executor Architecture

#### Async Executor (Linux/macOS)
- **File**: `backend/app/services/workflow_executor.py`
- **Use Case**: Production environments on Linux/macOS
- **Features**: Full async support, better performance

#### Sync Executor (Windows)
- **File**: `backend/app/services/workflow_executor_sync.py`
- **Use Case**: Development on Windows
- **Features**: Avoids Windows asyncio subprocess issues

The API automatically selects the appropriate executor based on the platform:
```python
if sys.platform == 'win32' or platform.system() == 'Windows':
    executor = WorkflowExecutorSync()
else:
    executor = WorkflowExecutor()
```

---

### 2. Execution Context

**Purpose**: Store and manage variables, loop counters, and node results during workflow execution.

**Features**:
- Variable storage and retrieval
- Loop counter management
- Node result tracking

**Usage**:
```python
# Set a variable
context.set_variable("username", "john_doe")

# Get a variable
username = context.get_variable("username")

# Store node result
context.set_node_result("node_1", {"status": "success"})
```

---

### 3. Retry Logic with Exponential Backoff

**Purpose**: Automatically retry failed nodes with increasing wait times.

**Configuration**:
```json
{
  "node_id": "click_button",
  "node_type": "CLICK",
  "config": {
    "selector": "#submit-btn",
    "retryCount": 3
  }
}
```

**Behavior**:
- Attempt 1: Immediate execution
- Attempt 2: Wait 2 seconds (2^0)
- Attempt 3: Wait 4 seconds (2^1)
- Attempt 4: Wait 8 seconds (2^2)

**Default**: 3 retries (4 total attempts)

---

### 4. Conditional Branching (IF_CONDITION)

**Purpose**: Execute different paths based on conditions.

**Node Type**: `IF_CONDITION`

**Condition Types**:

#### Element Exists
```json
{
  "node_type": "IF_CONDITION",
  "config": {
    "conditionType": "element_exists",
    "selector": "#error-message"
  }
}
```

#### Variable Equals
```json
{
  "node_type": "IF_CONDITION",
  "config": {
    "conditionType": "variable_equals",
    "variableName": "status",
    "expectedValue": "success"
  }
}
```

#### Custom Expression
```json
{
  "node_type": "IF_CONDITION",
  "config": {
    "conditionType": "custom",
    "expression": "count > 10"
  }
}
```

**Edge Configuration**:
```json
{
  "source_node_id": "condition_1",
  "target_node_id": "success_path",
  "config": {
    "condition": "true"
  }
},
{
  "source_node_id": "condition_1",
  "target_node_id": "failure_path",
  "config": {
    "condition": "false"
  }
}
```

---

### 5. Loop Execution (LOOP)

**Purpose**: Repeat a sequence of nodes multiple times.

**Node Type**: `LOOP`

**Configuration**:
```json
{
  "node_type": "LOOP",
  "config": {
    "maxIterations": 5
  }
}
```

**Edge Configuration**:
```json
{
  "source_node_id": "loop_1",
  "target_node_id": "loop_body_start",
  "config": {
    "condition": "loop_body"
  }
},
{
  "source_node_id": "loop_1",
  "target_node_id": "after_loop",
  "config": {
    "condition": "loop_exit"
  }
}
```

**Behavior**:
- Executes loop body up to `maxIterations` times
- Tracks iteration count in execution context
- Exits to loop_exit edge when max iterations reached

---

### 6. Parallel Execution

**Purpose**: Execute multiple nodes simultaneously for better performance.

**Configuration**:
```json
{
  "node_id": "parallel_start",
  "config": {
    "parallelExecution": true
  }
}
```

**Behavior**:
- When a node has `parallelExecution: true`, all its child nodes execute in parallel
- Uses `asyncio.gather()` for concurrent execution
- Waits for all parallel tasks to complete before continuing

**Example Use Case**:
```
Start Node (parallelExecution: true)
  ├─> API Call 1 (parallel)
  ├─> API Call 2 (parallel)
  └─> API Call 3 (parallel)
       ↓
  Merge Results
```

---

### 7. New Node Types

#### HOVER
**Purpose**: Hover over an element to trigger tooltips or menus.

```json
{
  "node_type": "HOVER",
  "config": {
    "selector": ".menu-item",
    "timeout": 5000
  }
}
```

#### UPLOAD_FILE
**Purpose**: Upload files to file input elements.

```json
{
  "node_type": "UPLOAD_FILE",
  "config": {
    "selector": "input[type='file']",
    "file_path": "/path/to/file.pdf",
    "timeout": 10000
  }
}
```

#### BACK
**Purpose**: Navigate back in browser history.

```json
{
  "node_type": "BACK",
  "config": {}
}
```

#### REFRESH
**Purpose**: Reload the current page.

```json
{
  "node_type": "REFRESH",
  "config": {}
}
```

#### VARIABLE
**Purpose**: Set or get variables in execution context.

**Set Variable**:
```json
{
  "node_type": "VARIABLE",
  "config": {
    "operation": "set",
    "variableName": "counter",
    "value": 0
  }
}
```

**Get Variable**:
```json
{
  "node_type": "VARIABLE",
  "config": {
    "operation": "get",
    "variableName": "counter"
  }
}
```

#### API_REQUEST
**Purpose**: Make HTTP API calls and store responses.

```json
{
  "node_type": "API_REQUEST",
  "config": {
    "method": "POST",
    "url": "https://api.example.com/data",
    "headers": {
      "Content-Type": "application/json",
      "Authorization": "Bearer token123"
    },
    "body": {
      "key": "value"
    },
    "responseVariable": "apiResponse"
  }
}
```

---

## Enhanced Screenshot Capture

**Features**:
- Automatic screenshot on node execution (if enabled)
- Error screenshots on failure
- Full-page screenshots
- Organized by run_id

**Configuration**:
```json
{
  "config": {
    "screenshot": true
  }
}
```

**Storage**:
```
screenshots/
  └── {run_id}/
      ├── node_1_20260621_143022.png
      ├── node_2_20260621_143025.png
      └── node_3_error_20260621_143028.png
```

---

## Execution Logs

**Log Levels**:
- `INFO`: Normal execution events
- `WARNING`: Retry attempts, non-critical issues
- `ERROR`: Execution failures

**Log Structure**:
```json
{
  "level": "INFO",
  "message": "Executing node: Click Submit Button",
  "node_id": "node_1",
  "timestamp": "2026-06-21T14:30:22.123Z"
}
```

---

## API Integration

### Execute Workflow Endpoint

**Endpoint**: `POST /api/workflows/{workflow_id}/execute`

**Request Body** (optional):
```json
{
  "url": "https://example.com"
}
```

**Response**:
```json
{
  "run_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "message": "Workflow executed successfully",
  "duration_seconds": 12.5,
  "logs_count": 15
}
```

---

## Example Workflows

### Example 1: Conditional Login Flow

```json
{
  "nodes": [
    {
      "node_id": "1",
      "node_type": "OPEN_URL",
      "config": {"url": "https://example.com/login"}
    },
    {
      "node_id": "2",
      "node_type": "TYPE",
      "config": {"selector": "#username", "value": "user@example.com"}
    },
    {
      "node_id": "3",
      "node_type": "TYPE",
      "config": {"selector": "#password", "value": "password123"}
    },
    {
      "node_id": "4",
      "node_type": "CLICK",
      "config": {"selector": "#login-btn", "retryCount": 3}
    },
    {
      "node_id": "5",
      "node_type": "IF_CONDITION",
      "config": {
        "conditionType": "element_exists",
        "selector": "#error-message"
      }
    },
    {
      "node_id": "6",
      "node_type": "VARIABLE",
      "config": {
        "operation": "set",
        "variableName": "loginStatus",
        "value": "failed"
      }
    },
    {
      "node_id": "7",
      "node_type": "VARIABLE",
      "config": {
        "operation": "set",
        "variableName": "loginStatus",
        "value": "success"
      }
    }
  ],
  "edges": [
    {"source_node_id": "1", "target_node_id": "2"},
    {"source_node_id": "2", "target_node_id": "3"},
    {"source_node_id": "3", "target_node_id": "4"},
    {"source_node_id": "4", "target_node_id": "5"},
    {"source_node_id": "5", "target_node_id": "6", "config": {"condition": "true"}},
    {"source_node_id": "5", "target_node_id": "7", "config": {"condition": "false"}}
  ]
}
```

### Example 2: Loop with API Calls

```json
{
  "nodes": [
    {
      "node_id": "1",
      "node_type": "VARIABLE",
      "config": {"operation": "set", "variableName": "counter", "value": 0}
    },
    {
      "node_id": "2",
      "node_type": "LOOP",
      "config": {"maxIterations": 3}
    },
    {
      "node_id": "3",
      "node_type": "API_REQUEST",
      "config": {
        "method": "GET",
        "url": "https://api.example.com/data",
        "responseVariable": "apiData"
      }
    },
    {
      "node_id": "4",
      "node_type": "DELAY",
      "config": {"duration": 2000}
    }
  ],
  "edges": [
    {"source_node_id": "1", "target_node_id": "2"},
    {"source_node_id": "2", "target_node_id": "3", "config": {"condition": "loop_body"}},
    {"source_node_id": "3", "target_node_id": "4"},
    {"source_node_id": "4", "target_node_id": "2"}
  ]
}
```

### Example 3: Parallel API Calls

```json
{
  "nodes": [
    {
      "node_id": "1",
      "node_type": "VARIABLE",
      "config": {
        "operation": "set",
        "variableName": "startTime",
        "value": "now",
        "parallelExecution": true
      }
    },
    {
      "node_id": "2",
      "node_type": "API_REQUEST",
      "config": {
        "method": "GET",
        "url": "https://api1.example.com/data",
        "responseVariable": "api1Data"
      }
    },
    {
      "node_id": "3",
      "node_type": "API_REQUEST",
      "config": {
        "method": "GET",
        "url": "https://api2.example.com/data",
        "responseVariable": "api2Data"
      }
    },
    {
      "node_id": "4",
      "node_type": "API_REQUEST",
      "config": {
        "method": "GET",
        "url": "https://api3.example.com/data",
        "responseVariable": "api3Data"
      }
    }
  ],
  "edges": [
    {"source_node_id": "1", "target_node_id": "2"},
    {"source_node_id": "1", "target_node_id": "3"},
    {"source_node_id": "1", "target_node_id": "4"}
  ]
}
```

---

## Performance Considerations

### Retry Logic
- **Pros**: Handles transient failures automatically
- **Cons**: Increases execution time on failures
- **Recommendation**: Use for flaky elements, set appropriate retry counts

### Parallel Execution
- **Pros**: Significantly faster for independent operations
- **Cons**: Higher resource usage, harder to debug
- **Recommendation**: Use for API calls, independent page interactions

### Screenshot Capture
- **Pros**: Visual debugging, execution proof
- **Cons**: Disk space usage, slight performance impact
- **Recommendation**: Enable for critical nodes only

---

## Troubleshooting

### Windows Asyncio Issues
**Problem**: `RuntimeError: Event loop is closed` on Windows

**Solution**: The system automatically uses `WorkflowExecutorSync` on Windows

### Retry Exhaustion
**Problem**: Node fails after all retries

**Solution**: 
- Check selector accuracy
- Increase timeout values
- Verify element is actually present

### Loop Not Exiting
**Problem**: Loop runs indefinitely

**Solution**:
- Verify `maxIterations` is set
- Check loop_exit edge is configured
- Ensure loop counter is being tracked

### Parallel Execution Failures
**Problem**: Some parallel tasks fail

**Solution**:
- Check for resource contention
- Verify tasks are truly independent
- Review error logs for specific failures

---

## Migration Guide

### From V1 to V2 Executor

**V1 Code**:
```python
from app.services.workflow_executor import WorkflowExecutor

executor = WorkflowExecutor()
result = await executor.execute(nodes, edges)
```

**V2 Code** (automatic platform detection):
```python
# API handles this automatically
# No code changes needed for existing workflows
```

**Adding Retry to Existing Nodes**:
```json
{
  "config": {
    "selector": "#button",
    "retryCount": 3  // Add this line
  }
}
```

---

## Future Enhancements

### Planned for Phase 6+
- [ ] Real-time execution progress tracking
- [ ] Execution cancellation support
- [ ] Workflow debugging mode
- [ ] Performance profiling
- [ ] Distributed execution
- [ ] Workflow templates library

---

## Technical Details

### Dependencies
- `playwright`: Browser automation
- `asyncio`: Async execution (Linux/macOS)
- `aiohttp`: HTTP requests in async executor

### Configuration
Set in `backend/app/core/config.py`:
```python
PLAYWRIGHT_HEADLESS = True  # Run browser in headless mode
PLAYWRIGHT_TIMEOUT = 30000  # Default timeout (ms)
SCREENSHOT_DIR = "screenshots"  # Screenshot storage
```

---

## Testing

### Unit Tests
```bash
cd backend
pytest tests/test_workflow_executor.py -v
```

### Integration Tests
```bash
cd backend
pytest tests/test_execution_integration.py -v
```

### Manual Testing
1. Create workflow with conditional branching
2. Execute via API
3. Verify logs show correct path taken
4. Check screenshots captured correctly

---

## Support

For issues or questions:
- Check execution logs in database
- Review screenshot captures
- Enable debug logging
- Consult API documentation at `/docs`

---

**Version**: 2.0  
**Last Updated**: 2026-06-21  
**Status**: Production Ready