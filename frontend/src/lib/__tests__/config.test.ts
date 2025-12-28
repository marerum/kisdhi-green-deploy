/**
 * Tests for frontend configuration validation
 */

import { ConfigurationError } from '../config';

// Mock process.env for testing
const originalEnv = process.env;

describe('Frontend Configuration Validation', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should validate valid configuration', () => {
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:8000';
    (process.env as any).NODE_ENV = 'development';

    // Re-import to trigger validation
    expect(() => {
      jest.isolateModules(() => {
        require('../config');
      });
    }).not.toThrow();
  });

  it('should throw error for missing API URL', () => {
    delete process.env.NEXT_PUBLIC_API_URL;

    expect(() => {
      jest.isolateModules(() => {
        require('../config');
      });
    }).toThrow('NEXT_PUBLIC_API_URL is required for API communication');
  });

  it('should throw error for invalid API URL format', () => {
    process.env.NEXT_PUBLIC_API_URL = 'invalid-url';

    expect(() => {
      jest.isolateModules(() => {
        require('../config');
      });
    }).toThrow('NEXT_PUBLIC_API_URL must be a valid HTTP/HTTPS URL');
  });

  it('should warn about HTTP in production', () => {
    process.env.NEXT_PUBLIC_API_URL = 'http://api.example.com';
    (process.env as any).NODE_ENV = 'production';

    expect(() => {
      jest.isolateModules(() => {
        require('../config');
      });
    }).toThrow('NEXT_PUBLIC_API_URL should use HTTPS in production environment');
  });

  it('should detect accidentally exposed sensitive variables', () => {
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:8000';
    process.env.NEXT_PUBLIC_OPENAI_API_KEY = 'sk-test123';

    expect(() => {
      jest.isolateModules(() => {
        require('../config');
      });
    }).toThrow('Sensitive environment variables should not be exposed to frontend: OPENAI_API_KEY');
  });

  it('should provide safe config summary', () => {
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:8000';
    (process.env as any).NODE_ENV = 'development';

    jest.isolateModules(() => {
      const { getSafeConfigSummary } = require('../config');
      const summary = getSafeConfigSummary();

      expect(summary).toHaveProperty('apiUrl', 'http://localhost:8000');
      expect(summary).toHaveProperty('environment', 'development');
      expect(summary).toHaveProperty('hasApiUrl', true);
    });
  });
});