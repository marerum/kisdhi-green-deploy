"""
Property-based tests for flow manipulation functionality.

Feature: ai-business-flow, Property 5: Flow Node Manipulation
Feature: ai-business-flow, Property 7: Undo Functionality
Validates: Requirements 4.3, 4.4, 4.5, 4.7
"""

import pytest
from datetime import datetime, timedelta
from hypothesis import given, strategies as st, assume, settings, HealthCheck
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.models import Project, FlowNode
from app.database import Base, get_db


# Test database setup
TEST_DATABASE_URL = "sqlite:///:memory:"

def create_test_session():
    """Create a fresh test database session."""
    engine = create_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return TestingSessionLocal()


# Hypothesis strategies for generating test data
flow_node_text = st.text(min_size=1, max_size=500).filter(lambda x: x.strip())
flow_node_orders = st.integers(min_value=0, max_value=20)
project_names = st.text(min_size=1, max_size=255).filter(lambda x: x.strip())

# Strategy for generating flow node lists
flow_nodes_data = st.lists(
    st.tuples(flow_node_text, flow_node_orders),
    min_size=1,
    max_size=8,  # AI generates 5-8 nodes, so test up to 8
    unique_by=lambda x: x[1]  # Ensure unique orders
)


class TestFlowManipulationProperties:
    """Property-based tests for flow manipulation functionality."""

    @given(
        project_name=project_names,
        initial_nodes=flow_nodes_data,
        new_text=flow_node_text
    )
    @settings(
        suppress_health_check=[HealthCheck.function_scoped_fixture],
        deadline=None,  # Disable deadline for API operations
        max_examples=2  # Reduced for faster execution
    )
    def test_flow_node_manipulation_inline_editing(self, project_name: str, initial_nodes: list, new_text: str):
        """
        Property 5: Flow Node Manipulation - Inline Editing
        
        For any flow node, users should be able to edit content inline,
        with the action automatically persisted.
        
        **Feature: ai-business-flow, Property 5: Flow Node Manipulation**
        **Validates: Requirements 4.3**
        """
        # Create a fresh database session for this test
        db_session = create_test_session()
        
        def override_get_db():
            try:
                yield db_session
            finally:
                pass
        
        # Override the database dependency
        app.dependency_overrides[get_db] = override_get_db
        
        try:
            client = TestClient(app)
            
            # Create a project
            project_data = {"name": project_name}
            project_response = client.post("/api/projects/", json=project_data)
            assert project_response.status_code == 201
            project_id = project_response.json()["id"]
            
            # Create initial flow nodes
            created_node_ids = []
            for text, order in initial_nodes:
                node_data = {
                    "project_id": project_id,
                    "text": text,
                    "order": order
                }
                node_response = client.post("/api/flow/nodes", json=node_data)
                assert node_response.status_code == 200
                created_node_ids.append(node_response.json()["id"])
            
            # Test inline editing for each node
            for node_id in created_node_ids:
                # Get original node data
                original_nodes = client.get(f"/api/projects/{project_id}/flow").json()
                original_node = next(n for n in original_nodes if n["id"] == node_id)
                original_text = original_node["text"]
                original_order = original_node["order"]
                
                # Ensure we're testing with a different value to trigger timestamp update
                # If new_text is the same as original_text, modify it to ensure change
                test_text = new_text if new_text != original_text else f"Modified_{new_text}_different"
                
                # Perform inline edit
                update_data = {"text": test_text}
                update_response = client.put(f"/api/flow/nodes/{node_id}", json=update_data)
                
                # Verify successful update
                assert update_response.status_code == 200
                updated_node = update_response.json()
                
                # Verify inline editing properties
                assert updated_node["id"] == node_id
                assert updated_node["text"] == test_text  # Text was updated
                assert updated_node["order"] == original_order  # Order preserved
                assert updated_node["project_id"] == project_id  # Project relationship preserved
                
                # Verify automatic persistence (Requirements 4.3)
                # Query database directly to ensure changes were persisted
                db_node = db_session.query(FlowNode).filter(FlowNode.id == node_id).first()
                assert db_node is not None
                assert db_node.text == test_text
                assert db_node.order == original_order
                assert db_node.project_id == project_id
                
                # Verify persistence across API calls
                get_response = client.get(f"/api/projects/{project_id}/flow")
                assert get_response.status_code == 200
                flow_nodes = get_response.json()
                
                updated_node_in_list = next(n for n in flow_nodes if n["id"] == node_id)
                assert updated_node_in_list["text"] == test_text
                assert updated_node_in_list["order"] == original_order
                
        finally:
            # Clean up
            app.dependency_overrides.clear()
            db_session.close()

    @given(
        project_name=project_names,
        initial_nodes=flow_nodes_data
    )
    @settings(
        suppress_health_check=[HealthCheck.function_scoped_fixture],
        deadline=None,  # Disable deadline for API operations
        max_examples=2  # Reduced for faster execution
    )
    def test_flow_node_manipulation_deletion(self, project_name: str, initial_nodes: list):
        """
        Property 5: Flow Node Manipulation - Node Deletion
        
        For any flow node, users should be able to delete the node,
        with the action automatically persisted.
        
        **Feature: ai-business-flow, Property 5: Flow Node Manipulation**
        **Validates: Requirements 4.5**
        """
        # Skip test if no nodes to delete
        assume(len(initial_nodes) > 0)
        
        # Create a fresh database session for this test
        db_session = create_test_session()
        
        def override_get_db():
            try:
                yield db_session
            finally:
                pass
        
        # Override the database dependency
        app.dependency_overrides[get_db] = override_get_db
        
        try:
            client = TestClient(app)
            
            # Create a project
            project_data = {"name": project_name}
            project_response = client.post("/api/projects/", json=project_data)
            assert project_response.status_code == 201
            project_id = project_response.json()["id"]
            
            # Create initial flow nodes
            created_node_ids = []
            for text, order in initial_nodes:
                node_data = {
                    "project_id": project_id,
                    "text": text,
                    "order": order
                }
                node_response = client.post("/api/flow/nodes", json=node_data)
                assert node_response.status_code == 200
                created_node_ids.append(node_response.json()["id"])
            
            # Get initial node count
            initial_count = len(created_node_ids)
            
            # Test deletion for the first node
            node_to_delete = created_node_ids[0]
            
            # Verify node exists before deletion
            db_node_before = db_session.query(FlowNode).filter(FlowNode.id == node_to_delete).first()
            assert db_node_before is not None
            
            # Perform deletion
            delete_response = client.delete(f"/api/flow/nodes/{node_to_delete}")
            
            # Verify successful deletion
            assert delete_response.status_code == 200
            assert "deleted successfully" in delete_response.json()["message"]
            
            # Verify automatic persistence of deletion (Requirements 4.5)
            # Query database directly to ensure node was deleted
            db_session.expunge_all()  # Clear session cache
            db_node_after = db_session.query(FlowNode).filter(FlowNode.id == node_to_delete).first()
            assert db_node_after is None  # Node should be deleted from database
            
            # Verify deletion persists across API calls
            get_response = client.get(f"/api/projects/{project_id}/flow")
            assert get_response.status_code == 200
            remaining_nodes = get_response.json()
            
            # Verify node count decreased
            assert len(remaining_nodes) == initial_count - 1
            
            # Verify deleted node is not in the list
            deleted_node_in_list = next((n for n in remaining_nodes if n["id"] == node_to_delete), None)
            assert deleted_node_in_list is None
            
            # Verify other nodes are still present
            for node_id in created_node_ids[1:]:  # Skip the deleted node
                node_in_list = next((n for n in remaining_nodes if n["id"] == node_id), None)
                assert node_in_list is not None
                
                # Verify node still exists in database
                db_node = db_session.query(FlowNode).filter(FlowNode.id == node_id).first()
                assert db_node is not None
                
        finally:
            # Clean up
            app.dependency_overrides.clear()
            db_session.close()

    @given(
        project_name=project_names,
        initial_nodes=flow_nodes_data
    )
    @settings(
        suppress_health_check=[HealthCheck.function_scoped_fixture],
        deadline=None,  # Disable deadline for API operations
        max_examples=2  # Reduced for faster execution
    )
    def test_flow_node_manipulation_reordering(self, project_name: str, initial_nodes: list):
        """
        Property 5: Flow Node Manipulation - Node Reordering
        
        For any flow node, users should be able to reorder it through drag operations,
        with the action automatically persisted.
        
        **Feature: ai-business-flow, Property 5: Flow Node Manipulation**
        **Validates: Requirements 4.4**
        """
        # Skip test if not enough nodes to reorder
        assume(len(initial_nodes) >= 2)
        
        # Create a fresh database session for this test
        db_session = create_test_session()
        
        def override_get_db():
            try:
                yield db_session
            finally:
                pass
        
        # Override the database dependency
        app.dependency_overrides[get_db] = override_get_db
        
        try:
            client = TestClient(app)
            
            # Create a project
            project_data = {"name": project_name}
            project_response = client.post("/api/projects/", json=project_data)
            assert project_response.status_code == 201
            project_id = project_response.json()["id"]
            
            # Create initial flow nodes with normalized orders (0, 1, 2, ...)
            created_nodes = []
            for i, (text, _) in enumerate(initial_nodes):
                node_data = {
                    "project_id": project_id,
                    "text": text,
                    "order": i  # Use index as order for consistency
                }
                node_response = client.post("/api/flow/nodes", json=node_data)
                assert node_response.status_code == 200
                created_nodes.append(node_response.json())
            
            # Get original ordering
            original_nodes = client.get(f"/api/projects/{project_id}/flow").json()
            original_order = {node["id"]: node["order"] for node in original_nodes}
            
            # Create a reversed reordering
            reversed_node_orders = []
            for i, node in enumerate(reversed(created_nodes)):
                reversed_node_orders.append({"id": node["id"], "order": i})
            
            # Perform reordering
            reorder_data = {"node_orders": reversed_node_orders}
            reorder_response = client.put(f"/api/projects/{project_id}/flow/reorder", json=reorder_data)
            
            # Verify successful reordering
            assert reorder_response.status_code == 200
            reordered_nodes = reorder_response.json()
            
            # Verify reordering properties
            assert len(reordered_nodes) == len(created_nodes)
            
            # Verify new order is applied
            for expected_data in reversed_node_orders:
                node_id = expected_data["id"]
                expected_order = expected_data["order"]
                
                # Find node in response
                reordered_node = next(n for n in reordered_nodes if n["id"] == node_id)
                assert reordered_node["order"] == expected_order
            
            # Verify automatic persistence of reordering (Requirements 4.4)
            # Query database directly to ensure changes were persisted
            db_session.expunge_all()  # Clear session cache
            for expected_data in reversed_node_orders:
                node_id = expected_data["id"]
                expected_order = expected_data["order"]
                
                db_node = db_session.query(FlowNode).filter(FlowNode.id == node_id).first()
                assert db_node is not None
                assert db_node.order == expected_order
            
            # Verify persistence across API calls
            get_response = client.get(f"/api/projects/{project_id}/flow")
            assert get_response.status_code == 200
            flow_nodes = get_response.json()
            
            # Verify nodes are returned in new order
            assert len(flow_nodes) == len(created_nodes)
            for i, node in enumerate(flow_nodes):
                assert node["order"] == i  # Should be ordered 0, 1, 2, ...
            
            # Verify the actual reordering took effect
            # The first node in the new order should be the last node from original order
            first_new_node = flow_nodes[0]
            last_original_node = created_nodes[-1]
            assert first_new_node["id"] == last_original_node["id"]
            assert first_new_node["text"] == last_original_node["text"]
            
        finally:
            # Clean up
            app.dependency_overrides.clear()
            db_session.close()

    @given(
        project_name=project_names,
        initial_nodes=flow_nodes_data,
        operation_type=st.sampled_from(["create", "update", "delete", "reorder"])
    )
    @settings(
        suppress_health_check=[HealthCheck.function_scoped_fixture],
        deadline=None,  # Disable deadline for API operations
        max_examples=2  # Reduced for faster execution
    )
    def test_undo_functionality(self, project_name: str, initial_nodes: list, operation_type: str):
        """
        Property 7: Undo Functionality
        
        For any user operation, the system should provide undo capability 
        for the most recent action only.
        
        **Feature: ai-business-flow, Property 7: Undo Functionality**
        **Validates: Requirements 4.7**
        """
        # Skip test if no nodes for certain operations
        if operation_type in ["update", "delete", "reorder"] and len(initial_nodes) == 0:
            assume(False)
        if operation_type == "reorder" and len(initial_nodes) < 2:
            assume(False)
        
        # Create a fresh database session for this test
        db_session = create_test_session()
        
        def override_get_db():
            try:
                yield db_session
            finally:
                pass
        
        # Override the database dependency
        app.dependency_overrides[get_db] = override_get_db
        
        try:
            client = TestClient(app)
            
            # Create a project
            project_data = {"name": project_name}
            project_response = client.post("/api/projects/", json=project_data)
            assert project_response.status_code == 201
            project_id = project_response.json()["id"]
            
            # Create initial flow nodes (if any)
            created_nodes = []
            for i, (text, _) in enumerate(initial_nodes):
                node_data = {
                    "project_id": project_id,
                    "text": text,
                    "order": i
                }
                node_response = client.post("/api/flow/nodes", json=node_data)
                assert node_response.status_code == 200
                created_nodes.append(node_response.json())
            
            # Get state before operation
            before_nodes = client.get(f"/api/projects/{project_id}/flow").json()
            before_state = {node["id"]: {"text": node["text"], "order": node["order"]} for node in before_nodes}
            
            # Perform the operation based on type
            operation_node_id = None
            
            if operation_type == "create":
                # Create a new node
                new_node_data = {
                    "project_id": project_id,
                    "text": "New test node",
                    "order": len(created_nodes)
                }
                create_response = client.post("/api/flow/nodes", json=new_node_data)
                assert create_response.status_code == 200
                operation_node_id = create_response.json()["id"]
                
            elif operation_type == "update" and created_nodes:
                # Update an existing node
                node_to_update = created_nodes[0]
                operation_node_id = node_to_update["id"]
                update_data = {"text": "Updated text"}
                update_response = client.put(f"/api/flow/nodes/{operation_node_id}", json=update_data)
                assert update_response.status_code == 200
                
            elif operation_type == "delete" and created_nodes:
                # Delete an existing node
                node_to_delete = created_nodes[0]
                operation_node_id = node_to_delete["id"]
                delete_response = client.delete(f"/api/flow/nodes/{operation_node_id}")
                assert delete_response.status_code == 200
                
            elif operation_type == "reorder" and len(created_nodes) >= 2:
                # Reorder nodes (reverse order)
                reversed_orders = []
                for i, node in enumerate(reversed(created_nodes)):
                    reversed_orders.append({"id": node["id"], "order": i})
                
                reorder_data = {"node_orders": reversed_orders}
                reorder_response = client.put(f"/api/projects/{project_id}/flow/reorder", json=reorder_data)
                assert reorder_response.status_code == 200
            
            # Get state after operation
            after_nodes = client.get(f"/api/projects/{project_id}/flow").json()
            
            # Verify operation had an effect (state changed)
            if operation_type == "create":
                assert len(after_nodes) == len(before_nodes) + 1
            elif operation_type == "delete":
                assert len(after_nodes) == len(before_nodes) - 1
            elif operation_type == "update" and operation_node_id:
                after_node = next((n for n in after_nodes if n["id"] == operation_node_id), None)
                assert after_node is not None
                assert after_node["text"] == "Updated text"
            elif operation_type == "reorder":
                # Verify order changed
                after_state = {node["id"]: node["order"] for node in after_nodes}
                before_order_state = {node["id"]: node["order"] for node in before_nodes}
                assert after_state != before_order_state
            
            # Perform undo operation
            undo_response = client.post(f"/api/projects/{project_id}/flow/undo")
            assert undo_response.status_code == 200
            undone_nodes = undo_response.json()
            
            # Verify undo functionality properties (Requirements 4.7)
            if operation_type == "create":
                # Undo create should remove the created node
                assert len(undone_nodes) == len(before_nodes)
                undone_node = next((n for n in undone_nodes if n["id"] == operation_node_id), None)
                assert undone_node is None  # Created node should be gone
                
            elif operation_type == "delete":
                # Undo delete should restore the deleted node
                assert len(undone_nodes) == len(before_nodes)
                # Note: Restored node will have a new ID, so check by text and order
                original_deleted_node = before_state[operation_node_id]
                restored_node = next((n for n in undone_nodes 
                                    if n["text"] == original_deleted_node["text"] 
                                    and n["order"] == original_deleted_node["order"]), None)
                assert restored_node is not None  # Deleted node should be restored
                assert restored_node["text"] == original_deleted_node["text"]
                assert restored_node["order"] == original_deleted_node["order"]
                
            elif operation_type == "update" and operation_node_id:
                # Undo update should restore original text
                undone_node = next((n for n in undone_nodes if n["id"] == operation_node_id), None)
                assert undone_node is not None
                assert undone_node["text"] == before_state[operation_node_id]["text"]
                assert undone_node["order"] == before_state[operation_node_id]["order"]
                
            elif operation_type == "reorder":
                # Undo reorder should restore original order
                undone_state = {node["id"]: node["order"] for node in undone_nodes}
                before_order_state = {node["id"]: node["order"] for node in before_nodes}
                assert undone_state == before_order_state
            
            # Verify undo persistence in database
            db_session.expunge_all()  # Clear session cache
            db_nodes = db_session.query(FlowNode).filter(FlowNode.project_id == project_id).all()
            
            if operation_type == "create":
                # Created node should not exist in database
                db_created_node = next((n for n in db_nodes if n.id == operation_node_id), None)
                assert db_created_node is None
                
            elif operation_type == "delete":
                # Deleted node should exist in database again (with new ID)
                original_deleted_node = before_state[operation_node_id]
                db_restored_node = next((n for n in db_nodes 
                                       if n.text == original_deleted_node["text"] 
                                       and n.order == original_deleted_node["order"]), None)
                assert db_restored_node is not None
                assert db_restored_node.text == original_deleted_node["text"]
                
            elif operation_type == "update" and operation_node_id:
                # Updated node should have original text in database
                db_undone_node = next((n for n in db_nodes if n.id == operation_node_id), None)
                assert db_undone_node is not None
                assert db_undone_node.text == before_state[operation_node_id]["text"]
            
            # Test that undo is only available for most recent operation (Requirements 4.7)
            # Try to undo again - should fail
            second_undo_response = client.post(f"/api/projects/{project_id}/flow/undo")
            assert second_undo_response.status_code == 400
            assert "No operation to undo" in second_undo_response.json()["error"]["message"]
            
        finally:
            # Clean up
            app.dependency_overrides.clear()
            db_session.close()