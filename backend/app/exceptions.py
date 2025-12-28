"""
Custom exception classes and error handling utilities for AI Business Flow application.
"""

from typing import Dict, Any, Optional
from fastapi import HTTPException, status


class BusinessFlowException(Exception):
    """Base exception class for business flow application errors."""
    
    def __init__(
        self,
        message: str,
        error_code: str = "BUSINESS_FLOW_ERROR",
        details: Optional[Dict[str, Any]] = None
    ):
        self.message = message
        self.error_code = error_code
        self.details = details or {}
        super().__init__(self.message)


class ValidationError(BusinessFlowException):
    """Exception for validation errors."""
    
    def __init__(self, message: str, field: Optional[str] = None, details: Optional[Dict[str, Any]] = None):
        error_details = details or {}
        if field:
            error_details["field"] = field
        super().__init__(message, "VALIDATION_ERROR", error_details)


class DatabaseError(BusinessFlowException):
    """Exception for database-related errors."""
    
    def __init__(self, message: str, operation: Optional[str] = None, details: Optional[Dict[str, Any]] = None):
        error_details = details or {}
        if operation:
            error_details["operation"] = operation
        super().__init__(message, "DATABASE_ERROR", error_details)


class AIServiceError(BusinessFlowException):
    """Exception for AI service-related errors."""
    
    def __init__(self, message: str, ai_error_type: Optional[str] = None, details: Optional[Dict[str, Any]] = None):
        error_details = details or {}
        if ai_error_type:
            error_details["ai_error_type"] = ai_error_type
        super().__init__(message, "AI_SERVICE_ERROR", error_details)


class ResourceNotFoundError(BusinessFlowException):
    """Exception for resource not found errors."""
    
    def __init__(self, resource_type: str, resource_id: Any, details: Optional[Dict[str, Any]] = None):
        message = f"{resource_type} with id {resource_id} not found"
        error_details = details or {}
        error_details.update({
            "resource_type": resource_type,
            "resource_id": str(resource_id)
        })
        super().__init__(message, "RESOURCE_NOT_FOUND", error_details)


class ConfigurationError(BusinessFlowException):
    """Exception for configuration-related errors."""
    
    def __init__(self, message: str, config_key: Optional[str] = None, details: Optional[Dict[str, Any]] = None):
        error_details = details or {}
        if config_key:
            error_details["config_key"] = config_key
        super().__init__(message, "CONFIGURATION_ERROR", error_details)


def create_http_exception(
    business_exception: BusinessFlowException,
    default_status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR
) -> HTTPException:
    """
    Convert a business exception to an HTTP exception.
    
    Args:
        business_exception: The business exception to convert
        default_status_code: Default HTTP status code if not mapped
        
    Returns:
        HTTPException with appropriate status code and error format
    """
    # Map business exception types to HTTP status codes
    status_code_mapping = {
        "VALIDATION_ERROR": status.HTTP_400_BAD_REQUEST,
        "RESOURCE_NOT_FOUND": status.HTTP_404_NOT_FOUND,
        "AI_SERVICE_ERROR": status.HTTP_500_INTERNAL_SERVER_ERROR,
        "DATABASE_ERROR": status.HTTP_500_INTERNAL_SERVER_ERROR,
        "CONFIGURATION_ERROR": status.HTTP_500_INTERNAL_SERVER_ERROR,
    }
    
    status_code = status_code_mapping.get(business_exception.error_code, default_status_code)
    
    # Create error response format
    error_detail = {
        "error": {
            "code": business_exception.error_code,
            "message": business_exception.message,
            "details": business_exception.details
        }
    }
    
    return HTTPException(status_code=status_code, detail=error_detail)


def get_user_friendly_message(error_code: str, original_message: str) -> str:
    """
    Get a user-friendly error message based on error code.
    
    Args:
        error_code: The error code
        original_message: The original error message
        
    Returns:
        User-friendly error message
    """
    user_friendly_messages = {
        "DATABASE_ERROR": "A database error occurred. Please try again in a moment.",
        "AI_SERVICE_ERROR": "The AI service is temporarily unavailable. Please try again later.",
        "CONFIGURATION_ERROR": "A configuration error occurred. Please contact support.",
        "VALIDATION_ERROR": original_message,  # Validation messages are usually user-friendly
        "RESOURCE_NOT_FOUND": original_message,  # Not found messages are usually clear
    }
    
    return user_friendly_messages.get(error_code, "An unexpected error occurred. Please try again.")