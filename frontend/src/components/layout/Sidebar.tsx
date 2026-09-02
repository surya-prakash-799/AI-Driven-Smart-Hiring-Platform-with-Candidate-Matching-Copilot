import { NavLink } from 'react-router-dom';
import { Briefcase, LayoutDashboard, MessageSquare, UploadCloud, Users, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';
import { useCandidates } from '../../context/CandidatesContext';
import { Avatar } from '../ui/Avatar';

export type NavItemKey = 'Dashboard' | 'Resume Upload' | 'Candidates' | 'Job Positions' | 'Interview Assistance';

interface NavItem {
  path: string;
  key: NavItemKey;
  label: string;
  icon: typeof LayoutDashboard;
  badge?: string | number;
}

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const NAV_ITEMS: NavItem[] = [
  { path: '/', key: 'Dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/upload', key: 'Resume Upload', label: 'Resume Upload', icon: UploadCloud, badge: 'New' },
  { path: '/candidates', key: 'Candidates', label: 'Candidates', icon: Users, badge: 'count' },
  { path: '/job-positions', key: 'Job Positions', label: 'Job Positions', icon: Briefcase, badge: 'AI' },
  { path: '/interview-assistance', key: 'Interview Assistance', label: 'Interview Assistance', icon: MessageSquare },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { total } = useCandidates();
  return (
    <>
      <div className="h-16 px-6 flex items-center border-b border-slate-100 dark:border-slate-700">
        <NavLink to="/" className="flex items-center gap-3" onClick={onNavigate} aria-label="Go to Dashboard">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-blue-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20 font-black tracking-tight">
            AH
          </div>
          <div>
            <h1 className="font-bold text-slate-900 dark:text-white leading-tight text-base tracking-tight flex items-center gap-1.5">
              AI-Driven Smart Hiring
            </h1>
            <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500">Candidate Matching Copilot</p>
          </div>
        </NavLink>
      </div>

      <nav className="flex-1 py-6 px-3.5 space-y-1.5 overflow-y-auto" aria-label="Main navigation">
        <p className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-slate-400 dark:text-slate-500 uppercase">Main Menu</p>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const badge = item.badge === 'count' ? String(total) : item.badge;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  'w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200',
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span className="flex items-center gap-3">
                    <Icon className={cn('w-5 h-5', isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500')} />
                    <span>{item.label}</span>
                  </span>
                  {badge && (
                    <span
                      className={cn(
                        'text-[10px] font-bold px-2 py-0.5 rounded-full',
                        isActive
                          ? 'bg-white/20 text-white'
                          : item.badge === 'AI'
                            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      )}
                    >
                      {badge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-100 dark:border-slate-700 flex items-center gap-3">
        <Avatar name="Admin" size="sm" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">Admin</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">Recruitment Admin</p>
        </div>
      </div>
    </>
  );
}

export function Sidebar({ mobileOpen, onCloseMobile }: SidebarProps) {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-700/80 min-h-screen flex-col fixed left-0 top-0 z-30 shadow-sm">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.button
              type="button"
              aria-label="Close navigation menu"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onCloseMobile}
              className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'tween', duration: 0.25 }}
              className="fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 shadow-2xl flex flex-col lg:hidden"
            >
              <button
                type="button"
                onClick={onCloseMobile}
                aria-label="Close navigation menu"
                className="absolute right-3 top-4 text-slate-400 hover:text-slate-700 dark:hover:text-white p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
              <SidebarContent onNavigate={onCloseMobile} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
