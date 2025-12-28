/**
 * Custom hook for managing toast notifications
 */

'use client';

import { useState, useCallback } from 'react';
import { ToastProps } from '@/components/common/Toast';

interface ToastItem extends ToastProps {
  id: string;
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((toast: Omit<ToastProps, 'onClose'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: ToastItem = {
      ...toast,
      id,
      onClose: () => {
        setToasts(prev => prev.filter(t => t.id !== id));
      },
    };

    setToasts(prev => [...prev, newToast]);
  }, []);

  const showSuccess = useCallback((message: string, duration?: number) => {
    showToast({ message, type: 'success', duration });
  }, [showToast]);

  const showError = useCallback((message: string, duration?: number) => {
    showToast({ message, type: 'error', duration });
  }, [showToast]);

  const showInfo = useCallback((message: string, duration?: number) => {
    showToast({ message, type: 'info', duration });
  }, [showToast]);

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  return {
    toasts,
    showToast,
    showSuccess,
    showError,
    showInfo,
    clearToasts,
  };
}

export default useToast;