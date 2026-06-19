"""
Block schemas
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class BlockBase(BaseModel):
    """Base block schema"""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    category: Optional[str] = None
    is_public: bool = False


class BlockCreate(BlockBase):
    """Block creation schema"""
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]
    inputs: List[Dict[str, Any]] = Field(default_factory=list)
    outputs: List[Dict[str, Any]] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class BlockUpdate(BaseModel):
    """Block update schema"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    category: Optional[str] = None
    is_public: Optional[bool] = None
    is_active: Optional[bool] = None
    nodes: Optional[List[Dict[str, Any]]] = None
    edges: Optional[List[Dict[str, Any]]] = None
    inputs: Optional[List[Dict[str, Any]]] = None
    outputs: Optional[List[Dict[str, Any]]] = None
    changelog: Optional[str] = None


class BlockVersionResponse(BaseModel):
    """Block version response schema"""
    id: int
    block_id: int
    version: int
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]
    inputs: List[Dict[str, Any]]
    outputs: List[Dict[str, Any]]
    changelog: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime

    class Config:
        from_attributes = True


class BlockResponse(BlockBase):
    """Block response schema"""
    id: int
    creator_id: int
    current_version: int
    is_active: bool
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
    updated_at: Optional[datetime] = None
    versions: List[BlockVersionResponse] = Field(default_factory=list)

    class Config:
        from_attributes = True

# Made with Bob
