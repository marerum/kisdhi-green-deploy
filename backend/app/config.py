from pydantic_settings import BaseSettings
from pydantic import Field, validator
from typing import List, Optional
import os
import sys

class ConfigurationError(Exception):
    """Raised when required configuration is missing or invalid"""
    pass

class Settings(BaseSettings):
    # Database settings
    database_url: Optional[str] = None
    database_host: str = "localhost"
    database_port: int = 3306
    database_name: str = "ai_business_flow"
    database_user: Optional[str] = None
    database_password: Optional[str] = None
    
    # SSL settings for database
    database_ssl_required: bool = False
    database_ssl_ca: Optional[str] = None
    
    # OpenAI settings
    openai_api_key: Optional[str] = None
    
    # Application settings
    environment: str = "development"
    debug: bool = False
    secret_key: Optional[str] = None
    
    # CORS settings
    allowed_origins: str = "http://localhost:3000"
    
    # Server settings
    host: str = "0.0.0.0"
    port: int = 8000
    
    class Config:
        env_file = ".env"
        case_sensitive = False
    
    @property
    def allowed_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",")]
    
    @property
    def effective_database_url(self) -> str:
        """
        Get the effective database URL, either from DATABASE_URL or constructed from components.
        """
        if self.database_url:
            return self.database_url
        
        # Construct DATABASE_URL from individual components
        if not all([self.database_user, self.database_password, self.database_host, self.database_name]):
            raise ConfigurationError("Either DATABASE_URL or all individual database components (user, password, host, name) must be provided")
        
        base_url = f"mysql+pymysql://{self.database_user}:{self.database_password}@{self.database_host}:{self.database_port}/{self.database_name}"
        
        # Add SSL parameters to URL if required
        if self.database_ssl_required:
            ssl_params = "?ssl_disabled=false"
            if self.database_ssl_ca:
                # Note: SSL certificate will be handled in engine connect_args, not URL
                pass
            return base_url + ssl_params
        
        return base_url
    
    def validate_required_settings(self) -> None:
        """
        Validate that all required environment variables are present and valid.
        Raises ConfigurationError with clear messages if validation fails.
        """
        errors = []
        
        # Check database configuration
        if not self.database_url:
            # If DATABASE_URL is not provided, check individual components
            if not self.database_user:
                errors.append("DATABASE_USER is required when DATABASE_URL is not provided")
            if not self.database_password:
                errors.append("DATABASE_PASSWORD is required when DATABASE_URL is not provided")
            if not self.database_host:
                errors.append("DATABASE_HOST is required when DATABASE_URL is not provided")
            if not self.database_name:
                errors.append("DATABASE_NAME is required when DATABASE_URL is not provided")
        
        # Check OpenAI API key
        if not self.openai_api_key:
            errors.append("OPENAI_API_KEY is required for AI flow generation")
        elif not self.openai_api_key.startswith(('sk-', 'sk-proj-')):
            errors.append("OPENAI_API_KEY appears to be invalid (should start with 'sk-' or 'sk-proj-')")
        
        # Check secret key for production
        if self.environment == "production" and not self.secret_key:
            errors.append("SECRET_KEY is required in production environment")
        
        # Validate database URL format - check the effective URL that will be used
        try:
            effective_url = self.effective_database_url
            if effective_url and not effective_url.startswith(('mysql+pymysql://', 'mysql://', 'sqlite://')):
                errors.append("Database URL must be a valid connection string (mysql+pymysql://... or sqlite://...)")
        except Exception as e:
            # If effective_database_url fails, the individual component validation above will catch it
            pass
        
        # Validate CORS origins
        if not self.allowed_origins:
            errors.append("ALLOWED_ORIGINS must be specified")
        
        if errors:
            error_message = "Configuration validation failed:\n" + "\n".join(f"  - {error}" for error in errors)
            error_message += "\n\nPlease check your environment variables and ensure all required values are set."
            error_message += "\nRefer to .env.template for the complete list of required variables."
            raise ConfigurationError(error_message)
    
    def get_safe_config_summary(self) -> dict:
        """
        Return a summary of configuration that's safe to log (no sensitive data).
        """
        return {
            "environment": self.environment,
            "debug": self.debug,
            "database_host": self.database_host,
            "database_port": self.database_port,
            "database_name": self.database_name,
            "database_ssl_required": self.database_ssl_required,
            "allowed_origins": self.allowed_origins_list,
            "host": self.host,
            "port": self.port,
            "openai_api_key_configured": bool(self.openai_api_key),
            "database_url_configured": bool(self.database_url),
            "database_components_configured": bool(self.database_user and self.database_password),
            "secret_key_configured": bool(self.secret_key),
        }

def create_settings() -> Settings:
    """
    Create and validate settings instance.
    This function ensures all required configuration is present before the application starts.
    """
    try:
        settings = Settings()
        settings.validate_required_settings()
        return settings
    except ConfigurationError as e:
        print(f"CONFIGURATION ERROR: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"UNEXPECTED CONFIGURATION ERROR: {e}", file=sys.stderr)
        sys.exit(1)

def create_settings_for_testing() -> Settings:
    """
    Create settings instance without validation for testing purposes.
    """
    return Settings()

# Global settings instance - only validate when not in test environment
if os.getenv('PYTEST_CURRENT_TEST'):
    # In test environment, don't validate on import
    settings = create_settings_for_testing()
else:
    # In normal environment, validate on import
    settings = create_settings()