import { useState, useCallback, useEffect } from 'react';
import {
  Users,
  Briefcase,
  UserCheck,
  Clock,
  Sparkles,
  RefreshCw,
  Search,
  CheckCircle2,
  BarChart3,
  MessageSquare,
  Activity,
  ArrowUpRight,
  TrendingUp,
  FileText,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useCandidates } from '../context/CandidatesContext';
import { Button } from '../components/ui/Button';
import { Avatar } from '../components/ui/Avatar';
import { VoiceScreeningModule } from '../components/VoiceScreeningModule';
import { fetchDashboardStats, fetchCandidates, getErrorMessage } from '../services/api';
import type { DashboardStats, BackendCandidate } from '../types/api';
import { useToast } from '../context/ToastContext';


export default function Dashboard() {
  const { dashboardStats: contextStats, refresh: refreshContext } = useCandidates();
  const toast = useToast();

  const [stats, setStats] = useState<DashboardStats | null>(contextStats);
  const [loading, setLoading] = useState<boolean>(!contextStats);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<BackendCandidate[]>([]);
  const [searching, setSearching] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    try {
      setRefreshing(true);
      const data = await fetchDashboardStats();
      setStats(data);
      refreshContext();
    } catch (err) {
      toast.error('Dashboard Error', getErrorMessage(err, 'Failed to update dashboard data.'));
    } finally {
      setRefreshing(false);
      setLoading(false);
    }

  }, [refreshContext, toast]);

  useEffect(() => {
    if (contextStats) {
      setStats(contextStats);
      setLoading(false);
    } else {
      loadData();
    }
  }, [contextStats, loadData]);

  // Global search handler
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      setSearching(true);
      const res = await fetchCandidates(1, 5, searchQuery.trim());
      setSearchResults(res.candidates);
    } catch (err) {
      toast.error('Search Error', 'Could not fetch search results.');
    } finally {
      setSearching(false);
    }
  };

  // Calculated values
  const totalCands = stats?.totalCandidates ?? 0;
  const activeJobs = stats?.activeJobPositions ?? 0;
  const shortlistedCands = stats?.shortlistedCandidates ?? stats?.shortlisted ?? 0;
  const pendingInterviews = stats?.pendingInterviews ?? 0;

  const pipeline = stats?.pipeline || {
    applied: totalCands,
    shortlisted: shortlistedCands,
    interview: 0,
    selected: 0,
    rejected: stats?.rejected ?? 0,
  };

  const maxPipelineVal = Math.max(pipeline.applied, 1);

  const topMatches = stats?.topCandidateMatches || [];

  const interviewStatus = stats?.interviewStatus || {
    scheduled: 0,
    in_progress: 0,
    completed: 0,
    pending: pendingInterviews,
  };
  const recentActivity = stats?.recentActivity || [];

  return (
    <div className="space-y-6 pb-8">
      {/* Top Area: Header, Description & Controls */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-semibold text-xs uppercase tracking-wider mb-1">
              <Sparkles className="w-4 h-4" />
              AI Recruitment Copilot Overview
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              AI Recruitment Dashboard
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Monitor candidates, job positions, matching performance, and interview progress in real-time.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Global Search Bar */}
            <form onSubmit={handleSearch} className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search candidates..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (!e.target.value) setSearchResults([]);
                }}
                className="w-full h-10 pl-9 pr-4 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-800 dark:text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </form>

            {/* Refresh Button */}
            <Button
              variant="secondary"
              onClick={loadData}
              disabled={refreshing}
              className="h-10 px-4 text-xs font-semibold gap-2 border border-slate-200 dark:border-slate-700 shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        </div>

        {/* Global Search Popup Results */}
        {searchResults.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
              Quick Search Results ({searchResults.length})
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {searchResults.map((cand) => (
                <div
                  key={cand.id}
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <Avatar name={cand.full_name || 'Candidate'} size="sm" />
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">
                        {cand.full_name || 'Unnamed Candidate'}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">{cand.email || 'No email'}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 capitalize">
                    {cand.status || 'pending'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 4 SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Candidates */}
        <motion.div
          whileHover={{ y: -2 }}
          className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 p-5 shadow-sm relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Total Candidates
              </p>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {loading ? '...' : totalCands.toLocaleString()}
              </h2>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-100 dark:border-blue-800">
              <Users className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Actual DB records</span>
          </div>
        </motion.div>

        {/* Card 2: Active Job Positions */}
        <motion.div
          whileHover={{ y: -2 }}
          className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 p-5 shadow-sm relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Active Job Positions
              </p>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {loading ? '...' : activeJobs.toLocaleString()}
              </h2>
            </div>
            <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-800">
              <Briefcase className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-indigo-600 font-semibold">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Open roles for matching</span>
          </div>
        </motion.div>

        {/* Card 3: Shortlisted Candidates */}
        <motion.div
          whileHover={{ y: -2 }}
          className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 p-5 shadow-sm relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Shortlisted Candidates
              </p>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {loading ? '...' : shortlistedCands.toLocaleString()}
              </h2>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-100 dark:border-emerald-800">
              <UserCheck className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{totalCands > 0 ? `${Math.round((shortlistedCands / totalCands) * 100)}% match rate` : '0% match rate'}</span>
          </div>
        </motion.div>

        {/* Card 4: Pending Interviews */}
        <motion.div
          whileHover={{ y: -2 }}
          className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 p-5 shadow-sm relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Pending Interviews
              </p>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {loading ? '...' : pendingInterviews.toLocaleString()}
              </h2>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-100 dark:border-amber-800">
              <Clock className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-amber-600 font-semibold">
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Awaiting simulation/evaluation</span>
          </div>
        </motion.div>
      </div>

      {/* MAIN DASHBOARD CONTENT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT MAIN COLUMN: Pipeline & Top Candidate Matches (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* SECTION: RECRUITMENT PIPELINE */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 p-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700 mb-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  Recruitment Pipeline
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Candidate progression across hiring stages
                </p>
              </div>
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-full">
                {totalCands} Total Applicants
              </span>
            </div>

            <div className="space-y-4">
              {[
                { stage: 'Applied', count: pipeline.applied, color: 'bg-blue-600' },
                { stage: 'Shortlisted', count: pipeline.shortlisted, color: 'bg-indigo-600' },
                { stage: 'Interview', count: pipeline.interview, color: 'bg-purple-600' },
                { stage: 'Selected', count: pipeline.selected, color: 'bg-emerald-600' },
                { stage: 'Rejected', count: pipeline.rejected, color: 'bg-rose-500' },
              ].map((item) => {
                const pct = maxPipelineVal > 0 ? Math.round((item.count / maxPipelineVal) * 100) : 0;
                return (
                  <div key={item.stage} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-700 dark:text-slate-300 w-24 font-bold">{item.stage}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-400 dark:text-slate-500 font-medium">{pct}%</span>
                        <span className="text-slate-900 dark:text-white font-extrabold w-12 text-right">
                          {item.count}
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-700 h-3 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                        className={`h-full rounded-full ${item.color}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION: TOP CANDIDATE MATCHES */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 p-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700 mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-blue-600" />
                  Top Candidate Matches
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Ranked by AI match score against active job positions
                </p>
              </div>
            </div>

            {topMatches.length === 0 ? (
              <div className="py-12 text-center text-slate-400 dark:text-slate-500 space-y-2">
                <FileText className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
                <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm">No candidate matches found</p>
                <p className="text-xs">Upload candidate resumes or create job positions to generate dynamic matches.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-700 text-slate-400 dark:text-slate-500 uppercase tracking-wider font-semibold">
                      <th className="pb-3 px-2">Candidate Name</th>
                      <th className="pb-3 px-2">Job Position</th>
                      <th className="pb-3 px-2">Match Score</th>
                      <th className="pb-3 px-2">Matched Skills</th>
                      <th className="pb-3 px-2 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 font-medium">
                    {topMatches.map((match, idx) => {
                      const scoreColor =
                        match.match_score >= 80
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : match.match_score >= 60
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200';

                      return (
                        <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/40 transition-colors">
                          <td className="py-3 px-2 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Avatar name={match.candidate_name} size="sm" />
                            <span>{match.candidate_name}</span>
                          </td>
                          <td className="py-3 px-2 text-slate-700 dark:text-slate-300 font-semibold">
                            {match.job_title}
                          </td>
                          <td className="py-3 px-2">
                            <span className={`px-2.5 py-1 rounded-md border font-black text-xs inline-block ${scoreColor}`}>
                              {match.match_score}%
                            </span>
                          </td>
                          <td className="py-3 px-2">
                            <div className="flex flex-wrap gap-1">
                              {match.matched_skills.map((skill) => (
                                <span
                                  key={skill}
                                  className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded font-medium text-[11px]"
                                >
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-3 px-2 text-right">
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-400 capitalize">
                              {match.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT SIDEBAR COLUMN: Voice Screening, Interview Status & Activity (4 Cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* SECTION: VOICE SCREENING MODULE */}
          <VoiceScreeningModule />


          {/* SECTION: INTERVIEW STATUS */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 p-6 shadow-sm">
            <div className="pb-3 border-b border-slate-100 dark:border-slate-700 mb-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-purple-600" />
                Interview Status
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Current status of candidate interviews</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 rounded-xl">
                <p className="text-xs font-semibold text-purple-700 dark:text-purple-400">Scheduled</p>
                <p className="text-xl font-black text-purple-900 dark:text-purple-200 mt-1">
                  {interviewStatus.scheduled}
                </p>
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl">
                <p className="text-xs font-semibold text-blue-700 dark:text-blue-400">In Progress</p>
                <p className="text-xl font-black text-blue-900 dark:text-blue-200 mt-1">
                  {interviewStatus.in_progress}
                </p>
              </div>

              <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-xl">
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Completed</p>
                <p className="text-xl font-black text-emerald-900 dark:text-emerald-200 mt-1">
                  {interviewStatus.completed}
                </p>
              </div>

              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-xl">
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">Pending</p>
                <p className="text-xl font-black text-amber-900 dark:text-amber-200 mt-1">
                  {interviewStatus.pending}
                </p>
              </div>
            </div>
          </div>

          {/* SECTION: RECENT RECRUITMENT ACTIVITY */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 p-6 shadow-sm">
            <div className="pb-3 border-b border-slate-100 dark:border-slate-700 mb-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-600" />
                Recent Recruitment Activity
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Chronological feed of platform events</p>
            </div>

            {recentActivity.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">No recent activity recorded.</p>
            ) : (
              <div className="space-y-3.5">
                {recentActivity.map((act) => (
                  <div key={act.id} className="flex items-start gap-3 text-xs">
                    <div className="w-2 h-2 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 dark:text-slate-200 leading-snug">
                        {act.message}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{act.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

