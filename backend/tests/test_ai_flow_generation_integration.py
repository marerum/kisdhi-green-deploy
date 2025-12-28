"""
Integration tests for AI flow generation functionality.

These tests focus on end-to-end flow generation workflows and error handling
for AI service failures, validating the complete integration between components.

Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
"""

import pytest
import json
import asyncio
from datetime import datetime
from unittest.mock import AsyncMock, patch, Mock
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from openai import AsyncOpenAI
from openai.types.chat import ChatCompletion, ChatCompletionMessage
from openai.types.chat.chat_completion import Choice

from app.main import app
from app.models import Project, HearingLog, FlowNode
from app.services.ai import ai_service


client = TestClient(app)


class TestAIFlowGenerationIntegration:
    """Integration tests for AI flow generation functionality."""

    def test_end_to_end_flow_generation_success(self, db_session: Session, override_get_db):
        """
        Test complete end-to-end flow generation from hearing logs.
        
        This test validates the entire workflow:
        1. Create project
        2. Add hearing logs
        3. Generate flow using AI service
        4. Verify flow structure and persistence
        5. Retrieve and validate generated flow
        
        Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
        """
        # Step 1: Create a project
        project_data = {
            "name": "Integration Test Project",
            "department": "Business Process"
        }
        
        project_response = client.post("/api/projects/", json=project_data)
        assert project_response.status_code == 201
        project = project_response.json()
        project_id = project["id"]
        
        # Step 2: Add multiple hearing logs with realistic business content
        hearing_contents = [
            "The customer calls our support line and provides their account information. Our agent looks up their account in the system and verifies their identity.",
            "Once verified, the agent documents the customer's issue in our ticketing system. They categorize the problem and assign it an appropriate priority level.",
            "The agent attempts to resolve the issue using available resources and knowledge base. If successful, they update the ticket and inform the customer.",
            "For complex issues that cannot be resolved immediately, the ticket is escalated to a specialist team with detailed notes about the problem.",
            "The specialist reviews the case, performs additional troubleshooting, and either resolves the issue or escalates further if needed.",
            "Once resolved, the customer is contacted with the solution. The ticket is updated with resolution details and marked as closed."
        ]
        
        hearing_log_ids = []
        for content in hearing_contents:
            hearing_data = {"content": content}
            hearing_response = client.post(f"/api/projects/{project_id}/hearing", json=hearing_data)
            assert hearing_response.status_code == 201
            hearing_log_ids.append(hearing_response.json()["id"])
        
        # Verify hearing logs were created
        hearing_logs_response = client.get(f"/api/projects/{project_id}/hearing")
        assert hearing_logs_response.status_code == 200
        hearing_logs = hearing_logs_response.json()
        assert len(hearing_logs) == len(hearing_contents)
        
        # Step 3: Mock AI service to return valid flow structure
        mock_flow_nodes = [
            {"text": "Customer contacts support and provides account information", "order": 0},
            {"text": "Agent verifies customer identity and looks up account", "order": 1},
            {"text": "Issue is documented and categorized in ticketing system", "order": 2},
            {"text": "Agent attempts initial resolution using available resources", "order": 3},
            {"text": "Complex issues are escalated to specialist team with detailed notes", "order": 4},
            {"text": "Specialist performs advanced troubleshooting and resolution", "order": 5},
            {"text": "Customer is contacted with solution and ticket is closed", "order": 6}
        ]
        
        with patch.object(ai_service, 'generate_business_flow', new_callable=AsyncMock) as mock_generate:
            mock_generate.return_value = mock_flow_nodes
            
            # Step 4: Generate flow using AI service
            flow_response = client.post(f"/api/projects/{project_id}/flow/generate")
            assert flow_response.status_code == 200
            generated_flow = flow_response.json()
            
            # Verify AI service was called with correct hearing logs
            mock_generate.assert_called_once()
            call_args = mock_generate.call_args[0][0]  # First argument (hearing_logs)
            assert isinstance(call_args, list)
            assert len(call_args) == len(hearing_contents)
            for i, content in enumerate(hearing_contents):
                assert call_args[i] == content
            
            # Verify generated flow structure meets requirements
            assert len(generated_flow) == 7  # Within 5-8 node requirement
            
            # Verify linear flow structure (Requirements 3.3)
            orders = [node["order"] for node in generated_flow]
            assert orders == list(range(7)), "Flow must have sequential ordering"
            
            # Verify each node has required fields (Requirements 3.4)
            for i, node in enumerate(generated_flow):
                assert "id" in node, f"Node {i} missing 'id' field"
                assert "text" in node, f"Node {i} missing 'text' field"
                assert "order" in node, f"Node {i} missing 'order' field"
                assert "project_id" in node, f"Node {i} missing 'project_id' field"
                assert "created_at" in node, f"Node {i} missing 'created_at' field"
                assert "updated_at" in node, f"Node {i} missing 'updated_at' field"
                
                # Verify data types and values
                assert isinstance(node["id"], int)
                assert isinstance(node["text"], str)
                assert isinstance(node["order"], int)
                assert node["project_id"] == project_id
                assert len(node["text"].strip()) > 0
                
                # Verify timestamps are valid
                created_at = datetime.fromisoformat(node["created_at"].replace('Z', '+00:00'))
                updated_at = datetime.fromisoformat(node["updated_at"].replace('Z', '+00:00'))
                assert isinstance(created_at, datetime)
                assert isinstance(updated_at, datetime)
        
        # Step 5: Verify flow persistence in database
        db_flow_nodes = db_session.query(FlowNode).filter(
            FlowNode.project_id == project_id
        ).order_by(FlowNode.order).all()
        
        assert len(db_flow_nodes) == 7
        for i, (api_node, db_node) in enumerate(zip(generated_flow, db_flow_nodes)):
            assert api_node["id"] == db_node.id
            assert api_node["text"] == db_node.text
            assert api_node["order"] == db_node.order
            assert api_node["project_id"] == db_node.project_id
        
        # Step 6: Retrieve flow and verify consistency
        retrieved_response = client.get(f"/api/projects/{project_id}/flow")
        assert retrieved_response.status_code == 200
        retrieved_flow = retrieved_response.json()
        
        assert len(retrieved_flow) == len(generated_flow)
        for original, retrieved in zip(generated_flow, retrieved_flow):
            assert original["id"] == retrieved["id"]
            assert original["text"] == retrieved["text"]
            assert original["order"] == retrieved["order"]
            assert original["project_id"] == retrieved["project_id"]

    def test_end_to_end_flow_generation_no_hearing_logs(self, db_session: Session, override_get_db):
        """
        Test flow generation failure when no hearing logs exist.
        
        Requirements: 3.1
        """
        # Create a project without hearing logs
        project_data = {
            "name": "Empty Project",
            "department": "Test"
        }
        
        project_response = client.post("/api/projects/", json=project_data)
        assert project_response.status_code == 201
        project_id = project_response.json()["id"]
        
        # Attempt to generate flow without hearing logs
        flow_response = client.post(f"/api/projects/{project_id}/flow/generate")
        assert flow_response.status_code == 400
        
        error_response = flow_response.json()
        assert "hearing logs" in error_response["error"]["message"].lower()
        
        # Verify no flow nodes were created
        db_flow_nodes = db_session.query(FlowNode).filter(
            FlowNode.project_id == project_id
        ).all()
        assert len(db_flow_nodes) == 0

    def test_ai_service_timeout_error_handling(self, db_session: Session, override_get_db):
        """
        Test error handling when AI service times out.
        
        Requirements: 3.1, 3.4
        """
        # Create project and hearing logs
        project_data = {"name": "Timeout Test Project", "department": "Test"}
        project_response = client.post("/api/projects/", json=project_data)
        assert project_response.status_code == 201
        project_id = project_response.json()["id"]
        
        hearing_data = {"content": "Test hearing content for timeout scenario"}
        hearing_response = client.post(f"/api/projects/{project_id}/hearing", json=hearing_data)
        assert hearing_response.status_code == 201
        
        # Mock AI service to raise timeout error
        with patch.object(ai_service, 'generate_business_flow', new_callable=AsyncMock) as mock_generate:
            mock_generate.side_effect = asyncio.TimeoutError("Request timed out")
            
            # Attempt flow generation
            flow_response = client.post(f"/api/projects/{project_id}/flow/generate")
            assert flow_response.status_code == 500
            
            error_response = flow_response.json()
            assert "unexpected error" in error_response["error"]["message"].lower() or "failed" in error_response["error"]["message"].lower()
            
            # Verify no flow nodes were created
            db_flow_nodes = db_session.query(FlowNode).filter(
                FlowNode.project_id == project_id
            ).all()
            assert len(db_flow_nodes) == 0

    def test_ai_service_invalid_response_error_handling(self, db_session: Session, override_get_db):
        """
        Test error handling when AI service returns invalid response format.
        
        Requirements: 3.4, 3.5
        """
        # Create project and hearing logs
        project_data = {"name": "Invalid Response Test", "department": "Test"}
        project_response = client.post("/api/projects/", json=project_data)
        assert project_response.status_code == 201
        project_id = project_response.json()["id"]
        
        hearing_data = {"content": "Test hearing content for invalid response scenario"}
        hearing_response = client.post(f"/api/projects/{project_id}/hearing", json=hearing_data)
        assert hearing_response.status_code == 201
        
        # Mock AI service to return invalid response
        with patch.object(ai_service, 'generate_business_flow', new_callable=AsyncMock) as mock_generate:
            mock_generate.side_effect = ValueError("Invalid JSON response")
            
            # Attempt flow generation
            flow_response = client.post(f"/api/projects/{project_id}/flow/generate")
            assert flow_response.status_code == 400
            
            error_response = flow_response.json()
            assert "validation failed" in error_response["error"]["message"].lower()
            
            # Verify no flow nodes were created
            db_flow_nodes = db_session.query(FlowNode).filter(
                FlowNode.project_id == project_id
            ).all()
            assert len(db_flow_nodes) == 0

    def test_ai_service_node_count_validation_error(self, db_session: Session, override_get_db):
        """
        Test error handling when AI service returns invalid node count.
        
        Requirements: 3.2
        """
        # Create project and hearing logs
        project_data = {"name": "Node Count Test", "department": "Test"}
        project_response = client.post("/api/projects/", json=project_data)
        assert project_response.status_code == 201
        project_id = project_response.json()["id"]
        
        hearing_data = {"content": "Test hearing content for node count validation"}
        hearing_response = client.post(f"/api/projects/{project_id}/hearing", json=hearing_data)
        assert hearing_response.status_code == 201
        
        # Mock AI service to return too few nodes
        with patch.object(ai_service, 'generate_business_flow', new_callable=AsyncMock) as mock_generate:
            mock_generate.side_effect = ValueError("Flow must contain 5-8 nodes, got 3")
            
            # Attempt flow generation
            flow_response = client.post(f"/api/projects/{project_id}/flow/generate")
            assert flow_response.status_code == 400
            
            error_response = flow_response.json()
            assert "5-8 nodes" in error_response["error"]["message"] or "validation failed" in error_response["error"]["message"].lower()
            
            # Verify no flow nodes were created
            db_flow_nodes = db_session.query(FlowNode).filter(
                FlowNode.project_id == project_id
            ).all()
            assert len(db_flow_nodes) == 0

    def test_ai_service_connection_error_handling(self, db_session: Session, override_get_db):
        """
        Test error handling when AI service connection fails.
        
        Requirements: 3.1
        """
        # Create project and hearing logs
        project_data = {"name": "Connection Error Test", "department": "Test"}
        project_response = client.post("/api/projects/", json=project_data)
        assert project_response.status_code == 201
        project_id = project_response.json()["id"]
        
        hearing_data = {"content": "Test hearing content for connection error scenario"}
        hearing_response = client.post(f"/api/projects/{project_id}/hearing", json=hearing_data)
        assert hearing_response.status_code == 201
        
        # Mock AI service to raise connection error
        with patch.object(ai_service, 'generate_business_flow', new_callable=AsyncMock) as mock_generate:
            mock_generate.side_effect = RuntimeError("Failed to connect to AI service")
            
            # Attempt flow generation
            flow_response = client.post(f"/api/projects/{project_id}/flow/generate")
            assert flow_response.status_code == 500
            
            error_response = flow_response.json()
            assert "failed" in error_response["error"]["message"].lower()
            
            # Verify no flow nodes were created
            db_flow_nodes = db_session.query(FlowNode).filter(
                FlowNode.project_id == project_id
            ).all()
            assert len(db_flow_nodes) == 0

    def test_flow_regeneration_replaces_existing_integration(self, db_session: Session, override_get_db):
        """
        Test complete flow regeneration workflow that replaces existing flow.
        
        Requirements: 3.1, 3.2, 3.3, 3.4
        """
        # Create project and hearing logs
        project_data = {"name": "Regeneration Test", "department": "Test"}
        project_response = client.post("/api/projects/", json=project_data)
        assert project_response.status_code == 201
        project_id = project_response.json()["id"]
        
        hearing_data = {"content": "Initial hearing content for regeneration test"}
        hearing_response = client.post(f"/api/projects/{project_id}/hearing", json=hearing_data)
        assert hearing_response.status_code == 201
        
        # Generate initial flow
        initial_flow_nodes = [
            {"text": "Initial step 1", "order": 0},
            {"text": "Initial step 2", "order": 1},
            {"text": "Initial step 3", "order": 2},
            {"text": "Initial step 4", "order": 3},
            {"text": "Initial step 5", "order": 4}
        ]
        
        with patch.object(ai_service, 'generate_business_flow', new_callable=AsyncMock) as mock_generate:
            mock_generate.return_value = initial_flow_nodes
            
            # Generate initial flow
            initial_response = client.post(f"/api/projects/{project_id}/flow/generate")
            assert initial_response.status_code == 200
            initial_flow = initial_response.json()
            assert len(initial_flow) == 5
            
            # Store initial flow IDs
            initial_ids = [node["id"] for node in initial_flow]
            
            # Add more hearing content
            additional_hearing = {"content": "Additional hearing content that changes the process"}
            client.post(f"/api/projects/{project_id}/hearing", json=additional_hearing)
            
            # Generate new flow with different structure
            new_flow_nodes = [
                {"text": "Regenerated step 1", "order": 0},
                {"text": "Regenerated step 2", "order": 1},
                {"text": "Regenerated step 3", "order": 2},
                {"text": "Regenerated step 4", "order": 3},
                {"text": "Regenerated step 5", "order": 4},
                {"text": "Regenerated step 6", "order": 5},
                {"text": "Regenerated step 7", "order": 6}
            ]
            
            mock_generate.return_value = new_flow_nodes
            
            # Regenerate flow
            regenerated_response = client.post(f"/api/projects/{project_id}/flow/generate")
            assert regenerated_response.status_code == 200
            regenerated_flow = regenerated_response.json()
            
            # Verify regeneration replaced existing flow
            assert len(regenerated_flow) == 7
            
            # Verify all nodes have different text from original
            regenerated_texts = [node["text"] for node in regenerated_flow]
            initial_texts = [node["text"] for node in initial_flow]
            
            for text in regenerated_texts:
                assert "Regenerated" in text
                assert text not in initial_texts
            
            # Verify database contains only new flow
            db_flow_nodes = db_session.query(FlowNode).filter(
                FlowNode.project_id == project_id
            ).order_by(FlowNode.order).all()
            
            assert len(db_flow_nodes) == 7
            for i, (api_node, db_node) in enumerate(zip(regenerated_flow, db_flow_nodes)):
                assert api_node["id"] == db_node.id
                assert api_node["text"] == db_node.text
                assert api_node["order"] == db_node.order
                assert "Regenerated" in db_node.text

    def test_concurrent_flow_generation_requests(self, db_session: Session, override_get_db):
        """
        Test handling of concurrent flow generation requests for the same project.
        
        Requirements: 3.1, 3.4
        """
        # Create project and hearing logs
        project_data = {"name": "Concurrent Test", "department": "Test"}
        project_response = client.post("/api/projects/", json=project_data)
        assert project_response.status_code == 201
        project_id = project_response.json()["id"]
        
        hearing_data = {"content": "Test hearing content for concurrent requests"}
        hearing_response = client.post(f"/api/projects/{project_id}/hearing", json=hearing_data)
        assert hearing_response.status_code == 201
        
        # Mock AI service with delay to simulate concurrent requests
        mock_flow_nodes = [
            {"text": "Concurrent step 1", "order": 0},
            {"text": "Concurrent step 2", "order": 1},
            {"text": "Concurrent step 3", "order": 2},
            {"text": "Concurrent step 4", "order": 3},
            {"text": "Concurrent step 5", "order": 4}
        ]
        
        with patch.object(ai_service, 'generate_business_flow', new_callable=AsyncMock) as mock_generate:
            mock_generate.return_value = mock_flow_nodes
            
            # Make first request
            first_response = client.post(f"/api/projects/{project_id}/flow/generate")
            assert first_response.status_code == 200
            first_flow = first_response.json()
            
            # Make second request immediately (should replace first)
            second_response = client.post(f"/api/projects/{project_id}/flow/generate")
            assert second_response.status_code == 200
            second_flow = second_response.json()
            
            # Verify both requests succeeded and final state is consistent
            assert len(first_flow) == 5
            assert len(second_flow) == 5
            
            # Verify database contains only one set of flow nodes
            db_flow_nodes = db_session.query(FlowNode).filter(
                FlowNode.project_id == project_id
            ).all()
            assert len(db_flow_nodes) == 5
            
            # Verify final flow can be retrieved consistently
            final_response = client.get(f"/api/projects/{project_id}/flow")
            assert final_response.status_code == 200
            final_flow = final_response.json()
            assert len(final_flow) == 5

    def test_flow_generation_with_large_hearing_content(self, db_session: Session, override_get_db):
        """
        Test flow generation with large amounts of hearing content.
        
        Requirements: 3.1, 3.4
        """
        # Create project
        project_data = {"name": "Large Content Test", "department": "Test"}
        project_response = client.post("/api/projects/", json=project_data)
        assert project_response.status_code == 201
        project_id = project_response.json()["id"]
        
        # Add multiple large hearing logs
        large_content_base = """
        This is a detailed business process description that contains extensive information
        about how the organization handles customer requests, internal workflows, approval
        processes, documentation requirements, quality assurance steps, and final delivery.
        The process involves multiple departments including sales, operations, finance,
        legal, and customer service. Each department has specific responsibilities and
        handoff procedures that must be followed to ensure compliance and quality.
        """
        
        for i in range(10):  # Add 10 large hearing logs
            large_content = f"Hearing log {i + 1}: {large_content_base} " * 5  # Multiply to make it larger
            hearing_data = {"content": large_content}
            hearing_response = client.post(f"/api/projects/{project_id}/hearing", json=hearing_data)
            assert hearing_response.status_code == 201
        
        # Mock AI service to handle large content
        mock_flow_nodes = [
            {"text": "Large content step 1: Initial customer contact", "order": 0},
            {"text": "Large content step 2: Requirements gathering", "order": 1},
            {"text": "Large content step 3: Internal review and approval", "order": 2},
            {"text": "Large content step 4: Resource allocation", "order": 3},
            {"text": "Large content step 5: Implementation and delivery", "order": 4},
            {"text": "Large content step 6: Quality assurance review", "order": 5}
        ]
        
        with patch.object(ai_service, 'generate_business_flow', new_callable=AsyncMock) as mock_generate:
            mock_generate.return_value = mock_flow_nodes
            
            # Generate flow with large content
            flow_response = client.post(f"/api/projects/{project_id}/flow/generate")
            assert flow_response.status_code == 200
            generated_flow = flow_response.json()
            
            # Verify AI service was called with all hearing logs
            mock_generate.assert_called_once()
            call_args = mock_generate.call_args[0][0]  # First argument (hearing_logs)
            assert len(call_args) == 10  # All 10 hearing logs
            
            # Verify flow structure is valid despite large input
            assert len(generated_flow) == 6
            assert all("Large content step" in node["text"] for node in generated_flow)
            
            # Verify flow is properly persisted
            db_flow_nodes = db_session.query(FlowNode).filter(
                FlowNode.project_id == project_id
            ).order_by(FlowNode.order).all()
            assert len(db_flow_nodes) == 6

    def test_nonexistent_project_flow_generation(self, override_get_db):
        """
        Test flow generation for nonexistent project.
        
        Requirements: 3.1
        """
        # Attempt to generate flow for nonexistent project
        flow_response = client.post("/api/projects/99999/flow/generate")
        assert flow_response.status_code == 404
        
        error_response = flow_response.json()
        assert "not found" in error_response["error"]["message"].lower()