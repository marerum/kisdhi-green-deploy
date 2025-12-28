/**
 * Custom hook for automatic saving functionality
 * Provides debounced saving with loading states and error handling
 */

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

interface UseAutoSaveOptions<T> {
  saveFunction: (data: T) => Promise<void>;
  delay?: number;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

interface UseAutoSaveReturn {
  save: (data: any) => void;
  isLoading: boolean;
  error: Error | null;
  lastSaved: Date | null;
}

export function useAutoSave<T>({
  saveFunction,
  delay = 1000,
  onSuccess,
  onError,
}: UseAutoSaveOptions<T>): UseAutoSaveReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingDataRef = useRef<T | null>(null);

  const performSave = useCallback(async (data: T) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await saveFunction(data);
      setLastSaved(new Date());
      onSuccess?.();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Save failed');
      setError(error);
      onError?.(error);
    } finally {
      setIsLoading(false);
    }
  }, [saveFunction, onSuccess, onError]);

  const save = useCallback((data: T) => {
    pendingDataRef.current = data;
    
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Set new timeout for debounced save
    timeoutRef.current = setTimeout(() => {
      if (pendingDataRef.current) {
        performSave(pendingDataRef.current);
        pendingDataRef.current = null;
      }
    }, delay);
  }, [performSave, delay]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    save,
    isLoading,
    error,
    lastSaved,
  };
}

export default useAutoSave;