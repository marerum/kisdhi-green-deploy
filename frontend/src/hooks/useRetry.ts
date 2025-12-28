/**
 * Custom hook for handling retry logic with exponential backoff
 */

'use client';

import { useState, useCallback } from 'react';
import { useToastContext } from '@/providers/ToastProvider';

interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  onError?: (error: Error, attempt: number) => void;
  onSuccess?: () => void;
}

interface RetryState {
  isRetrying: boolean;
  retryCount: number;
  lastError?: Error;
}

export function useRetry(options: RetryOptions = {}) {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffFactor = 2,
    onError,
    onSuccess,
  } = options;

  const { showError, showSuccess } = useToastContext();
  const [retryState, setRetryState] = useState<RetryState>({
    isRetrying: false,
    retryCount: 0,
  });

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const calculateDelay = (attempt: number) => {
    const delayMs = Math.min(initialDelay * Math.pow(backoffFactor, attempt), maxDelay);
    return delayMs;
  };

  const executeWithRetry = useCallback(async <T>(
    operation: () => Promise<T>,
    context?: string
  ): Promise<T> => {
    let lastError: Error | undefined;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        setRetryState(prev => ({
          ...prev,
          isRetrying: attempt > 0,
          retryCount: attempt,
        }));

        const result = await operation();
        
        // Success
        setRetryState({
          isRetrying: false,
          retryCount: 0,
        });
        
        if (attempt > 0) {
          showSuccess('Operation completed successfully');
        }
        
        onSuccess?.();
        return result;
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        console.error(`Attempt ${attempt + 1} failed:`, lastError);
        onError?.(lastError, attempt + 1);
        
        // If this was the last attempt, don't delay
        if (attempt === maxRetries) {
          break;
        }
        
        // Wait before retrying
        const delayMs = calculateDelay(attempt);
        await delay(delayMs);
      }
    }
    
    // All retries failed
    const finalError = lastError || new Error('Operation failed after all retry attempts');
    
    setRetryState({
      isRetrying: false,
      retryCount: maxRetries,
      lastError: finalError,
    });
    
    const errorMessage = context 
      ? `${context} failed after ${maxRetries + 1} attempts: ${finalError.message}`
      : `Operation failed after ${maxRetries + 1} attempts: ${finalError.message}`;
    
    showError(errorMessage);
    throw finalError;
  }, [maxRetries, initialDelay, maxDelay, backoffFactor, onError, onSuccess, showError, showSuccess]);

  const reset = useCallback(() => {
    setRetryState({
      isRetrying: false,
      retryCount: 0,
    });
  }, []);

  return {
    executeWithRetry,
    reset,
    ...retryState,
  };
}

export default useRetry;