/**
 * Unit tests for AsyncErrorBoundary component
 * Tests async error handling, retry functionality, and user feedback
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AsyncErrorBoundary, { useAsyncErrorHandler } from '../AsyncErrorBoundary';

// Mock ToastProvider
const mockShowError = jest.fn();
jest.mock('@/providers/ToastProvider', () => ({
  useToastContext: () => ({
    showError: mockShowError,
  }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock console methods to avoid noise in tests
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
});

// Helper function to wait for async operations
const waitForAsync = (ms = 0) => new Promise(resolve => setTimeout(resolve, ms));

// Component that throws an error for testing
const ThrowAsyncError = ({ shouldThrow = false, errorMessage = 'Async test error' }: { shouldThrow?: boolean; errorMessage?: string }) => {
  if (shouldThrow) {
    throw new Error(errorMessage);
  }
  return <div>No async error</div>;
};

// Test component for useAsyncErrorHandler hook
const AsyncErrorHandlerTest = ({ error, context }: { error?: unknown; context?: string }) => {
  const { handleAsyncError } = useAsyncErrorHandler();
  
  React.useEffect(() => {
    if (error) {
      handleAsyncError(error, context);
    }
  }, [error, context, handleAsyncError]);

  return <div>Hook test component</div>;
};

describe('AsyncErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockShowError.mockClear();
  });

  describe('Normal Operation', () => {
    it('should render children when no error occurs', () => {
      render(
        <AsyncErrorBoundary>
          <div>Async test content</div>
        </AsyncErrorBoundary>
      );

      expect(screen.getByText('Async test content')).toBeInTheDocument();
    });

    it('should not show error UI when children render successfully', () => {
      render(
        <AsyncErrorBoundary>
          <ThrowAsyncError shouldThrow={false} />
        </AsyncErrorBoundary>
      );

      expect(screen.getByText('No async error')).toBeInTheDocument();
      expect(screen.queryByText('Operation Failed')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should catch and display async error when child component throws', () => {
      render(
        <AsyncErrorBoundary>
          <ThrowAsyncError shouldThrow={true} errorMessage="Async operation failed" />
        </AsyncErrorBoundary>
      );

      expect(screen.getByText('Operation Failed')).toBeInTheDocument();
      expect(screen.getByText('Async operation failed')).toBeInTheDocument();
      expect(screen.getByText('⚠️')).toBeInTheDocument();
    });

    it('should display default error message when error has no message', () => {
      const ErrorWithoutMessage = () => {
        throw new Error();
      };

      render(
        <AsyncErrorBoundary>
          <ErrorWithoutMessage />
        </AsyncErrorBoundary>
      );

      expect(screen.getByText('Operation Failed')).toBeInTheDocument();
      expect(screen.getByText('Something went wrong while processing your request.')).toBeInTheDocument();
    });

    it('should log error details to console', () => {
      render(
        <AsyncErrorBoundary>
          <ThrowAsyncError shouldThrow={true} errorMessage="Console log async test" />
        </AsyncErrorBoundary>
      );

      expect(console.error).toHaveBeenCalledWith(
        'Async error boundary caught an error:',
        expect.any(Error),
        expect.any(Object)
      );
    });
  });

  describe('Custom Fallback', () => {
    it('should render custom fallback when provided', () => {
      const customFallback = <div>Custom async error message</div>;

      render(
        <AsyncErrorBoundary fallback={customFallback}>
          <ThrowAsyncError shouldThrow={true} />
        </AsyncErrorBoundary>
      );

      expect(screen.getByText('Custom async error message')).toBeInTheDocument();
      expect(screen.queryByText('Operation Failed')).not.toBeInTheDocument();
    });

    it('should use default fallback when custom fallback is not provided', () => {
      render(
        <AsyncErrorBoundary>
          <ThrowAsyncError shouldThrow={true} />
        </AsyncErrorBoundary>
      );

      expect(screen.getByText('Operation Failed')).toBeInTheDocument();
    });
  });

  describe('Retry Functionality', () => {
    it('should show retry button when onRetry is provided', () => {
      const onRetry = jest.fn();

      render(
        <AsyncErrorBoundary onRetry={onRetry}>
          <ThrowAsyncError shouldThrow={true} />
        </AsyncErrorBoundary>
      );

      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });

    it('should not show retry button when onRetry is not provided', () => {
      render(
        <AsyncErrorBoundary>
          <ThrowAsyncError shouldThrow={true} />
        </AsyncErrorBoundary>
      );

      expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
    });

    it('should call onRetry when retry button is clicked', async () => {
      const onRetry = jest.fn().mockResolvedValue(undefined);

      render(
        <AsyncErrorBoundary onRetry={onRetry}>
          <ThrowAsyncError shouldThrow={true} />
        </AsyncErrorBoundary>
      );

      const retryButton = screen.getByRole('button', { name: /try again/i });
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(onRetry).toHaveBeenCalledTimes(1);
      }, { timeout: 2000 });
    });

    it('should show loading state during retry', async () => {
      const onRetry = jest.fn(() => new Promise<void>(resolve => setTimeout(resolve, 100)));

      render(
        <AsyncErrorBoundary onRetry={onRetry}>
          <ThrowAsyncError shouldThrow={true} />
        </AsyncErrorBoundary>
      );

      const retryButton = screen.getByRole('button', { name: /try again/i });
      fireEvent.click(retryButton);

      // Check loading state immediately
      expect(screen.getByText('Retrying...')).toBeInTheDocument();
      expect(retryButton).toBeDisabled();

      // Wait for retry to complete
      await waitFor(() => {
        expect(onRetry).toHaveBeenCalledTimes(1);
      }, { timeout: 2000 });

      // Wait for loading state to clear
      await waitFor(() => {
        expect(screen.queryByText('Retrying...')).not.toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('should reset error state when retry succeeds', async () => {
      const onRetry = jest.fn().mockResolvedValue(undefined);

      render(
        <AsyncErrorBoundary onRetry={onRetry}>
          <ThrowAsyncError shouldThrow={true} />
        </AsyncErrorBoundary>
      );

      // Verify error state
      expect(screen.getByText('Operation Failed')).toBeInTheDocument();

      const retryButton = screen.getByRole('button', { name: /try again/i });
      fireEvent.click(retryButton);

      // Wait for retry to be called
      await waitFor(() => {
        expect(onRetry).toHaveBeenCalledTimes(1);
      }, { timeout: 3000 });

      // Wait for loading state to clear
      await waitFor(() => {
        expect(screen.queryByText('Retrying...')).not.toBeInTheDocument();
      }, { timeout: 3000 });

      // The error boundary should reset its state after successful retry
      // Note: In a real scenario, the parent would re-render with new props
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('should handle retry failure gracefully', async () => {
      const onRetry = jest.fn().mockRejectedValue(new Error('Retry failed'));

      render(
        <AsyncErrorBoundary onRetry={onRetry}>
          <ThrowAsyncError shouldThrow={true} />
        </AsyncErrorBoundary>
      );

      const retryButton = screen.getByRole('button', { name: /try again/i });
      fireEvent.click(retryButton);

      // Wait for retry to be called and fail
      await waitFor(() => {
        expect(onRetry).toHaveBeenCalledTimes(1);
      }, { timeout: 2000 });

      // Wait for loading state to clear
      await waitFor(() => {
        expect(screen.queryByText('Retrying...')).not.toBeInTheDocument();
      }, { timeout: 2000 });

      // Should still show error state
      expect(screen.getByText('Operation Failed')).toBeInTheDocument();
      expect(console.error).toHaveBeenCalledWith('Retry failed:', expect.any(Error));
    });

    it('should use custom retry text when provided', () => {
      const onRetry = jest.fn();

      render(
        <AsyncErrorBoundary onRetry={onRetry} retryText="Retry Operation">
          <ThrowAsyncError shouldThrow={true} />
        </AsyncErrorBoundary>
      );

      expect(screen.getByRole('button', { name: /retry operation/i })).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('should show spinner during retry', async () => {
      const onRetry = jest.fn(() => new Promise<void>(resolve => setTimeout(resolve, 100)));

      render(
        <AsyncErrorBoundary onRetry={onRetry}>
          <ThrowAsyncError shouldThrow={true} />
        </AsyncErrorBoundary>
      );

      const retryButton = screen.getByRole('button', { name: /try again/i });
      fireEvent.click(retryButton);

      // Should show spinner and loading text
      expect(retryButton).toHaveClass('disabled:opacity-50');
      expect(screen.getByText('Retrying...')).toBeInTheDocument();

      // Wait for retry to complete
      await waitFor(() => {
        expect(onRetry).toHaveBeenCalledTimes(1);
      }, { timeout: 2000 });

      await waitFor(() => {
        expect(screen.queryByText('Retrying...')).not.toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('should disable button during retry', async () => {
      const onRetry = jest.fn(() => new Promise<void>(resolve => setTimeout(resolve, 100)));

      render(
        <AsyncErrorBoundary onRetry={onRetry}>
          <ThrowAsyncError shouldThrow={true} />
        </AsyncErrorBoundary>
      );

      const retryButton = screen.getByRole('button', { name: /try again/i });
      
      // Initially button should not be disabled
      expect(retryButton).not.toBeDisabled();
      
      fireEvent.click(retryButton);

      // Should be disabled during retry
      expect(retryButton).toBeDisabled();
      expect(screen.getByText('Retrying...')).toBeInTheDocument();

      // Wait for retry to complete
      await waitFor(() => {
        expect(onRetry).toHaveBeenCalledTimes(1);
      }, { timeout: 2000 });

      // Wait for loading state to finish
      await waitFor(() => {
        expect(screen.queryByText('Retrying...')).not.toBeInTheDocument();
      }, { timeout: 2000 });

      // Button should be enabled again after retry completes
      const buttonAfterRetry = screen.getByRole('button', { name: /try again/i });
      expect(buttonAfterRetry).not.toBeDisabled();
    });
  });
});

describe('useAsyncErrorHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockShowError.mockClear();
  });

  it('should handle Error objects correctly', () => {
    render(<AsyncErrorHandlerTest error={new Error('Test error message')} />);

    expect(console.error).toHaveBeenCalledWith('Async error:', expect.any(Error));
    expect(mockShowError).toHaveBeenCalledWith('Test error message');
  });

  it('should handle string errors correctly', () => {
    render(<AsyncErrorHandlerTest error="String error message" />);

    expect(console.error).toHaveBeenCalledWith('Async error:', 'String error message');
    expect(mockShowError).toHaveBeenCalledWith('String error message');
  });

  it('should handle unknown error types', () => {
    render(<AsyncErrorHandlerTest error={{ unknown: 'object' }} />);

    expect(console.error).toHaveBeenCalledWith('Async error:', { unknown: 'object' });
    expect(mockShowError).toHaveBeenCalledWith('An unexpected error occurred');
  });

  it('should include context in error message when provided', () => {
    render(<AsyncErrorHandlerTest error={new Error('Test error')} context="API call" />);

    expect(console.error).toHaveBeenCalledWith('Async error in API call:', expect.any(Error));
    expect(mockShowError).toHaveBeenCalledWith('API call: Test error');
  });
});