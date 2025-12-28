/**
 * Toast provider for managing global toast notifications
 */

'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useToast } from '@/hooks/useToast';
import Toast from '@/components/common/Toast';

interface ToastContextType {
  showToast: (toast: { message: string; type?: 'success' | 'error' | 'info'; duration?: number }) => void;
  showSuccess: (message: string, duration?: number) => void;
  showError: (message: string, duration?: number) => void;
  showInfo: (message: string, duration?: number) => void;
  clearToasts: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToastContext() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToastContext must be used within a ToastProvider');
  }
  return context;
}

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const { toasts, showToast, showSuccess, showError, showInfo, clearToasts } = useToast();

  return (
    <ToastContext.Provider value={{ showToast, showSuccess, showError, showInfo, clearToasts }}>
      {children}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <Toast key={toast.id} {...toast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// Re-export the hook with the context name for consistency
export { useToastContext as useToast };