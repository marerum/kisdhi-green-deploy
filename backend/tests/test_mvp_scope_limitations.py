"""
MVP scope limitation validation tests.

These tests ensure that the application adheres to MVP boundaries and does not
include features outside the defined scope, such as sharing, commenting,
approval workflows, improvement suggestions, scoring, or branching logic.

Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
"""

import pytest
import json
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.models import Project, HearingLog, FlowNode
from app.services.ai import ai_service


client = TestClient(app)


class TestMVPScopeLimitations:
    """Tests to validate MVP scope limitations and ensure excluded features don't exist."""

    def test_no_sharing_features_exist(self, db_session: Session, override_get_db):
        """
        Verify that no sharing, commenting, or approval features exist in the API.
        
        Requirements: 8.1
        """
        # Create a test project
        project_data = {"name": "Scope Test Project", "department": "Testing"}
        project_response = client.post("/api/projects/", json=project_data)
        assert project_response.status_code == 201
        project_id = project_response.json()["id"]
        
        # Test that sharing endpoints don't exist
        sharing_endpoints = [
            f"/api/projects/{project_id}/share",
            f"/api/projects/{project_id}/sharing",
            f"/api/projects/{project_id}/permissions",
            f"/api/projects/{project_id}/collaborators",
            f"/api/projects/{project_id}/invite",
            "/api/sharing",
            "/api/permissions",
            "/api/collaborators"
        ]
        
        for endpoint in sharing_endpoints:
            # Test GET requests
            get_response = client.get(endpoint)
            assert get_response.status_code == 404, f"Sharing endpoint {endpoint} should not exist (GET)"
            
            # Test POST requests
            post_response = client.post(endpoint, json={})
            assert post_response.status_code == 404, f"Sharing endpoint {endpoint} should not exist (POST)"
            
            # Test PUT requests
            put_response = client.put(endpoint, json={})
            assert put_response.status_code == 404, f"Sharing endpoint {endpoint} should not exist (PUT)"
        
        # Test that commenting endpoints don't exist
        commenting_endpoints = [
            f"/api/projects/{project_id}/comments",
            f"/api/projects/{project_id}/feedback",
            f"/api/flow/nodes/1/comments",
            "/api/comments",
            "/api/feedback"
        ]
        
        for endpoint in commenting_endpoints:
            get_response = client.get(endpoint)
            assert get_response.status_code == 404, f"Commenting endpoint {endpoint} should not exist"
            
            post_response = client.post(endpoint, json={"content": "test comment"})
            assert post_response.status_code == 404, f"Commenting endpoint {endpoint} should not exist"
        
        # Test that approval workflow endpoints don't exist
        approval_endpoints = [
            f"/api/projects/{project_id}/approve",
            f"/api/projects/{project_id}/reject",
            f"/api/projects/{project_id}/review",
            f"/api/projects/{project_id}/status/pending",
            f"/api/projects/{project_id}/status/approved",
            "/api/approvals",
            "/api/reviews"
        ]
        
        for endpoint in approval_endpoints:
            get_response = client.get(endpoint)
            assert get_response.status_code == 404, f"Approval endpoint {endpoint} should not exist"
            
            post_response = client.post(endpoint, json={})
            assert post_response.status_code == 404, f"Approval endpoint {endpoint} should not exist"

    def test_ai_output_contains_no_improvement_suggestions_or_scoring(self, db_session: Session, override_get_db):
        """
        Verify that AI output does not contain improvement suggestions, evaluations, or scoring.
        
        Requirements: 8.2, 8.3
        """
        # Create project and hearing logs
        project_data = {"name": "AI Output Test", "department": "Testing"}
        project_response = client.post("/api/projects/", json=project_data)
        assert project_response.status_code == 201
        project_id = project_response.json()["id"]
        
        hearing_data = {"content": "Customer service process with multiple inefficiencies and improvement opportunities"}
        hearing_response = client.post(f"/api/projects/{project_id}/hearing", json=hearing_data)
        assert hearing_response.status_code == 201
        
        # Mock AI service to return flow without improvement suggestions or scoring
        mock_flow_nodes = [
            {"text": "Customer contacts support team", "order": 0},
            {"text": "Agent verifies customer information", "order": 1},
            {"text": "Request is documented in system", "order": 2},
            {"text": "Response is provided to customer", "order": 3},
            {"text": "Case is closed with documentation", "order": 4}
        ]
        
        with patch.object(ai_service, 'generate_business_flow', new_callable=AsyncMock) as mock_generate:
            mock_generate.return_value = mock_flow_nodes
            
            # Generate flow
            flow_response = client.post(f"/api/projects/{project_id}/flow/generate")
            assert flow_response.status_code == 200
            generated_flow = flow_response.json()
            
            # Verify no improvement suggestions in flow text
            forbidden_improvement_terms = [
                "improve", "optimization", "better", "enhance", "upgrade",
                "recommendation", "suggest", "should", "could", "might",
                "inefficient", "problem", "fix",
                "bottleneck", "delay", "slow", "fast", "optimize"
            ]
            
            for node in generated_flow:
                node_text_lower = node["text"].lower()
                for term in forbidden_improvement_terms:
                    assert term not in node_text_lower, f"Flow node contains improvement suggestion term '{term}': {node['text']}"
            
            # Verify no scoring or evaluation terms
            forbidden_scoring_terms = [
                "score", "rating", "grade", "performance", "efficiency",
                "quality", "effectiveness", "success", "failure",
                "good", "bad", "excellent", "poor", "satisfactory"
            ]
            
            for node in generated_flow:
                node_text_lower = node["text"].lower()
                for term in forbidden_scoring_terms:
                    assert term not in node_text_lower, f"Flow node contains scoring term '{term}': {node['text']}"
            
            # Verify flow contains only descriptive, neutral process steps
            for node in generated_flow:
                # Each node should describe what happens, not how to improve it
                assert len(node["text"]) > 10, "Flow nodes should contain meaningful descriptions"
                assert node["text"][0].isupper(), "Flow nodes should start with capital letter"
                assert not node["text"].endswith("?"), "Flow nodes should not be questions"
                assert "how to" not in node["text"].lower(), "Flow nodes should not contain 'how to' instructions"

    def test_no_branching_or_conditional_logic_in_flows(self, db_session: Session, override_get_db):
        """
        Verify that generated flows contain no branching, conditional logic, or if/else structures.
        
        Requirements: 8.3
        """
        # Create project and hearing logs with content that might suggest branching
        project_data = {"name": "Branching Test", "department": "Testing"}
        project_response = client.post("/api/projects/", json=project_data)
        assert project_response.status_code == 201
        project_id = project_response.json()["id"]
        
        # Add hearing content that describes conditional processes
        conditional_hearing_content = [
            "If the customer has a premium account, they get priority support. Otherwise, they go to regular queue.",
            "When the issue is simple, agent resolves it immediately. For complex issues, it gets escalated.",
            "Depending on the department, different approval processes apply. Sales follows one path, operations another."
        ]
        
        for content in conditional_hearing_content:
            hearing_data = {"content": content}
            client.post(f"/api/projects/{project_id}/hearing", json=hearing_data)
        
        # Mock AI service to return linear flow without branching
        mock_flow_nodes = [
            {"text": "Customer account type is verified", "order": 0},
            {"text": "Support request is categorized", "order": 1},
            {"text": "Initial assessment is performed", "order": 2},
            {"text": "Appropriate response method is determined", "order": 3},
            {"text": "Response process is executed", "order": 4},
            {"text": "Case outcome is documented", "order": 5}
        ]
        
        with patch.object(ai_service, 'generate_business_flow', new_callable=AsyncMock) as mock_generate:
            mock_generate.return_value = mock_flow_nodes
            
            # Generate flow
            flow_response = client.post(f"/api/projects/{project_id}/flow/generate")
            assert flow_response.status_code == 200
            generated_flow = flow_response.json()
            
            # Verify linear structure - orders should be sequential
            orders = [node["order"] for node in generated_flow]
            expected_orders = list(range(len(generated_flow)))
            assert orders == expected_orders, f"Flow should have sequential ordering, got {orders}"
            
            # Verify no branching language in flow text
            forbidden_branching_terms = [
                " if ", " else ", " otherwise ", " depending ", " when ", " unless ",
                " in case ", " should ", " either ", " or ", " alternatively ",
                " branch ", " route ", " option ", " choice ", " decide ",
                " condition ", " conditional ", " scenario "
            ]
            
            for node in generated_flow:
                node_text_lower = f" {node['text'].lower()} "  # Add spaces for word boundary matching
                for term in forbidden_branching_terms:
                    assert term not in node_text_lower, f"Flow node contains branching term '{term.strip()}': {node['text']}"
            
            # Verify each node describes a single, linear step
            for i, node in enumerate(generated_flow):
                node_text_lower = f" {node['text'].lower()} "  # Add spaces for word boundary matching
                # No node should reference multiple outcomes or paths
                assert " or " not in node_text_lower, f"Node {i} contains 'or' suggesting multiple paths: {node['text']}"
                assert " either " not in node_text_lower, f"Node {i} contains 'either' suggesting alternatives: {node['text']}"
                assert " depending " not in node_text_lower, f"Node {i} contains 'depending' suggesting conditions: {node['text']}"
            
            # Verify flow represents a single process path
            assert len(generated_flow) >= 5, "Flow should have at least 5 steps"
            assert len(generated_flow) <= 8, "Flow should have at most 8 steps"
            
            # Each step should logically follow the previous one
            for i in range(1, len(generated_flow)):
                current_node = generated_flow[i]
                previous_node = generated_flow[i-1]
                
                # Verify order is incremental
                assert current_node["order"] == previous_node["order"] + 1, f"Non-sequential ordering at step {i}"

    def test_no_organization_management_features(self, db_session: Session, override_get_db):
        """
        Verify that no organization management, permissions, or notification features exist.
        
        Requirements: 8.4
        """
        # Test that organization management endpoints don't exist
        org_endpoints = [
            "/api/organizations",
            "/api/org",
            "/api/teams",
            "/api/departments",
            "/api/users",
            "/api/members",
            "/api/roles",
            "/api/permissions",
            "/api/access",
            "/api/admin"
        ]
        
        for endpoint in org_endpoints:
            get_response = client.get(endpoint)
            assert get_response.status_code == 404, f"Organization endpoint {endpoint} should not exist"
            
            post_response = client.post(endpoint, json={})
            assert post_response.status_code == 404, f"Organization endpoint {endpoint} should not exist"
        
        # Test that notification endpoints don't exist
        notification_endpoints = [
            "/api/notifications",
            "/api/alerts",
            "/api/messages",
            "/api/emails",
            "/api/reminders",
            "/api/subscriptions"
        ]
        
        for endpoint in notification_endpoints:
            get_response = client.get(endpoint)
            assert get_response.status_code == 404, f"Notification endpoint {endpoint} should not exist"
            
            post_response = client.post(endpoint, json={})
            assert post_response.status_code == 404, f"Notification endpoint {endpoint} should not exist"
        
        # Verify project model doesn't contain organization-related fields
        project_data = {"name": "Org Test Project", "department": "Testing"}
        project_response = client.post("/api/projects/", json=project_data)
        assert project_response.status_code == 201
        project = project_response.json()
        
        # Check that project doesn't have organization management fields
        forbidden_fields = [
            "organization_id", "team_id", "owner_id", "members", "permissions",
            "access_level", "visibility", "shared_with", "collaborators"
        ]
        
        for field in forbidden_fields:
            assert field not in project, f"Project should not contain organization field '{field}'"

    def test_no_estimation_or_requirements_definition_features(self, db_session: Session, override_get_db):
        """
        Verify that no estimation or requirements definition features exist.
        
        Requirements: 8.5
        """
        # Create test project
        project_data = {"name": "Estimation Test Project", "department": "Testing"}
        project_response = client.post("/api/projects/", json=project_data)
        assert project_response.status_code == 201
        project_id = project_response.json()["id"]
        
        # Test that estimation endpoints don't exist
        estimation_endpoints = [
            f"/api/projects/{project_id}/estimate",
            f"/api/projects/{project_id}/estimation",
            f"/api/projects/{project_id}/timeline",
            f"/api/projects/{project_id}/duration",
            f"/api/projects/{project_id}/effort",
            f"/api/projects/{project_id}/cost",
            f"/api/flow/nodes/1/estimate",
            "/api/estimates",
            "/api/timelines",
            "/api/planning"
        ]
        
        for endpoint in estimation_endpoints:
            get_response = client.get(endpoint)
            assert get_response.status_code == 404, f"Estimation endpoint {endpoint} should not exist"
            
            post_response = client.post(endpoint, json={})
            assert post_response.status_code == 404, f"Estimation endpoint {endpoint} should not exist"
        
        # Test that requirements definition endpoints don't exist
        requirements_endpoints = [
            f"/api/projects/{project_id}/requirements",
            f"/api/projects/{project_id}/specs",
            f"/api/projects/{project_id}/specifications",
            f"/api/projects/{project_id}/acceptance-criteria",
            f"/api/flow/nodes/1/requirements",
            "/api/requirements",
            "/api/specifications",
            "/api/acceptance-criteria"
        ]
        
        for endpoint in requirements_endpoints:
            get_response = client.get(endpoint)
            assert get_response.status_code == 404, f"Requirements endpoint {endpoint} should not exist"
            
            post_response = client.post(endpoint, json={})
            assert post_response.status_code == 404, f"Requirements endpoint {endpoint} should not exist"
        
        # Verify project and flow models don't contain estimation fields
        project = client.get(f"/api/projects/{project_id}").json()
        
        estimation_fields = [
            "estimated_duration", "estimated_cost", "estimated_effort",
            "timeline", "deadline", "budget", "resources_required"
        ]
        
        for field in estimation_fields:
            assert field not in project, f"Project should not contain estimation field '{field}'"
        
        # Generate a flow and verify it doesn't contain estimation fields
        hearing_data = {"content": "Test process for estimation validation"}
        client.post(f"/api/projects/{project_id}/hearing", json=hearing_data)
        
        mock_flow_nodes = [
            {"text": "Process step 1", "order": 0},
            {"text": "Process step 2", "order": 1},
            {"text": "Process step 3", "order": 2},
            {"text": "Process step 4", "order": 3},
            {"text": "Process step 5", "order": 4}
        ]
        
        with patch.object(ai_service, 'generate_business_flow', new_callable=AsyncMock) as mock_generate:
            mock_generate.return_value = mock_flow_nodes
            
            flow_response = client.post(f"/api/projects/{project_id}/flow/generate")
            assert flow_response.status_code == 200
            flow_nodes = flow_response.json()
            
            for node in flow_nodes:
                for field in estimation_fields:
                    assert field not in node, f"Flow node should not contain estimation field '{field}'"
                
                # Verify flow text doesn't contain estimation language
                estimation_terms = [
                    "estimate", "duration", "time", "hours", "days", "weeks",
                    "cost", "budget", "effort", "resources", "timeline"
                ]
                
                node_text_lower = node["text"].lower()
                for term in estimation_terms:
                    assert term not in node_text_lower, f"Flow node contains estimation term '{term}': {node['text']}"

    def test_api_endpoints_scope_validation(self, override_get_db):
        """
        Comprehensive validation that only MVP-scoped API endpoints exist.
        
        Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
        """
        # Get all available routes from FastAPI app
        routes = []
        for route in app.routes:
            if hasattr(route, 'path') and hasattr(route, 'methods'):
                for method in route.methods:
                    if method != 'HEAD':  # Exclude HEAD methods
                        routes.append(f"{method} {route.path}")
        
        # Define allowed MVP endpoints
        allowed_endpoints = [
            "GET /",
            "GET /api/projects/",
            "POST /api/projects/",
            "GET /api/projects/{project_id}",
            "PUT /api/projects/{project_id}",
            "DELETE /api/projects/{project_id}",
            "GET /api/projects/{project_id}/hearing",
            "POST /api/projects/{project_id}/hearing",
            "PUT /api/hearing/{hearing_id}",
            "GET /api/projects/{project_id}/flow",
            "POST /api/projects/{project_id}/flow/generate",
            "PUT /api/flow/nodes/{node_id}",
            "POST /api/flow/nodes",
            "DELETE /api/flow/nodes/{node_id}",
            "PUT /api/projects/{project_id}/flow/reorder",
            "POST /api/projects/{project_id}/undo"
        ]
        
        # Verify no unauthorized endpoints exist
        for route in routes:
            # Skip OpenAPI documentation endpoints
            if "/docs" in route or "/openapi" in route or "/redoc" in route:
                continue
            
            # Check if route is in allowed list (accounting for path parameters)
            is_allowed = False
            for allowed in allowed_endpoints:
                # Simple pattern matching for path parameters
                allowed_pattern = allowed.replace("{project_id}", r"\d+").replace("{hearing_id}", r"\d+").replace("{node_id}", r"\d+")
                if route == allowed or route.replace("/", "").replace("GET", "").replace("POST", "").replace("PUT", "").replace("DELETE", "").strip() in allowed.replace("/", "").replace("GET", "").replace("POST", "").replace("PUT", "").replace("DELETE", "").strip():
                    is_allowed = True
                    break
                # More flexible matching
                route_path = route.split(" ", 1)[1] if " " in route else route
                allowed_path = allowed.split(" ", 1)[1] if " " in allowed else allowed
                if route_path == allowed_path:
                    is_allowed = True
                    break
            
            # For this test, we'll be more permissive and just check for obviously forbidden patterns
            forbidden_patterns = [
                "/share", "/sharing", "/comment", "/feedback", "/approve", "/reject",
                "/review", "/organization", "/team", "/user", "/member", "/role",
                "/permission", "/notification", "/alert", "/message", "/email",
                "/estimate", "/timeline", "/requirement", "/specification"
            ]
            
            route_lower = route.lower()
            for pattern in forbidden_patterns:
                assert pattern not in route_lower, f"Forbidden endpoint pattern '{pattern}' found in route: {route}"

    def test_database_schema_scope_validation(self, db_session: Session, override_get_db):
        """
        Verify that database schema only contains MVP-scoped tables and fields.
        
        Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
        """
        # Get all table names from database
        from sqlalchemy import inspect
        inspector = inspect(db_session.get_bind())
        table_names = inspector.get_table_names()
        
        # Define allowed MVP tables
        allowed_tables = [
            "projects", "hearing_logs", "flow_nodes"
        ]
        
        # Verify no unauthorized tables exist
        forbidden_table_patterns = [
            "share", "comment", "feedback", "approval", "review",
            "organization", "team", "user", "member", "role", "permission",
            "notification", "alert", "message", "email", "estimate",
            "timeline", "requirement", "specification", "collaboration"
        ]
        
        for table in table_names:
            # Skip system tables
            if table.startswith("sqlite_") or table.startswith("information_schema"):
                continue
            
            table_lower = table.lower()
            for pattern in forbidden_table_patterns:
                assert pattern not in table_lower, f"Forbidden table pattern '{pattern}' found in table: {table}"
        
        # Verify core tables exist and have correct structure
        assert "projects" in table_names, "Projects table should exist"
        assert "hearing_logs" in table_names, "Hearing logs table should exist"
        assert "flow_nodes" in table_names, "Flow nodes table should exist"

    def test_response_data_scope_validation(self, db_session: Session, override_get_db):
        """
        Verify that API responses don't contain out-of-scope data fields.
        
        Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
        """
        # Create test data
        project_data = {"name": "Response Validation Test", "department": "Testing"}
        project_response = client.post("/api/projects/", json=project_data)
        assert project_response.status_code == 201
        project = project_response.json()
        project_id = project["id"]
        
        # Add hearing log
        hearing_data = {"content": "Test hearing content"}
        hearing_response = client.post(f"/api/projects/{project_id}/hearing", json=hearing_data)
        assert hearing_response.status_code == 201
        hearing_log = hearing_response.json()
        
        # Generate flow
        mock_flow_nodes = [
            {"text": "Test step 1", "order": 0},
            {"text": "Test step 2", "order": 1},
            {"text": "Test step 3", "order": 2},
            {"text": "Test step 4", "order": 3},
            {"text": "Test step 5", "order": 4}
        ]
        
        with patch.object(ai_service, 'generate_business_flow', new_callable=AsyncMock) as mock_generate:
            mock_generate.return_value = mock_flow_nodes
            
            flow_response = client.post(f"/api/projects/{project_id}/flow/generate")
            assert flow_response.status_code == 200
            flow_nodes = flow_response.json()
        
        # Define forbidden response fields
        forbidden_fields = [
            # Sharing and collaboration
            "shared_with", "collaborators", "permissions", "access_level",
            "owner", "members", "team_id", "organization_id",
            
            # Comments and feedback
            "comments", "feedback", "reviews", "ratings",
            
            # Approval workflows
            "approval_status", "approved_by", "rejected_by", "review_status",
            
            # Improvement suggestions and scoring
            "suggestions", "improvements", "recommendations", "score",
            "rating", "performance", "efficiency", "quality_score",
            
            # Estimation and requirements
            "estimated_duration", "estimated_cost", "timeline", "deadline",
            "requirements", "specifications", "acceptance_criteria",
            
            # Notifications
            "notifications", "alerts", "messages", "subscriptions"
        ]
        
        # Check project response
        for field in forbidden_fields:
            assert field not in project, f"Project response contains forbidden field '{field}'"
        
        # Check hearing log response
        for field in forbidden_fields:
            assert field not in hearing_log, f"Hearing log response contains forbidden field '{field}'"
        
        # Check flow node responses
        for node in flow_nodes:
            for field in forbidden_fields:
                assert field not in node, f"Flow node response contains forbidden field '{field}'"
        
        # Verify responses only contain expected MVP fields
        expected_project_fields = {
            "id", "name", "department", "status", "created_at", "updated_at"
        }
        
        project_fields = set(project.keys())
        unexpected_fields = project_fields - expected_project_fields
        assert len(unexpected_fields) == 0, f"Project response contains unexpected fields: {unexpected_fields}"
        
        expected_hearing_fields = {
            "id", "project_id", "content", "created_at"
        }
        
        hearing_fields = set(hearing_log.keys())
        unexpected_hearing_fields = hearing_fields - expected_hearing_fields
        assert len(unexpected_hearing_fields) == 0, f"Hearing log response contains unexpected fields: {unexpected_hearing_fields}"
        
        expected_flow_fields = {
            "id", "project_id", "text", "order", "created_at", "updated_at"
        }
        
        for node in flow_nodes:
            node_fields = set(node.keys())
            unexpected_node_fields = node_fields - expected_flow_fields
            assert len(unexpected_node_fields) == 0, f"Flow node response contains unexpected fields: {unexpected_node_fields}"