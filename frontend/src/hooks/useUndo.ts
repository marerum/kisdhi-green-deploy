/**
 * Custom hook for managing undo functionality
 * Tracks the most recent operation and provides undo capability
 */

'use client';

import { useState, useCallback } from 'react';

export interface UndoOperation {
  type: 'update' | 'delete' | 'add' | 'reorder';
  description: string;
  undo: () => Promise<void>;
}

export function useUndo() {
  const [lastOperation, setLastOperation] = useState<UndoOperation | null>(null);
  const [isUndoing, setIsUndoing] = useState(false);

  const recordOperation = useCallback((operation: UndoOperation) => {
    setLastOperation(operation);
  }, []);

  const performUndo = useCallback(async () => {
    if (!lastOperation || isUndoing) {
      return;
    }

    setIsUndoing(true);
    try {
      await lastOperation.undo();
      setLastOperation(null);
    } catch (error) {
      console.error('Failed to undo operation:', error);
      throw error;
    } finally {
      setIsUndoing(false);
    }
  }, [lastOperation, isUndoing]);

  const clearUndo = useCallback(() => {
    setLastOperation(null);
  }, []);

  return {
    lastOperation,
    isUndoing,
    recordOperation,
    performUndo,
    clearUndo,
    canUndo: !!lastOperation && !isUndoing,
  };
}