"""
Workflow API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

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
    """Delete a workflow"""
    workflow = db.query(models.Workflow).filter(
        models.Workflow.id == workflow_id,
        models.Workflow.creator_id == current_user.id
    ).first()
    
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow not found"
        )
    
    db.delete(workflow)
    db.commit()
    return None


@router.post("/{workflow_id}/execute")
async def execute_workflow(
    workflow_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Execute a workflow"""
    import uuid
    from app.services.workflow_executor import WorkflowExecutor
    
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
        
        edges_data = [
            {
                "edge_id": edge.edge_id,
                "source_node_id": edge.source_node_id,
                "target_node_id": edge.target_node_id
            }
            for edge in workflow.edges
        ]
        
        # Execute workflow
        executor = WorkflowExecutor()
        result = await executor.execute(
            nodes=nodes_data,
            edges=edges_data,
            inputs={},
            run_id=run_id
        )
        
        # Update workflow run with results
        workflow_run.status = models.WorkflowStatus.COMPLETED
        workflow_run.started_at = result.get("started_at")
        workflow_run.completed_at = result.get("completed_at")
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
            "status": "completed",
            "message": "Workflow executed successfully",
            "duration_seconds": result.get("duration_seconds"),
            "logs_count": len(result.get("logs", []))
        }
        
    except Exception as e:
        # Update workflow run with error
        workflow_run.status = models.WorkflowStatus.FAILED
        workflow_run.error_message = str(e)
        db.commit()
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Workflow execution failed: {str(e)}"
        )

# Made with Bob