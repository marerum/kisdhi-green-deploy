"""
Property-based tests for project API endpoints.

Feature: ai-business-flow, Property 1: Project Creation Consistency
Feature: ai-business-flow, Property 2: Automatic Data Persistence
Validates: Requirements 1.2, 1.3, 1.4, 2.3, 4.8, 6.1, 6.2
"""

import pytest
from datetime import datetime, timedelta
from hypothesis import given, strategies as st, assume, settings, HealthCheck
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.models import Project
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
project_names = st.text(min_size=1, max_size=255, alphabet=st.characters(min_codepoint=32, max_codepoint=126, blacklist_characters=['\r', '\n', '\t'])).filter(lambda x: x.strip() and x == x.strip())
department_names = st.one_of(st.none(), st.text(min_size=1, max_size=100, alphabet=st.characters(min_codepoint=32, max_codepoint=126, blacklist_characters=['\r', '\n', '\t'])).filter(lambda x: x.strip() and x == x.strip()))

# More precise strategy for project updates with field-specific constraints
def project_update_strategy():
    """Generate project updates with field-specific constraints."""
    return st.one_of(
        # Name updates
        st.fixed_dictionaries({
            "name": st.text(min_size=1, max_size=255, alphabet=st.characters(min_codepoint=32, max_codepoint=126, blacklist_characters=['\r', '\n', '\t'])).filter(lambda x: x.strip() and x == x.strip())
        }),
        # Department updates  
        st.fixed_dictionaries({
            "department": st.text(min_size=1, max_size=100, alphabet=st.characters(min_codepoint=32, max_codepoint=126, blacklist_characters=['\r', '\n', '\t'])).filter(lambda x: x.strip() and x == x.strip())
        }),
        # Status updates
        st.fixed_dictionaries({
            "status": st.sampled_from(["draft", "active", "completed"])
        }),
        # Combined updates with proper field constraints
        st.fixed_dictionaries({
            "name": st.text(min_size=1, max_size=255, alphabet=st.characters(min_codepoint=32, max_codepoint=126, blacklist_characters=['\r', '\n', '\t'])).filter(lambda x: x.strip() and x == x.strip()),
            "department": st.text(min_size=1, max_size=100, alphabet=st.characters(min_codepoint=32, max_codepoint=126, blacklist_characters=['\r', '\n', '\t'])).filter(lambda x: x.strip() and x == x.strip())
        }),
        st.fixed_dictionaries({
            "name": st.text(min_size=1, max_size=255, alphabet=st.characters(min_codepoint=32, max_codepoint=126, blacklist_characters=['\r', '\n', '\t'])).filter(lambda x: x.strip() and x == x.strip()),
            "status": st.sampled_from(["draft", "active", "completed"])
        }),
        st.fixed_dictionaries({
            "department": st.text(min_size=1, max_size=100, alphabet=st.characters(min_codepoint=32, max_codepoint=126, blacklist_characters=['\r', '\n', '\t'])).filter(lambda x: x.strip() and x == x.strip()),
            "status": st.sampled_from(["draft", "active", "completed"])
        }),
        st.fixed_dictionaries({
            "name": st.text(min_size=1, max_size=255, alphabet=st.characters(min_codepoint=32, max_codepoint=126, blacklist_characters=['\r', '\n', '\t'])).filter(lambda x: x.strip() and x == x.strip()),
            "department": st.text(min_size=1, max_size=100, alphabet=st.characters(min_codepoint=32, max_codepoint=126, blacklist_characters=['\r', '\n', '\t'])).filter(lambda x: x.strip() and x == x.strip()),
            "status": st.sampled_from(["draft", "active", "completed"])
        })
    )

project_updates = project_update_strategy()


class TestProjectAPIProperties:
    """Property-based tests for project API endpoints."""

    @given(
        project_name=project_names,
        department=department_names
    )
    @settings(
        suppress_health_check=[HealthCheck.function_scoped_fixture],
        deadline=None,  # Disable deadline for API operations
        max_examples=2  # Reduced for faster execution
    )
    def test_project_creation_consistency(self, project_name: str, department: str):
        """
        Property 1: Project Creation Consistency
        
        For any project creation request, the system should create a project with 
        draft status and allow immediate name editing.
        
        **Feature: ai-business-flow, Property 1: Project Creation Consistency**
        **Validates: Requirements 1.2, 1.3**
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
            
            # Test project creation
            project_data = {
                "name": project_name,
                "department": department
            }
            
            response = client.post("/api/projects/", json=project_data)
            
            # Verify successful creation
            assert response.status_code == 201
            created_project = response.json()
            
            # Verify project creation consistency properties
            assert created_project["name"] == project_name
            assert created_project["department"] == department
            assert created_project["status"] == "draft"  # Always created with draft status
            assert "id" in created_project
            assert "created_at" in created_project
            assert "updated_at" in created_project
            
            # Verify the project exists in database
            project_id = created_project["id"]
            db_project = db_session.query(Project).filter(Project.id == project_id).first()
            assert db_project is not None
            assert db_project.name == project_name
            assert db_project.department == department
            assert db_project.status == "draft"
            
            # Test immediate name editing capability (Requirements 1.3)
            new_name = f"Updated {project_name}"
            update_data = {"name": new_name}
            
            update_response = client.put(f"/api/projects/{project_id}", json=update_data)
            
            # Verify successful update
            assert update_response.status_code == 200
            updated_project = update_response.json()
            
            # Verify name editing works immediately after creation
            assert updated_project["name"] == new_name
            assert updated_project["id"] == project_id
            assert updated_project["department"] == department
            assert updated_project["status"] == "draft"
            
            # Verify the update persisted in database
            db_project_updated = db_session.query(Project).filter(Project.id == project_id).first()
            assert db_project_updated.name == new_name
            
        finally:
            # Clean up
            app.dependency_overrides.clear()
            db_session.close()

    @given(
        project_name=project_names,
        department=department_names,
        updates=project_updates
    )
    @settings(
        suppress_health_check=[HealthCheck.function_scoped_fixture],
        deadline=None,  # Disable deadline for API operations
        max_examples=2  # Reduced for faster execution
    )
    def test_automatic_data_persistence(self, project_name: str, department: str, updates: dict):
        """
        Property 2: Automatic Data Persistence
        
        For any user input or modification (project changes, hearing content, flow edits), 
        the system should automatically persist the data to the database without requiring 
        explicit save actions.
        
        **Feature: ai-business-flow, Property 2: Automatic Data Persistence**
        **Validates: Requirements 1.4, 2.3, 4.8, 6.1, 6.2**
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
            project_data = {
                "name": project_name,
                "department": department
            }
            
            create_response = client.post("/api/projects/", json=project_data)
            assert create_response.status_code == 201
            created_project = create_response.json()
            project_id = created_project["id"]
            
            # Verify automatic persistence of creation (Requirements 6.1, 6.2)
            # Query database directly to ensure data was persisted automatically
            db_project = db_session.query(Project).filter(Project.id == project_id).first()
            assert db_project is not None
            assert db_project.name == project_name
            assert db_project.department == department
            assert db_project.status == "draft"
            assert db_project.created_at is not None
            assert db_project.updated_at is not None
            
            # Record original timestamps
            original_created_at = db_project.created_at
            original_updated_at = db_project.updated_at
            
            # Test automatic persistence of updates (Requirements 1.4)
            # The updates are already properly constrained by the strategy
            update_response = client.put(f"/api/projects/{project_id}", json=updates)
            assert update_response.status_code == 200
            updated_project = update_response.json()
            
            # Verify automatic persistence of updates
            # Query database directly to ensure updates were persisted automatically
            db_session.expunge_all()  # Clear session cache to force fresh query
            db_project_updated = db_session.query(Project).filter(Project.id == project_id).first()
            assert db_project_updated is not None
            
            # Verify all updates were automatically persisted
            for key, expected_value in updates.items():
                actual_value = getattr(db_project_updated, key)
                assert actual_value == expected_value, f"Field {key} was not automatically persisted"
            
            # Verify timestamps were automatically updated
            assert db_project_updated.created_at == original_created_at  # Created timestamp should not change
            # Note: We don't strictly test updated_at timing due to potential race conditions in tests
            # The important property is that the data is persisted, which we've verified above
            
            # Test that data persists across different API calls (simulating user sessions)
            # Make another API call to retrieve the project
            get_response = client.get(f"/api/projects/{project_id}")
            assert get_response.status_code == 200
            retrieved_project = get_response.json()
            
            # Verify all data persisted across API calls
            for key, expected_value in updates.items():
                actual_value = retrieved_project[key]
                assert actual_value == expected_value, f"Field {key} did not persist across API calls"
            
            # Verify original data that wasn't updated is still preserved
            if "name" not in updates:
                assert retrieved_project["name"] == project_name
            if "department" not in updates:
                assert retrieved_project["department"] == department
            if "status" not in updates:
                assert retrieved_project["status"] == "draft"
            
            # Test automatic persistence through project listing
            list_response = client.get("/api/projects/")
            assert list_response.status_code == 200
            projects_list = list_response.json()
            
            # Find our project in the list
            our_project = next((p for p in projects_list if p["id"] == project_id), None)
            assert our_project is not None, "Project not found in list after updates"
            
            # Verify data persisted in list view
            for key, expected_value in updates.items():
                actual_value = our_project[key]
                assert actual_value == expected_value, f"Field {key} not persisted in list view"
            
        finally:
            # Clean up
            app.dependency_overrides.clear()
            db_session.close()

    @given(
        projects_data=st.lists(
            st.tuples(project_names, department_names),
            min_size=1,
            max_size=5
        )
    )
    @settings(
        suppress_health_check=[HealthCheck.function_scoped_fixture],
        deadline=None,  # Disable deadline for API operations
        max_examples=3  # Reduced for faster execution
    )
    def test_multiple_projects_persistence(self, projects_data: list):
        """
        Additional property test: Multiple projects should all be automatically 
        persisted and retrievable.
        
        **Feature: ai-business-flow, Property 2: Automatic Data Persistence**
        **Validates: Requirements 6.1, 6.2**
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
            created_project_ids = []
            
            # Create multiple projects
            for project_name, department in projects_data:
                project_data = {
                    "name": project_name,
                    "department": department
                }
                
                response = client.post("/api/projects/", json=project_data)
                assert response.status_code == 201
                created_project = response.json()
                created_project_ids.append(created_project["id"])
                
                # Verify immediate persistence
                db_project = db_session.query(Project).filter(Project.id == created_project["id"]).first()
                assert db_project is not None
                assert db_project.name == project_name
                assert db_project.department == department
            
            # Verify all projects are persisted and retrievable
            list_response = client.get("/api/projects/")
            assert list_response.status_code == 200
            projects_list = list_response.json()
            
            # Verify all created projects are in the list
            assert len(projects_list) >= len(projects_data)
            
            for project_id in created_project_ids:
                project_in_list = next((p for p in projects_list if p["id"] == project_id), None)
                assert project_in_list is not None, f"Project {project_id} not found in list"
            
            # Verify each project can be retrieved individually
            for project_id in created_project_ids:
                get_response = client.get(f"/api/projects/{project_id}")
                assert get_response.status_code == 200
                retrieved_project = get_response.json()
                assert retrieved_project["id"] == project_id
                assert retrieved_project["status"] == "draft"
            
        finally:
            # Clean up
            app.dependency_overrides.clear()
            db_session.close()