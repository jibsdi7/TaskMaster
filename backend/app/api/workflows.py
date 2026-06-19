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

# Made with Bob