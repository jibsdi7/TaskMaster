"""
Workflow API tests
"""
import pytest
from fastapi import status


def test_create_workflow(client, auth_headers, test_project):
    """Test workflow creation"""
    response = client.post(
        "/api/workflows",
        headers=auth_headers,
        json={
            "name": "New Workflow",
            "description": "Test workflow",
            "project_id": test_project.id,
            "nodes": [
                {
                    "node_id": "node_1",
                    "node_type": "open_url",
                    "label": "Open URL",
                    "position_x": 100,
                    "position_y": 100,
                    "config": {"url": "https://example.com"},
                    "metadata": {}
                }
            ],
            "edges": [],
            "metadata": {}
        }
    )
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["name"] == "New Workflow"
    assert len(data["nodes"]) == 1


def test_list_workflows(client, auth_headers, test_workflow):
    """Test listing workflows"""
    response = client.get("/api/workflows", headers=auth_headers)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1


def test_get_workflow(client, auth_headers, test_workflow):
    """Test getting a specific workflow"""
    response = client.get(
        f"/api/workflows/{test_workflow.id}",
        headers=auth_headers
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["id"] == test_workflow.id
    assert data["name"] == test_workflow.name


def test_update_workflow(client, auth_headers, test_workflow):
    """Test updating a workflow"""
    response = client.put(
        f"/api/workflows/{test_workflow.id}",
        headers=auth_headers,
        json={
            "name": "Updated Workflow",
            "description": "Updated description"
        }
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["name"] == "Updated Workflow"
    assert data["version"] == 2


def test_delete_workflow(client, auth_headers, test_workflow):
    """Test deleting a workflow"""
    response = client.delete(
        f"/api/workflows/{test_workflow.id}",
        headers=auth_headers
    )
    assert response.status_code == status.HTTP_204_NO_CONTENT
    
    # Verify deletion
    response = client.get(
        f"/api/workflows/{test_workflow.id}",
        headers=auth_headers
    )
    assert response.status_code == status.HTTP_404_NOT_FOUND


def test_run_workflow(client, auth_headers, test_workflow):
    """Test running a workflow"""
    response = client.post(
        f"/api/workflows/{test_workflow.id}/run",
        headers=auth_headers,
        json={
            "inputs": {},
            "config": {}
        }
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "run_id" in data
    assert data["status"] == "queued"


def test_workflow_unauthorized(client, test_workflow):
    """Test accessing workflow without authentication"""
    response = client.get(f"/api/workflows/{test_workflow.id}")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED

# Made with Bob
