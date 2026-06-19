"""
Blocks API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.db.database import get_db
from app.db import models
from app.schemas.block import BlockCreate, BlockUpdate, BlockResponse, BlockVersionResponse
from app.core.security import get_current_user

router = APIRouter()


@router.post("", response_model=BlockResponse, status_code=status.HTTP_201_CREATED)
async def create_block(
    block_data: BlockCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Create a new reusable block"""
    # Create block
    db_block = models.Block(
        name=block_data.name,
        description=block_data.description,
        creator_id=current_user.id,
        category=block_data.category,
        is_public=block_data.is_public,
        metadata=block_data.metadata
    )
    
    db.add(db_block)
    db.flush()
    
    # Create first version
    db_version = models.BlockVersion(
        block_id=db_block.id,
        version=1,
        nodes=block_data.nodes,
        edges=block_data.edges,
        inputs=block_data.inputs,
        outputs=block_data.outputs,
        changelog="Initial version",
        metadata={}
    )
    
    db.add(db_version)
    db.commit()
    db.refresh(db_block)
    
    return db_block


@router.get("", response_model=List[BlockResponse])
async def list_blocks(
    category: Optional[str] = None,
    is_public: Optional[bool] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """List blocks"""
    query = db.query(models.Block).filter(
        (models.Block.creator_id == current_user.id) | (models.Block.is_public == True)
    )
    
    if category:
        query = query.filter(models.Block.category == category)
    
    if is_public is not None:
        query = query.filter(models.Block.is_public == is_public)
    
    blocks = query.offset(skip).limit(limit).all()
    return blocks


@router.get("/{block_id}", response_model=BlockResponse)
async def get_block(
    block_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get a specific block"""
    block = db.query(models.Block).filter(
        models.Block.id == block_id,
        (models.Block.creator_id == current_user.id) | (models.Block.is_public == True)
    ).first()
    
    if not block:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Block not found"
        )
    
    return block


@router.put("/{block_id}", response_model=BlockResponse)
async def update_block(
    block_id: int,
    block_data: BlockUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Update a block (creates a new version)"""
    block = db.query(models.Block).filter(
        models.Block.id == block_id,
        models.Block.creator_id == current_user.id
    ).first()
    
    if not block:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Block not found or access denied"
        )
    
    # Update basic fields
    if block_data.name is not None:
        block.name = block_data.name
    if block_data.description is not None:
        block.description = block_data.description
    if block_data.category is not None:
        block.category = block_data.category
    if block_data.is_public is not None:
        block.is_public = block_data.is_public
    if block_data.is_active is not None:
        block.is_active = block_data.is_active
    
    # Create new version if nodes/edges are updated
    if block_data.nodes is not None or block_data.edges is not None:
        new_version = block.current_version + 1
        
        # Get current version data for defaults
        current_version = db.query(models.BlockVersion).filter(
            models.BlockVersion.block_id == block_id,
            models.BlockVersion.version == block.current_version
        ).first()
        
        db_version = models.BlockVersion(
            block_id=block.id,
            version=new_version,
            nodes=block_data.nodes if block_data.nodes is not None else current_version.nodes,
            edges=block_data.edges if block_data.edges is not None else current_version.edges,
            inputs=block_data.inputs if block_data.inputs is not None else current_version.inputs,
            outputs=block_data.outputs if block_data.outputs is not None else current_version.outputs,
            changelog=block_data.changelog or f"Version {new_version}",
            metadata={}
        )
        
        db.add(db_version)
        block.current_version = new_version
    
    db.commit()
    db.refresh(block)
    
    return block


@router.delete("/{block_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_block(
    block_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Delete a block"""
    block = db.query(models.Block).filter(
        models.Block.id == block_id,
        models.Block.creator_id == current_user.id
    ).first()
    
    if not block:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Block not found or access denied"
        )
    
    db.delete(block)
    db.commit()
    
    return None


@router.get("/{block_id}/versions", response_model=List[BlockVersionResponse])
async def get_block_versions(
    block_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get all versions of a block"""
    block = db.query(models.Block).filter(
        models.Block.id == block_id,
        (models.Block.creator_id == current_user.id) | (models.Block.is_public == True)
    ).first()
    
    if not block:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Block not found"
        )
    
    versions = db.query(models.BlockVersion).filter(
        models.BlockVersion.block_id == block_id
    ).order_by(models.BlockVersion.version.desc()).all()
    
    return versions


@router.get("/{block_id}/versions/{version}", response_model=BlockVersionResponse)
async def get_block_version(
    block_id: int,
    version: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get a specific version of a block"""
    block = db.query(models.Block).filter(
        models.Block.id == block_id,
        (models.Block.creator_id == current_user.id) | (models.Block.is_public == True)
    ).first()
    
    if not block:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Block not found"
        )
    
    block_version = db.query(models.BlockVersion).filter(
        models.BlockVersion.block_id == block_id,
        models.BlockVersion.version == version
    ).first()
    
    if not block_version:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Block version not found"
        )
    
    return block_version

# Made with Bob
