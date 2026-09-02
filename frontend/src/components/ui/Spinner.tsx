import { cn } from '../../utils/cn';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASSES = {
  sm: 'w-4 h-4 border-2',
  md: 'w-7 h-7 border-2',
  lg: 'w-10 h-10 border-[3px]',
};

export function Spinner({ size = 'md', className }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        'inline-block rounded-full border-current border-t-transparent animate-spin',
        SIZE_CLASSES[size],
        className
      )}
    />
  );
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center py-24" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-3">
        <Spinner size="lg" className="text-blue-600" />
        <p className="text-sm font-semibold text-slate-400 dark:text-slate-500">Loading...</p>
      </div>
    </div>
  );
}
