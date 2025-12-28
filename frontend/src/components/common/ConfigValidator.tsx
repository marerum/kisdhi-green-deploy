'use client';

import { useEffect } from 'react';
import { validateStartup, validateNoSensitiveDataExposed } from '@/lib/startup-validation';

/**
 * Configuration validator component
 * Runs startup validation checks on the client side
 */
export default function ConfigValidator({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    try {
      validateStartup();
      validateNoSensitiveDataExposed();
    } catch (error) {
      // Configuration errors are already logged in the validation functions
      // In a production app, you might want to show a user-friendly error page
      console.error('Configuration validation failed:', error);
    }
  }, []);

  return <>{children}</>;
}