/**
 * Error boundary component for handling React errors gracefully
 */

'use client';

import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: any) => void;
  onRefresh?: () => void;
  showRetry?: boolean;
}

interface State {
  hasError: boolean;
  error?: Error;
  retryCount: number;
}

export default class ErrorBoundary extends Component<Props, State> {
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, retryCount: 0 };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, retryCount: 0 };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Error boundary caught an error:', error, errorInfo);
    
    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
    
    // Log error details for debugging
    console.error('Component stack:', errorInfo.componentStack);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
  }

  handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: undefined,
        retryCount: prevState.retryCount + 1,
      }));
    }
  };

  handleRefresh = () => {
    if (this.props.onRefresh) {
      this.props.onRefresh();
    } else {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const canRetry = this.props.showRetry !== false && this.state.retryCount < this.maxRetries;
      const errorMessage = this.state.error?.message || '予期しないエラーが発生しました';

      return (
        <div className="min-h-64 flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              問題が発生しました
            </h2>
            <p className="text-gray-600 mb-4">
              {errorMessage}
            </p>
            {this.state.retryCount > 0 && (
              <p className="text-sm text-gray-500 mb-4">
                再試行 {this.state.retryCount} / {this.maxRetries}
              </p>
            )}
            <div className="space-x-3">
              {canRetry && (
                <button
                  onClick={this.handleRetry}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  再試行
                </button>
              )}
              <button
                onClick={this.handleRefresh}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                ページを更新
              </button>
            </div>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                  エラー詳細（開発環境）
                </summary>
                <pre className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded overflow-auto">
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}