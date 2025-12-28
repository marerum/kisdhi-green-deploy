"""
End-to-end workflow tests for the AI Business Flow application.

These tests validate complete user workflows from project creation through
flow editing, ensuring automatic saving works across all screens and
AI generation functions correctly with various inputs.

Requirements: 1.1, 2.1, 4.1
"""

import pytest
import json
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.models import Project, HearingLog, FlowNode
from app.services.ai import ai_service


client = TestClient(app)


class TestEndToEndWorkflows:
    """End-to-end workflow tests for complete user journeys."""

    def test_complete_project_creation_to_flow_editing_workflow(self, db_session: Session, override_get_db):
        """
        Test complete user workflow from project creation to flow editing.
        
        This test validates the entire user journey:
        1. Create a new project (Requirement 1.1)
        2. Add hearing logs with automatic saving (Requirement 2.1)
        3. Generate AI flow from hearing content (Requirement 4.1)
        4. Edit and manipulate the generated flow
        5. Verify all data persists correctly across operations
        
        Requirements: 1.1, 2.1, 4.1
        """
        # Step 1: Create a new project (Screen ①)
        project_data = {
            "name": "Customer Support Process Analysis",
            "department": "Customer Service"
        }
        
        project_response = client.post("/api/projects/", json=project_data)
        assert project_response.status_code == 201
        project = project_response.json()
        project_id = project["id"]
        
        # Verify project appears in project list
        projects_response = client.get("/api/projects/")
        assert projects_response.status_code == 200
        projects = projects_response.json()
        assert any(p["id"] == project_id for p in projects)
        
        # Verify project has correct initial state
        created_project = next(p for p in projects if p["id"] == project_id)
        assert created_project["name"] == "Customer Support Process Analysis"
        assert created_project["department"] == "Customer Service"
        assert created_project["status"] == "draft"
        assert "created_at" in created_project
        assert "updated_at" in created_project
        
        # Step 2: Navigate to hearing input (Screen ②) and add hearing logs
        hearing_contents = [
            "Customer calls support line with billing question. Agent verifies identity.",
            "Agent looks up customer account and reviews billing details.",
            "Simple questions get immediate explanation, complex issues are escalated.",
            "Billing specialists investigate and provide resolution within 3 days."
        ]
        
        hearing_log_ids = []
        for i, content in enumerate(hearing_contents):
            hearing_data = {"content": content}
            hearing_response = client.post(f"/api/projects/{project_id}/hearing", json=hearing_data)
            assert hearing_response.status_code == 201
            
            hearing_log = hearing_response.json()
            hearing_log_ids.append(hearing_log["id"])
            
            # Verify automatic saving - each hearing log is immediately persisted
            assert hearing_log["content"] == content
            assert hearing_log["project_id"] == project_id
            assert "created_at" in hearing_log
            
            # Verify chronological ordering
            if i > 0:
                previous_log_time = datetime.fromisoformat(
                    hearing_logs_response.json()[i-1]["created_at"].replace('Z', '+00:00')
                )
                current_log_time = datetime.fromisoformat(
                    hearing_log["created_at"].replace('Z', '+00:00')
                )
                assert current_log_time >= previous_log_time
            
            # Verify hearing logs can be retrieved in chronological order
            hearing_logs_response = client.get(f"/api/projects/{project_id}/hearing")
            assert hearing_logs_response.status_code == 200
            hearing_logs = hearing_logs_response.json()
            assert len(hearing_logs) == i + 1
        
        # Verify all hearing logs are stored and ordered correctly
        final_hearing_response = client.get(f"/api/projects/{project_id}/hearing")
        assert final_hearing_response.status_code == 200
        final_hearing_logs = final_hearing_response.json()
        assert len(final_hearing_logs) == len(hearing_contents)
        
        # Verify chronological ordering of all logs
        for i in range(1, len(final_hearing_logs)):
            prev_time = datetime.fromisoformat(
                final_hearing_logs[i-1]["created_at"].replace('Z', '+00:00')
            )
            curr_time = datetime.fromisoformat(
                final_hearing_logs[i]["created_at"].replace('Z', '+00:00')
            )
            assert curr_time >= prev_time
        
        # Step 3: Generate AI flow from hearing logs (Screen ③)
        mock_flow_nodes = [
            {"text": "Customer contacts support with billing inquiry", "order": 0},
            {"text": "Agent verifies customer identity and account access", "order": 1},
            {"text": "Agent reviews account history and billing details", "order": 2},
            {"text": "Simple questions resolved, complex disputes escalated", "order": 3},
            {"text": "Specialist investigates and provides resolution", "order": 4}
        ]
        
        with patch.object(ai_service, 'generate_business_flow', new_callable=AsyncMock) as mock_generate:
            mock_generate.return_value = mock_flow_nodes
            
            # Generate flow from hearing logs
            flow_response = client.post(f"/api/projects/{project_id}/flow/generate")
            assert flow_response.status_code == 200
            generated_flow = flow_response.json()
            
            # Verify AI was called with all hearing content
            mock_generate.assert_called_once()
            call_args = mock_generate.call_args[0][0]
            assert len(call_args) == len(hearing_contents)
            for original, passed in zip(hearing_contents, call_args):
                assert passed == original
            
            # Verify generated flow meets requirements
            assert len(generated_flow) == 5  # Within 5-8 node requirement
            assert all("id" in node for node in generated_flow)
            assert all("text" in node for node in generated_flow)
            assert all("order" in node for node in generated_flow)
            assert all(node["project_id"] == project_id for node in generated_flow)
            
            # Verify linear ordering
            orders = [node["order"] for node in generated_flow]
            assert orders == list(range(5))
        
        # Step 4: Edit and manipulate the generated flow
        flow_node_id = generated_flow[0]["id"]
        
        # Test inline text editing
        updated_text = "Customer initiates contact through support channel with billing concern"
        edit_response = client.put(
            f"/api/flow/nodes/{flow_node_id}",
            json={"text": updated_text}
        )
        assert edit_response.status_code == 200
        edited_node = edit_response.json()
        assert edited_node["text"] == updated_text
        
        # Verify automatic saving of edits
        flow_check_response = client.get(f"/api/projects/{project_id}/flow")
        assert flow_check_response.status_code == 200
        updated_flow = flow_check_response.json()
        updated_first_node = next(node for node in updated_flow if node["id"] == flow_node_id)
        assert updated_first_node["text"] == updated_text
        
        # Test adding a new flow node
        new_node_data = {
            "project_id": project_id,
            "text": "Additional quality assurance step",
            "order": 5
        }
        add_response = client.post("/api/flow/nodes", json=new_node_data)
        assert add_response.status_code == 200
        new_node = add_response.json()
        assert new_node["text"] == "Additional quality assurance step"
        assert new_node["order"] == 5
        
        # Test flow reordering
        reorder_data = {
            "node_orders": [
                {"id": new_node["id"], "order": 2},  # Move new node to position 2
                {"id": generated_flow[2]["id"], "order": 5}  # Move original node 2 to end
            ]
        }
        reorder_response = client.put(f"/api/projects/{project_id}/flow/reorder", json=reorder_data)
        assert reorder_response.status_code == 200
        
        # Verify reordering was applied
        reordered_flow_response = client.get(f"/api/projects/{project_id}/flow")
        assert reordered_flow_response.status_code == 200
        reordered_flow = reordered_flow_response.json()
        
        # Find the moved nodes and verify their new positions
        moved_new_node = next(node for node in reordered_flow if node["id"] == new_node["id"])
        moved_original_node = next(node for node in reordered_flow if node["id"] == generated_flow[2]["id"])
        assert moved_new_node["order"] == 2
        assert moved_original_node["order"] == 5
        
        # Test node deletion
        delete_response = client.delete(f"/api/flow/nodes/{moved_original_node['id']}")
        assert delete_response.status_code == 200
        
        # Verify node was deleted
        final_flow_response = client.get(f"/api/projects/{project_id}/flow")
        assert final_flow_response.status_code == 200
        final_flow = final_flow_response.json()
        assert len(final_flow) == 5  # One less than before
        assert not any(node["id"] == moved_original_node["id"] for node in final_flow)
        
        # Step 5: Verify all data persists correctly in database
        db_project = db_session.query(Project).filter(Project.id == project_id).first()
        assert db_project is not None
        assert db_project.name == "Customer Support Process Analysis"
        assert db_project.department == "Customer Service"
        assert db_project.status == "draft"
        
        db_hearing_logs = db_session.query(HearingLog).filter(
            HearingLog.project_id == project_id
        ).order_by(HearingLog.created_at).all()
        assert len(db_hearing_logs) == len(hearing_contents)
        for db_log, original_content in zip(db_hearing_logs, hearing_contents):
            assert db_log.content == original_content
        
        db_flow_nodes = db_session.query(FlowNode).filter(
            FlowNode.project_id == project_id
        ).order_by(FlowNode.order).all()
        assert len(db_flow_nodes) == 5
        
        # Verify the edited first node persisted
        db_first_node = next(node for node in db_flow_nodes if node.id == flow_node_id)
        assert db_first_node.text == updated_text
        
        # Verify the added node persisted
        db_added_node = next(node for node in db_flow_nodes if node.id == new_node["id"])
        assert db_added_node.text == "Additional quality assurance step"
        assert db_added_node.order == 2

    def test_automatic_saving_across_all_screens(self, db_session: Session, override_get_db):
        """
        Test that automatic saving works correctly across all three screens.
        
        Verifies that no save buttons are needed and all changes persist immediately.
        
        Requirements: 1.1, 2.1, 4.1
        """
        # Screen ① - Project Management: Test automatic project saving
        project_data = {"name": "Auto-Save Test Project", "department": "Testing"}
        project_response = client.post("/api/projects/", json=project_data)
        assert project_response.status_code == 201
        project_id = project_response.json()["id"]
        
        # Update project name - should auto-save
        update_data = {"name": "Updated Auto-Save Project", "department": "Updated Testing"}
        update_response = client.put(f"/api/projects/{project_id}", json=update_data)
        assert update_response.status_code == 200
        
        # Verify update persisted immediately without explicit save
        get_response = client.get(f"/api/projects/{project_id}")
        assert get_response.status_code == 200
        updated_project = get_response.json()
        assert updated_project["name"] == "Updated Auto-Save Project"
        assert updated_project["department"] == "Updated Testing"
        
        # Screen ② - Hearing Input: Test automatic hearing log saving
        hearing_data = {"content": "First hearing log for auto-save test"}
        hearing_response = client.post(f"/api/projects/{project_id}/hearing", json=hearing_data)
        assert hearing_response.status_code == 201
        hearing_log_id = hearing_response.json()["id"]
        
        # Update hearing log content - should auto-save
        updated_content = "Updated hearing log content for auto-save verification"
        update_hearing_response = client.put(
            f"/api/hearing/{hearing_log_id}",
            json={"content": updated_content}
        )
        assert update_hearing_response.status_code == 200
        
        # Verify hearing update persisted immediately
        hearing_logs_response = client.get(f"/api/projects/{project_id}/hearing")
        assert hearing_logs_response.status_code == 200
        hearing_logs = hearing_logs_response.json()
        updated_log = next(log for log in hearing_logs if log["id"] == hearing_log_id)
        assert updated_log["content"] == updated_content
        
        # Screen ③ - Flow Editing: Test automatic flow saving
        # First generate a flow
        mock_flow_nodes = [
            {"text": "Auto-save test step 1", "order": 0},
            {"text": "Auto-save test step 2", "order": 1},
            {"text": "Auto-save test step 3", "order": 2},
            {"text": "Auto-save test step 4", "order": 3},
            {"text": "Auto-save test step 5", "order": 4}
        ]
        
        with patch.object(ai_service, 'generate_business_flow', new_callable=AsyncMock) as mock_generate:
            mock_generate.return_value = mock_flow_nodes
            
            flow_response = client.post(f"/api/projects/{project_id}/flow/generate")
            assert flow_response.status_code == 200
            generated_flow = flow_response.json()
            
            # Edit a flow node - should auto-save
            node_id = generated_flow[0]["id"]
            new_text = "Auto-saved updated flow step"
            edit_response = client.put(f"/api/flow/nodes/{node_id}", json={"text": new_text})
            assert edit_response.status_code == 200
            
            # Verify flow edit persisted immediately
            flow_check_response = client.get(f"/api/projects/{project_id}/flow")
            assert flow_check_response.status_code == 200
            current_flow = flow_check_response.json()
            edited_node = next(node for node in current_flow if node["id"] == node_id)
            assert edited_node["text"] == new_text
        
        # Verify all changes persisted in database
        db_project = db_session.query(Project).filter(Project.id == project_id).first()
        assert db_project.name == "Updated Auto-Save Project"
        assert db_project.department == "Updated Testing"
        
        db_hearing_log = db_session.query(HearingLog).filter(HearingLog.id == hearing_log_id).first()
        assert db_hearing_log.content == updated_content
        
        db_flow_node = db_session.query(FlowNode).filter(FlowNode.id == node_id).first()
        assert db_flow_node.text == new_text

    def test_ai_generation_with_various_hearing_inputs(self, db_session: Session, override_get_db):
        """
        Test AI flow generation with various types and amounts of hearing log inputs.
        
        Verifies that the system handles different hearing log scenarios correctly.
        
        Requirements: 2.1, 4.1
        """
        # Test Case 1: Minimal hearing input
        project_data = {"name": "Minimal Input Test", "department": "Testing"}
        project_response = client.post("/api/projects/", json=project_data)
        assert project_response.status_code == 201
        minimal_project_id = project_response.json()["id"]
        
        minimal_hearing = {"content": "Customer calls, agent helps, issue resolved."}
        client.post(f"/api/projects/{minimal_project_id}/hearing", json=minimal_hearing)
        
        minimal_flow_nodes = [
            {"text": "Customer initiates contact", "order": 0},
            {"text": "Agent provides assistance", "order": 1},
            {"text": "Issue resolution completed", "order": 2},
            {"text": "Process documentation updated", "order": 3},
            {"text": "Customer satisfaction confirmed", "order": 4}
        ]
        
        with patch.object(ai_service, 'generate_business_flow', new_callable=AsyncMock) as mock_generate:
            mock_generate.return_value = minimal_flow_nodes
            
            flow_response = client.post(f"/api/projects/{minimal_project_id}/flow/generate")
            assert flow_response.status_code == 200
            generated_flow = flow_response.json()
            assert len(generated_flow) == 5
            assert all("Customer" in generated_flow[0]["text"] or "contact" in generated_flow[0]["text"] for _ in [1])
        
        # Test Case 2: Detailed hearing input with multiple logs
        project_data = {"name": "Detailed Input Test", "department": "Testing"}
        project_response = client.post("/api/projects/", json=project_data)
        assert project_response.status_code == 201
        detailed_project_id = project_response.json()["id"]
        
        detailed_hearings = [
            "Customer contacts through phone, email, or chat. Agent verifies identity.",
            "Agent documents issue in CRM and categorizes by type and priority.",
            "Initial resolution attempted using knowledge base and tools.",
            "Unresolved issues escalated to specialist team with detailed notes."
        ]
        
        for hearing_content in detailed_hearings:
            hearing_data = {"content": hearing_content}
            client.post(f"/api/projects/{detailed_project_id}/hearing", json=hearing_data)
        
        detailed_flow_nodes = [
            {"text": "Customer initiates contact through multiple channels", "order": 0},
            {"text": "Agent verifies identity and documents issue in CRM", "order": 1},
            {"text": "Initial resolution attempt using available resources", "order": 2},
            {"text": "Escalation to specialist team with detailed handoff", "order": 3},
            {"text": "Specialist review and advanced troubleshooting", "order": 4}
        ]
        
        with patch.object(ai_service, 'generate_business_flow', new_callable=AsyncMock) as mock_generate:
            mock_generate.return_value = detailed_flow_nodes
            
            flow_response = client.post(f"/api/projects/{detailed_project_id}/flow/generate")
            assert flow_response.status_code == 200
            generated_flow = flow_response.json()
            assert len(generated_flow) == 5
            
            # Verify AI was called with all detailed hearing logs
            mock_generate.assert_called_once()
            call_args = mock_generate.call_args[0][0]
            assert len(call_args) == len(detailed_hearings)
        
        # Test Case 3: Mixed content types (short and long entries)
        project_data = {"name": "Mixed Content Test", "department": "Testing"}
        project_response = client.post("/api/projects/", json=project_data)
        assert project_response.status_code == 201
        mixed_project_id = project_response.json()["id"]
        
        mixed_hearings = [
            "Start process",  # Very short
            "Customer contacts support through various channels with specific procedures.",  # Medium
            "Agent helps customer with initial support and documentation."  # Medium
        ]
        
        for hearing_content in mixed_hearings:
            hearing_data = {"content": hearing_content}
            client.post(f"/api/projects/{mixed_project_id}/hearing", json=hearing_data)
        
        mixed_flow_nodes = [
            {"text": "Process initiation and customer contact", "order": 0},
            {"text": "Multi-channel customer support engagement", "order": 1},
            {"text": "Agent assistance and initial support", "order": 2},
            {"text": "Documentation and case management", "order": 3},
            {"text": "Issue resolution and follow-up", "order": 4}
        ]
        
        with patch.object(ai_service, 'generate_business_flow', new_callable=AsyncMock) as mock_generate:
            mock_generate.return_value = mixed_flow_nodes
            
            flow_response = client.post(f"/api/projects/{mixed_project_id}/flow/generate")
            assert flow_response.status_code == 200
            generated_flow = flow_response.json()
            assert len(generated_flow) == 5
            
            # Verify all mixed content was processed
            mock_generate.assert_called_once()
            call_args = mock_generate.call_args[0][0]
            assert len(call_args) == len(mixed_hearings)
            assert call_args[0] == "Start process"
            assert "various channels" in call_args[1]
        
        # Verify all test projects and their data persisted correctly
        db_projects = db_session.query(Project).filter(
            Project.id.in_([minimal_project_id, detailed_project_id, mixed_project_id])
        ).all()
        assert len(db_projects) == 3
        
        for project_id in [minimal_project_id, detailed_project_id, mixed_project_id]:
            db_hearing_logs = db_session.query(HearingLog).filter(
                HearingLog.project_id == project_id
            ).all()
            assert len(db_hearing_logs) > 0
            
            db_flow_nodes = db_session.query(FlowNode).filter(
                FlowNode.project_id == project_id
            ).all()
            assert len(db_flow_nodes) >= 5  # All should have at least 5 nodes

    def test_project_update_timestamps_workflow(self, db_session: Session, override_get_db):
        """
        Test that project update timestamps are maintained correctly throughout workflow.
        
        Requirements: 1.1
        """
        # Create project and capture initial timestamp
        project_data = {"name": "Timestamp Test Project", "department": "Testing"}
        project_response = client.post("/api/projects/", json=project_data)
        assert project_response.status_code == 201
        project = project_response.json()
        project_id = project["id"]
        
        initial_created_at = datetime.fromisoformat(project["created_at"].replace('Z', '+00:00'))
        initial_updated_at = datetime.fromisoformat(project["updated_at"].replace('Z', '+00:00'))
        
        # Add hearing log and verify project updated_at changes
        import time
        time.sleep(0.1)  # Ensure timestamp difference
        
        hearing_data = {"content": "Test hearing content"}
        hearing_response = client.post(f"/api/projects/{project_id}/hearing", json=hearing_data)
        assert hearing_response.status_code == 201
        
        # Check project timestamps after hearing log addition
        project_check_response = client.get(f"/api/projects/{project_id}")
        assert project_check_response.status_code == 200
        updated_project = project_check_response.json()
        
        updated_created_at = datetime.fromisoformat(updated_project["created_at"].replace('Z', '+00:00'))
        updated_updated_at = datetime.fromisoformat(updated_project["updated_at"].replace('Z', '+00:00'))
        
        # created_at should remain the same, updated_at should be newer
        assert updated_created_at == initial_created_at
        assert updated_updated_at >= initial_updated_at
        
        # Generate flow and verify timestamps update again
        time.sleep(0.1)
        
        mock_flow_nodes = [
            {"text": "Timestamp test step 1", "order": 0},
            {"text": "Timestamp test step 2", "order": 1},
            {"text": "Timestamp test step 3", "order": 2},
            {"text": "Timestamp test step 4", "order": 3},
            {"text": "Timestamp test step 5", "order": 4}
        ]
        
        with patch.object(ai_service, 'generate_business_flow', new_callable=AsyncMock) as mock_generate:
            mock_generate.return_value = mock_flow_nodes
            
            flow_response = client.post(f"/api/projects/{project_id}/flow/generate")
            assert flow_response.status_code == 200
            
            # Check project timestamps after flow generation
            final_project_response = client.get(f"/api/projects/{project_id}")
            assert final_project_response.status_code == 200
            final_project = final_project_response.json()
            
            final_created_at = datetime.fromisoformat(final_project["created_at"].replace('Z', '+00:00'))
            final_updated_at = datetime.fromisoformat(final_project["updated_at"].replace('Z', '+00:00'))
            
            # created_at should still be the same, updated_at should be newest
            assert final_created_at == initial_created_at
            assert final_updated_at >= updated_updated_at

    def test_error_recovery_in_workflow(self, db_session: Session, override_get_db):
        """
        Test error recovery scenarios during complete workflow execution.
        
        Requirements: 1.1, 2.1, 4.1
        """
        # Create project successfully
        project_data = {"name": "Error Recovery Test", "department": "Testing"}
        project_response = client.post("/api/projects/", json=project_data)
        assert project_response.status_code == 201
        project_id = project_response.json()["id"]
        
        # Add hearing log successfully
        hearing_data = {"content": "Test hearing for error recovery"}
        hearing_response = client.post(f"/api/projects/{project_id}/hearing", json=hearing_data)
        assert hearing_response.status_code == 201
        
        # Attempt flow generation with AI service error
        with patch.object(ai_service, 'generate_business_flow', new_callable=AsyncMock) as mock_generate:
            mock_generate.side_effect = RuntimeError("AI service temporarily unavailable")
            
            flow_response = client.post(f"/api/projects/{project_id}/flow/generate")
            assert flow_response.status_code == 500
            
            # Verify project and hearing data still exist after error
            project_check = client.get(f"/api/projects/{project_id}")
            assert project_check.status_code == 200
            
            hearing_check = client.get(f"/api/projects/{project_id}/hearing")
            assert hearing_check.status_code == 200
            hearing_logs = hearing_check.json()
            assert len(hearing_logs) == 1
            
            # Verify no partial flow data was created
            flow_check = client.get(f"/api/projects/{project_id}/flow")
            assert flow_check.status_code == 200
            flow_nodes = flow_check.json()
            assert len(flow_nodes) == 0
        
        # Retry flow generation successfully
        mock_flow_nodes = [
            {"text": "Recovery test step 1", "order": 0},
            {"text": "Recovery test step 2", "order": 1},
            {"text": "Recovery test step 3", "order": 2},
            {"text": "Recovery test step 4", "order": 3},
            {"text": "Recovery test step 5", "order": 4}
        ]
        
        with patch.object(ai_service, 'generate_business_flow', new_callable=AsyncMock) as mock_generate:
            mock_generate.return_value = mock_flow_nodes
            
            retry_response = client.post(f"/api/projects/{project_id}/flow/generate")
            assert retry_response.status_code == 200
            generated_flow = retry_response.json()
            assert len(generated_flow) == 5
            
            # Verify complete workflow state is now correct
            final_project = client.get(f"/api/projects/{project_id}").json()
            final_hearing = client.get(f"/api/projects/{project_id}/hearing").json()
            final_flow = client.get(f"/api/projects/{project_id}/flow").json()
            
            assert final_project["name"] == "Error Recovery Test"
            assert len(final_hearing) == 1
            assert len(final_flow) == 5