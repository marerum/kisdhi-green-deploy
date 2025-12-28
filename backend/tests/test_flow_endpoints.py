"""
Tests for flow management API endpoints.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.models import Project, FlowNode


client = TestClient(app)


def test_get_flow_nodes_empty(db_session: Session, override_get_db):
    """Test getting flow nodes for a project with no nodes."""
    # Create a test project
    project = Project(name="Test Project", status="draft")
    db_session.add(project)
    db_session.commit()
    db_session.refresh(project)
    
    # Get flow nodes (should be empty)
    response = client.get(f"/api/projects/{project.id}/flow")
    assert response.status_code == 200
    assert response.json() == []


def test_get_flow_nodes_with_data(db_session: Session, override_get_db):
    """Test getting flow nodes for a project with existing nodes."""
    # Create a test project
    project = Project(name="Test Project", status="draft")
    db_session.add(project)
    db_session.commit()
    db_session.refresh(project)
    
    # Create flow nodes
    node1 = FlowNode(project_id=project.id, text="First step", order=0)
    node2 = FlowNode(project_id=project.id, text="Second step", order=1)
    db_session.add_all([node1, node2])
    db_session.commit()
    
    # Get flow nodes
    response = client.get(f"/api/projects/{project.id}/flow")
    assert response.status_code == 200
    
    nodes = response.json()
    assert len(nodes) == 2
    assert nodes[0]["text"] == "First step"
    assert nodes[0]["order"] == 0
    assert nodes[1]["text"] == "Second step"
    assert nodes[1]["order"] == 1


def test_create_flow_node(db_session: Session, override_get_db):
    """Test creating a new flow node."""
    # Create a test project
    project = Project(name="Test Project", status="draft")
    db_session.add(project)
    db_session.commit()
    db_session.refresh(project)
    
    # Create flow node
    node_data = {
        "project_id": project.id,
        "text": "New flow step",
        "order": 0
    }
    response = client.post("/api/flow/nodes", json=node_data)
    assert response.status_code == 200
    
    created_node = response.json()
    assert created_node["text"] == "New flow step"
    assert created_node["order"] == 0
    assert created_node["project_id"] == project.id


def test_update_flow_node(db_session: Session, override_get_db):
    """Test updating an existing flow node."""
    # Create a test project and node
    project = Project(name="Test Project", status="draft")
    db_session.add(project)
    db_session.commit()
    db_session.refresh(project)
    
    node = FlowNode(project_id=project.id, text="Original text", order=0)
    db_session.add(node)
    db_session.commit()
    db_session.refresh(node)
    
    # Update the node
    update_data = {"text": "Updated text"}
    response = client.put(f"/api/flow/nodes/{node.id}", json=update_data)
    assert response.status_code == 200
    
    updated_node = response.json()
    assert updated_node["text"] == "Updated text"
    assert updated_node["id"] == node.id


def test_delete_flow_node(db_session: Session, override_get_db):
    """Test deleting a flow node."""
    # Create a test project and node
    project = Project(name="Test Project", status="draft")
    db_session.add(project)
    db_session.commit()
    db_session.refresh(project)
    
    node = FlowNode(project_id=project.id, text="To be deleted", order=0)
    db_session.add(node)
    db_session.commit()
    db_session.refresh(node)
    
    # Delete the node
    response = client.delete(f"/api/flow/nodes/{node.id}")
    assert response.status_code == 200
    assert "deleted successfully" in response.json()["message"]
    
    # Verify node is deleted
    deleted_node = db_session.query(FlowNode).filter(FlowNode.id == node.id).first()
    assert deleted_node is None


def test_reorder_flow_nodes(db_session: Session, override_get_db):
    """Test reordering flow nodes."""
    # Create a test project
    project = Project(name="Test Project", status="draft")
    db_session.add(project)
    db_session.commit()
    db_session.refresh(project)
    
    # Create flow nodes
    node1 = FlowNode(project_id=project.id, text="First step", order=0)
    node2 = FlowNode(project_id=project.id, text="Second step", order=1)
    node3 = FlowNode(project_id=project.id, text="Third step", order=2)
    db_session.add_all([node1, node2, node3])
    db_session.commit()
    db_session.refresh(node1)
    db_session.refresh(node2)
    db_session.refresh(node3)
    
    # Reorder nodes (reverse order)
    reorder_data = {
        "node_orders": [
            {"id": node3.id, "order": 0},
            {"id": node2.id, "order": 1},
            {"id": node1.id, "order": 2}
        ]
    }
    response = client.put(f"/api/projects/{project.id}/flow/reorder", json=reorder_data)
    assert response.status_code == 200
    
    reordered_nodes = response.json()
    assert len(reordered_nodes) == 3
    assert reordered_nodes[0]["text"] == "Third step"
    assert reordered_nodes[0]["order"] == 0
    assert reordered_nodes[1]["text"] == "Second step"
    assert reordered_nodes[1]["order"] == 1
    assert reordered_nodes[2]["text"] == "First step"
    assert reordered_nodes[2]["order"] == 2


def test_get_flow_nodes_nonexistent_project(override_get_db):
    """Test getting flow nodes for a nonexistent project."""
    response = client.get("/api/projects/99999/flow")
    assert response.status_code == 404
    assert "not found" in response.json()["error"]["message"]


def test_create_flow_node_nonexistent_project(override_get_db):
    """Test creating a flow node for a nonexistent project."""
    node_data = {
        "project_id": 99999,
        "text": "New flow step",
        "order": 0
    }
    response = client.post("/api/flow/nodes", json=node_data)
    assert response.status_code == 404
    assert "not found" in response.json()["error"]["message"]


def test_update_nonexistent_flow_node(override_get_db):
    """Test updating a nonexistent flow node."""
    update_data = {"text": "Updated text"}
    response = client.put("/api/flow/nodes/99999", json=update_data)
    assert response.status_code == 404
    assert "not found" in response.json()["error"]["message"]


def test_delete_nonexistent_flow_node(override_get_db):
    """Test deleting a nonexistent flow node."""
    response = client.delete("/api/flow/nodes/99999")
    assert response.status_code == 404
    assert "not found" in response.json()["error"]["message"]


def test_reorder_flow_nodes_nonexistent_project(override_get_db):
    """Test reordering flow nodes for a nonexistent project."""
    reorder_data = {
        "node_orders": [
            {"id": 1, "order": 0},
            {"id": 2, "order": 1}
        ]
    }
    response = client.put("/api/projects/99999/flow/reorder", json=reorder_data)
    assert response.status_code == 404
    assert "not found" in response.json()["error"]["message"]


def test_undo_create_node(db_session: Session, override_get_db):
    """Test undoing a node creation."""
    # Create a test project
    project = Project(name="Test Project", status="draft")
    db_session.add(project)
    db_session.commit()
    db_session.refresh(project)
    
    # Create flow node
    node_data = {
        "project_id": project.id,
        "text": "New flow step",
        "order": 0
    }
    response = client.post("/api/flow/nodes", json=node_data)
    assert response.status_code == 200
    created_node = response.json()
    
    # Undo the creation
    response = client.post(f"/api/projects/{project.id}/flow/undo")
    assert response.status_code == 200
    
    # Verify node was deleted
    nodes = response.json()
    assert len(nodes) == 0


def test_undo_delete_node(db_session: Session, override_get_db):
    """Test undoing a node deletion."""
    # Create a test project and node
    project = Project(name="Test Project", status="draft")
    db_session.add(project)
    db_session.commit()
    db_session.refresh(project)
    
    node = FlowNode(project_id=project.id, text="To be deleted", order=0)
    db_session.add(node)
    db_session.commit()
    db_session.refresh(node)
    
    # Delete the node
    response = client.delete(f"/api/flow/nodes/{node.id}")
    assert response.status_code == 200
    
    # Undo the deletion
    response = client.post(f"/api/projects/{project.id}/flow/undo")
    assert response.status_code == 200
    
    # Verify node was restored
    nodes = response.json()
    assert len(nodes) == 1
    assert nodes[0]["text"] == "To be deleted"
    assert nodes[0]["order"] == 0


def test_undo_update_node(db_session: Session, override_get_db):
    """Test undoing a node update."""
    # Create a test project and node
    project = Project(name="Test Project", status="draft")
    db_session.add(project)
    db_session.commit()
    db_session.refresh(project)
    
    node = FlowNode(project_id=project.id, text="Original text", order=0)
    db_session.add(node)
    db_session.commit()
    db_session.refresh(node)
    
    # Update the node
    update_data = {"text": "Updated text"}
    response = client.put(f"/api/flow/nodes/{node.id}", json=update_data)
    assert response.status_code == 200
    
    # Undo the update
    response = client.post(f"/api/projects/{project.id}/flow/undo")
    assert response.status_code == 200
    
    # Verify text was restored
    nodes = response.json()
    assert len(nodes) == 1
    assert nodes[0]["text"] == "Original text"


def test_undo_reorder_nodes(db_session: Session, override_get_db):
    """Test undoing a node reordering."""
    # Create a test project
    project = Project(name="Test Project", status="draft")
    db_session.add(project)
    db_session.commit()
    db_session.refresh(project)
    
    # Create flow nodes
    node1 = FlowNode(project_id=project.id, text="First step", order=0)
    node2 = FlowNode(project_id=project.id, text="Second step", order=1)
    db_session.add_all([node1, node2])
    db_session.commit()
    db_session.refresh(node1)
    db_session.refresh(node2)
    
    # Reorder nodes
    reorder_data = {
        "node_orders": [
            {"id": node2.id, "order": 0},
            {"id": node1.id, "order": 1}
        ]
    }
    response = client.put(f"/api/projects/{project.id}/flow/reorder", json=reorder_data)
    assert response.status_code == 200
    
    # Undo the reordering
    response = client.post(f"/api/projects/{project.id}/flow/undo")
    assert response.status_code == 200
    
    # Verify original order was restored
    nodes = response.json()
    assert len(nodes) == 2
    assert nodes[0]["text"] == "First step"
    assert nodes[0]["order"] == 0
    assert nodes[1]["text"] == "Second step"
    assert nodes[1]["order"] == 1


def test_undo_no_operation(db_session: Session, override_get_db):
    """Test undo when there's no operation to undo."""
    # Create a test project
    project = Project(name="Test Project", status="draft")
    db_session.add(project)
    db_session.commit()
    db_session.refresh(project)
    
    # Try to undo without any previous operation
    response = client.post(f"/api/projects/{project.id}/flow/undo")
    assert response.status_code == 400
    assert "No operation to undo" in response.json()["error"]["message"]


def test_undo_nonexistent_project(override_get_db):
    """Test undo for a nonexistent project."""
    response = client.post("/api/projects/99999/flow/undo")
    assert response.status_code == 404
    assert "not found" in response.json()["error"]["message"]