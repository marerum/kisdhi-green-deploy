"""
Tests for configuration validation
"""
import pytest
import os
from unittest.mock import patch
from app.config import Settings, ConfigurationError, create_settings_for_testing


class TestConfigurationValidation:
    """Test configuration validation functionality"""
    
    def test_valid_configuration(self):
        """Test that valid configuration passes validation"""
        with patch.dict(os.environ, {
            'DATABASE_URL': 'mysql+pymysql://user:pass@localhost:3306/test',
            'OPENAI_API_KEY': 'sk-test123456789',
            'SECRET_KEY': 'test-secret-key',
            'ALLOWED_ORIGINS': 'http://localhost:3000'
        }):
            settings = create_settings_for_testing()
            # Should not raise an exception
            settings.validate_required_settings()
    
    def test_valid_configuration_with_individual_db_components(self):
        """Test that valid configuration with individual database components passes validation"""
        with patch.dict(os.environ, {
            'DATABASE_HOST': 'localhost',
            'DATABASE_PORT': '3306',
            'DATABASE_NAME': 'test_db',
            'DATABASE_USER': 'testuser',
            'DATABASE_PASSWORD': 'testpass',
            'OPENAI_API_KEY': 'sk-test123456789',
            'SECRET_KEY': 'test-secret-key',
            'ALLOWED_ORIGINS': 'http://localhost:3000'
        }, clear=True):
            settings = create_settings_for_testing()
            # Should not raise an exception
            settings.validate_required_settings()
            # Should construct DATABASE_URL correctly
            expected_url = "mysql+pymysql://testuser:testpass@localhost:3306/test_db"
            assert settings.effective_database_url == expected_url
    
    def test_missing_database_url(self):
        """Test that missing database configuration raises ConfigurationError"""
        with patch.dict(os.environ, {
            'OPENAI_API_KEY': 'sk-test123456789',
        }, clear=True):
            settings = create_settings_for_testing()
            with pytest.raises(ConfigurationError) as exc_info:
                settings.validate_required_settings()
            error_message = str(exc_info.value)
            assert ("DATABASE_USER is required when DATABASE_URL is not provided" in error_message or
                    "DATABASE_PASSWORD is required when DATABASE_URL is not provided" in error_message)
    
    def test_missing_openai_api_key(self):
        """Test that missing OPENAI_API_KEY raises ConfigurationError"""
        with patch.dict(os.environ, {
            'DATABASE_URL': 'mysql+pymysql://user:pass@localhost:3306/test',
        }, clear=True):
            settings = create_settings_for_testing()
            with pytest.raises(ConfigurationError) as exc_info:
                settings.validate_required_settings()
            assert "OPENAI_API_KEY is required" in str(exc_info.value)
    
    def test_invalid_openai_api_key_format(self):
        """Test that invalid OPENAI_API_KEY format raises ConfigurationError"""
        with patch.dict(os.environ, {
            'DATABASE_URL': 'mysql+pymysql://user:pass@localhost:3306/test',
            'OPENAI_API_KEY': 'invalid-key-format',
        }, clear=True):
            settings = create_settings_for_testing()
            with pytest.raises(ConfigurationError) as exc_info:
                settings.validate_required_settings()
            assert "OPENAI_API_KEY appears to be invalid" in str(exc_info.value)
    
    def test_invalid_database_url_format(self):
        """Test that invalid DATABASE_URL format raises ConfigurationError"""
        with patch.dict(os.environ, {
            'DATABASE_URL': 'invalid://connection/string',
            'OPENAI_API_KEY': 'sk-test123456789',
        }, clear=True):
            settings = create_settings_for_testing()
            with pytest.raises(ConfigurationError) as exc_info:
                settings.validate_required_settings()
            assert "Database URL must be a valid connection string" in str(exc_info.value)
    
    def test_production_requires_secret_key(self):
        """Test that production environment requires SECRET_KEY"""
        with patch.dict(os.environ, {
            'DATABASE_URL': 'mysql+pymysql://user:pass@localhost:3306/test',
            'OPENAI_API_KEY': 'sk-test123456789',
            'ENVIRONMENT': 'production',
        }, clear=True):
            settings = create_settings_for_testing()
            with pytest.raises(ConfigurationError) as exc_info:
                settings.validate_required_settings()
            assert "SECRET_KEY is required in production" in str(exc_info.value)
    
    def test_safe_config_summary_no_sensitive_data(self):
        """Test that safe config summary doesn't expose sensitive data"""
        with patch.dict(os.environ, {
            'DATABASE_URL': 'mysql+pymysql://user:secretpassword@localhost:3306/test',
            'OPENAI_API_KEY': 'sk-secretkey123456789',
            'SECRET_KEY': 'super-secret-key-value',
        }, clear=True):
            settings = create_settings_for_testing()
            summary = settings.get_safe_config_summary()
            
            # Should not contain actual sensitive values
            summary_str = str(summary)
            assert 'secretpassword' not in summary_str
            assert 'sk-secretkey123456789' not in summary_str
            assert 'super-secret-key-value' not in summary_str
            
            # Should contain safe configuration flags
            assert summary['openai_api_key_configured'] is True
            assert summary['database_url_configured'] is True
            assert summary['secret_key_configured'] is True
    
    def test_multiple_validation_errors(self):
        """Test that multiple validation errors are reported together"""
        with patch.dict(os.environ, {}, clear=True):
            settings = create_settings_for_testing()
            with pytest.raises(ConfigurationError) as exc_info:
                settings.validate_required_settings()
            
            error_message = str(exc_info.value)
            # Check for database configuration errors (either DATABASE_URL or individual components)
            assert ("DATABASE_USER is required when DATABASE_URL is not provided" in error_message or
                    "DATABASE_PASSWORD is required when DATABASE_URL is not provided" in error_message)
            assert "OPENAI_API_KEY is required" in error_message