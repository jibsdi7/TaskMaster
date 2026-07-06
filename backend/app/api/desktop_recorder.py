"""
Desktop Recorder API endpoints — records PyAutoGUI desktop interactions.
Fully separate from the Playwright web recorder; both can coexist independently.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict, Any, List, Optional
from pydantic import BaseModel

from app.db.database import get_db
from app.db import models
from app.core.security import get_current_user
from app.services.desktop_recorder import DesktopRecorderService, PyAutoGUIScriptParser
from app.services.script_generator import topological_sort

router = APIRouter()

# Per-user active desktop recording sessions
_desktop_sessions: Dict[int, Any] = {}


# ── Request / response models ─────────────────────────────────────────────────

class StartDesktopRecordingRequest(BaseModel):
    session_name: Optional[str] = None


class SaveDesktopRecordingRequest(BaseModel):
    workflow_name: str
    project_id: Optional[int] = None
    recording_mode: str = "desktop"  # "desktop" | "hybrid"


class ImportPyAutoGUIScriptRequest(BaseModel):
    script: str
    workflow_name: str
    project_id: Optional[int] = None


# ── Helper: persist nodes + sequential edges ──────────────────────────────────

def _persist_workflow(
    db: Session,
    workflow_name: str,
    project_id: int,
    creator_id: int,
    nodes: List[Dict[str, Any]],
    meta: Dict[str, Any],
) -> models.Workflow:
    db_workflow = models.Workflow(
        name=workflow_name,
        description=meta.get("description", ""),
        project_id=project_id,
        creator_id=creator_id,
        meta_data=meta,
    )
    db.add(db_workflow)
    db.flush()

    for node_data in nodes:
        db.add(models.WorkflowNode(
            workflow_id=db_workflow.id,
            node_id=node_data["node_id"],
            node_type=node_data["node_type"],
            label=node_data["label"],
            position_x=node_data.get("position_x", 100),
            position_y=node_data.get("position_y", 100),
            config=node_data.get("config", {}),
            meta_data=node_data.get("metadata", {}),
        ))

    node_ids = [n["node_id"] for n in nodes]
    for i in range(1, len(node_ids)):
        db.add(models.WorkflowEdge(
            workflow_id=db_workflow.id,
            edge_id=f"dedge_{i}",
            source_node_id=node_ids[i - 1],
            target_node_id=node_ids[i],
            source_handle=None,
            target_handle=None,
            config={},
            meta_data={},
        ))

    db.commit()
    db.refresh(db_workflow)
    return db_workflow


def _resolve_or_create_project(
    db: Session, project_id: Optional[int], user_id: int
) -> models.Project:
    if project_id:
        project = db.query(models.Project).filter(
            models.Project.id == project_id,
            models.Project.owner_id == user_id,
        ).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        return project

    project = db.query(models.Project).filter(
        models.Project.owner_id == user_id,
        models.Project.name == "Default Project",
    ).first()
    if not project:
        project = models.Project(
            name="Default Project",
            description="Auto-created default project",
            owner_id=user_id,
        )
        db.add(project)
        db.flush()
    return project


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/start")
async def start_desktop_recording(
    request: StartDesktopRecordingRequest,
    current_user: models.User = Depends(get_current_user),
):
    """Start a desktop recording session (mouse + keyboard via pynput)."""
    if current_user.id in _desktop_sessions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Desktop recording session already active",
        )

    recorder = DesktopRecorderService()
    try:
        result = recorder.start(session_id=request.session_name)
    except RuntimeError as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

    _desktop_sessions[current_user.id] = {
        "recorder": recorder,
        "session_id": result["session_id"],
        "status": "recording",
    }

    return result


@router.post("/stop")
async def stop_desktop_recording(
    current_user: models.User = Depends(get_current_user),
):
    """Stop desktop recording and return captured actions."""
    if current_user.id not in _desktop_sessions:
        raise HTTPException(status_code=404, detail="No active desktop recording session")

    session = _desktop_sessions.pop(current_user.id)
    recorder: DesktopRecorderService = session["recorder"]

    try:
        result = recorder.stop()
    except RuntimeError as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

    return result


@router.post("/save")
async def save_desktop_recording(
    request: SaveDesktopRecordingRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Save the currently buffered desktop actions as a workflow.
    Can be called while recording is still active (live save) or after stop.
    """
    session = _desktop_sessions.get(current_user.id)
    if not session:
        raise HTTPException(status_code=404, detail="No active desktop recording session")

    recorder: DesktopRecorderService = session["recorder"]
    nodes = recorder.get_actions()

    if not nodes:
        raise HTTPException(status_code=422, detail="No desktop actions recorded yet")

    project = _resolve_or_create_project(db, request.project_id, current_user.id)

    db_workflow = _persist_workflow(
        db=db,
        workflow_name=request.workflow_name,
        project_id=project.id,
        creator_id=current_user.id,
        nodes=nodes,
        meta={
            "source": "desktop_recorder",
            "recording_mode": request.recording_mode,
            "node_count": len(nodes),
        },
    )

    return {
        "workflow_id": db_workflow.id,
        "workflow_name": db_workflow.name,
        "nodes_count": len(nodes),
        "message": f"Desktop recording saved — {len(nodes)} actions",
    }


@router.post("/stop-and-save")
async def stop_and_save_desktop_recording(
    request: SaveDesktopRecordingRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Convenience: stop recording and immediately save as workflow."""
    if current_user.id not in _desktop_sessions:
        raise HTTPException(status_code=404, detail="No active desktop recording session")

    session = _desktop_sessions.pop(current_user.id)
    recorder: DesktopRecorderService = session["recorder"]

    try:
        result = recorder.stop()
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))

    nodes = result.get("actions", [])
    if not nodes:
        return {
            "workflow_id": None,
            "nodes_count": 0,
            "message": "Recording stopped — no actions captured",
        }

    project = _resolve_or_create_project(db, request.project_id, current_user.id)

    db_workflow = _persist_workflow(
        db=db,
        workflow_name=request.workflow_name,
        project_id=project.id,
        creator_id=current_user.id,
        nodes=nodes,
        meta={
            "source": "desktop_recorder",
            "recording_mode": request.recording_mode,
            "session_id": result.get("session_id"),
            "node_count": len(nodes),
        },
    )

    return {
        "workflow_id": db_workflow.id,
        "workflow_name": db_workflow.name,
        "nodes_count": len(nodes),
        "message": f"Desktop recording saved — {len(nodes)} actions captured",
    }


@router.get("/status")
async def get_desktop_recording_status(
    current_user: models.User = Depends(get_current_user),
):
    """Check if a desktop recording session is active."""
    session = _desktop_sessions.get(current_user.id)
    if session:
        recorder: DesktopRecorderService = session["recorder"]
        return {
            "is_recording": recorder.is_recording,
            "session_id": session["session_id"],
            "actions_count": len(recorder.get_actions()),
            "status": "recording" if recorder.is_recording else "stopped",
        }
    return {
        "is_recording": False,
        "session_id": None,
        "actions_count": 0,
        "status": "idle",
    }


@router.post("/import-script")
async def import_pyautogui_script(
    request: ImportPyAutoGUIScriptRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Parse a PyAutoGUI Python script and save it as a workflow.
    Supports the same action types as the live desktop recorder.
    """
    script = request.script.strip()
    if not script:
        raise HTTPException(status_code=400, detail="script must not be empty")

    nodes = PyAutoGUIScriptParser.parse(script)
    if not nodes:
        raise HTTPException(
            status_code=422,
            detail="No recognisable PyAutoGUI actions found in the script",
        )

    project = _resolve_or_create_project(db, request.project_id, current_user.id)

    db_workflow = _persist_workflow(
        db=db,
        workflow_name=request.workflow_name,
        project_id=project.id,
        creator_id=current_user.id,
        nodes=nodes,
        meta={
            "source": "import_pyautogui_script",
            "original_script": script,
            "node_count": len(nodes),
        },
    )

    return {
        "workflow_id": db_workflow.id,
        "workflow_name": db_workflow.name,
        "nodes_count": len(nodes),
        "edges_count": max(0, len(nodes) - 1),
        "message": f"PyAutoGUI script imported — {len(nodes)} nodes created",
    }


@router.get("/available")
async def check_desktop_dependencies():
    """Return which desktop automation dependencies are available."""
    try:
        import pynput  # noqa: F401
        pynput_ok = True
    except ImportError:
        pynput_ok = False

    try:
        import pyautogui  # noqa: F401
        pyautogui_ok = True
    except ImportError:
        pyautogui_ok = False

    try:
        import win32gui  # noqa: F401
        win32_ok = True
    except ImportError:
        win32_ok = False

    return {
        "pynput": pynput_ok,
        "pyautogui": pyautogui_ok,
        "pywin32": win32_ok,
        "desktop_recording_available": pynput_ok,
        "desktop_execution_available": pyautogui_ok,
        "install_hint": (
            "pip install pynput pyautogui pywin32"
            if not (pynput_ok and pyautogui_ok)
            else None
        ),
    }


# Made with Bob
