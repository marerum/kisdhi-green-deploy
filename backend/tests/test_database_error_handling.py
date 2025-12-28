"""
Unit tests for database error handling and recovery
Tests database connection errors, transaction rollbacks, and error recovery mechanisms
"""

import pytest
from unittest.mock import Mock, patch, MagicMock, PropertyMock
from sqlalchemy.exc import (
    SQLAlchemyError,
    IntegrityError,
    OperationalError,
    TimeoutError as SQLTimeoutError,
    DisconnectionError
)
from sqlalchemy.orm import Session

from app.utils.error_handlers import (
    handle_database_errors,
    ErrorContext,
    _extract_db_session
)
from app.exceptions import DatabaseError, BusinessFlowException
from app.database import get_db, test_db_connection, create_database_engine
from app.models import Project, HearingLog, FlowNode


class TestDatabaseErrorHandlers:
    """Test database error handling decorators and utilities"""

    def test_handle_database_errors_decorator_success(self):
        """Test that decorator allows successful operations to pass through"""
        @handle_database_errors("test operation")
        def successful_operation():
            return "success"

        result = successful_operation()
        assert result == "success"

    def test_handle_database_errors_decorator_async_success(self):
        """Test that decorator allows successful async operations to pass through"""
        @handle_database_errors("test async operation")
        async def successful_async_operation():
            return "async success"

        import asyncio
        result = asyncio.run(successful_async_operation())
        assert result == "async success"

    def test_handle_database_errors_integrity_error(self):
        """Test handling of database integrity constraint violations"""
        mock_db = Mock(spec=Session)
        
        @handle_database_errors("integrity test")
        def operation_with_integrity_error(db: Session):
            raise IntegrityError("statement", "params", "orig_error")

        with pytest.raises(DatabaseError) as exc_info:
            operation_with_integrity_error(mock_db)

        error = exc_info.value
        assert error.error_code == "DATABASE_ERROR"
        assert "Data integrity constraint violated" in error.message
        assert "integrity test" in error.message
        mock_db.rollback.assert_called_once()

    def test_handle_database_errors_operational_error(self):
        """Test handling of database operational errors"""
        mock_db = Mock(spec=Session)
        
        @handle_database_errors("operational test")
        def operation_with_operational_error(db: Session):
            raise OperationalError("statement", "params", "connection error")

        with pytest.raises(DatabaseError) as exc_info:
            operation_with_operational_error(mock_db)

        error = exc_info.value
        assert "Database connection or operational error" in error.message
        assert "operational test" in error.message
        mock_db.rollback.assert_called_once()

    def test_handle_database_errors_timeout_error(self):
        """Test handling of database timeout errors"""
        mock_db = Mock(spec=Session)
        
        @handle_database_errors("timeout test")
        def operation_with_timeout_error(db: Session):
            raise SQLTimeoutError("statement", "params", "timeout")

        with pytest.raises(DatabaseError) as exc_info:
            operation_with_timeout_error(mock_db)

        error = exc_info.value
        assert "Database operation timed out" in error.message
        assert "timeout test" in error.message
        mock_db.rollback.assert_called_once()

    def test_handle_database_errors_disconnection_error(self):
        """Test handling of database disconnection errors"""
        @handle_database_errors("disconnection test")
        def operation_with_disconnection_error():
            raise DisconnectionError("connection lost")

        with pytest.raises(DatabaseError) as exc_info:
            operation_with_disconnection_error()

        error = exc_info.value
        assert "Database connection lost" in error.message
        assert "disconnection test" in error.message

    def test_handle_database_errors_general_sqlalchemy_error(self):
        """Test handling of general SQLAlchemy errors"""
        mock_db = Mock(spec=Session)
        
        @handle_database_errors("general error test")
        def operation_with_general_error(db: Session):
            raise SQLAlchemyError("general database error")

        with pytest.raises(DatabaseError) as exc_info:
            operation_with_general_error(mock_db)

        error = exc_info.value
        assert "Database error occurred" in error.message
        assert "general error test" in error.message
        mock_db.rollback.assert_called_once()

    def test_handle_database_errors_unexpected_error(self):
        """Test handling of unexpected non-database errors"""
        mock_db = Mock(spec=Session)
        
        @handle_database_errors("unexpected error test")
        def operation_with_unexpected_error(db: Session):
            raise ValueError("unexpected error")

        with pytest.raises(DatabaseError) as exc_info:
            operation_with_unexpected_error(mock_db)

        error = exc_info.value
        assert "Unexpected error occurred" in error.message
        assert "unexpected error test" in error.message
        mock_db.rollback.assert_called_once()

    def test_handle_database_errors_preserves_business_exceptions(self):
        """Test that business exceptions are not wrapped"""
        @handle_database_errors("business exception test")
        def operation_with_business_exception():
            raise BusinessFlowException("business error", "BUSINESS_ERROR")

        with pytest.raises(BusinessFlowException) as exc_info:
            operation_with_business_exception()

        # Should be the original business exception, not wrapped
        assert exc_info.value.error_code == "BUSINESS_ERROR"
        assert exc_info.value.message == "business error"

    def test_extract_db_session_from_kwargs(self):
        """Test extracting database session from keyword arguments"""
        mock_db = Mock(spec=Session)
        
        result = _extract_db_session((), {"db": mock_db, "other": "value"})
        assert result is mock_db

    def test_extract_db_session_from_args(self):
        """Test extracting database session from positional arguments"""
        mock_db = Mock(spec=Session)
        
        result = _extract_db_session((mock_db, "other_arg"), {})
        assert result is mock_db

    def test_extract_db_session_not_found(self):
        """Test when no database session is found in arguments"""
        result = _extract_db_session(("arg1", "arg2"), {"key": "value"})
        assert result is None

    def test_extract_db_session_wrong_type(self):
        """Test when arguments contain non-Session objects"""
        result = _extract_db_session(("string", 123), {"db": "not_a_session"})
        assert result is None


class TestErrorContext:
    """Test ErrorContext context manager"""

    def test_error_context_success(self):
        """Test that context manager allows successful operations"""
        with ErrorContext("test operation"):
            result = "success"
        
        assert result == "success"

    def test_error_context_sqlalchemy_error(self):
        """Test that context manager converts SQLAlchemy errors"""
        with pytest.raises(DatabaseError) as exc_info:
            with ErrorContext("context test"):
                raise IntegrityError("statement", "params", "orig")

        error = exc_info.value
        assert "Database error in context test" in error.message

    def test_error_context_business_exception(self):
        """Test that context manager preserves business exceptions"""
        with pytest.raises(BusinessFlowException) as exc_info:
            with ErrorContext("context test"):
                raise BusinessFlowException("business error", "BUSINESS_ERROR")

        # Should be the original business exception
        assert exc_info.value.error_code == "BUSINESS_ERROR"

    def test_error_context_unknown_exception(self):
        """Test that context manager wraps unknown exceptions"""
        with pytest.raises(DatabaseError) as exc_info:
            with ErrorContext("context test"):
                raise ValueError("unknown error")

        error = exc_info.value
        assert "Unexpected error in context test" in error.message

    def test_error_context_custom_logger(self):
        """Test that context manager uses custom logger when provided"""
        import logging
        custom_logger = Mock(spec=logging.Logger)
        
        with pytest.raises(DatabaseError):
            with ErrorContext("logger test", custom_logger):
                raise ValueError("test error")

        custom_logger.error.assert_called_once()


class TestDatabaseConnection:
    """Test database connection and session management"""

    def test_get_db_session_success(self):
        """Test successful database session creation and cleanup"""
        with patch('app.database.SessionLocal') as mock_session_local:
            mock_session = Mock(spec=Session)
            mock_session_local.return_value = mock_session
            
            # Test the generator
            db_generator = get_db()
            db_session = next(db_generator)
            
            assert db_session is mock_session
            
            # Test cleanup
            try:
                next(db_generator)
            except StopIteration:
                pass
            
            mock_session.close.assert_called_once()

    def test_get_db_session_error_handling(self):
        """Test database session error handling and rollback"""
        with patch('app.database.SessionLocal') as mock_session_local:
            mock_session = Mock(spec=Session)
            mock_session_local.return_value = mock_session
            
            db_generator = get_db()
            db_session = next(db_generator)
            
            # Simulate an error during session usage
            try:
                db_generator.throw(SQLAlchemyError("test error"))
            except SQLAlchemyError:
                pass
            
            mock_session.rollback.assert_called_once()
            mock_session.close.assert_called_once()

    def test_test_db_connection_success(self):
        """Test successful database connection test"""
        with patch('app.database.engine') as mock_engine:
            mock_connection = Mock()
            mock_engine.connect.return_value.__enter__.return_value = mock_connection
            
            result = test_db_connection()
            
            assert result is True
            # Check that execute was called with a text() object containing "SELECT 1"
            mock_connection.execute.assert_called_once()
            call_args = mock_connection.execute.call_args[0][0]
            assert str(call_args) == "SELECT 1"

    def test_test_db_connection_failure(self):
        """Test database connection test failure"""
        with patch('app.database.engine') as mock_engine:
            mock_engine.connect.side_effect = OperationalError("statement", "params", "connection failed")
            
            result = test_db_connection()
            
            assert result is False

    def test_create_database_engine_with_url(self):
        """Test database engine creation with valid URL"""
        with patch('app.database.settings') as mock_settings:
            mock_settings.effective_database_url = "mysql+pymysql://user:pass@localhost:3306/test"
            mock_settings.database_ssl_required = False
            mock_settings.debug = False
            
            with patch('app.database.create_engine') as mock_create_engine:
                create_database_engine()
                
                mock_create_engine.assert_called_once()
                args, kwargs = mock_create_engine.call_args
                assert args[0] == "mysql+pymysql://user:pass@localhost:3306/test"
                assert kwargs['pool_pre_ping'] is True
                assert kwargs['pool_recycle'] == 3600

    def test_create_database_engine_without_url(self):
        """Test database engine creation without URL (fallback to SQLite)"""
        with patch('app.database.settings') as mock_settings:
            # Configure the mock to raise an exception when accessing effective_database_url
            type(mock_settings).effective_database_url = PropertyMock(side_effect=Exception("Database configuration error"))
            mock_settings.debug = False
            
            with patch('app.database.create_engine') as mock_create_engine:
                create_database_engine()
                
                mock_create_engine.assert_called_once()
                args, kwargs = mock_create_engine.call_args
                assert args[0] == "sqlite:///:memory:"


class TestDatabaseRecovery:
    """Test database connection recovery scenarios"""

    def test_connection_pool_recovery(self):
        """Test that connection pool recovers from temporary failures"""
        with patch('app.database.engine') as mock_engine:
            # First connection fails, second succeeds
            mock_connection = Mock()
            mock_connection.__enter__ = Mock(return_value=mock_connection)
            mock_connection.__exit__ = Mock(return_value=None)
            
            mock_engine.connect.side_effect = [
                OperationalError("statement", "params", "connection failed"),
                mock_connection
            ]
            
            # First test should fail
            result1 = test_db_connection()
            assert result1 is False
            
            # Second test should succeed (simulating recovery)
            result2 = test_db_connection()
            assert result2 is True

    def test_session_rollback_on_error(self):
        """Test that database sessions are properly rolled back on errors"""
        mock_db = Mock(spec=Session)
        
        @handle_database_errors("rollback test")
        def failing_operation(db: Session):
            # Simulate some database operations
            db.add(Mock())
            db.flush()
            # Then fail
            raise IntegrityError("statement", "params", "constraint violation")

        with pytest.raises(DatabaseError):
            failing_operation(mock_db)

        # Verify rollback was called
        mock_db.rollback.assert_called_once()

    def test_multiple_error_recovery_attempts(self):
        """Test handling of multiple consecutive database errors"""
        call_count = 0
        
        @handle_database_errors("multi-error test")
        def multi_error_operation():
            nonlocal call_count
            call_count += 1
            
            if call_count == 1:
                raise OperationalError("statement", "params", "first error")
            elif call_count == 2:
                raise SQLTimeoutError("statement", "params", "second error")
            else:
                return "success"

        # First call should raise OperationalError wrapped as DatabaseError
        with pytest.raises(DatabaseError) as exc_info1:
            multi_error_operation()
        assert "operational error" in exc_info1.value.message.lower()

        # Second call should raise TimeoutError wrapped as DatabaseError
        with pytest.raises(DatabaseError) as exc_info2:
            multi_error_operation()
        assert "timed out" in exc_info2.value.message.lower()

        # Third call should succeed
        result = multi_error_operation()
        assert result == "success"

    def test_concurrent_error_handling(self):
        """Test error handling under concurrent access scenarios"""
        import threading
        
        errors_caught = []
        
        @handle_database_errors("concurrent test")
        def concurrent_operation(thread_id: int):
            # Simulate different types of errors from different threads
            if thread_id % 2 == 0:
                raise OperationalError("statement", "params", f"error from thread {thread_id}")
            else:
                raise IntegrityError("statement", "params", f"constraint error from thread {thread_id}")

        def thread_worker(thread_id: int):
            try:
                concurrent_operation(thread_id)
            except DatabaseError as e:
                errors_caught.append((thread_id, e.error_code, e.message))

        # Start multiple threads
        threads = []
        for i in range(4):
            thread = threading.Thread(target=thread_worker, args=(i,))
            threads.append(thread)
            thread.start()

        # Wait for all threads to complete
        for thread in threads:
            thread.join()

        # Verify all errors were caught and handled properly
        assert len(errors_caught) == 4
        for thread_id, error_code, message in errors_caught:
            assert error_code == "DATABASE_ERROR"
            # Check that the error message contains information about the operation
            assert "concurrent test" in message


class TestDatabaseErrorIntegration:
    """Integration tests for database error handling with actual models"""

    def test_model_constraint_violation_handling(self):
        """Test handling of model constraint violations"""
        mock_db = Mock(spec=Session)
        
        @handle_database_errors("model constraint test")
        def create_duplicate_project(db: Session):
            # Simulate creating a project that violates unique constraints
            project = Project(name="Test Project")
            db.add(project)
            db.flush()  # This would trigger constraint violation
            raise IntegrityError("statement", "params", "UNIQUE constraint failed")

        with pytest.raises(DatabaseError) as exc_info:
            create_duplicate_project(mock_db)

        error = exc_info.value
        assert "constraint violated" in error.message.lower()
        mock_db.rollback.assert_called_once()

    def test_foreign_key_constraint_handling(self):
        """Test handling of foreign key constraint violations"""
        mock_db = Mock(spec=Session)
        
        @handle_database_errors("foreign key test")
        def create_orphaned_hearing_log(db: Session):
            # Simulate creating a hearing log with invalid project_id
            hearing_log = HearingLog(project_id=999, content="Test content")
            db.add(hearing_log)
            db.flush()
            raise IntegrityError("statement", "params", "FOREIGN KEY constraint failed")

        with pytest.raises(DatabaseError) as exc_info:
            create_orphaned_hearing_log(mock_db)

        error = exc_info.value
        assert "constraint violated" in error.message.lower()
        mock_db.rollback.assert_called_once()

    def test_transaction_rollback_preserves_state(self):
        """Test that transaction rollback preserves database state"""
        mock_db = Mock(spec=Session)
        
        @handle_database_errors("transaction test")
        def complex_transaction(db: Session):
            # Simulate a complex transaction that fails partway through
            project = Project(name="Test Project")
            db.add(project)
            
            hearing_log = HearingLog(project_id=1, content="Test content")
            db.add(hearing_log)
            
            # Simulate failure after partial operations
            raise OperationalError("statement", "params", "connection lost")

        with pytest.raises(DatabaseError):
            complex_transaction(mock_db)

        # Verify rollback was called to undo partial changes
        mock_db.rollback.assert_called_once()
        
        # Verify that add operations were attempted
        assert mock_db.add.call_count == 2