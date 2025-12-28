"""
Test configuration and fixtures for AI Business Flow backend tests.
"""

import pytest
import asyncio
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from typing import Generator

# Set test environment variables before importing app modules
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("DATABASE_USER", "test")
os.environ.setdefault("DATABASE_PASSWORD", "test")
os.environ.setdefault("OPENAI_API_KEY", "test-key")
os.environ.setdefault("SECRET_KEY", "test-secret-key")

from app.database import Base


# Use in-memory SQLite for testing
TEST_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db_session():
    """Create a fresh database session for each test."""
    # Create tables
    Base.metadata.create_all(bind=engine)
    
    # Create session
    session = TestingSessionLocal()
    
    try:
        yield session
    finally:
        session.close()
        # Drop all tables after test
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def override_get_db(db_session):
    """Override the get_db dependency for testing."""
    def _override_get_db():
        try:
            yield db_session
        finally:
            pass
    
    # Import here to avoid circular imports and settings issues
    from app.main import app
    from app.database import get_db
    
    app.dependency_overrides[get_db] = _override_get_db
    yield
    app.dependency_overrides.clear()


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()