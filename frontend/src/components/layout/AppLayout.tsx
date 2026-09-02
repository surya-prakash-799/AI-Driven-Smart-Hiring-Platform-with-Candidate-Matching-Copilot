import { Suspense, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useCandidates } from '../../context/CandidatesContext';
import { PageLoader } from '../ui/Spinner';
import { ViewCandidateModal, EditCandidateModal } from '../CandidateModal';

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { viewingCandidate, closeView, editingCandidate, closeEdit, saveCandidate } = useCandidates();

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100">
      <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />

      <div className="lg:pl-64 flex flex-col min-h-screen">
        <Header onToggleSidebar={() => setMobileOpen(true)} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </main>

        <footer className="px-6 py-4 border-t border-slate-200/70 dark:border-slate-700/70 text-[11px] text-slate-400 dark:text-slate-500">
          AI-Driven Smart Hiring Platform with Candidate Matching Copilot — automated resume parsing &amp; talent analytics
        </footer>
      </div>

      <ViewCandidateModal candidate={viewingCandidate} onClose={closeView} />
      <EditCandidateModal
        key={editingCandidate?.id ?? 'edit-closed'}
        candidate={editingCandidate}
        onClose={closeEdit}
        onSave={saveCandidate}
      />
    </div>
  );
}
