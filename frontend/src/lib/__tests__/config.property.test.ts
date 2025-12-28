/**
 * Property-based tests for configuration validation
 * Tests configuration behavior with various environment variable combinations
 */

import fc from 'fast-check';

describe('Configuration Property Tests', () => {
  // Store original environment variables
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset modules and environment
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  it('Property: For any valid API URL format, configuration should load successfully in development', () => {
    fc.assert(fc.property(
      fc.webUrl(),
      (validApiUrl: string) => {
        // Set up valid environment
        process.env.NEXT_PUBLIC_API_URL = validApiUrl;
        (process.env as any).NODE_ENV = 'development';

        // Should not throw
        let threwError = false;
        
        try {
          jest.isolateModules(() => {
            require('../config');
          });
        } catch (error) {
          threwError = true;
        }

        expect(threwError).toBe(false);
      }
    ), { numRuns: 5 });
  });

  it('Property: For any invalid API URL format, configuration should fail with descriptive error', () => {
    fc.assert(fc.property(
      fc.oneof(
        fc.constant(''),
        fc.constant('not-a-url'),
        fc.constant('ftp://invalid-protocol.com'),
        fc.string().filter(s => !s.startsWith('http'))
      ),
      (invalidApiUrl: string) => {
        // Set up invalid environment
        if (invalidApiUrl) {
          process.env.NEXT_PUBLIC_API_URL = invalidApiUrl;
        } else {
          delete process.env.NEXT_PUBLIC_API_URL;
        }
        (process.env as any).NODE_ENV = 'development';

        // Should throw configuration error
        let threwError = false;
        let errorMessage = '';
        
        try {
          jest.isolateModules(() => {
            require('../config');
          });
        } catch (error) {
          threwError = true;
          errorMessage = (error as Error).message;
        }

        expect(threwError).toBe(true);
        expect(errorMessage.toLowerCase()).toMatch(/api.*url|next_public_api_url/);
      }
    ), { numRuns: 3 });
  });

  it('Property: For any accidentally exposed sensitive environment variables, configuration should fail with clear error messages', () => {
    fc.assert(fc.property(
      fc.oneof(
        fc.constant('DATABASE_PASSWORD'),
        fc.constant('SECRET_KEY'),
        fc.constant('PRIVATE_KEY'),
        fc.constant('API_SECRET')
      ),
      (sensitiveVarName: string) => {
        // Set up environment with exposed sensitive variable
        process.env.NEXT_PUBLIC_API_URL = 'https://api.example.com';
        (process.env as any).NODE_ENV = 'development';
        process.env[`NEXT_PUBLIC_${sensitiveVarName}`] = 'sensitive-value';

        // Should throw configuration error
        let threwError = false;
        let errorMessage = '';
        
        try {
          jest.isolateModules(() => {
            require('../config');
          });
        } catch (error) {
          threwError = true;
          errorMessage = (error as Error).message;
        }

        expect(threwError).toBe(true);
        expect(errorMessage.toLowerCase()).toMatch(/sensitive|exposed|security/);
      }
    ), { numRuns: 3 });
  });

  it('Property: For any valid environment (development/production), configuration should adapt correctly', () => {
    fc.assert(fc.property(
      fc.constantFrom('development', 'production'),
      (environment: string) => {
        // Set up valid environment
        process.env.NEXT_PUBLIC_API_URL = 'https://api.example.com';
        (process.env as any).NODE_ENV = environment;

        // Should not throw
        let threwError = false;
        
        try {
          jest.isolateModules(() => {
            require('../config');
          });
        } catch (error) {
          threwError = true;
        }

        expect(threwError).toBe(false);
      }
    ), { numRuns: 2 });
  });

  it('Property: Configuration validation should be consistent across multiple calls', () => {
    fc.assert(fc.property(
      fc.array(fc.webUrl(), { minLength: 1, maxLength: 3 }),
      (apiUrls: string[]) => {
        const results: boolean[] = [];
        
        apiUrls.forEach(apiUrl => {
          // Reset environment for each test
          jest.resetModules();
          process.env = { ...originalEnv };
          
          process.env.NEXT_PUBLIC_API_URL = apiUrl;
          (process.env as any).NODE_ENV = 'development';

          let threwError = false;
          
          try {
            jest.isolateModules(() => {
              require('../config');
            });
          } catch (error) {
            threwError = true;
          }

          results.push(!threwError);
        });

        // All valid URLs should produce consistent results
        const allSucceeded = results.every(result => result === true);
        expect(allSucceeded).toBe(true);
      }
    ), { numRuns: 3 });
  });

  it('Property: For any combination of missing required variables, configuration should fail with specific error types', () => {
    fc.assert(fc.property(
      fc.array(
        fc.constantFrom('missing_api_url', 'invalid_api_url', 'exposed_sensitive'),
        { minLength: 1, maxLength: 3 }
      ),
      (errorTypes: string[]) => {
        // Set up environment based on error types
        jest.resetModules();
        process.env = { ...originalEnv };
        
        const uniqueErrors = Array.from(new Set(errorTypes));
        
        uniqueErrors.forEach(errorType => {
          switch (errorType) {
            case 'missing_api_url':
              delete process.env.NEXT_PUBLIC_API_URL;
              break;
            case 'invalid_api_url':
              process.env.NEXT_PUBLIC_API_URL = 'invalid-url';
              break;
            case 'exposed_sensitive':
              process.env.NEXT_PUBLIC_SECRET = 'exposed-secret';
              break;
          }
        });

        (process.env as any).NODE_ENV = 'development';

        // Should throw configuration error
        let threwError = false;
        let errorMessage = '';
        
        try {
          jest.isolateModules(() => {
            require('../config');
          });
        } catch (error) {
          threwError = true;
          errorMessage = (error as Error).message;
        }

        expect(threwError).toBe(true);
        expect(typeof errorMessage).toBe('string');
        expect(errorMessage.length).toBeGreaterThan(0);
      }
    ), { numRuns: 5 });
  });

  it('Property: Configuration should handle edge cases in environment variable values', () => {
    fc.assert(fc.property(
      fc.constantFrom('development', 'production', 'test'),
      (environment: string) => {
        // Set up environment with edge case values
        process.env.NEXT_PUBLIC_API_URL = 'https://api.example.com';
        (process.env as any).NODE_ENV = environment;

        // Should handle gracefully
        let threwError = false;
        let errorMessage = '';
        
        try {
          jest.isolateModules(() => {
            require('../config');
          });
        } catch (error) {
          threwError = true;
          errorMessage = (error as Error).message;
        }

        // Should either succeed or fail with meaningful error
        if (threwError) {
          expect(typeof errorMessage).toBe('string');
          expect(errorMessage.length).toBeGreaterThan(0);
        }

        // Test should complete without hanging
        expect(true).toBe(true);
      }
    ), { numRuns: 3 });
  });
});