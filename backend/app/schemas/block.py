"""
Block schemas
"""
from pydantic import BaseModel, Field, model_validator
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

    model_config = {"from_attributes": True}

    @model_validator(mode="before")
    @classmethod
    def _remap_meta_data(cls, values: Any) -> Any:
        """
        The ORM column is named `meta_data` to avoid clashing with SQLAlchemy's
        reserved `metadata` attribute.  When Pydantic reads the ORM object via
        from_attributes, `obj.metadata` returns SQLAlchemy's MetaData() object
        instead of our column value.  We read `meta_data` explicitly and expose
        it as `metadata` in the schema.
        """
        if hasattr(values, "meta_data"):
            # ORM instance — extract via attribute access
            return {
                "id": values.id,
                "block_id": values.block_id,
                "version": values.version,
                "nodes": values.nodes or [],
                "edges": values.edges or [],
                "inputs": values.inputs or [],
                "outputs": values.outputs or [],
                "changelog": values.changelog,
                "metadata": values.meta_data or {},
                "created_at": values.created_at,
            }
        # Already a dict (e.g. during testing)
        return values


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

    model_config = {"from_attributes": True}

    @model_validator(mode="before")
    @classmethod
    def _remap_meta_data(cls, values: Any) -> Any:
        """Same fix as BlockVersionResponse — map ORM `meta_data` → schema `metadata`."""
        if hasattr(values, "meta_data"):
            return {
                "id": values.id,
                "name": values.name,
                "description": values.description,
                "category": values.category,
                "is_public": values.is_public,
                "creator_id": values.creator_id,
                "current_version": values.current_version,
                "is_active": values.is_active,
                "metadata": values.meta_data or {},
                "created_at": values.created_at,
                "updated_at": values.updated_at,
                "versions": values.versions or [],
            }
        return values

# Made with Bob
