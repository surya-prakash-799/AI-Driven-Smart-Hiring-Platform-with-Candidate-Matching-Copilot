import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';
import { cn } from '../../utils/cn';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('px-6 py-12 text-center', className)}>
      <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-3 text-slate-300 dark:text-slate-600">
        {icon ?? <Inbox className="w-7 h-7" />}
      </div>
      <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{title}</p>
      {description && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{description}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
