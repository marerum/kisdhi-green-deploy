"""
Unit tests for hearing log API endpoints.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.models import Project, HearingLog


@pytest.fixture
def client(override_get_db):
    """Create test client with database override."""
    return TestClient(app)


def test_create_and_get_hearing_logs(client: TestClient):
    """Test creating and retrieving hearing logs for a project."""
    # First create a project
    project_data = {"name": "Test Project", "department": "IT"}
    project_response = client.post("/api/projects/", json=project_data)
    assert project_response.status_code == 201
    project_id = project_response.json()["id"]
    
    # Add a hearing log
    hearing_data = {"content": "This is a test hearing log entry"}
    hearing_response = client.post(f"/api/projects/{project_id}/hearing", json=hearing_data)
    assert hearing_response.status_code == 201
    
    hearing_log = hearing_response.json()
    assert hearing_log["content"] == "This is a test hearing log entry"
    assert hearing_log["project_id"] == project_id
    assert "created_at" in hearing_log
    
    # Get hearing logs for the project
    get_response = client.get(f"/api/projects/{project_id}/hearing")
    assert get_response.status_code == 200
    
    hearing_logs = get_response.json()
    assert len(hearing_logs) == 1
    assert hearing_logs[0]["content"] == "This is a test hearing log entry"


def test_update_hearing_log(client: TestClient):
    """Test updating a hearing log's content."""
    # Create project and hearing log
    project_data = {"name": "Test Project"}
    project_response = client.post("/api/projects/", json=project_data)
    project_id = project_response.json()["id"]
    
    hearing_data = {"content": "Original content"}
    hearing_response = client.post(f"/api/projects/{project_id}/hearing", json=hearing_data)
    hearing_id = hearing_response.json()["id"]
    
    # Update the hearing log
    update_data = {"content": "Updated content"}
    update_response = client.put(f"/api/hearing/{hearing_id}", json=update_data)
    assert update_response.status_code == 200
    
    updated_hearing = update_response.json()
    assert updated_hearing["content"] == "Updated content"
    assert updated_hearing["id"] == hearing_id


def test_chronological_ordering(client: TestClient):
    """Test that hearing logs are returned in chronological order."""
    # Create project
    project_data = {"name": "Test Project"}
    project_response = client.post("/api/projects/", json=project_data)
    project_id = project_response.json()["id"]
    
    # Add multiple hearing logs
    hearing_logs = [
        {"content": "First entry"},
        {"content": "Second entry"},
        {"content": "Third entry"}
    ]
    
    for hearing_data in hearing_logs:
        client.post(f"/api/projects/{project_id}/hearing", json=hearing_data)
    
    # Get hearing logs and verify order
    get_response = client.get(f"/api/projects/{project_id}/hearing")
    retrieved_logs = get_response.json()
    
    assert len(retrieved_logs) == 3
    assert retrieved_logs[0]["content"] == "First entry"
    assert retrieved_logs[1]["content"] == "Second entry"
    assert retrieved_logs[2]["content"] == "Third entry"


def test_hearing_log_for_nonexistent_project(client: TestClient):
    """Test adding hearing log to non-existent project returns 404."""
    hearing_data = {"content": "Test content"}
    response = client.post("/api/projects/999/hearing", json=hearing_data)
    assert response.status_code == 404
    assert "not found" in response.json()["error"]["message"].lower()


def test_update_nonexistent_hearing_log(client: TestClient):
    """Test updating non-existent hearing log returns 404."""
    update_data = {"content": "Updated content"}
    response = client.put("/api/hearing/999", json=update_data)
    assert response.status_code == 404
    assert "not found" in response.json()["error"]["message"].lower()


def test_get_hearing_logs_for_nonexistent_project(client: TestClient):
    """Test getting hearing logs for non-existent project returns 404."""
    response = client.get("/api/projects/999/hearing")
    assert response.status_code == 404
    assert "not found" in response.json()["error"]["message"].lower()


def test_delete_hearing_log(client: TestClient):
    """Test deleting a hearing log."""
    # Create project and hearing log
    project_data = {"name": "Test Project"}
    project_response = client.post("/api/projects/", json=project_data)
    project_id = project_response.json()["id"]
    
    hearing_data = {"content": "Test content to delete"}
    hearing_response = client.post(f"/api/projects/{project_id}/hearing", json=hearing_data)
    hearing_id = hearing_response.json()["id"]
    
    # Verify hearing log exists
    get_response = client.get(f"/api/projects/{project_id}/hearing")
    assert len(get_response.json()) == 1
    
    # Delete the hearing log
    delete_response = client.delete(f"/api/hearing/{hearing_id}")
    assert delete_response.status_code == 200
    assert "deleted successfully" in delete_response.json()["message"]
    
    # Verify hearing log is deleted
    get_response = client.get(f"/api/projects/{project_id}/hearing")
    assert len(get_response.json()) == 0


def test_delete_nonexistent_hearing_log(client: TestClient):
    """Test deleting non-existent hearing log returns 404."""
    response = client.delete("/api/hearing/999")
    assert response.status_code == 404
    assert "not found" in response.json()["error"]["message"].lower()