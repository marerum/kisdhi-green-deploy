"""
Unit tests for error handling utilities and AI service error handling
Tests AI service error handling, HTTP exception conversion, and error response formatting
"""

import pytest
from unittest.mock import Mock, patch
from fastapi import HTTPException, status

from app.utils.error_handlers import (
    handle_ai_service_errors,
    handle_database_errors,
    convert_business_exception_to_http
)
from app.exceptions import (
    BusinessFlowException,
    AIServiceError,
    ValidationError,
    DatabaseError,
    ResourceNotFoundError,
    ConfigurationError,
    create_http_exception,
    get_user_friendly_message
)


class TestAIServiceErrorHandling:
    """Test AI service error handling decorator and utilities"""

    def test_handle_ai_service_errors_success(self):
        """Test that decorator allows successful AI operations to pass through"""
        @handle_ai_service_errors("test AI operation")
        async def successful_ai_operation():
            return {"nodes": [{"text": "Step 1", "order": 0}]}

        import asyncio
        result = asyncio.run(successful_ai_operation())
        assert result == {"nodes": [{"text": "Step 1", "order": 0}]}

    def test_handle_ai_service_errors_timeout_error(self):
        """Test handling of AI service timeout errors"""
        @handle_ai_service_errors("AI timeout test")
        async def ai_operation_with_timeout():
            raise Exception("Request timeout: The operation timed out")

        import asyncio
        with pytest.raises(AIServiceError) as exc_info:
            asyncio.run(ai_operation_with_timeout())

        error = exc_info.value
        assert error.error_code == "AI_SERVICE_ERROR"
        assert "AI service request timed out" in error.message
        assert error.details["ai_error_type"] == "timeout"

    def test_handle_ai_service_errors_rate_limit_error(self):
        """Test handling of AI service rate limit errors"""
        @handle_ai_service_errors("AI rate limit test")
        async def ai_operation_with_rate_limit():
            raise Exception("Rate limit exceeded for requests")

        import asyncio
        with pytest.raises(AIServiceError) as exc_info:
            asyncio.run(ai_operation_with_rate_limit())

        error = exc_info.value
        assert "rate limit exceeded" in error.message.lower()
        assert error.details["ai_error_type"] == "rate_limit"

    def test_handle_ai_service_errors_quota_error(self):
        """Test handling of AI service quota errors"""
        @handle_ai_service_errors("AI quota test")
        async def ai_operation_with_quota():
            raise Exception("You have exceeded your quota for this month")

        import asyncio
        with pytest.raises(AIServiceError) as exc_info:
            asyncio.run(ai_operation_with_quota())

        error = exc_info.value
        assert "rate limit exceeded" in error.message.lower()
        assert error.details["ai_error_type"] == "rate_limit"

    def test_handle_ai_service_errors_authentication_error(self):
        """Test handling of AI service authentication errors"""
        @handle_ai_service_errors("AI auth test")
        async def ai_operation_with_auth_error():
            raise Exception("Invalid API key provided")

        import asyncio
        with pytest.raises(AIServiceError) as exc_info:
            asyncio.run(ai_operation_with_auth_error())

        error = exc_info.value
        assert "authentication failed" in error.message.lower()
        assert error.details["ai_error_type"] == "authentication"

    def test_handle_ai_service_errors_network_error(self):
        """Test handling of AI service network errors"""
        @handle_ai_service_errors("AI network test")
        async def ai_operation_with_network_error():
            raise Exception("Network connection failed")

        import asyncio
        with pytest.raises(AIServiceError) as exc_info:
            asyncio.run(ai_operation_with_network_error())

        error = exc_info.value
        assert "network error" in error.message.lower()
        assert error.details["ai_error_type"] == "network"

    def test_handle_ai_service_errors_general_error(self):
        """Test handling of general AI service errors"""
        @handle_ai_service_errors("AI general test")
        async def ai_operation_with_general_error():
            raise Exception("Unexpected AI service error")

        import asyncio
        with pytest.raises(AIServiceError) as exc_info:
            asyncio.run(ai_operation_with_general_error())

        error = exc_info.value
        assert "AI service error occurred" in error.message
        assert error.details["ai_error_type"] == "general"

    def test_handle_ai_service_errors_preserves_business_exceptions(self):
        """Test that AI service decorator preserves business exceptions"""
        @handle_ai_service_errors("AI business exception test")
        async def ai_operation_with_business_exception():
            raise ValidationError("Invalid input format", "content")

        import asyncio
        with pytest.raises(ValidationError) as exc_info:
            asyncio.run(ai_operation_with_business_exception())

        # Should be the original validation error, not wrapped
        assert exc_info.value.error_code == "VALIDATION_ERROR"
        assert exc_info.value.details["field"] == "content"


class TestBusinessExceptionConversion:
    """Test conversion of business exceptions to HTTP exceptions"""

    def test_convert_validation_error_to_http(self):
        """Test conversion of validation error to HTTP exception"""
        validation_error = ValidationError("Name is required", "name")
        
        http_exception = convert_business_exception_to_http(validation_error)
        
        assert isinstance(http_exception, HTTPException)
        assert http_exception.status_code == status.HTTP_400_BAD_REQUEST
        assert http_exception.detail["error"]["code"] == "VALIDATION_ERROR"
        assert http_exception.detail["error"]["message"] == "Name is required"
        assert http_exception.detail["error"]["details"]["field"] == "name"

    def test_convert_resource_not_found_error_to_http(self):
        """Test conversion of resource not found error to HTTP exception"""
        not_found_error = ResourceNotFoundError("Project", 123)
        
        http_exception = convert_business_exception_to_http(not_found_error)
        
        assert http_exception.status_code == status.HTTP_404_NOT_FOUND
        assert http_exception.detail["error"]["code"] == "RESOURCE_NOT_FOUND"
        assert "Project with id 123 not found" in http_exception.detail["error"]["message"]

    def test_convert_ai_service_error_to_http(self):
        """Test conversion of AI service error to HTTP exception"""
        ai_error = AIServiceError("AI service unavailable", "timeout")
        
        http_exception = convert_business_exception_to_http(ai_error)
        
        assert http_exception.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        assert http_exception.detail["error"]["code"] == "AI_SERVICE_ERROR"
        assert http_exception.detail["error"]["message"] == "AI service unavailable"

    def test_convert_database_error_to_http(self):
        """Test conversion of database error to HTTP exception"""
        db_error = DatabaseError("Connection failed", "create_project")
        
        http_exception = convert_business_exception_to_http(db_error)
        
        assert http_exception.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        assert http_exception.detail["error"]["code"] == "DATABASE_ERROR"
        assert http_exception.detail["error"]["message"] == "Connection failed"

    def test_convert_configuration_error_to_http(self):
        """Test conversion of configuration error to HTTP exception"""
        config_error = ConfigurationError("Missing API key", "OPENAI_API_KEY")
        
        http_exception = convert_business_exception_to_http(config_error)
        
        assert http_exception.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        assert http_exception.detail["error"]["code"] == "CONFIGURATION_ERROR"
        assert http_exception.detail["error"]["details"]["config_key"] == "OPENAI_API_KEY"

    def test_convert_unknown_error_code_to_http(self):
        """Test conversion of unknown error code uses default status"""
        unknown_error = BusinessFlowException("Unknown error", "UNKNOWN_ERROR")
        
        http_exception = convert_business_exception_to_http(unknown_error)
        
        assert http_exception.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        assert http_exception.detail["error"]["code"] == "UNKNOWN_ERROR"

    def test_convert_with_custom_default_status(self):
        """Test conversion with custom default status code"""
        custom_error = BusinessFlowException("Custom error", "CUSTOM_ERROR")
        
        http_exception = create_http_exception(custom_error, status.HTTP_418_IM_A_TEAPOT)
        
        assert http_exception.status_code == status.HTTP_418_IM_A_TEAPOT


class TestCreateHttpException:
    """Test create_http_exception utility function"""

    def test_create_http_exception_with_details(self):
        """Test creating HTTP exception with detailed error information"""
        business_error = ValidationError(
            "Invalid project data",
            "name",
            {"min_length": 3, "max_length": 100}
        )
        
        http_exception = create_http_exception(business_error)
        
        assert http_exception.status_code == status.HTTP_400_BAD_REQUEST
        assert http_exception.detail["error"]["code"] == "VALIDATION_ERROR"
        assert http_exception.detail["error"]["message"] == "Invalid project data"
        assert http_exception.detail["error"]["details"]["field"] == "name"
        assert http_exception.detail["error"]["details"]["min_length"] == 3
        assert http_exception.detail["error"]["details"]["max_length"] == 100

    def test_create_http_exception_error_format(self):
        """Test that HTTP exception follows correct error format"""
        business_error = DatabaseError("Query failed")
        
        http_exception = create_http_exception(business_error)
        
        # Verify error format structure
        assert "error" in http_exception.detail
        error_obj = http_exception.detail["error"]
        assert "code" in error_obj
        assert "message" in error_obj
        assert "details" in error_obj
        
        assert isinstance(error_obj["code"], str)
        assert isinstance(error_obj["message"], str)
        assert isinstance(error_obj["details"], dict)


class TestUserFriendlyMessages:
    """Test user-friendly error message generation"""

    def test_get_user_friendly_message_database_error(self):
        """Test user-friendly message for database errors"""
        message = get_user_friendly_message("DATABASE_ERROR", "Connection timeout")
        
        assert message == "A database error occurred. Please try again in a moment."

    def test_get_user_friendly_message_ai_service_error(self):
        """Test user-friendly message for AI service errors"""
        message = get_user_friendly_message("AI_SERVICE_ERROR", "Rate limit exceeded")
        
        assert message == "The AI service is temporarily unavailable. Please try again later."

    def test_get_user_friendly_message_configuration_error(self):
        """Test user-friendly message for configuration errors"""
        message = get_user_friendly_message("CONFIGURATION_ERROR", "Missing environment variable")
        
        assert message == "A configuration error occurred. Please contact support."

    def test_get_user_friendly_message_validation_error(self):
        """Test user-friendly message for validation errors (preserves original)"""
        original_message = "Name must be at least 3 characters long"
        message = get_user_friendly_message("VALIDATION_ERROR", original_message)
        
        assert message == original_message

    def test_get_user_friendly_message_resource_not_found(self):
        """Test user-friendly message for not found errors (preserves original)"""
        original_message = "Project with id 123 not found"
        message = get_user_friendly_message("RESOURCE_NOT_FOUND", original_message)
        
        assert message == original_message

    def test_get_user_friendly_message_unknown_error(self):
        """Test user-friendly message for unknown error codes"""
        message = get_user_friendly_message("UNKNOWN_ERROR", "Something went wrong")
        
        assert message == "An unexpected error occurred. Please try again."


class TestExceptionClasses:
    """Test custom exception classes"""

    def test_business_flow_exception_creation(self):
        """Test BusinessFlowException creation with all parameters"""
        exception = BusinessFlowException(
            "Test error message",
            "TEST_ERROR",
            {"key": "value", "number": 42}
        )
        
        assert exception.message == "Test error message"
        assert exception.error_code == "TEST_ERROR"
        assert exception.details == {"key": "value", "number": 42}
        assert str(exception) == "Test error message"

    def test_validation_error_creation(self):
        """Test ValidationError creation with field information"""
        exception = ValidationError("Invalid email format", "email", {"pattern": "email"})
        
        assert exception.error_code == "VALIDATION_ERROR"
        assert exception.details["field"] == "email"
        assert exception.details["pattern"] == "email"

    def test_database_error_creation(self):
        """Test DatabaseError creation with operation information"""
        exception = DatabaseError("Connection failed", "create_project", {"timeout": 30})
        
        assert exception.error_code == "DATABASE_ERROR"
        assert exception.details["operation"] == "create_project"
        assert exception.details["timeout"] == 30

    def test_ai_service_error_creation(self):
        """Test AIServiceError creation with error type"""
        exception = AIServiceError("Rate limit exceeded", "rate_limit", {"retry_after": 60})
        
        assert exception.error_code == "AI_SERVICE_ERROR"
        assert exception.details["ai_error_type"] == "rate_limit"
        assert exception.details["retry_after"] == 60

    def test_resource_not_found_error_creation(self):
        """Test ResourceNotFoundError creation with resource information"""
        exception = ResourceNotFoundError("Project", 123, {"user_id": 456})
        
        assert exception.error_code == "RESOURCE_NOT_FOUND"
        assert "Project with id 123 not found" in exception.message
        assert exception.details["resource_type"] == "Project"
        assert exception.details["resource_id"] == "123"
        assert exception.details["user_id"] == 456

    def test_configuration_error_creation(self):
        """Test ConfigurationError creation with config key"""
        exception = ConfigurationError("Missing API key", "OPENAI_API_KEY", {"required": True})
        
        assert exception.error_code == "CONFIGURATION_ERROR"
        assert exception.details["config_key"] == "OPENAI_API_KEY"
        assert exception.details["required"] is True

    def test_exception_inheritance(self):
        """Test that all custom exceptions inherit from BusinessFlowException"""
        validation_error = ValidationError("test")
        database_error = DatabaseError("test")
        ai_error = AIServiceError("test")
        not_found_error = ResourceNotFoundError("Test", 1)
        config_error = ConfigurationError("test")
        
        assert isinstance(validation_error, BusinessFlowException)
        assert isinstance(database_error, BusinessFlowException)
        assert isinstance(ai_error, BusinessFlowException)
        assert isinstance(not_found_error, BusinessFlowException)
        assert isinstance(config_error, BusinessFlowException)


class TestErrorHandlingIntegration:
    """Integration tests for error handling across different components"""

    def test_ai_service_to_http_conversion_flow(self):
        """Test complete flow from AI service error to HTTP response"""
        # Simulate AI service error
        @handle_ai_service_errors("integration test")
        async def failing_ai_operation():
            raise Exception("OpenAI API timeout occurred")

        import asyncio
        
        # Catch the AI service error
        with pytest.raises(AIServiceError) as exc_info:
            asyncio.run(failing_ai_operation())

        ai_error = exc_info.value
        
        # Convert to HTTP exception
        http_exception = convert_business_exception_to_http(ai_error)
        
        # Verify complete conversion
        assert http_exception.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        assert http_exception.detail["error"]["code"] == "AI_SERVICE_ERROR"
        assert "timed out" in http_exception.detail["error"]["message"].lower()
        assert http_exception.detail["error"]["details"]["ai_error_type"] == "timeout"

    def test_database_to_http_conversion_flow(self):
        """Test complete flow from database error to HTTP response"""
        from sqlalchemy.exc import IntegrityError
        
        # Simulate database operation with error
        @handle_database_errors("integration test")
        def failing_db_operation():
            raise IntegrityError("statement", "params", "UNIQUE constraint failed")

        # Catch the database error
        with pytest.raises(DatabaseError) as exc_info:
            failing_db_operation()

        db_error = exc_info.value
        
        # Convert to HTTP exception
        http_exception = convert_business_exception_to_http(db_error)
        
        # Verify complete conversion
        assert http_exception.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        assert http_exception.detail["error"]["code"] == "DATABASE_ERROR"
        assert "constraint violated" in http_exception.detail["error"]["message"].lower()

    def test_error_message_consistency(self):
        """Test that error messages are consistent across different error types"""
        errors = [
            ValidationError("Test validation error"),
            DatabaseError("Test database error"),
            AIServiceError("Test AI error"),
            ResourceNotFoundError("Test", 1),
            ConfigurationError("Test config error")
        ]
        
        for error in errors:
            http_exception = create_http_exception(error)
            
            # All should have consistent error format
            assert "error" in http_exception.detail
            error_obj = http_exception.detail["error"]
            assert all(key in error_obj for key in ["code", "message", "details"])
            
            # All should have appropriate status codes
            assert 400 <= http_exception.status_code <= 500