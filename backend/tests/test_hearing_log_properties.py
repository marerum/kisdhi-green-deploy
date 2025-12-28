"""
Property-based tests for hearing log functionality.

Feature: ai-business-flow, Property 3: Hearing Log Storage and Ordering
Validates: Requirements 2.2, 2.4
"""

import pytest
from datetime import datetime, timedelta
from hypothesis import given, strategies as st, assume, settings, HealthCheck
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.models import Project, HearingLog
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
project_names = st.text(min_size=1, max_size=255).filter(lambda x: x.strip())
department_names = st.one_of(st.none(), st.text(min_size=1, max_size=100).filter(lambda x: x.strip()))
hearing_content = st.text(min_size=1, max_size=10000).filter(lambda x: x.strip())


class TestHearingLogProperties:
    """Property-based tests for hearing log functionality."""

    @given(
        project_name=project_names,
        department=department_names,
        hearing_contents=st.lists(hearing_content, min_size=1, max_size=10)
    )
    @settings(
        suppress_health_check=[HealthCheck.function_scoped_fixture],
        deadline=None,  # Disable deadline for API operations
        max_examples=2  # Reduced for faster execution
    )
    def test_hearing_log_storage_and_ordering(
        self, 
        project_name: str, 
        department: str,
        hearing_contents: list
    ):
        """
        Property 3: Hearing Log Storage and Ordering
        
        For any hearing content input, the system should store it as a timestamped 
        entry and display all logs in chronological order.
        
        **Feature: ai-business-flow, Property 3: Hearing Log Storage and Ordering**
        **Validates: Requirements 2.2, 2.4**
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
            
            # Create a project first
            project_data = {
                "name": project_name,
                "department": department
            }
            
            project_response = client.post("/api/projects/", json=project_data)
            assert project_response.status_code == 201
            project_id = project_response.json()["id"]
            
            # Store hearing logs with their expected order
            created_hearing_logs = []
            
            # Add hearing logs one by one to ensure chronological ordering
            for i, content in enumerate(hearing_contents):
                hearing_data = {"content": content}
                
                # Record time before creation
                before_creation = datetime.utcnow()
                
                response = client.post(f"/api/projects/{project_id}/hearing", json=hearing_data)
                
                # Record time after creation
                after_creation = datetime.utcnow()
                
                # Verify successful creation (Requirements 2.2)
                assert response.status_code == 201
                created_log = response.json()
                
                # Verify hearing log storage properties
                assert created_log["content"] == content
                assert created_log["project_id"] == project_id
                assert "id" in created_log
                assert "created_at" in created_log
                
                # Verify timestamp exists and is reasonable
                created_at_str = created_log["created_at"]
                assert created_at_str is not None
                
                # Parse the timestamp to verify it's a valid datetime
                created_at = datetime.fromisoformat(created_at_str.replace('Z', '+00:00'))
                assert isinstance(created_at, datetime)
                
                # Store for ordering verification
                created_hearing_logs.append({
                    "id": created_log["id"],
                    "content": content,
                    "created_at": created_at,
                    "order_index": i
                })
                
                # Verify automatic persistence by querying database directly
                db_hearing_log = db_session.query(HearingLog).filter(
                    HearingLog.id == created_log["id"]
                ).first()
                assert db_hearing_log is not None
                assert db_hearing_log.content == content
                assert db_hearing_log.project_id == project_id
                assert db_hearing_log.created_at is not None
                
                # Add small delay to ensure different timestamps for ordering test
                # (In real usage, user input would naturally have time gaps)
                import time
                time.sleep(0.001)  # 1ms delay
            
            # Test chronological ordering (Requirements 2.4)
            # Retrieve all hearing logs for the project
            get_response = client.get(f"/api/projects/{project_id}/hearing")
            assert get_response.status_code == 200
            retrieved_logs = get_response.json()
            
            # Verify all logs were stored
            assert len(retrieved_logs) == len(hearing_contents)
            
            # Verify chronological ordering
            for i, retrieved_log in enumerate(retrieved_logs):
                # Verify content matches expected order
                expected_content = hearing_contents[i]
                assert retrieved_log["content"] == expected_content
                assert retrieved_log["project_id"] == project_id
                
                # Verify timestamp ordering
                if i > 0:
                    prev_timestamp = datetime.fromisoformat(
                        retrieved_logs[i-1]["created_at"].replace('Z', '+00:00')
                    )
                    curr_timestamp = datetime.fromisoformat(
                        retrieved_log["created_at"].replace('Z', '+00:00')
                    )
                    
                    # Current timestamp should be >= previous timestamp (chronological order)
                    assert curr_timestamp >= prev_timestamp, (
                        f"Hearing logs not in chronological order: "
                        f"log {i-1} at {prev_timestamp} should be <= log {i} at {curr_timestamp}"
                    )
            
            # Test that ordering persists across multiple API calls
            # Make another request to verify consistent ordering
            second_get_response = client.get(f"/api/projects/{project_id}/hearing")
            assert second_get_response.status_code == 200
            second_retrieved_logs = second_get_response.json()
            
            # Verify ordering is consistent across requests
            assert len(second_retrieved_logs) == len(retrieved_logs)
            for i, (first_log, second_log) in enumerate(zip(retrieved_logs, second_retrieved_logs)):
                assert first_log["id"] == second_log["id"]
                assert first_log["content"] == second_log["content"]
                assert first_log["created_at"] == second_log["created_at"]
            
            # Test direct database query to verify ordering at database level
            db_hearing_logs = db_session.query(HearingLog).filter(
                HearingLog.project_id == project_id
            ).order_by(HearingLog.created_at.asc()).all()
            
            assert len(db_hearing_logs) == len(hearing_contents)
            
            # Verify database-level chronological ordering
            for i, db_log in enumerate(db_hearing_logs):
                expected_content = hearing_contents[i]
                assert db_log.content == expected_content
                
                # Verify timestamp ordering at database level
                if i > 0:
                    prev_db_log = db_hearing_logs[i-1]
                    assert db_log.created_at >= prev_db_log.created_at, (
                        f"Database hearing logs not in chronological order: "
                        f"log {i-1} at {prev_db_log.created_at} should be <= log {i} at {db_log.created_at}"
                    )
            
            # Test that hearing log updates preserve ordering
            if len(retrieved_logs) > 0:
                # Update the first hearing log
                first_log_id = retrieved_logs[0]["id"]
                updated_content = f"Updated: {retrieved_logs[0]['content']}"
                
                update_response = client.put(
                    f"/api/hearing/{first_log_id}", 
                    json={"content": updated_content}
                )
                assert update_response.status_code == 200
                
                # Verify ordering is preserved after update
                post_update_response = client.get(f"/api/projects/{project_id}/hearing")
                assert post_update_response.status_code == 200
                post_update_logs = post_update_response.json()
                
                # First log should still be first (ordering preserved)
                assert post_update_logs[0]["id"] == first_log_id
                assert post_update_logs[0]["content"] == updated_content
                
                # All other logs should maintain their relative order
                for i in range(1, len(post_update_logs)):
                    assert post_update_logs[i]["id"] == retrieved_logs[i]["id"]
                    assert post_update_logs[i]["content"] == retrieved_logs[i]["content"]
            
        finally:
            # Clean up
            app.dependency_overrides.clear()
            db_session.close()

    @given(
        project_name=project_names,
        department=department_names,
        hearing_content_single=hearing_content
    )
    @settings(
        suppress_health_check=[HealthCheck.function_scoped_fixture],
        deadline=None,  # Disable deadline for API operations
        max_examples=2  # Reduced for faster execution
    )
    def test_single_hearing_log_storage(
        self, 
        project_name: str, 
        department: str,
        hearing_content_single: str
    ):
        """
        Additional property test: Single hearing log storage should work correctly
        and maintain all required properties.
        
        **Feature: ai-business-flow, Property 3: Hearing Log Storage and Ordering**
        **Validates: Requirements 2.2, 2.4**
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
            
            # Create a project first
            project_data = {
                "name": project_name,
                "department": department
            }
            
            project_response = client.post("/api/projects/", json=project_data)
            assert project_response.status_code == 201
            project_id = project_response.json()["id"]
            
            # Add a single hearing log
            hearing_data = {"content": hearing_content_single}
            
            response = client.post(f"/api/projects/{project_id}/hearing", json=hearing_data)
            
            # Verify successful creation
            assert response.status_code == 201
            created_log = response.json()
            
            # Verify hearing log storage properties
            assert created_log["content"] == hearing_content_single
            assert created_log["project_id"] == project_id
            assert "id" in created_log
            assert "created_at" in created_log
            
            # Verify timestamp exists and is valid
            created_at_str = created_log["created_at"]
            assert created_at_str is not None
            created_at = datetime.fromisoformat(created_at_str.replace('Z', '+00:00'))
            assert isinstance(created_at, datetime)
            
            # Verify retrieval maintains all properties
            get_response = client.get(f"/api/projects/{project_id}/hearing")
            assert get_response.status_code == 200
            retrieved_logs = get_response.json()
            
            assert len(retrieved_logs) == 1
            retrieved_log = retrieved_logs[0]
            
            assert retrieved_log["id"] == created_log["id"]
            assert retrieved_log["content"] == hearing_content_single
            assert retrieved_log["project_id"] == project_id
            assert retrieved_log["created_at"] == created_log["created_at"]
            
            # Verify database persistence
            db_hearing_log = db_session.query(HearingLog).filter(
                HearingLog.id == created_log["id"]
            ).first()
            assert db_hearing_log is not None
            assert db_hearing_log.content == hearing_content_single
            assert db_hearing_log.project_id == project_id
            assert db_hearing_log.created_at is not None
            
        finally:
            # Clean up
            app.dependency_overrides.clear()
            db_session.close()

    @given(
        project_name=project_names,
        department=department_names,
        empty_project_hearing_count=st.integers(min_value=0, max_value=0)  # Always 0 for empty test
    )
    @settings(
        suppress_health_check=[HealthCheck.function_scoped_fixture],
        deadline=None,  # Disable deadline for API operations
        max_examples=3  # Reduced for faster execution
    )
    def test_empty_hearing_logs_ordering(
        self, 
        project_name: str, 
        department: str,
        empty_project_hearing_count: int
    ):
        """
        Edge case property test: Projects with no hearing logs should return 
        empty list in correct format.
        
        **Feature: ai-business-flow, Property 3: Hearing Log Storage and Ordering**
        **Validates: Requirements 2.2, 2.4**
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
            
            # Create a project without any hearing logs
            project_data = {
                "name": project_name,
                "department": department
            }
            
            project_response = client.post("/api/projects/", json=project_data)
            assert project_response.status_code == 201
            project_id = project_response.json()["id"]
            
            # Retrieve hearing logs for empty project
            get_response = client.get(f"/api/projects/{project_id}/hearing")
            assert get_response.status_code == 200
            retrieved_logs = get_response.json()
            
            # Verify empty list is returned in correct format
            assert isinstance(retrieved_logs, list)
            assert len(retrieved_logs) == 0
            
            # Verify database query also returns empty result
            db_hearing_logs = db_session.query(HearingLog).filter(
                HearingLog.project_id == project_id
            ).order_by(HearingLog.created_at.asc()).all()
            
            assert len(db_hearing_logs) == 0
            
        finally:
            # Clean up
            app.dependency_overrides.clear()
            db_session.close()