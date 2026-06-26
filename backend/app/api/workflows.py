"""
Workflow API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime

from app.db.database import get_db
from app.db import models
from app.schemas.workflow import WorkflowCreate, WorkflowUpdate, WorkflowResponse
from app.core.security import get_current_user
# Force reload to pick up schema changes

router = APIRouter()


@router.post("/", response_model=WorkflowResponse, status_code=status.HTTP_201_CREATED)
async def create_workflow(
    workflow_data: WorkflowCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Create a new workflow"""
    # Create the workflow
    workflow = models.Workflow(
        name=workflow_data.name,
        description=workflow_data.description,
        project_id=workflow_data.project_id,
        creator_id=current_user.id,
        meta_data=workflow_data.metadata or {},
        version=workflow_data.version if getattr(workflow_data, 'version', None) is not None else 1,
        is_active=workflow_data.is_active if getattr(workflow_data, 'is_active', None) is not None else True,
    )
    db.add(workflow)
    db.flush()  # Flush to get the workflow ID
    
    # Create nodes
    for node_data in workflow_data.nodes:
        node = models.WorkflowNode(
            workflow_id=workflow.id,
            node_id=node_data.node_id,
            node_type=node_data.node_type,
            label=node_data.label,
            position_x=node_data.position_x,
            position_y=node_data.position_y,
            config=node_data.config,
            meta_data=node_data.metadata
        )
        db.add(node)
    
    # Create edges
    for edge_data in workflow_data.edges:
        edge = models.WorkflowEdge(
            workflow_id=workflow.id,
            edge_id=edge_data.edge_id,
            source_node_id=edge_data.source_node_id,
            target_node_id=edge_data.target_node_id,
            source_handle=edge_data.source_handle,
            target_handle=edge_data.target_handle,
            config=edge_data.config,
            meta_data=edge_data.metadata
        )
        db.add(edge)
    
    db.commit()
    db.refresh(workflow)
    return WorkflowResponse.from_db(workflow)


@router.get("/", response_model=List[WorkflowResponse])
async def list_workflows(
    skip: int = 0,
    limit: int = 100,
    project_id: int = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """List all workflows"""
    query = db.query(models.Workflow).filter(models.Workflow.creator_id == current_user.id)
    
    if project_id:
        query = query.filter(models.Workflow.project_id == project_id)
    
    workflows = query.offset(skip).limit(limit).all()
    # Convert each workflow using the from_db method
    return [WorkflowResponse.from_db(wf) for wf in workflows]


@router.get("/{workflow_id}", response_model=WorkflowResponse)
async def get_workflow(
    workflow_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get a specific workflow"""
    workflow = db.query(models.Workflow).filter(
        models.Workflow.id == workflow_id,
        models.Workflow.creator_id == current_user.id
    ).first()
    
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow not found"
        )
    
    return WorkflowResponse.from_db(workflow)


@router.put("/{workflow_id}", response_model=WorkflowResponse)
async def update_workflow(
    workflow_id: int,
    workflow_data: WorkflowUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Update a workflow"""
    workflow = db.query(models.Workflow).filter(
        models.Workflow.id == workflow_id,
        models.Workflow.creator_id == current_user.id
    ).first()
    
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow not found"
        )
    
    # Update fields
    if workflow_data.name is not None:
        workflow.name = workflow_data.name
    if workflow_data.description is not None:
        workflow.description = workflow_data.description
    if workflow_data.metadata is not None:
        workflow.meta_data = workflow_data.metadata
    if workflow_data.is_active is not None:
        workflow.is_active = workflow_data.is_active
    
    # Update nodes if provided
    if workflow_data.nodes is not None:
        # Delete existing nodes
        db.query(models.WorkflowNode).filter(
            models.WorkflowNode.workflow_id == workflow_id
        ).delete()
        
        # Create new nodes
        for node_data in workflow_data.nodes:
            node = models.WorkflowNode(
                workflow_id=workflow.id,
                node_id=node_data.node_id,
                node_type=node_data.node_type,
                label=node_data.label,
                position_x=node_data.position_x,
                position_y=node_data.position_y,
                config=node_data.config,
                meta_data=node_data.metadata
            )
            db.add(node)
    
    # Update edges if provided
    if workflow_data.edges is not None:
        # Delete existing edges
        db.query(models.WorkflowEdge).filter(
            models.WorkflowEdge.workflow_id == workflow_id
        ).delete()
        
        # Create new edges
        for edge_data in workflow_data.edges:
            edge = models.WorkflowEdge(
                workflow_id=workflow.id,
                edge_id=edge_data.edge_id,
                source_node_id=edge_data.source_node_id,
                target_node_id=edge_data.target_node_id,
                source_handle=edge_data.source_handle,
                target_handle=edge_data.target_handle,
                config=edge_data.config,
                meta_data=edge_data.metadata
            )
            db.add(edge)
    
    db.commit()
    db.refresh(workflow)
    return WorkflowResponse.from_db(workflow)


@router.delete("/{workflow_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workflow(
    workflow_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Delete a workflow and all related data"""
    try:
        workflow = db.query(models.Workflow).filter(
            models.Workflow.id == workflow_id,
            models.Workflow.creator_id == current_user.id
        ).first()
        
        if not workflow:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Workflow not found"
            )
        
        print(f"[DELETE] Deleting workflow {workflow_id}")
        
        # Force reload - fixed WorkflowLog deletion
        # Manually delete related records to avoid foreign key constraint issues
        # First, get all run IDs for this workflow
        run_ids = [run.id for run in db.query(models.WorkflowRun).filter(
            models.WorkflowRun.workflow_id == workflow_id
        ).all()]
        
        # Delete workflow logs (they reference runs)
        logs_deleted = 0
        if run_ids:
            logs_deleted = db.query(models.WorkflowLog).filter(
                models.WorkflowLog.run_id.in_(run_ids)
            ).delete(synchronize_session=False)
        print(f"[DELETE] Deleted {logs_deleted} workflow logs")
        
        # Delete workflow runs
        runs_deleted = db.query(models.WorkflowRun).filter(
            models.WorkflowRun.workflow_id == workflow_id
        ).delete()
        print(f"[DELETE] Deleted {runs_deleted} workflow runs")
        
        # Delete edges
        edges_deleted = db.query(models.WorkflowEdge).filter(
            models.WorkflowEdge.workflow_id == workflow_id
        ).delete()
        print(f"[DELETE] Deleted {edges_deleted} edges")
        
        # Delete nodes
        nodes_deleted = db.query(models.WorkflowNode).filter(
            models.WorkflowNode.workflow_id == workflow_id
        ).delete()
        print(f"[DELETE] Deleted {nodes_deleted} nodes")
        
        # Delete variables
        vars_deleted = db.query(models.WorkflowVariable).filter(
            models.WorkflowVariable.workflow_id == workflow_id
        ).delete()
        print(f"[DELETE] Deleted {vars_deleted} variables")
        
        # Finally delete the workflow itself
        db.delete(workflow)
        db.commit()
        print(f"[DELETE] Workflow {workflow_id} deleted successfully")
        return None
    except HTTPException:
        raise
    except Exception as e:
        print(f"[DELETE ERROR] Failed to delete workflow {workflow_id}: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete workflow: {str(e)}"
        )


@router.post("/{workflow_id}/execute")
async def execute_workflow(
    workflow_id: int,
    request_body: Optional[Dict[str, Any]] = Body(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Execute a workflow with optional URL parameter"""
    import uuid
    import sys
    import platform
    
    # Use sync executor on Windows to avoid asyncio subprocess issues
    if sys.platform == 'win32' or platform.system() == 'Windows':
        from app.services.workflow_executor_sync import WorkflowExecutorSync
        use_sync = True
    else:
        from app.services.workflow_executor import WorkflowExecutor
        use_sync = False
    
    # Get workflow
    workflow = db.query(models.Workflow).filter(
        models.Workflow.id == workflow_id,
        models.Workflow.creator_id == current_user.id
    ).first()
    
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow not found"
        )
    
    # Generate run ID
    run_id = str(uuid.uuid4())
    
    # Create workflow run record
    workflow_run = models.WorkflowRun(
        workflow_id=workflow.id,
        run_id=run_id,
        status=models.WorkflowStatus.DRAFT,
        meta_data={}
    )
    db.add(workflow_run)
    db.commit()
    db.refresh(workflow_run)
    
    try:
        # Get URL from request body if provided
        url = request_body.get("url") if request_body else None
        print(f"\n{'='*80}")
        print(f"[EXECUTE] Starting workflow execution")
        print(f"[EXECUTE] Workflow ID: {workflow_id}")
        print(f"[EXECUTE] URL parameter: {url}")
        print(f"[EXECUTE] Request body: {request_body}")
        print(f"[EXECUTE] Platform: {sys.platform}")
        print(f"[EXECUTE] Using sync executor: {use_sync}")
        print(f"{'='*80}\n")
        
        # Prepare nodes and edges for execution
        nodes_data = [
            {
                "node_id": node.node_id,
                "node_type": node.node_type.value,
                "label": node.label,
                "config": node.config or {},
                "metadata": node.meta_data or {}
            }
            for node in workflow.nodes
        ]
        
        # Check if there's an OPEN_URL node
        has_open_url = any(node["node_type"] == models.NodeType.OPEN_URL.value for node in nodes_data)
        
        # If no OPEN_URL node and URL is provided, add one at the start
        if not has_open_url and url:
            open_url_node = {
                "node_id": "start_url_node",
                "node_type": models.NodeType.OPEN_URL.value,
                "label": "Navigate to URL",
                "config": {"url": url, "timeout": 30000},
                "metadata": {}
            }
            nodes_data.insert(0, open_url_node)
            
            # Update edges to connect start node to first original node
            if nodes_data and len(nodes_data) > 1:
                first_original_node = nodes_data[1]["node_id"]
                edges_data = [
                    {
                        "edge_id": "start_edge",
                        "source_node_id": "start_url_node",
                        "target_node_id": first_original_node
                    }
                ] + [
                    {
                        "edge_id": edge.edge_id,
                        "source_node_id": edge.source_node_id,
                        "target_node_id": edge.target_node_id
                    }
                    for edge in workflow.edges
                ]
            else:
                edges_data = []
        else:
            edges_data = [
                {
                    "edge_id": edge.edge_id,
                    "source_node_id": edge.source_node_id,
                    "target_node_id": edge.target_node_id
                }
                for edge in workflow.edges
            ]
        
        # Execute workflow with appropriate executor
        print(f"[EXECUTE] Nodes count: {len(nodes_data)}")
        print(f"[EXECUTE] Edges count: {len(edges_data)}")
        print(f"[EXECUTE] First node: {nodes_data[0] if nodes_data else 'None'}")
        
        if use_sync:
            print(f"[EXECUTE] Using WorkflowExecutorSync with asyncio.to_thread")
            import asyncio
            
            def run_sync_executor():
                """Run sync executor in isolated thread"""
                executor = WorkflowExecutorSync()
                return executor.execute(
                    nodes=nodes_data,
                    edges=edges_data,
                    inputs={},
                    run_id=run_id
                )
            
            print(f"[EXECUTE] Calling executor.execute() via asyncio.to_thread...")
            # Use asyncio.to_thread to properly isolate sync code from async context
            result = await asyncio.to_thread(run_sync_executor)
            print(f"[EXECUTE] Execution completed. Result keys: {result.keys() if result else 'None'}")
        else:
            print(f"[EXECUTE] Using WorkflowExecutor (async)")
            executor = WorkflowExecutor()
            result = await executor.execute(
                nodes=nodes_data,
                edges=edges_data,
                inputs={},
                run_id=run_id
            )
        
        # Update workflow run with results
        workflow_run.status = models.WorkflowStatus.COMPLETED
        # Convert datetime objects or ISO strings to datetime
        started_at = result.get("started_at")
        completed_at = result.get("completed_at")
        workflow_run.started_at = started_at if isinstance(started_at, datetime) else datetime.fromisoformat(started_at) if started_at else None
        workflow_run.completed_at = completed_at if isinstance(completed_at, datetime) else datetime.fromisoformat(completed_at) if completed_at else None
        workflow_run.duration_seconds = result.get("duration_seconds")
        workflow_run.result = result.get("result", {})
        
        # Save logs
        for log_data in result.get("logs", []):
            log = models.WorkflowLog(
                run_id=workflow_run.id,
                node_id=log_data.get("node_id"),
                level=log_data.get("level", "INFO"),
                message=log_data.get("message", ""),
                screenshot_path=log_data.get("screenshot_path"),
                meta_data=log_data.get("metadata", {})
            )
            db.add(log)
        
        db.commit()
        db.refresh(workflow_run)
        
        return {
            "run_id": run_id,
            "status": result.get("status", "completed"),
            "message": "Workflow executed successfully",
            "duration_seconds": result.get("duration_seconds"),
            "logs_count": len(result.get("logs", [])),
            "logs": result.get("logs", []),  # Include actual logs for debugging
            "result": result.get("result", {}),  # Include result details
            "error_message": result.get("error_message")  # Include error if any
        }
        
    except Exception as e:
        # Update workflow run with error
        import traceback
        error_details = traceback.format_exc()
        print(f"[ERROR] Workflow execution failed: {str(e)}")
        print(f"[ERROR] Traceback: {error_details}")
        
        workflow_run.status = models.WorkflowStatus.FAILED
        workflow_run.error_message = str(e)
        db.commit()
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Workflow execution failed: {str(e)}"
        )

# Made with Bob