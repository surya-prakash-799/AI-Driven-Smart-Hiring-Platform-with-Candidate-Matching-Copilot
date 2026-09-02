import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import type { ToastItem, ToastType } from '../context/ToastContext';

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
}

const TOAST_CONFIG: Record<
  ToastType,
  { icon: typeof Info; iconClass: string; barClass: string }
> = {
  success: { icon: CheckCircle2, iconClass: 'text-emerald-500', barClass: 'bg-emerald-500' },
  error: { icon: AlertCircle, iconClass: 'text-rose-500', barClass: 'bg-rose-500' },
  info: { icon: Info, iconClass: 'text-blue-500', barClass: 'bg-blue-500' },
  warning: { icon: AlertTriangle, iconClass: 'text-amber-500', barClass: 'bg-amber-500' },
};

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="fixed top-4 right-4 z-[100] flex flex-col gap-2.5 w-[calc(100vw-2rem)] max-w-sm"
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => {
          const config = TOAST_CONFIG[toast.type];
          const Icon = config.icon;
          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: -16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ duration: 0.2 }}
              role="status"
              className="relative overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl rounded-xl flex items-start gap-3 p-3.5"
            >
              <span className={`absolute left-0 top-0 bottom-0 w-1 ${config.barClass}`} />
              <span className={`mt-0.5 ${config.iconClass}`}>
                <Icon className="w-5 h-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-900 dark:text-white leading-snug">{toast.message}</p>
                {toast.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">{toast.description}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => onDismiss(toast.id)}
                aria-label="Dismiss notification"
                className="shrink-0 text-slate-400 hover:text-slate-700 dark:hover:text-white p-0.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
