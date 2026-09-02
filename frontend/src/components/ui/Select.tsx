import { forwardRef, type SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../utils/cn';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  placeholder?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, placeholder, error, className, id, ...rest }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={selectId} className="block font-bold text-slate-700 dark:text-slate-300 text-xs mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            id={selectId}
            ref={ref}
            className={cn(
              'w-full px-3 py-2 border rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-200 transition-all appearance-none pr-8',
              'focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600',
              'bg-white dark:bg-slate-800',
              error ? 'border-rose-400' : 'border-slate-200',
              className
            )}
            aria-invalid={error ? true : undefined}
            {...rest}
          >
            {placeholder && <option value="">{placeholder}</option>}
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
            <ChevronDown className="w-4 h-4" />
          </span>
        </div>
        {error && <p className="text-[11px] font-semibold text-rose-600 mt-1">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
