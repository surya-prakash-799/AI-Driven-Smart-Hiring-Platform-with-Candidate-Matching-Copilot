import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ToastContainer } from '../components/ToastContainer';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
  description?: string;
}

interface ToastContextValue {
  toast: (type: ToastType, message: string, description?: string) => void;
  success: (message: string, description?: string) => void;
  error: (message: string, description?: string) => void;
  info: (message: string, description?: string) => void;
  warning: (message: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_DURATION_MS = 5000;
const MAX_VISIBLE_TOASTS = 4;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (type: ToastType, message: string, description?: string) => {
      const id = ++idRef.current;
      setToasts((prev) => {
        const next = [...prev, { id, type, message, description }];
        return next.slice(-MAX_VISIBLE_TOASTS);
      });
      window.setTimeout(() => remove(id), TOAST_DURATION_MS);
    },
    [remove]
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      toast: push,
      success: (message, description) => push('success', message, description),
      error: (message, description) => push('error', message, description),
      info: (message, description) => push('info', message, description),
      warning: (message, description) => push('warning', message, description),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={remove} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
