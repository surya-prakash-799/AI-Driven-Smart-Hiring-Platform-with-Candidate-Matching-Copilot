import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftIcon, rightIcon, className, id, ...rest }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block font-bold text-slate-700 dark:text-slate-300 text-xs mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{leftIcon}</span>
          )}
          <input
            id={inputId}
            ref={ref}
            className={cn(
              'w-full px-3 py-2 border rounded-xl text-sm text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 transition-all',
              'focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600',
              leftIcon && 'pl-9',
              rightIcon && 'pr-10',
              error ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800',
              className
            )}
            aria-invalid={error ? true : undefined}
            {...rest}
          />
          {rightIcon && (
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400">{rightIcon}</span>
          )}
        </div>
        {error && <p className="text-[11px] font-semibold text-rose-600 mt-1">{error}</p>}
        {hint && !error && <p className="text-[11px] text-slate-400 mt-1">{hint}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
