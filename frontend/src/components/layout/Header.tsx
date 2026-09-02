import { useCallback, useEffect, useRef, useState } from 'react';
import { Search, Bell, Menu, Sparkles, Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCandidates } from '../../context/CandidatesContext';
import { useTheme } from '../../context/ThemeContext';
import { Avatar } from '../ui/Avatar';

interface NotificationItem {
  id: number;
  title: string;
  desc: string;
  time: string;
  read: boolean;
}

interface HeaderProps {
  onToggleSidebar: () => void;
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  { id: 1, title: 'Parsing Complete', desc: 'A candidate profile was extracted with a 96% match score.', time: '2m ago', read: false },
  { id: 2, title: 'Batch Upload Done', desc: 'New candidate resumes processed successfully.', time: '15m ago', read: false },
  { id: 3, title: 'AI Match Alert', desc: 'A candidate fits the "Lead Frontend Architect" requisition.', time: '1h ago', read: true },
];

export function Header({ onToggleSidebar }: HeaderProps) {
  const { searchQuery, setSearchQuery } = useCandidates();
  const { theme, toggleTheme, isDark } = useTheme();

  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const notificationRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((item) => !item.read).length;

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowNotifications(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <header className="h-16 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-700/80 sticky top-0 z-20 flex items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
      {/* Left: mobile menu + search */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label="Open navigation menu"
          className="lg:hidden p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="relative flex-1 max-w-md min-w-0">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search candidates, skills or keywords..."
            aria-label="Search candidates"
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
          />
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Theme Toggle */}
        <motion.button
          type="button"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleTheme}
          className="w-9 h-9 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 text-slate-600 dark:text-slate-400 flex items-center justify-center transition-colors"
          aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </motion.button>

        {/* Notifications */}
        <div className="relative" ref={notificationRef}>
          <motion.button
            type="button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowNotifications((open) => !open)}
            className="w-9 h-9 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 text-slate-600 dark:text-slate-400 flex items-center justify-center relative transition-colors"
            aria-label={`Notifications (${unreadCount} unread)`}
            aria-expanded={showNotifications}
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 text-white font-bold text-[10px] rounded-full flex items-center justify-center ring-2 ring-white dark:ring-slate-900">
                {unreadCount}
              </span>
            )}
          </motion.button>

          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute right-0 mt-3 w-72 sm:w-80 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl z-50 overflow-hidden"
              >
                <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50/60 dark:bg-slate-700/60">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">Notifications</h4>
                  </div>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={markAllRead}
                      className="text-[11px] font-semibold text-blue-600 hover:text-blue-700"
                    >
                      Mark read
                    </button>
                  )}
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-700 max-h-64 overflow-y-auto">
                  {notifications.map((item) => (
                    <div
                      key={item.id}
                      className={`p-3.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${!item.read ? 'bg-blue-50/30 dark:bg-blue-900/20' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-bold text-slate-900 dark:text-white">{item.title}</p>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0">{item.time}</span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{item.desc}</p>
                    </div>
                  ))}
                </div>

                <div className="p-2 bg-slate-50 dark:bg-slate-700/60 text-center border-t border-slate-100 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setShowNotifications(false)}
                    className="text-xs text-slate-500 dark:text-slate-400 font-medium hover:text-slate-800 dark:hover:text-white"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="hidden sm:flex items-center gap-3 pl-2 border-l border-slate-200 dark:border-slate-700">
          <Avatar name="Admin" size="sm" className="ring-2 ring-blue-600/20" />
          <div className="hidden xl:block text-left">
            <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">Admin</p>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Recruitment Admin</p>
          </div>
        </div>
      </div>
    </header>
  );
}
