/**
 * Unit tests for ErrorBoundary component
 * Tests error boundary functionality, retry mechanisms, and user feedback
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ErrorBoundary from '../ErrorBoundary';

// Mock console methods to avoid noise in tests
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
});

// Component that throws an error for testing
const ThrowError = ({ shouldThrow = false, errorMessage = 'Test error' }: { shouldThrow?: boolean; errorMessage?: string }) => {
  if (shouldThrow) {
    throw new Error(errorMessage);
  }
  return <div>No error</div>;
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Normal Operation', () => {
    it('should render children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <div>Test content</div>
        </ErrorBoundary>
      );

      expect(screen.getByText('Test content')).toBeInTheDocument();
    });

    it('should not show error UI when children render successfully', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByText('No error')).toBeInTheDocument();
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should catch and display error when child component throws', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="Component crashed" />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('Component crashed')).toBeInTheDocument();
      expect(screen.getByText('⚠️')).toBeInTheDocument();
    });

    it('should display default error message when error has no message', () => {
      const ErrorWithoutMessage = () => {
        throw new Error();
      };

      render(
        <ErrorBoundary>
          <ErrorWithoutMessage />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('An unexpected error occurred')).toBeInTheDocument();
    });

    it('should call onError callback when error occurs', () => {
      const onError = jest.fn();
      
      render(
        <ErrorBoundary onError={onError}>
          <ThrowError shouldThrow={true} errorMessage="Callback test error" />
        </ErrorBoundary>
      );

      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.any(String)
        })
      );
    });

    it('should log error details to console', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="Console log test" />
        </ErrorBoundary>
      );

      expect(console.error).toHaveBeenCalledWith(
        'Error boundary caught an error:',
        expect.any(Error),
        expect.any(Object)
      );
    });
  });

  describe('Custom Fallback', () => {
    it('should render custom fallback when provided', () => {
      const customFallback = <div>Custom error message</div>;

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Custom error message')).toBeInTheDocument();
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    });

    it('should use default fallback when custom fallback is not provided', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });
  });

  describe('Retry Functionality', () => {
    it('should show retry button by default', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });

    it('should hide retry button when showRetry is false', () => {
      render(
        <ErrorBoundary showRetry={false}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /refresh page/i })).toBeInTheDocument();
    });

    it('should reset error state when retry button is clicked', () => {
      const TestComponent = () => {
        const [shouldThrow, setShouldThrow] = React.useState(true);
        
        React.useEffect(() => {
          // After first render, set shouldThrow to false to simulate fix
          const timer = setTimeout(() => setShouldThrow(false), 100);
          return () => clearTimeout(timer);
        }, []);

        return <ThrowError shouldThrow={shouldThrow} />;
      };

      render(
        <ErrorBoundary>
          <TestComponent />
        </ErrorBoundary>
      );

      // Should show error initially
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();

      // Click retry button
      fireEvent.click(screen.getByRole('button', { name: /try again/i }));

      // Should show success after retry
      waitFor(() => {
        expect(screen.getByText('No error')).toBeInTheDocument();
      });
    });

    it('should track retry count and show retry attempts', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Click retry button
      fireEvent.click(screen.getByRole('button', { name: /try again/i }));

      // Should show retry attempt count (need to wait for state update)
      waitFor(() => {
        expect(screen.getByText('Retry attempt 1 of 3')).toBeInTheDocument();
      });
    });

    it('should disable retry button after max retries', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Click retry button 3 times (max retries)
      const retryButton = screen.getByRole('button', { name: /try again/i });
      fireEvent.click(retryButton);
      fireEvent.click(retryButton);
      fireEvent.click(retryButton);

      // After max attempts, retry button should be gone
      waitFor(() => {
        expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
        expect(screen.getByText('Retry attempt 3 of 3')).toBeInTheDocument();
      });
    });
  });

  describe('Refresh Functionality', () => {
    it('should show refresh page button', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByRole('button', { name: /refresh page/i })).toBeInTheDocument();
    });

    it('should call onRefresh callback when refresh button is clicked', () => {
      const mockRefresh = jest.fn();

      render(
        <ErrorBoundary onRefresh={mockRefresh}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      fireEvent.click(screen.getByRole('button', { name: /refresh page/i }));

      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  describe('Development Mode', () => {
    const originalNodeEnv = process.env.NODE_ENV;

    afterEach(() => {
      // Restore original NODE_ENV using Object.defineProperty
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: originalNodeEnv,
        writable: true,
        configurable: true
      });
    });

    it('should show error details in development mode', () => {
      // Set NODE_ENV using Object.defineProperty
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'development',
        writable: true,
        configurable: true
      });

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="Dev mode error" />
        </ErrorBoundary>
      );

      expect(screen.getByText('Error Details (Development)')).toBeInTheDocument();
    });

    it('should hide error details in production mode', () => {
      // Set NODE_ENV using Object.defineProperty
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'production',
        writable: true,
        configurable: true
      });

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="Prod mode error" />
        </ErrorBoundary>
      );

      expect(screen.queryByText('Error Details (Development)')).not.toBeInTheDocument();
    });

    it('should show error stack trace in development mode', () => {
      // Set NODE_ENV using Object.defineProperty
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'development',
        writable: true,
        configurable: true
      });

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="Stack trace test" />
        </ErrorBoundary>
      );

      // Click to expand error details
      fireEvent.click(screen.getByText('Error Details (Development)'));

      // Should show stack trace
      expect(screen.getByText(/Error: Stack trace test/)).toBeInTheDocument();
    });
  });

  describe('Error State Management', () => {
    it('should maintain error state until retry or refresh', () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();

      // Re-render with same error
      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Should still show error
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('should reset error state when component is unmounted and remounted', () => {
      const { unmount } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();

      unmount();

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByText('No error')).toBeInTheDocument();
    });
  });
});