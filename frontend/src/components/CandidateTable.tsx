import { memo } from 'react';
import { Eye, Edit3, Trash2, Users } from 'lucide-react';
import type { Candidate } from '../types/candidate';
import { Avatar } from './ui/Avatar';
import { Pagination } from './ui/Pagination';
import { EmptyState } from './ui/EmptyState';
import { Spinner } from './ui/Spinner';
import { Card } from './ui/Card';

interface CandidateTableProps {
  candidates: Candidate[];
  loading?: boolean;
  page: number;
  totalPages: number;
  total: number;
  perPage: number;
  onPageChange: (page: number) => void;
  onPerPageChange?: (perPage: number) => void;
  onViewCandidate: (candidate: Candidate) => void;
  onEditCandidate: (candidate: Candidate) => void;
  onDeleteCandidate: (candidate: Candidate) => void;
  title?: string;
  subtitle?: string;
}

const SKILL_LIMIT = 4;

export const CandidateTable = memo(function CandidateTable({
  candidates,
  loading = false,
  page,
  totalPages,
  total,
  perPage,
  onPageChange,
  onPerPageChange,
  onViewCandidate,
  onEditCandidate,
  onDeleteCandidate,
  title = 'Candidate List',
  subtitle = 'Structured candidate profiles extracted from uploaded resumes',
}: CandidateTableProps) {
  return (
    <Card className="overflow-hidden">
      <div className="p-5 border-b border-slate-100 dark:border-slate-700">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">{title}</h3>
              <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold px-2.5 py-0.5 rounded-full">
                {total} Candidates
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[860px]">
          <thead>
            <tr className="bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-200/80 dark:border-slate-700/80 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <th className="py-3 px-5">Candidate</th>
              <th className="py-3 px-5">Email</th>
              <th className="py-3 px-5">Experience</th>
              <th className="py-3 px-5">Education</th>
              <th className="py-3 px-5">Skills</th>
              <th className="py-3 px-5 text-right">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-xs">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-12">
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <Spinner className="text-blue-600" />
                    <p className="text-xs font-semibold">Loading candidates…</p>
                  </div>
                </td>
              </tr>
            ) : candidates.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <EmptyState
                    icon={<Users className="w-7 h-7" />}
                    title="No candidates found"
                    description="Try adjusting your search or filters, or upload a resume to get started."
                  />
                </td>
              </tr>
            ) : (
              candidates.map((candidate) => (
                <tr key={candidate.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors group">
                  <td className="py-3.5 px-5">
                    <div className="flex items-center gap-3">
                      <Avatar name={candidate.name} src={candidate.avatarUrl} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors truncate max-w-[12rem]">
                            {candidate.name}
                          </p>
                          <span className="text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded border border-blue-100 dark:border-blue-800 shrink-0">
                            {candidate.matchScore}% Match
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{candidate.role}</p>
                      </div>
                    </div>
                  </td>

                  <td className="py-3.5 px-5 text-slate-600 dark:text-slate-400 font-medium font-mono text-[11px] truncate max-w-[13rem]">
                    {candidate.email}
                  </td>

                  <td className="py-3.5 px-5 text-slate-800 dark:text-slate-200 font-semibold whitespace-nowrap">
                    {candidate.experienceYears > 0 ? `${candidate.experienceYears}+ yrs` : candidate.experience}
                  </td>

                  <td className="py-3.5 px-5 text-slate-600 dark:text-slate-400 truncate max-w-[14rem]" title={candidate.education}>
                    {candidate.education}
                  </td>

                  <td className="py-3.5 px-5">
                    <div className="flex flex-wrap gap-1 max-w-[12rem]">
                      {candidate.skills.slice(0, SKILL_LIMIT).map((skill) => (
                        <span
                          key={skill}
                          className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-semibold text-[11px] rounded-md border border-blue-100 dark:border-blue-800"
                        >
                          {skill}
                        </span>
                      ))}
                      {candidate.skills.length > SKILL_LIMIT && (
                        <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold text-[10px] rounded-md">
                          +{candidate.skills.length - SKILL_LIMIT}
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="py-3.5 px-5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => onViewCandidate(candidate)}
                        className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-slate-700 dark:text-slate-300 hover:text-blue-600 font-semibold rounded-lg transition-colors flex items-center gap-1 text-[11px]"
                        title="View candidate details"
                        aria-label={`View ${candidate.name}`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => onEditCandidate(candidate)}
                        className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-lg transition-colors flex items-center gap-1 text-[11px]"
                        title="Edit candidate profile"
                        aria-label={`Edit ${candidate.name}`}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteCandidate(candidate)}
                        className="px-2.5 py-1.5 bg-rose-50 dark:bg-rose-900/30 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 font-semibold rounded-lg transition-colors flex items-center gap-1 text-[11px]"
                        title="Delete candidate"
                        aria-label={`Delete ${candidate.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        page={page}
        totalPages={totalPages}
        totalItems={total}
        perPage={perPage}
        onPageChange={onPageChange}
        onPerPageChange={onPerPageChange}
      />
    </Card>
  );
});
