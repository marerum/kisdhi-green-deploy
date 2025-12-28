/**
 * Error boundary specifically for handling async operation errors
 */

'use client';

import { Component, ReactNode } from 'react';
import { useToastContext } from '@/providers/ToastProvider';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onRetry?: () => Promise<void> | void;
  retryText?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
  isRetrying: boolean;
}

export default class AsyncErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, isRetrying: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, isRetrying: false };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Async error boundary caught an error:', error, errorInfo);
  }

  handleRetry = async () => {
    if (!this.props.onRetry) return;

    this.setState({ isRetrying: true });
    
    try {
      await this.props.onRetry();
      // If retry succeeds, reset error state
      this.setState({ hasError: false, error: undefined, isRetrying: false });
    } catch (error) {
      console.error('Retry failed:', error);
      this.setState({ isRetrying: false });
      // Keep error state, but show toast for retry failure
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex items-center justify-center p-8">
          <div className="text-center max-w-sm">
            <div className="text-yellow-500 text-4xl mb-3">⚠️</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Operation Failed
            </h3>
            <p className="text-gray-600 text-sm mb-4">
              {this.state.error?.message || 'Something went wrong while processing your request.'}
            </p>
            {this.props.onRetry && (
              <button
                onClick={this.handleRetry}
                disabled={this.state.isRetrying}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {this.state.isRetrying ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Retrying...
                  </>
                ) : (
                  this.props.retryText || 'Try Again'
                )}
              </button>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook version for functional components
export function useAsyncErrorHandler() {
  const { showError } = useToastContext();

  const handleAsyncError = (error: unknown, context?: string) => {
    console.error(`Async error${context ? ` in ${context}` : ''}:`, error);
    
    let message = 'An unexpected error occurred';
    
    if (error instanceof Error) {
      message = error.message;
    } else if (typeof error === 'string') {
      message = error;
    }

    if (context) {
      message = `${context}: ${message}`;
    }

    showError(message);
  };

  return { handleAsyncError };
}