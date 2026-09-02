import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ hover = false, className, children, ...rest }, ref) => (
    <div
      ref={ref}
      className={cn(
        'bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-subtle',
        hover && 'transition-all hover:shadow-card',
        className
      )}
      {...rest}
    >
      {children}
    </div>
  )
);

Card.displayName = 'Card';
