import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  deleteCandidate as apiDeleteCandidate,
  fetchCandidates,
  fetchDashboardStats,
  getErrorMessage,
  updateCandidate as apiUpdateCandidate,
  type DashboardStats,
} from '../services/api';
import type { Candidate } from '../types/candidate';
import { mapBackendToCandidate, toCandidateUpdate } from '../utils/candidateMapping';
import { useDebounce } from '../hooks/useDebounce';
import { useToast } from './ToastContext';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

interface CandidatesContextValue {
  dashboardStats: DashboardStats | null;
  statsLoading: boolean;
  candidates: Candidate[];
  total: number;
  totalPages: number;
  loading: boolean;
  error: string | null;
  page: number;
  perPage: number;
  setPage: (page: number) => void;
  setPerPage: (perPage: number) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  refresh: () => Promise<void>;
  viewingCandidate: Candidate | null;
  openView: (candidate: Candidate) => void;
  closeView: () => void;
  editingCandidate: Candidate | null;
  openEdit: (candidate: Candidate) => void;
  closeEdit: () => void;
  saveCandidate: (updated: Candidate) => Promise<void>;
  deleteCandidate: (candidate: Candidate) => void;
}

const CandidatesContext = createContext<CandidatesContextValue | null>(null);

export function CandidatesProvider({ children }: { children: ReactNode }) {
  const toast = useToast();

  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  const [searchQuery, setSearchQuery] = useState('');

  const [refreshToken, setRefreshToken] = useState(0);

  const [viewingCandidate, setViewingCandidate] = useState<Candidate | null>(null);
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Candidate | null>(null);
  const [deleting, setDeleting] = useState(false);

  const debouncedSearch = useDebounce(searchQuery, 400);

  // Fetch dashboard stats on mount
  useEffect(() => {
    let cancelled = false;
    setStatsLoading(true);
    fetchDashboardStats()
      .then((stats) => {
        if (!cancelled) setDashboardStats(stats);
      })
      .catch(() => {
        if (!cancelled) setDashboardStats(null);
      })
      .finally(() => {
        if (!cancelled) setStatsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch candidate table (with header search / pagination)
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const load = async () => {
      try {
        const data = await fetchCandidates(page, perPage, debouncedSearch || undefined);
        if (cancelled) return;
        setCandidates(data.candidates.map(mapBackendToCandidate));
        setTotal(data.total);
        setTotalPages(data.total_pages || 1);
      } catch (err) {
        if (cancelled) return;
        setError(getErrorMessage(err));
        setCandidates([]);
        setTotal(0);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [page, perPage, debouncedSearch, refreshToken]);

  const refresh = useCallback(async () => {
    setRefreshToken((token) => token + 1);
    setStatsLoading(true);
    try {
      const stats = await fetchDashboardStats();
      setDashboardStats(stats);
    } catch (err) {
      toast.error('Could not refresh data', getErrorMessage(err));
    } finally {
      setStatsLoading(false);
    }
  }, [toast]);

  const setPerPageSafe = useCallback((value: number) => {
    setPerPage(value);
    setPage(1);
  }, []);

  const openView = useCallback((candidate: Candidate) => setViewingCandidate(candidate), []);
  const closeView = useCallback(() => setViewingCandidate(null), []);
  const openEdit = useCallback((candidate: Candidate) => setEditingCandidate(candidate), []);
  const closeEdit = useCallback(() => setEditingCandidate(null), []);

  const saveCandidate = useCallback(
    async (updated: Candidate) => {
      if (!updated.backendId) {
        setCandidates((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        toast.success('Candidate updated locally');
        setEditingCandidate(null);
        return;
      }
      try {
        await apiUpdateCandidate(updated.backendId, toCandidateUpdate(updated));
        setCandidates((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        toast.success('Candidate updated successfully');
        setEditingCandidate(null);
        refresh();
      } catch (err) {
        toast.error('Update failed', getErrorMessage(err));
      }
    },
    [toast, refresh]
  );

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      if (deleteTarget.backendId) {
        await apiDeleteCandidate(deleteTarget.backendId);
      }
      setCandidates((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      toast.success('Candidate deleted', `"${deleteTarget.name}" was removed.`);
      setDeleteTarget(null);
      refresh();
    } catch (err) {
      toast.error('Delete failed', getErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, toast, refresh]);

  const value = useMemo<CandidatesContextValue>(
    () => ({
      dashboardStats,
      statsLoading,
      candidates,
      total,
      totalPages,
      loading,
      error,
      page,
      perPage,
      setPage,
      setPerPage: setPerPageSafe,
      searchQuery,
      setSearchQuery,
      refresh,
      viewingCandidate,
      openView,
      closeView,
      editingCandidate,
      openEdit,
      closeEdit,
      saveCandidate,
      deleteCandidate: setDeleteTarget,
    }),
    [
      dashboardStats,
      statsLoading,
      candidates,
      total,
      totalPages,
      loading,
      error,
      page,
      perPage,
      searchQuery,
      refresh,
      viewingCandidate,
      openView,
      closeView,
      editingCandidate,
      openEdit,
      closeEdit,
      saveCandidate,
      setPerPageSafe,
    ]
  );

  return (
    <CandidatesContext.Provider value={value}>
      {children}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete candidate"
        message={
          deleteTarget
            ? `Are you sure you want to permanently delete "${deleteTarget.name}"? This action cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </CandidatesContext.Provider>
  );
}

export function useCandidates(): CandidatesContextValue {
  const context = useContext(CandidatesContext);
  if (!context) {
    throw new Error('useCandidates must be used within a CandidatesProvider');
  }
  return context;
}
