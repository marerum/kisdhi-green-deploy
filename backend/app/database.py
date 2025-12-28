"""
Database configuration and session management for AI Business Flow application.
"""

from sqlalchemy import create_engine, MetaData
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import QueuePool
from typing import Generator, Optional
import logging
import os

from .config import settings

# Configure logging
logger = logging.getLogger(__name__)

# Create SQLAlchemy engine with connection pooling
def create_database_engine():
    """Create database engine with proper configuration."""
    try:
        database_url = settings.effective_database_url
        logger.info(f"Using database URL: {database_url.replace(settings.database_password or '', '***')}")
    except Exception as e:
        logger.warning(f"Database configuration error: {e}, using in-memory SQLite for testing")
        return create_engine(
            "sqlite:///:memory:",
            echo=settings.debug,
        )
    
    # Prepare engine arguments with Azure MySQL optimizations
    engine_args = {
        "poolclass": QueuePool,
        "pool_size": 3,  # Reduced for Azure MySQL
        "max_overflow": 5,  # Reduced for Azure MySQL
        "pool_pre_ping": True,
        "pool_recycle": 1800,  # 30 minutes for Azure MySQL
        "echo": settings.debug,
        "connect_args": {
            "connect_timeout": 30,  # Reduced timeout for faster failure detection
            "read_timeout": 30,
            "write_timeout": 30,
            "charset": "utf8mb4",  # Explicit charset for Azure MySQL
            "autocommit": False,
        }
    }
    
    # Add SSL configuration if required
    if settings.database_ssl_required:
        if settings.database_ssl_ca:
            ssl_ca_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), settings.database_ssl_ca)
            logger.info(f"Checking SSL certificate at: {ssl_ca_path}")
            if os.path.exists(ssl_ca_path):
                # Use SSL with certificate for Azure MySQL
                # Import ssl module for proper constants
                import ssl as ssl_module
                engine_args["connect_args"].update({
                    "ssl": {
                        "ca": ssl_ca_path,
                        "check_hostname": False,
                        "verify_mode": ssl_module.CERT_REQUIRED
                    },
                    "ssl_disabled": False
                })
                logger.info(f"SSL enabled for database connection using certificate: {ssl_ca_path}")
            else:
                logger.warning(f"SSL certificate not found at {ssl_ca_path}, trying SSL without certificate")
                # Fallback to SSL without explicit certificate
                engine_args["connect_args"]["ssl_disabled"] = False
        else:
            # SSL required but no certificate specified - use default SSL
            engine_args["connect_args"]["ssl_disabled"] = False
            logger.info("SSL enabled for Azure MySQL connection without explicit certificate")
    
    logger.info(f"Creating database engine with SSL settings: {settings.database_ssl_required}")
    return create_engine(database_url, **engine_args)

engine = create_database_engine()

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create Base class for models
Base = declarative_base()

# Metadata for migrations
metadata = MetaData()


def get_db() -> Generator[Session, None, None]:
    """
    Dependency function to get database session.
    Used for FastAPI dependency injection.
    """
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        logger.error(f"Database session error: {e}")
        db.rollback()
        raise
    finally:
        db.close()


async def init_db() -> None:
    """
    Initialize database tables.
    Creates all tables defined in models.
    """
    try:
        # Import models to register them with Base
        from . import models  # noqa: F401
        
        # Create all tables
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created successfully")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
        raise


async def close_db() -> None:
    """
    Close database connections.
    Used during application shutdown.
    """
    try:
        engine.dispose()
        logger.info("Database connections closed")
    except Exception as e:
        logger.error(f"Error closing database connections: {e}")
        raise


def test_db_connection() -> bool:
    """
    Test database connection.
    Returns True if connection is successful, False otherwise.
    """
    try:
        from sqlalchemy import text
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        logger.info("Database connection test successful")
        return True
    except Exception as e:
        logger.error(f"Database connection test failed: {e}")
        return False