import { memo } from 'react';
import { Users, UploadCloud, UserCheck, Clock, CheckCircle2, TrendingUp, TrendingDown } from 'lucide-react';
import { motion } from 'framer-motion';
import type { MetricStat } from '../types/candidate';
import { Card } from './ui/Card';

interface StatsCardProps {
  stats: MetricStat[];
  loading?: boolean;
}

const iconMap = {
  Users,
  UploadCloud,
  UserCheck,
  Clock,
  CheckCircle2,
} as const;

const colorStyles: Record<MetricStat['color'], { bgIcon: string; textIcon: string; bar: string }> = {
  blue: { bgIcon: 'bg-blue-50', textIcon: 'text-blue-600', bar: 'bg-blue-600' },
  emerald: { bgIcon: 'bg-emerald-50', textIcon: 'text-emerald-600', bar: 'bg-emerald-500' },
  indigo: { bgIcon: 'bg-indigo-50', textIcon: 'text-indigo-600', bar: 'bg-indigo-600' },
  amber: { bgIcon: 'bg-amber-50', textIcon: 'text-amber-600', bar: 'bg-amber-500' },
  rose: { bgIcon: 'bg-rose-50', textIcon: 'text-rose-600', bar: 'bg-rose-500' },
};

export const StatsCard = memo(function StatsCard({ stats, loading = false }: StatsCardProps) {
  if (loading && stats.length === 0) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4" aria-label="Loading statistics">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700 p-4 animate-pulse">
            <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-700" />
            <div className="mt-4 h-7 w-20 bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="mt-2 h-3 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="mt-3 h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {stats.map((stat, index) => {
        const Icon = iconMap[stat.iconName as keyof typeof iconMap] ?? Users;
        const style = colorStyles[stat.color] ?? colorStyles.blue;
        const TrendIcon = stat.isPositive ? TrendingUp : TrendingDown;
        const trendClass = stat.isPositive ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : 'text-rose-600 bg-rose-50 border-rose-100';

        return (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            whileHover={{ y: -3, transition: { duration: 0.2 } }}
          >
            <Card hover className="p-4">
              <div className="flex items-center justify-between">
                <span className={`w-10 h-10 rounded-xl ${style.bgIcon} dark:bg-slate-700 ${style.textIcon} flex items-center justify-center`}>
                  <Icon className="w-5 h-5" aria-hidden="true" />
                </span>
                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${trendClass}`}
                  aria-label={`${stat.change} ${stat.isPositive ? 'increase' : 'decrease'}`}
                >
                  <TrendIcon className="w-3 h-3" />
                  {stat.change}
                </span>
              </div>

              <div className="mt-3">
                <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{stat.value}</p>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">{stat.title}</p>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-700 flex items-center gap-2">
                <div className="flex-1 bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${stat.progress}%` }}
                    transition={{ duration: 0.8, delay: 0.2 + index * 0.1 }}
                    className={`h-full rounded-full ${style.bar}`}
                  />
                </div>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">{stat.progress}%</span>
              </div>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
});
