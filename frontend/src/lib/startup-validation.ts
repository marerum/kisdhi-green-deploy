/**
 * Frontend startup validation
 * This module performs validation checks when the application starts
 */

import { ConfigurationError, getSafeConfigSummary } from './config';

/**
 * Perform startup validation checks
 * This function should be called early in the application lifecycle
 */
export function validateStartup(): void {
  try {
    // Configuration is already validated when config module is imported
    // Log safe configuration summary for debugging
    if (typeof window === 'undefined') {
      // Server-side (during build or SSR)
      console.log('Frontend configuration validated:', getSafeConfigSummary());
    } else {
      // Client-side
      console.log('Frontend configuration validated:', getSafeConfigSummary());
    }
  } catch (error) {
    if (error instanceof ConfigurationError) {
      console.error('FRONTEND CONFIGURATION ERROR:', error.message);
      
      // In development, show a more helpful error
      if (process.env.NODE_ENV === 'development') {
        console.error('\nTo fix this issue:');
        console.error('1. Copy .env.local.template to .env.local');
        console.error('2. Fill in the required environment variables');
        console.error('3. Restart the development server');
      }
      
      throw error;
    }
    
    console.error('UNEXPECTED FRONTEND STARTUP ERROR:', error);
    throw error;
  }
}

/**
 * Validate that sensitive data is not exposed
 * This is an additional safety check to prevent accidental exposure
 */
export function validateNoSensitiveDataExposed(): void {
  const sensitivePatterns = [
    /sk-[a-zA-Z0-9]+/, // OpenAI API keys
    /mysql:\/\/.*:.*@/, // Database URLs with credentials
    /[a-zA-Z0-9]{32,}/, // Long strings that might be secrets (basic check)
  ];
  
  // Check all environment variables that start with NEXT_PUBLIC_
  const publicEnvVars = Object.keys(process.env).filter(key => 
    key.startsWith('NEXT_PUBLIC_')
  );
  
  const exposedSecrets: string[] = [];
  
  publicEnvVars.forEach(key => {
    const value = process.env[key];
    if (value) {
      sensitivePatterns.forEach(pattern => {
        if (pattern.test(value)) {
          exposedSecrets.push(key);
        }
      });
    }
  });
  
  if (exposedSecrets.length > 0) {
    const errorMessage = `Potential sensitive data exposed in public environment variables: ${exposedSecrets.join(', ')}`;
    console.error('SECURITY WARNING:', errorMessage);
    throw new ConfigurationError(errorMessage);
  }
}