"""
Workflow schemas
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.db.models import NodeType, WorkflowStatus


class WorkflowNodeCreate(BaseModel):
    """Workflow node creation schema"""
    node_id: str
    node_type: NodeType
    label: str
    position_x: float
    position_y: float
    config: Dict[str, Any] = Field(default_factory=dict)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class WorkflowNodeResponse(WorkflowNodeCreate):
    """Workflow node response schema"""
    id: int
    workflow_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
        
    @staticmethod
    def from_db(node):
        """Convert database model to response schema"""
        return WorkflowNodeResponse(
            id=node.id,
            workflow_id=node.workflow_id,
            node_id=node.node_id,
            node_type=node.node_type,
            label=node.label,
            position_x=node.position_x,
            position_y=node.position_y,
            config=node.config or {},
            metadata=node.meta_data or {},
            created_at=node.created_at,
            updated_at=getattr(node, 'updated_at', None)
        )


class WorkflowEdgeCreate(BaseModel):
    """Workflow edge creation schema"""
    edge_id: str
    source_node_id: str
    target_node_id: str
    source_handle: Optional[str] = None
    target_handle: Optional[str] = None
    config: Dict[str, Any] = Field(default_factory=dict)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class WorkflowEdgeResponse(WorkflowEdgeCreate):
    """Workflow edge response schema"""
    id: int
    workflow_id: int
    created_at: datetime

    class Config:
        from_attributes = True
        
    @staticmethod
    def from_db(edge):
        """Convert database model to response schema"""
        return WorkflowEdgeResponse(
            id=edge.id,
            workflow_id=edge.workflow_id,
            edge_id=edge.edge_id,
            source_node_id=edge.source_node_id,
            target_node_id=edge.target_node_id,
            source_handle=edge.source_handle,
            target_handle=edge.target_handle,
            config=edge.config or {},
            metadata=edge.meta_data or {},
            created_at=edge.created_at
        )


class WorkflowBase(BaseModel):
    """Base workflow schema"""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class WorkflowCreate(WorkflowBase):
    """Workflow creation schema"""
    project_id: int
    nodes: List[WorkflowNodeCreate] = Field(default_factory=list)
    edges: List[WorkflowEdgeCreate] = Field(default_factory=list)


class WorkflowUpdate(BaseModel):
    """Workflow update schema"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    is_active: Optional[bool] = None
    nodes: Optional[List[WorkflowNodeCreate]] = None
    edges: Optional[List[WorkflowEdgeCreate]] = None
    metadata: Optional[Dict[str, Any]] = None


class WorkflowResponse(WorkflowBase):
    """Workflow response schema"""
    id: int
    project_id: int
    creator_id: int
    version: int
    is_active: bool
    nodes: List[WorkflowNodeResponse] = Field(default_factory=list)
    edges: List[WorkflowEdgeResponse] = Field(default_factory=list)
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
        
    @staticmethod
    def from_db(workflow):
        """Convert database model to response schema"""
        return WorkflowResponse(
            id=workflow.id,
            name=workflow.name,
            description=workflow.description,
            project_id=workflow.project_id,
            creator_id=workflow.creator_id,
            version=workflow.version,
            is_active=workflow.is_active,
            metadata=workflow.meta_data or {},
            nodes=[WorkflowNodeResponse.from_db(n) for n in workflow.nodes],
            edges=[WorkflowEdgeResponse.from_db(e) for e in workflow.edges],
            created_at=workflow.created_at,
            updated_at=workflow.updated_at
        )


class WorkflowLogResponse(BaseModel):
    """Workflow log response schema"""
    id: int
    run_id: int
    node_id: Optional[str] = None
    level: str
    message: str
    screenshot_path: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime

    class Config:
        from_attributes = True


class WorkflowRunResponse(BaseModel):
    """Workflow run response schema"""
    id: int
    workflow_id: int
    run_id: str
    status: WorkflowStatus
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    duration_seconds: Optional[float] = None
    result: Dict[str, Any] = Field(default_factory=dict)
    error_message: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
    logs: List[WorkflowLogResponse] = Field(default_factory=list)

    class Config:
        from_attributes = True


class WorkflowExecuteRequest(BaseModel):
    """Workflow execution request schema"""
    inputs: Dict[str, Any] = Field(default_factory=dict)
    config: Dict[str, Any] = Field(default_factory=dict)


class WorkflowExportRequest(BaseModel):
    """Workflow export request schema"""
    language: str = Field(..., pattern="^(python|javascript|typescript)$")
    include_comments: bool = True

# Made with Bob
