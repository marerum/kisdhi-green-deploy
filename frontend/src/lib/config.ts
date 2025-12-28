/**
 * Frontend configuration validation
 * Ensures required environment variables are present and validates their format
 */

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

interface FrontendConfig {
  apiUrl: string;
  environment: string;
}

/**
 * Validate and return frontend configuration
 * This function ensures all required environment variables are present and valid
 */
function validateConfig(): FrontendConfig {
  const errors: string[] = [];
  
  // Validate API URL
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) {
    errors.push('NEXT_PUBLIC_API_URL is required for API communication');
  } else if (!apiUrl.startsWith('http://') && !apiUrl.startsWith('https://')) {
    errors.push('NEXT_PUBLIC_API_URL must be a valid HTTP/HTTPS URL');
  }
  
  // Get environment
  const environment = process.env.NODE_ENV || 'development';
  
  // Validate production requirements
  if (environment === 'production') {
    if (apiUrl && apiUrl.startsWith('http://')) {
      errors.push('NEXT_PUBLIC_API_URL should use HTTPS in production environment');
    }
  }
  
  // Check for accidentally exposed sensitive variables
  const sensitiveVars = ['OPENAI_API_KEY', 'DATABASE_URL', 'SECRET_KEY'];
  const exposedVars = sensitiveVars.filter(varName => 
    process.env[`NEXT_PUBLIC_${varName}`] !== undefined
  );
  
  if (exposedVars.length > 0) {
    errors.push(
      `Sensitive environment variables should not be exposed to frontend: ${exposedVars.join(', ')}`
    );
  }
  
  if (errors.length > 0) {
    const errorMessage = 'Frontend configuration validation failed:\n' + 
      errors.map(error => `  - ${error}`).join('\n') +
      '\n\nPlease check your environment variables and ensure all required values are set.' +
      '\nRefer to .env.local.template for the complete list of required variables.';
    
    throw new ConfigurationError(errorMessage);
  }
  
  return {
    apiUrl: apiUrl!,
    environment,
  };
}

/**
 * Get safe configuration summary for logging (no sensitive data)
 */
export function getSafeConfigSummary() {
  return {
    apiUrl: config.apiUrl,
    environment: config.environment,
    hasApiUrl: !!process.env.NEXT_PUBLIC_API_URL,
  };
}

// Validate configuration on module load
export const config = validateConfig();

// Export individual config values for convenience
export const { apiUrl, environment } = config;