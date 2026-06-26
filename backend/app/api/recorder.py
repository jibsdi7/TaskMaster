"""
Recorder API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
from typing import Dict, Any
from pydantic import BaseModel

from app.db.database import get_db
from app.db import models
from app.core.security import get_current_user
from app.services.recorder import RecorderService, PlaywrightScriptParser
from app.services.action_normalizer import ActionNormalizer
from app.services.workflow_generator import WorkflowGeneratorService

router = APIRouter()

# In-memory storage for active recording sessions
active_sessions: Dict[int, Any] = {}


class StartRecordingRequest(BaseModel):
    url: str
    language: str = "python"


@router.post("/start")
async def start_recording(
    request: StartRecordingRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Start recording a new session"""
    url = request.url
    language = request.language
    # Check if user already has an active session
    if current_user.id in active_sessions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Recording session already active"
        )
    
    # Initialize Playwright recorder
    recorder = RecorderService()
    try:
        result = await recorder.start(url, language)
        
        # Store recorder instance and session info
        active_sessions[current_user.id] = {
            "recorder": recorder,
            "session_id": result["session_id"],
            "url": url,
            "actions": [],
            "status": "recording",
            "output_file": result.get("output_file")
        }
        
        return {
            "session_id": result["session_id"],
            "status": "recording",
            "url": url,
            "message": result.get("message", "Recording started successfully")
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start recording: {str(e)}"
        )


@router.post("/stop")
async def stop_recording(
    save_as_workflow: bool = False,
    workflow_name: str | None = None,
    project_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Stop recording session"""
    if current_user.id not in active_sessions:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active recording session"
        )
    
    session = active_sessions[current_user.id]
    recorder = session.get("recorder")
    
    # Stop Playwright recorder
    try:
        if recorder and recorder.is_active():
            result = await recorder.stop()
            playwright_script = result.get("playwright_script", "")
            
            # Parse Playwright script into actions
            if playwright_script:
                parsed_nodes = PlaywrightScriptParser.parse(playwright_script)
                # Convert nodes to actions
                actions = []
                for node in parsed_nodes:
                    action = {
                        "id": node.get("node_id"),
                        "type": node.get("node_type"),
                        "selector": node.get("config", {}).get("selector"),
                        "value": node.get("config", {}).get("value"),
                        "url": node.get("config", {}).get("url"),
                        "label": node.get("label"),
                        "metadata": node.get("metadata", {})
                    }
                    actions.append(ActionNormalizer.normalize(action))
            else:
                actions = session["actions"]
        else:
            actions = session["actions"]
    except Exception as e:
        # Fallback to stored actions if recorder fails
        actions = session["actions"]
        print(f"Warning: Failed to stop recorder: {str(e)}")
    
    # Save as workflow if requested
    workflow_id = None
    if save_as_workflow and workflow_name:
        # Get or create default project if project_id not provided
        if not project_id:
            project = db.query(models.Project).filter(
                models.Project.owner_id == current_user.id,
                models.Project.name == "Default Project"
            ).first()
            
            if not project:
                project = models.Project(
                    name="Default Project",
                    description="Auto-created default project for workflows",
                    owner_id=current_user.id
                )
                db.add(project)
                db.flush()
            
            project_id = project.id
        else:
            # Verify project exists
            project = db.query(models.Project).filter(
                models.Project.id == project_id,
                models.Project.owner_id == current_user.id
            ).first()
            
            if not project:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Project not found"
                )
        
        # Generate workflow using WorkflowGeneratorService
        workflow_data = WorkflowGeneratorService.generate_from_actions(
            actions=actions,
            workflow_name=workflow_name,
            description=f"Recorded from {session['url']}"
        )
        
        # Filter out nodes with no selector (invalid nodes from recording)
        valid_nodes = []
        for node in workflow_data["nodes"]:
            node_type = node.get("node_type")
            config = node.get("config", {})
            
            # Keep OPEN_URL nodes (they use 'url' not 'selector')
            if node_type == models.NodeType.OPEN_URL.value:
                valid_nodes.append(node)
            # Keep nodes that have a valid selector
            elif config.get("selector"):
                valid_nodes.append(node)
            # Skip nodes with no selector
            else:
                print(f"Skipping node {node.get('node_id')} - no selector")
        
        workflow_data["nodes"] = valid_nodes
        
        # Rebuild edges to only connect valid nodes
        valid_node_ids = {node.get("node_id") for node in valid_nodes}
        valid_edges = [
            edge for edge in workflow_data["edges"]
            if edge.get("source_node_id") in valid_node_ids and edge.get("target_node_id") in valid_node_ids
        ]
        workflow_data["edges"] = valid_edges
        
        # Check if there's an OPEN_URL node, if not add one at the beginning
        has_open_url = any(node.get("node_type") == models.NodeType.OPEN_URL for node in valid_nodes)
        
        if not has_open_url and session.get("url"):
            # Insert OPEN_URL node at the beginning
            open_url_node = {
                "node_id": "open_url_start",
                "node_type": models.NodeType.OPEN_URL,
                "label": "Open URL",
                "config": {
                    "url": session["url"],
                    "timeout": 30000
                },
                "position_x": 100,
                "position_y": 100,
                "metadata": {"auto_generated": True, "source": "recorder"}
            }
            workflow_data["nodes"].insert(0, open_url_node)
            
            # Update edges to connect OPEN_URL to first original node
            if len(workflow_data["nodes"]) > 1:
                first_original_node_id = workflow_data["nodes"][1]["node_id"]
                # Insert edge from OPEN_URL to first node
                new_edge = {
                    "edge_id": "edge_open_url_start",
                    "source_node_id": "open_url_start",
                    "target_node_id": first_original_node_id
                }
                workflow_data["edges"].insert(0, new_edge)
        
        # Create workflow
        db_workflow = models.Workflow(
            name=workflow_data["name"],
            description=workflow_data["description"],
            project_id=project_id,
            creator_id=current_user.id,
            meta_data={
                **workflow_data.get("metadata", {}),
                "recorded_url": session["url"]
            }
        )
        
        db.add(db_workflow)
        db.flush()
        
        # Create nodes
        for node_data in workflow_data["nodes"]:
            db_node = models.WorkflowNode(
                workflow_id=db_workflow.id,
                node_id=node_data["node_id"],
                node_type=node_data["node_type"],
                label=node_data["label"],
                position_x=node_data["position_x"],
                position_y=node_data["position_y"],
                config=node_data.get("config", {}),
                meta_data=node_data.get("metadata", {})
            )
            db.add(db_node)
        
        # Create edges
        for edge_data in workflow_data["edges"]:
            db_edge = models.WorkflowEdge(
                workflow_id=db_workflow.id,
                edge_id=edge_data["edge_id"],
                source_node_id=edge_data["source_node_id"],
                target_node_id=edge_data["target_node_id"],
                source_handle=edge_data.get("source_handle"),
                target_handle=edge_data.get("target_handle"),
                config=edge_data.get("config", {}),
                meta_data=edge_data.get("metadata", {})
            )
            db.add(db_edge)
        
        db.commit()
        db.refresh(db_workflow)
        workflow_id = db_workflow.id
    
    # Clean up session
    del active_sessions[current_user.id]
    
    return {
        "status": "stopped",
        "actions_count": len(actions),
        "actions": actions,
        "workflow_id": workflow_id,
        "message": "Recording stopped successfully"
    }


@router.get("/status")
async def get_recording_status(
    current_user: models.User = Depends(get_current_user)
):
    """Get current recording status"""
    if current_user.id in active_sessions:
        session = active_sessions[current_user.id]
        return {
            "is_recording": True,
            "session_id": session["session_id"],
            "url": session["url"],
            "actions_count": len(session["actions"]),
            "status": session["status"]
        }
    
    return {
        "is_recording": False,
        "session_id": None,
        "url": None,
        "actions_count": 0,
        "status": "idle"
    }


@router.post("/action")
async def record_action(
    action_data: Dict[str, Any],
    current_user: models.User = Depends(get_current_user)
):
    """Record a single action (called by browser extension)"""
    if current_user.id not in active_sessions:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active recording session"
        )
    
    session = active_sessions[current_user.id]
    session["actions"].append(action_data)
    
    return {
        "status": "recorded",
        "action_index": len(session["actions"]) - 1,
        "message": "Action recorded successfully"
    }

# Made with Bob
