import { useCandidates } from '../context/CandidatesContext';
import { CandidateTable } from '../components/CandidateTable';
import { PageHeader } from '../components/ui/PageHeader';
import { ErrorState } from '../components/ui/ErrorState';

export default function Candidates() {
  const {
    candidates,
    loading,
    error,
    total,
    totalPages,
    page,
    perPage,
    setPage,
    setPerPage,
    openView,
    openEdit,
    deleteCandidate,
    refresh,
  } = useCandidates();

  return (
    <div className="space-y-6">
      <PageHeader title="Candidates" subtitle="All uploaded candidate profiles" />

      {error && <ErrorState message={error} onRetry={refresh} />}

      <CandidateTable
        candidates={candidates}
        loading={loading}
        page={page}
        totalPages={totalPages}
        total={total}
        perPage={perPage}
        onPageChange={setPage}
        onPerPageChange={setPerPage}
        onViewCandidate={openView}
        onEditCandidate={openEdit}
        onDeleteCandidate={deleteCandidate}
        title="Candidates"
      />
    </div>
  );
}
