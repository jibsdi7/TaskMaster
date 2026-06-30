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

    # Stop the Playwright recorder and parse the generated script
    parsed_nodes: list = []
    playwright_script: str = ""
    actions = session["actions"]
    try:
        if recorder and recorder.is_active():
            result = await recorder.stop()
            playwright_script = result.get("playwright_script", "")
            if playwright_script:
                parsed_nodes = PlaywrightScriptParser.parse(playwright_script)
    except Exception as e:
        print(f"Warning: Failed to stop recorder: {str(e)}")

    # Save as workflow if requested
    workflow_id = None
    if save_as_workflow and workflow_name:
        # Resolve project
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
            project = db.query(models.Project).filter(
                models.Project.id == project_id,
                models.Project.owner_id == current_user.id
            ).first()
            if not project:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Project not found"
                )

        # Use parsed_nodes from the script directly — they already carry the
        # correct node_type ("OPEN_URL", "SELECT", "TYPE"), selector, value, and
        # url. Routing through WorkflowGeneratorService would re-map them via
        # lowercase action-type keys ("navigate", "select", …) which don't match
        # the DB enum values, causing all values and node types to be lost.
        if parsed_nodes:
            nodes_to_save = parsed_nodes
        else:
            # Fallback for legacy in-session action list (no script produced)
            workflow_data = WorkflowGeneratorService.generate_from_actions(
                actions=actions,
                workflow_name=workflow_name,
                description=f"Recorded from {session['url']}"
            )
            nodes_to_save = workflow_data["nodes"]

        # Drop nodes that have neither a selector nor a url
        valid_nodes = []
        for node in nodes_to_save:
            config = node.get("config", {})
            if node.get("node_type") == models.NodeType.OPEN_URL.value:
                valid_nodes.append(node)
            elif config.get("selector"):
                valid_nodes.append(node)
            else:
                print(f"Skipping node {node.get('node_id')} — no selector")

        # Ensure there is an OPEN_URL node; prepend one if missing
        has_open_url = any(
            n.get("node_type") == models.NodeType.OPEN_URL.value for n in valid_nodes
        )
        if not has_open_url and session.get("url"):
            valid_nodes.insert(0, {
                "node_id": "open_url_start",
                "node_type": models.NodeType.OPEN_URL.value,
                "label": f"Navigate to {session['url']}",
                "config": {"url": session["url"], "timeout": 30000},
                "position_x": 100,
                "position_y": 100,
                "metadata": {"auto_generated": True, "source": "recorder"},
            })

        # Create the workflow record
        db_workflow = models.Workflow(
            name=workflow_name,
            description=f"Recorded from {session['url']}",
            project_id=project_id,
            creator_id=current_user.id,
            meta_data={
                "recorded_url": session["url"],
                "playwright_script": playwright_script,
                "node_count": len(valid_nodes),
            }
        )
        db.add(db_workflow)
        db.flush()

        # Persist nodes
        for node_data in valid_nodes:
            db_node = models.WorkflowNode(
                workflow_id=db_workflow.id,
                node_id=node_data["node_id"],
                node_type=node_data["node_type"],
                label=node_data["label"],
                position_x=node_data.get("position_x", 100),
                position_y=node_data.get("position_y", 100),
                config=node_data.get("config", {}),
                meta_data=node_data.get("metadata", {})
            )
            db.add(db_node)

        # Persist sequential edges
        valid_node_ids = [n["node_id"] for n in valid_nodes]
        for i in range(1, len(valid_node_ids)):
            db_edge = models.WorkflowEdge(
                workflow_id=db_workflow.id,
                edge_id=f"edge_{i}",
                source_node_id=valid_node_ids[i - 1],
                target_node_id=valid_node_ids[i],
                source_handle=None,
                target_handle=None,
                config={},
                meta_data={}
            )
            db.add(db_edge)

        db.commit()
        db.refresh(db_workflow)
        workflow_id = db_workflow.id

    # Clean up session
    del active_sessions[current_user.id]

    return {
        "status": "stopped",
        "actions_count": len(parsed_nodes) if parsed_nodes else len(actions),
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


class ImportScriptRequest(BaseModel):
    playwright_script: str
    workflow_name: str
    project_id: int | None = None


@router.post("/import-script")
async def import_playwright_script(
    request: ImportScriptRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Parse a pasted Playwright script and save it as a new workflow.
    All user actions (navigate, select, fill, click) are captured exactly,
    including dropdown selections and text field values.
    """
    script = request.playwright_script.strip()
    if not script:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="playwright_script must not be empty",
        )

    # Parse the script into workflow nodes
    parsed_nodes = PlaywrightScriptParser.parse(script)

    if not parsed_nodes:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No recognisable Playwright actions found in the script",
        )

    # Resolve or auto-create a project
    if request.project_id:
        project = db.query(models.Project).filter(
            models.Project.id == request.project_id,
            models.Project.owner_id == current_user.id,
        ).first()
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found",
            )
    else:
        project = db.query(models.Project).filter(
            models.Project.owner_id == current_user.id,
            models.Project.name == "Default Project",
        ).first()
        if not project:
            project = models.Project(
                name="Default Project",
                description="Auto-created default project for workflows",
                owner_id=current_user.id,
            )
            db.add(project)
            db.flush()

    # Build the workflow DB record
    db_workflow = models.Workflow(
        name=request.workflow_name,
        description=f"Imported from Playwright script — {len(parsed_nodes)} nodes",
        project_id=project.id,
        creator_id=current_user.id,
        meta_data={"source": "import_script", "playwright_script": script},
    )
    db.add(db_workflow)
    db.flush()

    # Persist nodes
    for node_data in parsed_nodes:
        db_node = models.WorkflowNode(
            workflow_id=db_workflow.id,
            node_id=node_data["node_id"],
            node_type=node_data["node_type"],
            label=node_data["label"],
            position_x=node_data["position_x"],
            position_y=node_data["position_y"],
            config=node_data.get("config", {}),
            meta_data=node_data.get("metadata", {}),
        )
        db.add(db_node)

    # Persist sequential edges
    for i in range(1, len(parsed_nodes)):
        db_edge = models.WorkflowEdge(
            workflow_id=db_workflow.id,
            edge_id=f"edge_{i}",
            source_node_id=parsed_nodes[i - 1]["node_id"],
            target_node_id=parsed_nodes[i]["node_id"],
            source_handle=None,
            target_handle=None,
            config={},
            meta_data={},
        )
        db.add(db_edge)

    db.commit()
    db.refresh(db_workflow)

    return {
        "workflow_id": db_workflow.id,
        "workflow_name": db_workflow.name,
        "nodes_count": len(parsed_nodes),
        "edges_count": len(parsed_nodes) - 1 if len(parsed_nodes) > 1 else 0,
        "message": f"Script imported successfully — {len(parsed_nodes)} nodes created",
    }

# Made with Bob
