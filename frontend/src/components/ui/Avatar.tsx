import { useMemo } from 'react';
import { cn } from '../../utils/cn';
import { getInitials } from '../../utils/format';

interface AvatarProps {
  name: string;
  src?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASSES = {
  sm: 'w-9 h-9 text-[11px] rounded-xl',
  md: 'w-10 h-10 text-sm rounded-xl',
  lg: 'w-16 h-16 text-lg rounded-2xl',
};

const GRADIENTS = [
  'from-blue-500 to-indigo-500',
  'from-emerald-500 to-teal-500',
  'from-amber-500 to-orange-500',
  'from-rose-500 to-pink-500',
  'from-violet-500 to-purple-500',
  'from-cyan-500 to-sky-500',
];

export function Avatar({ name, src, size = 'sm', className }: AvatarProps) {
  const initials = useMemo(() => getInitials(name), [name]);
  const gradient = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
    return GRADIENTS[hash % GRADIENTS.length];
  }, [name]);

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        loading="lazy"
        className={cn('object-cover border border-slate-200 dark:border-slate-700 shrink-0', SIZE_CLASSES[size], className)}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={cn(
        'shrink-0 inline-flex items-center justify-center font-bold text-white bg-gradient-to-tr shadow-sm',
        gradient,
        SIZE_CLASSES[size],
        className
      )}
    >
      {initials || '?'}
    </span>
  );
}
