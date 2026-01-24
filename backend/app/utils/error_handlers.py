"""
Error handling utilities and decorators for the AI Business Flow application.
"""

import logging
import functools
from typing import Callable, Any, Optional, Type
from sqlalchemy.exc import (
    SQLAlchemyError, 
    IntegrityError, 
    OperationalError, 
    TimeoutError as SQLTimeoutError,
    DisconnectionError
)
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from ..exceptions import (
    BusinessFlowException,
    DatabaseError,
    AIServiceError,
    ValidationError,
    create_http_exception
)

logger = logging.getLogger(__name__)


def handle_database_errors(operation_name: str = "database operation"):
    """
    Decorator to handle database errors and convert them to appropriate exceptions.
    
    Args:
        operation_name: Name of the operation for error context
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        async def async_wrapper(*args, **kwargs):
            try:
                return await func(*args, **kwargs)
            except BusinessFlowException:
                # Re-raise business exceptions as-is
                raise
            except IntegrityError as e:
                logger.error(f"Database integrity error in {operation_name}: {str(e)}")
                # Rollback if db session is available
                db = _extract_db_session(args, kwargs)
                if db:
                    db.rollback()
                raise DatabaseError(
                    f"Data integrity constraint violated during {operation_name}",
                    operation_name,
                    {"constraint_error": str(e.orig) if hasattr(e, 'orig') else str(e)}
                )
            except OperationalError as e:
                logger.error(f"Database operational error in {operation_name}: {str(e)}")
                # Rollback if db session is available
                db = _extract_db_session(args, kwargs)
                if db:
                    db.rollback()
                raise DatabaseError(
                    f"Database connection or operational error during {operation_name}",
                    operation_name,
                    {"operational_error": str(e.orig) if hasattr(e, 'orig') else str(e)}
                )
            except SQLTimeoutError as e:
                logger.error(f"Database timeout error in {operation_name}: {str(e)}")
                # Rollback if db session is available
                db = _extract_db_session(args, kwargs)
                if db:
                    db.rollback()
                raise DatabaseError(
                    f"Database operation timed out during {operation_name}",
                    operation_name,
                    {"timeout_error": str(e)}
                )
            except DisconnectionError as e:
                logger.error(f"Database disconnection error in {operation_name}: {str(e)}")
                raise DatabaseError(
                    f"Database connection lost during {operation_name}",
                    operation_name,
                    {"disconnection_error": str(e)}
                )
            except SQLAlchemyError as e:
                logger.error(f"SQLAlchemy error in {operation_name}: {str(e)}")
                # Rollback if db session is available
                db = _extract_db_session(args, kwargs)
                if db:
                    db.rollback()
                raise DatabaseError(
                    f"Database error occurred during {operation_name}",
                    operation_name,
                    {"sqlalchemy_error": str(e)}
                )
            except Exception as e:
                logger.error(f"Unexpected error in {operation_name}: {str(e)}", exc_info=True)
                # Rollback if db session is available
                db = _extract_db_session(args, kwargs)
                if db:
                    db.rollback()
                raise DatabaseError(
                    f"Unexpected error occurred during {operation_name}",
                    operation_name,
                    {"unexpected_error": str(e)}
                )
        
        @functools.wraps(func)
        def sync_wrapper(*args, **kwargs):
            try:
                return func(*args, **kwargs)
            except BusinessFlowException:
                # Re-raise business exceptions as-is
                raise
            except IntegrityError as e:
                logger.error(f"Database integrity error in {operation_name}: {str(e)}")
                # Rollback if db session is available
                db = _extract_db_session(args, kwargs)
                if db:
                    db.rollback()
                raise DatabaseError(
                    f"Data integrity constraint violated during {operation_name}",
                    operation_name,
                    {"constraint_error": str(e.orig) if hasattr(e, 'orig') else str(e)}
                )
            except OperationalError as e:
                logger.error(f"Database operational error in {operation_name}: {str(e)}")
                # Rollback if db session is available
                db = _extract_db_session(args, kwargs)
                if db:
                    db.rollback()
                raise DatabaseError(
                    f"Database connection or operational error during {operation_name}",
                    operation_name,
                    {"operational_error": str(e.orig) if hasattr(e, 'orig') else str(e)}
                )
            except SQLTimeoutError as e:
                logger.error(f"Database timeout error in {operation_name}: {str(e)}")
                # Rollback if db session is available
                db = _extract_db_session(args, kwargs)
                if db:
                    db.rollback()
                raise DatabaseError(
                    f"Database operation timed out during {operation_name}",
                    operation_name,
                    {"timeout_error": str(e)}
                )
            except DisconnectionError as e:
                logger.error(f"Database disconnection error in {operation_name}: {str(e)}")
                raise DatabaseError(
                    f"Database connection lost during {operation_name}",
                    operation_name,
                    {"disconnection_error": str(e)}
                )
            except SQLAlchemyError as e:
                logger.error(f"SQLAlchemy error in {operation_name}: {str(e)}")
                # Rollback if db session is available
                db = _extract_db_session(args, kwargs)
                if db:
                    db.rollback()
                raise DatabaseError(
                    f"Database error occurred during {operation_name}",
                    operation_name,
                    {"sqlalchemy_error": str(e)}
                )
            except Exception as e:
                logger.error(f"Unexpected error in {operation_name}: {str(e)}", exc_info=True)
                # Rollback if db session is available
                db = _extract_db_session(args, kwargs)
                if db:
                    db.rollback()
                raise DatabaseError(
                    f"Unexpected error occurred during {operation_name}",
                    operation_name,
                    {"unexpected_error": str(e)}
                )
        
        # Return appropriate wrapper based on function type
        import inspect
        if inspect.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator


def handle_ai_service_errors(operation_name: str = "AI operation"):
    """
    Decorator to handle AI service errors and convert them to appropriate exceptions.
    
    Args:
        operation_name: Name of the operation for error context
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            try:
                return await func(*args, **kwargs)
            except BusinessFlowException:
                # Re-raise business exceptions as-is
                raise
            except Exception as e:
                error_message = str(e)
                logger.error(f"AI service error in {operation_name}: {error_message}")
                
                # Categorize AI errors
                if "timeout" in error_message.lower():
                    raise AIServiceError(
                        f"AI service request timed out during {operation_name}",
                        "timeout",
                        {"timeout_error": error_message}
                    )
                elif "rate limit" in error_message.lower() or "quota" in error_message.lower():
                    raise AIServiceError(
                        f"AI service rate limit exceeded during {operation_name}",
                        "rate_limit",
                        {"rate_limit_error": error_message}
                    )
                elif "authentication" in error_message.lower() or "api key" in error_message.lower():
                    raise AIServiceError(
                        f"AI service authentication failed during {operation_name}",
                        "authentication",
                        {"auth_error": error_message}
                    )
                elif "network" in error_message.lower() or "connection" in error_message.lower():
                    raise AIServiceError(
                        f"AI service network error during {operation_name}",
                        "network",
                        {"network_error": error_message}
                    )
                else:
                    raise AIServiceError(
                        f"AI service error occurred during {operation_name}",
                        "general",
                        {"general_error": error_message}
                    )
        
        return wrapper
    
    return decorator


def _extract_db_session(args: tuple, kwargs: dict) -> Optional[Session]:
    """
    Extract database session from function arguments for rollback purposes.
    
    Args:
        args: Function positional arguments
        kwargs: Function keyword arguments
        
    Returns:
        Database session if found, None otherwise
    """
    # Check kwargs first
    if 'db' in kwargs and isinstance(kwargs['db'], Session):
        return kwargs['db']
    
    # Check args
    for arg in args:
        if isinstance(arg, Session):
            return arg
    
    return None


def convert_business_exception_to_http(exception: BusinessFlowException) -> HTTPException:
    """
    Convert a business exception to an HTTP exception with proper error format.
    
    Args:
        exception: The business exception to convert
        
    Returns:
        HTTPException with structured error response
    """
    return create_http_exception(exception)


class ErrorContext:
    """Context manager for handling errors with additional context."""
    
    def __init__(self, operation_name: str, logger_instance: Optional[logging.Logger] = None):
        self.operation_name = operation_name
        self.logger = logger_instance or logger
    
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type: Optional[Type[Exception]], exc_val: Optional[Exception], exc_tb):
        if exc_type and exc_val:
            self.logger.error(f"Error in {self.operation_name}: {str(exc_val)}", exc_info=True)
            
            # Convert known exceptions to business exceptions
            if isinstance(exc_val, SQLAlchemyError):
                raise DatabaseError(
                    f"Database error in {self.operation_name}: {str(exc_val)}",
                    self.operation_name
                ) from exc_val
            elif not isinstance(exc_val, BusinessFlowException):
                # Wrap unknown exceptions
                raise DatabaseError(
                    f"Unexpected error in {self.operation_name}: {str(exc_val)}",
                    self.operation_name
                ) from exc_val
        
        return False  # Don't suppress exceptions