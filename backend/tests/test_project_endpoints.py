"""
Tests for project management API endpoints.
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.models import Project


@pytest.fixture
def client(override_get_db):
    """Create test client with database override."""
    return TestClient(app)


def test_create_project(client):
    """Test creating a new project."""
    project_data = {
        "name": "Test Project",
        "department": "IT"
    }
    
    response = client.post("/api/projects/", json=project_data)
    
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Test Project"
    assert data["department"] == "IT"
    assert data["status"] == "draft"
    assert "id" in data
    assert "created_at" in data
    assert "updated_at" in data


def test_list_projects(client, db_session):
    """Test listing projects."""
    # Create test projects
    project1 = Project(name="Project 1", department="IT")
    project2 = Project(name="Project 2", department="HR")
    
    db_session.add(project1)
    db_session.add(project2)
    db_session.commit()
    
    response = client.get("/api/projects/")
    
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert data[0]["name"] in ["Project 1", "Project 2"]
    assert data[1]["name"] in ["Project 1", "Project 2"]


def test_get_project(client, db_session):
    """Test getting a specific project."""
    # Create test project
    project = Project(name="Test Project", department="IT")
    db_session.add(project)
    db_session.commit()
    db_session.refresh(project)
    
    response = client.get(f"/api/projects/{project.id}")
    
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Test Project"
    assert data["department"] == "IT"
    assert data["id"] == project.id


def test_get_nonexistent_project(client):
    """Test getting a project that doesn't exist."""
    response = client.get("/api/projects/999")
    
    assert response.status_code == 404
    data = response.json()
    assert "error" in data
    assert "not found" in data["error"]["message"].lower()


def test_update_project(client, db_session):
    """Test updating a project."""
    # Create test project
    project = Project(name="Original Name", department="IT")
    db_session.add(project)
    db_session.commit()
    db_session.refresh(project)
    
    update_data = {
        "name": "Updated Name",
        "department": "HR"
    }
    
    response = client.put(f"/api/projects/{project.id}", json=update_data)
    
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Updated Name"
    assert data["department"] == "HR"
    assert data["id"] == project.id


def test_update_nonexistent_project(client):
    """Test updating a project that doesn't exist."""
    update_data = {"name": "Updated Name"}
    
    response = client.put("/api/projects/999", json=update_data)
    
    assert response.status_code == 404
    data = response.json()
    assert "error" in data
    assert "not found" in data["error"]["message"].lower()


def test_delete_project(client, db_session):
    """Test deleting a project."""
    # Create test project
    project = Project(name="Test Project", department="IT")
    db_session.add(project)
    db_session.commit()
    db_session.refresh(project)
    
    response = client.delete(f"/api/projects/{project.id}")
    
    assert response.status_code == 204
    
    # Verify project is deleted
    get_response = client.get(f"/api/projects/{project.id}")
    assert get_response.status_code == 404


def test_delete_nonexistent_project(client):
    """Test deleting a project that doesn't exist."""
    response = client.delete("/api/projects/999")
    
    assert response.status_code == 404
    data = response.json()
    assert "error" in data
    assert "not found" in data["error"]["message"].lower()