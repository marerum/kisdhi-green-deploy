"""
Property-based tests for security and configuration requirements
**Feature: ai-business-flow, Property 9: Security and Configuration**
**Validates: Requirements 7.4, 7.5, 7.6**
"""
import pytest
import os
from unittest.mock import patch
from hypothesis import given, strategies as st, assume
from app.config import Settings, ConfigurationError, create_settings_for_testing


class TestSecurityConfigurationProperties:
    """Property-based tests for security and configuration validation"""
    
    @given(
        database_url=st.one_of(
            st.none(),
            st.text(min_size=1, max_size=200, alphabet=st.characters(blacklist_characters=['\x00'])).filter(lambda x: not x.startswith(('mysql+pymysql://', 'mysql://'))),
            st.just("")
        )
    )
    def test_property_invalid_database_urls_prevent_startup(self, database_url):
        """
        Property: For any invalid or missing DATABASE_URL, the system should prevent startup with clear error messages
        **Validates: Requirements 7.4, 7.6**
        """
        env_vars = {
            'OPENAI_API_KEY': 'sk-test123456789',
            'SECRET_KEY': 'test-secret-key',
            'ALLOWED_ORIGINS': 'http://localhost:3000'
        }
        
        if database_url is not None:
            env_vars['DATABASE_URL'] = database_url
        
        with patch.dict(os.environ, env_vars, clear=True):
            settings = create_settings_for_testing()
            
            with pytest.raises(ConfigurationError) as exc_info:
                settings.validate_required_settings()
            
            error_message = str(exc_info.value)
            # Should contain clear error message about database configuration
            assert any(keyword in error_message.lower() for keyword in ['database', 'mysql', 'connection'])
    
    @given(
        openai_key=st.one_of(
            st.none(),
            st.text(min_size=1, max_size=100, alphabet=st.characters(min_codepoint=32, max_codepoint=126)).filter(lambda x: not x.startswith(('sk-', 'sk-proj-'))),
            st.just("")
        )
    )
    def test_property_invalid_openai_keys_prevent_startup(self, openai_key):
        """
        Property: For any invalid or missing OPENAI_API_KEY, the system should prevent startup with clear error messages
        **Validates: Requirements 7.4, 7.5, 7.6**
        """
        env_vars = {
            'DATABASE_URL': 'mysql+pymysql://user:pass@localhost:3306/test',
            'SECRET_KEY': 'test-secret-key',
            'ALLOWED_ORIGINS': 'http://localhost:3000'
        }
        
        if openai_key is not None:
            env_vars['OPENAI_API_KEY'] = openai_key
        
        with patch.dict(os.environ, env_vars, clear=True):
            settings = create_settings_for_testing()
            
            with pytest.raises(ConfigurationError) as exc_info:
                settings.validate_required_settings()
            
            error_message = str(exc_info.value)
            # Should contain clear error message about OpenAI API key
            assert any(keyword in error_message.lower() for keyword in ['openai', 'api', 'key'])
    
    @given(
        secret_key=st.one_of(st.none(), st.just(""))
    )
    def test_property_production_requires_secret_key(self, secret_key):
        """
        Property: For any production environment, missing SECRET_KEY should prevent startup with clear error messages
        **Validates: Requirements 7.4, 7.6**
        """
        env_vars = {
            'DATABASE_URL': 'mysql+pymysql://user:pass@localhost:3306/test',
            'OPENAI_API_KEY': 'sk-test123456789',
            'ENVIRONMENT': 'production',
            'ALLOWED_ORIGINS': 'http://localhost:3000'
        }
        
        if secret_key is not None:
            env_vars['SECRET_KEY'] = secret_key
        
        with patch.dict(os.environ, env_vars, clear=True):
            settings = create_settings_for_testing()
            
            with pytest.raises(ConfigurationError) as exc_info:
                settings.validate_required_settings()
            
            error_message = str(exc_info.value)
            # Should contain clear error message about secret key in production
            assert any(keyword in error_message.lower() for keyword in ['secret', 'production'])
    
    @given(
        database_url=st.one_of(
            st.just('mysql+pymysql://user:secretpassword123@localhost:3306/test'),
            st.just('mysql://root:mysecretkey456@host:3306/db')
        ),
        openai_key=st.text(min_size=15, max_size=50, alphabet=st.characters(min_codepoint=65, max_codepoint=90)).map(lambda x: f'sk-{x}'),
        secret_key=st.text(min_size=15, max_size=50, alphabet=st.characters(min_codepoint=65, max_codepoint=90))
    )
    def test_property_sensitive_data_never_exposed_in_safe_summary(self, database_url, openai_key, secret_key):
        """
        Property: For any configuration with sensitive data, the safe config summary should never expose actual sensitive values
        **Validates: Requirements 7.5**
        """
        with patch.dict(os.environ, {
            'DATABASE_URL': database_url,
            'OPENAI_API_KEY': openai_key,
            'SECRET_KEY': secret_key,
            'ALLOWED_ORIGINS': 'http://localhost:3000'
        }, clear=True):
            settings = create_settings_for_testing()
            summary = settings.get_safe_config_summary()
            summary_str = str(summary)
            
            # Extract sensitive parts from the inputs
            sensitive_parts = []
            
            # Extract password from database URL
            if '@' in database_url and ':' in database_url:
                try:
                    # Extract password part from URL like mysql://user:password@host:port/db
                    auth_part = database_url.split('://')[1].split('@')[0]
                    if ':' in auth_part:
                        password = auth_part.split(':')[1]
                        if len(password) > 8:  # Only check meaningful passwords
                            sensitive_parts.append(password)
                except (IndexError, ValueError):
                    pass
            
            # Add OpenAI key (but skip the 'sk-' prefix)
            if len(openai_key) > 15:
                key_part = openai_key[3:]  # Remove 'sk-' prefix
                if len(key_part) > 10:
                    sensitive_parts.append(key_part)
            
            # Add secret key (but only if it's long enough and doesn't contain common words)
            if len(secret_key) > 10 and not any(word in secret_key.lower() for word in ['database', 'host', 'port', 'environment']):
                sensitive_parts.append(secret_key)
            
            # Verify no sensitive data is exposed in the summary
            for sensitive_value in sensitive_parts:
                assert sensitive_value not in summary_str, f"Sensitive value '{sensitive_value}' found in safe config summary"
            
            # Verify summary contains configuration flags instead
            assert 'openai_api_key_configured' in summary
            assert 'database_url_configured' in summary
            assert 'secret_key_configured' in summary
            assert summary['openai_api_key_configured'] is True
            assert summary['database_url_configured'] is True
            assert summary['secret_key_configured'] is True
    
    @given(
        missing_vars=st.lists(
            st.sampled_from(['DATABASE_URL', 'OPENAI_API_KEY']),
            min_size=1,
            max_size=2,
            unique=True
        )
    )
    def test_property_multiple_missing_vars_reported_together(self, missing_vars):
        """
        Property: For any combination of missing required environment variables, all missing variables should be reported in a single clear error message
        **Validates: Requirements 7.6**
        """
        # Start with a complete valid configuration
        env_vars = {
            'DATABASE_URL': 'mysql+pymysql://user:pass@localhost:3306/test',
            'OPENAI_API_KEY': 'sk-test123456789',
            'SECRET_KEY': 'test-secret-key',
            'ALLOWED_ORIGINS': 'http://localhost:3000'
        }
        
        # Remove the specified variables
        for var in missing_vars:
            env_vars.pop(var, None)
        
        with patch.dict(os.environ, env_vars, clear=True):
            settings = create_settings_for_testing()
            
            with pytest.raises(ConfigurationError) as exc_info:
                settings.validate_required_settings()
            
            error_message = str(exc_info.value)
            
            # All missing variables should be mentioned in the error
            for var in missing_vars:
                assert var in error_message
            
            # Should contain helpful guidance
            assert any(keyword in error_message.lower() for keyword in ['environment', 'variables', 'required'])
            assert '.env' in error_message.lower()
    
    @given(
        valid_mysql_urls=st.sampled_from([
            'mysql+pymysql://user:pass@localhost:3306/db',
            'mysql://user:pass@host.example.com:3306/database',
            'mysql+pymysql://root:password123@127.0.0.1:3306/test_db'
        ]),
        valid_openai_keys=st.sampled_from([
            'sk-test123456789abcdef',
            'sk-proj-abcdef123456789',
            'sk-1234567890abcdefghijklmnop'
        ])
    )
    def test_property_valid_configuration_passes_validation(self, valid_mysql_urls, valid_openai_keys):
        """
        Property: For any valid configuration with proper format, validation should pass without errors
        **Validates: Requirements 7.4**
        """
        with patch.dict(os.environ, {
            'DATABASE_URL': valid_mysql_urls,
            'OPENAI_API_KEY': valid_openai_keys,
            'SECRET_KEY': 'test-secret-key',
            'ALLOWED_ORIGINS': 'http://localhost:3000'
        }, clear=True):
            settings = create_settings_for_testing()
            
            # Should not raise any exception
            try:
                settings.validate_required_settings()
            except ConfigurationError:
                pytest.fail("Valid configuration should not raise ConfigurationError")