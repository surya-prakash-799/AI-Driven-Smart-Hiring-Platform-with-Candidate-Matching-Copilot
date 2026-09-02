import { useCallback, useEffect, useState } from 'react';
import {
  Briefcase,
  Search,
  Plus,
  Edit,
  Trash2,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Lightbulb,
  User,
  GraduationCap,
  Sparkles,
  Award,
  Layers,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Avatar } from '../components/ui/Avatar';
import { ViewCandidateModal } from '../components/CandidateModal';
import { useToast } from '../context/ToastContext';
import {
  fetchJobPositions,
  createJobPosition,
  updateJobPosition,
  deleteJobPosition,
  fetchJobPositionMatching,
  searchCandidatesBySkill,
  shortlistCandidate,
  fetchSkillGapAnalysis,
  fetchCandidate,
} from '../services/api';
import type {
  JobPosition,
  CandidateMatchItem,
  SkillGapAnalysisResponse,
} from '../types/api';
import type { Candidate } from '../types/candidate';
import { mapBackendToCandidate } from '../utils/candidateMapping';

export default function JobPositions() {
  const toast = useToast();

  // Job Positions & Selection State
  const [jobPositions, setJobPositions] = useState<JobPosition[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);

  // Search State
  const [skillInput, setSkillInput] = useState('');

  // Candidates & Score State
  const [candidates, setCandidates] = useState<CandidateMatchItem[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateMatchItem | null>(null);
  const [skillGap, setSkillGap] = useState<SkillGapAnalysisResponse | null>(null);

  // Loaders & Modal States
  const [loading, setLoading] = useState<boolean>(true);
  const [gapLoading, setGapLoading] = useState<boolean>(false);
  const [createModalOpen, setCreateModalOpen] = useState<boolean>(false);
  const [editModalOpen, setEditModalOpen] = useState<boolean>(false);
  const [shortlistingCandidateId, setShortlistingCandidateId] = useState<number | null>(null);
  const [viewingCandidate, setViewingCandidate] = useState<Candidate | null>(null);

  // Create Form State
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newReqSkills, setNewReqSkills] = useState('');
  const [newPrefSkills, setNewPrefSkills] = useState('');
  const [newMinExp, setNewMinExp] = useState<number>(2);
  const [newEdu, setNewEdu] = useState("Bachelor's Degree");
  const [submitting, setSubmitting] = useState(false);

  // Edit Form State
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editReqSkills, setEditReqSkills] = useState('');
  const [editPrefSkills, setEditPrefSkills] = useState('');
  const [editMinExp, setEditMinExp] = useState<number>(2);
  const [editEdu, setEditEdu] = useState("Bachelor's Degree");
  const [editSubmitting, setEditSubmitting] = useState(false);


  // 1. Initial Load: Fetch Job Positions
  const loadJobPositions = useCallback(async () => {
    try {
      setLoading(true);
      const positions = await fetchJobPositions();
      setJobPositions(positions);
      if (positions.length > 0) {
        setSelectedJobId(positions[0].id);
      }
    } catch (err) {
      toast.error('Error loading job positions', 'Could not connect to the backend server.');
    } finally {
      setLoading(false);
    }
  }, [toast]);


  useEffect(() => {
    loadJobPositions();
  }, [loadJobPositions]);

  // 2. Fetch Matching Candidates whenever selectedJobId or active skill search changes
  const loadCandidatesAndMatching = useCallback(
    async (jobId: number, searchSkill?: string) => {
      try {
        setLoading(true);
        if (searchSkill && searchSkill.trim()) {
          const res = await searchCandidatesBySkill(searchSkill.trim(), jobId);
          setCandidates(res.candidates);
          if (res.candidates.length > 0) {
            setSelectedCandidate(res.candidates[0]);
          } else {
            setSelectedCandidate(null);
            setSkillGap(null);
          }
        } else {
          const res = await fetchJobPositionMatching(jobId);
          setCandidates(res.candidates);
          if (res.candidates.length > 0) {
            setSelectedCandidate(res.candidates[0]);
          } else {
            setSelectedCandidate(null);
            setSkillGap(null);
          }
        }
      } catch (err) {
        toast.error('Matching Error', 'Failed to compute candidate matching scores.');
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  useEffect(() => {
    if (selectedJobId) {
      loadCandidatesAndMatching(selectedJobId, skillInput);
    }
  }, [selectedJobId, loadCandidatesAndMatching]);

  // 3. Fetch Skill Gap Analysis whenever selectedCandidate or selectedJobId changes
  const loadSkillGap = useCallback(
    async (candId: number, jobId: number) => {
      try {
        setGapLoading(true);
        const gapData = await fetchSkillGapAnalysis(candId, jobId);
        setSkillGap(gapData);
      } catch (err) {
        console.error('Skill gap analysis error:', err);
      } finally {
        setGapLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (selectedCandidate && selectedJobId) {
      loadSkillGap(selectedCandidate.id, selectedJobId);
    }
  }, [selectedCandidate, selectedJobId, loadSkillGap]);

  // 4. Handle Search Form Submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedJobId) {
      loadCandidatesAndMatching(selectedJobId, skillInput);
    }
  };

  // 5. Shortlist Candidate Handler
  const handleShortlist = async (candidateId: number) => {
    if (!selectedJobId) return;
    try {
      setShortlistingCandidateId(candidateId);
      const resp = await shortlistCandidate(selectedJobId, candidateId);

      // Update local state to show 'Shortlisted ✓'
      setCandidates((prev) =>
        prev.map((c) => (c.id === candidateId ? { ...c, is_shortlisted: true } : c))
      );

      if (selectedCandidate && selectedCandidate.id === candidateId) {
        setSelectedCandidate((prev) => (prev ? { ...prev, is_shortlisted: true } : null));
      }

      toast.success('Candidate Shortlisted', resp.message || 'Status updated in PostgreSQL database.');
    } catch (err) {
      toast.error('Shortlist Failed', 'Could not update shortlisted candidate status.');
    } finally {
      setShortlistingCandidateId(null);
    }
  };

  // 6. View Profile Handler
  const handleViewProfile = async (candidateId: number) => {
    try {
      const backendCand = await fetchCandidate(candidateId);
      const mapped = mapBackendToCandidate(backendCand);
      setViewingCandidate(mapped);
    } catch (err) {
      toast.error('Error', 'Could not fetch candidate details.');
    }
  };

  // 7. Create Job Position Handler
  const handleCreateJobPosition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      toast.warning('Missing Title', 'Please enter a job title.');
      return;
    }

    try {
      setSubmitting(true);
      const reqArray = newReqSkills
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const prefArray = newPrefSkills
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const created = await createJobPosition({
        title: newTitle.trim(),
        description: newDescription.trim(),
        required_skills: reqArray,
        preferred_skills: prefArray,
        minimum_experience: Number(newMinExp) || 0,
        education: newEdu.trim(),
      });

      toast.success('Job Position Created', `Successfully created position: ${created.title}`);

      setCreateModalOpen(false);
      setNewTitle('');
      setNewDescription('');
      setNewReqSkills('');
      setNewPrefSkills('');

      // Reload positions and select the new position
      const positions = await fetchJobPositions();
      setJobPositions(positions);
      setSelectedJobId(created.id);
    } catch (err) {
      toast.error('Creation Failed', 'Could not create job position.');
    } finally {
      setSubmitting(false);
    }
  };

  // 8. Open Edit Modal & Pre-fill Handler
  const openEditModal = () => {
    const current = jobPositions.find((j) => j.id === selectedJobId);
    if (!current) return;
    setEditTitle(current.title || '');
    setEditDescription(current.description || '');
    setEditReqSkills((current.required_skills || []).join(', '));
    setEditPrefSkills((current.preferred_skills || []).join(', '));
    setEditMinExp(current.minimum_experience || 0);
    setEditEdu(current.education || "Bachelor's Degree");
    setEditModalOpen(true);
  };

  // 9. Update Job Position Handler
  const handleEditJobPosition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJobId || !editTitle.trim()) {
      toast.warning('Missing Title', 'Please enter a job title.');
      return;
    }

    try {
      setEditSubmitting(true);
      const reqArray = editReqSkills.split(',').map((s) => s.trim()).filter(Boolean);
      const prefArray = editPrefSkills.split(',').map((s) => s.trim()).filter(Boolean);

      const updated = await updateJobPosition(selectedJobId, {
        title: editTitle.trim(),
        description: editDescription.trim(),
        required_skills: reqArray,
        preferred_skills: prefArray,
        minimum_experience: Number(editMinExp) || 0,
        education: editEdu.trim(),
      });

      toast.success('Job Position Updated', `Successfully updated: ${updated.title}`);
      setEditModalOpen(false);

      const positions = await fetchJobPositions();
      setJobPositions(positions);
      if (selectedJobId) {
        loadCandidatesAndMatching(selectedJobId, skillInput);
      }
    } catch (err) {
      toast.error('Update Failed', 'Could not update job position.');
    } finally {
      setEditSubmitting(false);
    }
  };

  // 10. Delete Job Position Handler
  const handleDeleteJobPosition = async () => {
    if (!selectedJobId) return;
    const current = jobPositions.find((j) => j.id === selectedJobId);
    if (!window.confirm(`Are you sure you want to delete job position: "${current?.title || 'Selected Position'}"?`)) {
      return;
    }

    try {
      setLoading(true);
      await deleteJobPosition(selectedJobId);
      toast.success('Position Deleted', 'Job position deleted successfully.');

      const positions = await fetchJobPositions();
      setJobPositions(positions);
      if (positions.length > 0) {
        setSelectedJobId(positions[0].id);
      } else {
        setSelectedJobId(null);
        setCandidates([]);
        setSelectedCandidate(null);
        setSkillGap(null);
      }
    } catch (err) {
      toast.error('Delete Failed', 'Could not delete job position.');
    } finally {
      setLoading(false);
    }
  };

  const currentJob = jobPositions.find((j) => j.id === selectedJobId);


  return (
    <div className="space-y-6">
      {/* Top Page Header & Controls */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-700">
          <div>
            <div className="flex items-center gap-2 text-blue-600 font-semibold text-xs uppercase tracking-wider mb-1">
              <Briefcase className="w-4 h-4" />
              Recruitment Automation
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Job Position & Candidate Matching
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Match candidates dynamically from PostgreSQL using AI skill scoring, experience metrics, and skill gap analysis.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-center">
            {selectedJobId && (
              <>
                <Button
                  variant="outline"
                  onClick={openEditModal}
                  className="gap-1.5 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200"
                >
                  <Edit className="w-4 h-4 text-blue-600" />
                  Edit Position
                </Button>

                <Button
                  variant="outline"
                  onClick={handleDeleteJobPosition}
                  className="gap-1.5 border-rose-200 dark:border-rose-800 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                >
                  <Trash2 className="w-4 h-4 text-rose-600" />
                  Delete Position
                </Button>
              </>
            )}

            <Button
              onClick={() => setCreateModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20 gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Job Position
            </Button>
          </div>

        </div>

        {/* Filter Controls Bar */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mt-6 items-center">
          {/* Job Position Dropdown */}
          <div className="md:col-span-6 lg:col-span-5">
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Job Position
            </label>
            <div className="relative">
              <select
                value={selectedJobId || ''}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setSelectedJobId(val);
                }}
                className="w-full h-11 pl-4 pr-10 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-800 dark:text-slate-200 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none cursor-pointer transition-all"
              >
                {jobPositions.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.title} ({job.minimum_experience} yrs min exp • {job.required_skills?.length || 0} req skills)
                  </option>
                ))}
              </select>
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                ▼
              </div>
            </div>
          </div>

          {/* Skill Search Form */}
          <div className="md:col-span-6 lg:col-span-7">
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Skill Search
            </label>
            <form onSubmit={handleSearchSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <input
                  type="text"
                  placeholder="Search required skill (e.g. Python, React, SQL)..."
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  className="w-full h-11 pl-10 pr-4 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>
              <Button type="submit" variant="secondary" className="h-11 px-5 font-semibold gap-1.5">
                <Search className="w-4 h-4" />
                Search
              </Button>
            </form>
          </div>
        </div>

        {/* Selected Position Summary Pills */}
        {currentJob && (
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 flex flex-wrap items-center gap-2 text-xs">
            <span className="font-medium text-slate-400 dark:text-slate-500">Required Skills:</span>
            {currentJob.required_skills.map((skill) => (
              <span
                key={skill}
                className="px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-semibold border border-blue-100 dark:border-blue-800"
              >
                {skill}
              </span>
            ))}
            {currentJob.preferred_skills && currentJob.preferred_skills.length > 0 && (
              <>
                <span className="font-medium text-slate-400 dark:text-slate-500 ml-2">Preferred:</span>
                {currentJob.preferred_skills.map((skill) => (
                  <span
                    key={skill}
                    className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 font-medium"
                  >
                    {skill}
                  </span>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* Main Grid: Candidate Matching (Left) vs Skill Gap Analysis (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT CARD: Candidate Matching */}
        <div className="lg:col-span-6 xl:col-span-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 p-6 shadow-sm flex flex-col min-h-[600px]">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700 mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-600" />
                Candidate Matching
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Ranked dynamically using weighted skill match, experience & education
              </p>
            </div>
            <span className="px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full font-bold text-xs">
              {candidates.length} Candidates
            </span>
          </div>

          {/* Candidate List Container */}
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-400 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <p className="text-sm font-medium">Computing candidate match scores...</p>
            </div>
          ) : candidates.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-400 dark:text-slate-500 gap-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-400 dark:text-slate-500">
                <User className="w-6 h-6" />
              </div>
              <p className="font-bold text-slate-700 dark:text-slate-300">No matching candidates found</p>
              <p className="text-xs max-w-xs">
                Upload candidates or clear skill search filters to view ranked results.
              </p>
            </div>
          ) : (
            <div className="space-y-3.5 overflow-y-auto max-h-[700px] pr-1">
              {candidates.map((cand) => {
                const isSelected = selectedCandidate?.id === cand.id;
                const scoreColor =
                  cand.match_score >= 80
                    ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                    : cand.match_score >= 60
                    ? 'text-blue-700 bg-blue-50 border-blue-200'
                    : 'text-amber-700 bg-amber-50 border-amber-200';

                return (
                  <motion.div
                    key={cand.id}
                    layout
                    onClick={() => setSelectedCandidate(cand)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer relative ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-900/20 shadow-md ring-1 ring-blue-500/20'
                        : 'border-slate-200/80 dark:border-slate-600 bg-white dark:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-500 hover:bg-slate-50/50 dark:hover:bg-slate-600/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {/* Rank Badge */}
                        <div className="w-7 h-7 rounded-lg bg-slate-900 text-white font-black text-xs flex items-center justify-center shadow-sm shrink-0">
                          #{cand.rank}
                        </div>
                        <Avatar name={cand.full_name || 'Candidate'} size="md" />
                        <div>
                          <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                            {cand.full_name || 'Unnamed Candidate'}
                            {cand.is_shortlisted && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                Shortlisted ✓
                              </span>
                            )}
                          </h3>
                          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            <span>{cand.experience_years} Yrs Exp</span>
                            <span>•</span>
                            <span className="truncate max-w-[180px]">
                              {cand.education && cand.education.length > 0
                                ? cand.education[0]
                                : 'Degree Holder'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Match Score Badge */}
                      <div className="text-right shrink-0">
                        <div
                          className={`px-2.5 py-1 rounded-lg border font-black text-xs inline-flex items-center gap-1 ${scoreColor}`}
                        >
                          <span>Match Score:</span>
                          <span className="text-sm">{cand.match_score}%</span>
                        </div>
                      </div>
                    </div>

                    {/* Skill Tags */}
                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      {cand.skills.slice(0, 5).map((skill) => {
                        const isReq = currentJob?.required_skills?.some(
                          (r) => r.toLowerCase() === skill.toLowerCase()
                        );
                        return (
                          <span
                            key={skill}
                            className={`text-[11px] font-medium px-2 py-0.5 rounded-md ${
                              isReq
                                ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-400 font-semibold'
                                : 'bg-slate-100 dark:bg-slate-600 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            {skill}
                          </span>
                        );
                      })}
                      {cand.skills.length > 5 && (
                        <span className="text-[10px] text-slate-400 font-medium">
                          +{cand.skills.length - 5} more
                        </span>
                      )}
                    </div>

                    {/* Score Bar */}
                    <div className="mt-3 w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 rounded-full ${
                          cand.match_score >= 80
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                            : cand.match_score >= 60
                            ? 'bg-gradient-to-r from-blue-500 to-indigo-500'
                            : 'bg-gradient-to-r from-amber-500 to-orange-500'
                        }`}
                        style={{ width: `${cand.match_score}%` }}
                      />
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewProfile(cand.id);
                        }}
                        className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      >
                        View Profile
                      </button>

                      <Button
                        size="sm"
                        disabled={cand.is_shortlisted || shortlistingCandidateId === cand.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleShortlist(cand.id);
                        }}
                        className={
                          cand.is_shortlisted
                            ? 'bg-emerald-600 text-white cursor-default text-xs py-1 px-3'
                            : 'bg-blue-600 hover:bg-blue-700 text-white text-xs py-1 px-3 shadow-sm'
                        }
                      >
                        {shortlistingCandidateId === cand.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : cand.is_shortlisted ? (
                          'Shortlisted ✓'
                        ) : (
                          'Shortlist'
                        )}
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT CARD: Skill Gap Analysis */}
        <div className="lg:col-span-6 xl:col-span-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 p-6 shadow-sm flex flex-col min-h-[600px]">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700 mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-600" />
                Skill Gap Analysis
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Comparing Required Job Skills vs Candidate Skills
              </p>
            </div>
            {selectedCandidate && (
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-full">
                {selectedCandidate.full_name}
              </span>
            )}
          </div>

          {gapLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-400 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <p className="text-sm font-medium">Analyzing candidate skill gap...</p>
            </div>
          ) : !selectedCandidate || !skillGap ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-400 dark:text-slate-500 gap-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-400 dark:text-slate-500">
                <Layers className="w-6 h-6" />
              </div>
              <p className="font-bold text-slate-700 dark:text-slate-300">Select a candidate to view skill gap</p>
              <p className="text-xs max-w-xs">
                Click any candidate on the left card to compare their skills against position requirements.
              </p>
            </div>
          ) : (
            <div className="space-y-6 flex-1 overflow-y-auto pr-1">
              {/* Candidate Info Header */}
              <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-xl border border-slate-200/70 dark:border-slate-600 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">{skillGap.candidate_name}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Comparing against: {skillGap.job_title}</p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-blue-600">{skillGap.overall_match_score}%</span>
                  <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">Overall Match</p>
                </div>
              </div>

              {/* Matching Summary Chips */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200/80 dark:border-emerald-800 rounded-xl flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div>
                    <div className="text-lg font-bold text-emerald-900 dark:text-emerald-300">{skillGap.matching_skills_count}</div>
                    <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Matching Skills</div>
                  </div>
                </div>

                <div className="p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200/80 dark:border-rose-800 rounded-xl flex items-center gap-3">
                  <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
                  <div>
                    <div className="text-lg font-bold text-rose-900 dark:text-rose-300">{skillGap.missing_skills_count}</div>
                    <div className="text-xs font-semibold text-rose-700 dark:text-rose-400">Missing Skills</div>
                  </div>
                </div>
              </div>

              {/* Skills Comparison Table */}
              <div>
                <h4 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-3">
                  Skills Breakdown
                </h4>
                <div className="border border-slate-200 dark:border-slate-600 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-700">
                  {skillGap.items.map((item, idx) => {
                    return (
                      <div key={idx} className="p-3 bg-white dark:bg-slate-800 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-700/50">
                        <div className="flex items-center gap-2.5">
                          {item.status === 'matching' ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          ) : item.status === 'partial' ? (
                            <AlertCircle className="w-4 h-4 text-amber-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-rose-500" />
                          )}
                          <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">{item.skill_name}</span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 capitalize">({item.category})</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                              item.status === 'matching'
                                ? 'bg-emerald-100 text-emerald-800'
                                : item.status === 'partial'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {item.level}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* AI Recommendation Section */}
              <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200/80 dark:border-blue-800 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-blue-900 dark:text-blue-300 font-bold text-sm">
                  <Lightbulb className="w-4 h-4 text-blue-600" />
                  Recommended Skills & Insights
                </div>
                <div className="space-y-1.5 text-xs text-blue-950 dark:text-blue-200 leading-relaxed font-medium">
                  {skillGap.recommendations.map((rec, i) => (
                    <p key={i} className="flex items-start gap-2">
                      <span className="text-blue-500 font-bold">•</span>
                      <span>{rec}</span>
                    </p>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Create Job Position */}
      <Modal open={createModalOpen} onClose={() => setCreateModalOpen(false)} title="Create New Job Position">
        <form onSubmit={handleCreateJobPosition} className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Job Title *
            </label>
            <Input
              type="text"
              required
              placeholder="e.g. Machine Learning Engineer"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Job Description
            </label>
            <textarea
              rows={3}
              placeholder="Brief description of responsibilities and goals..."
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              className="w-full p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Required Skills (comma separated) *
              </label>
              <Input
                type="text"
                required
                placeholder="Python, TensorFlow, ML, NLP"
                value={newReqSkills}
                onChange={(e) => setNewReqSkills(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Preferred Skills (comma separated)
              </label>
              <Input
                type="text"
                placeholder="PyTorch, Docker, AWS, MLOps"
                value={newPrefSkills}
                onChange={(e) => setNewPrefSkills(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Minimum Experience (Years)
              </label>
              <Input
                type="number"
                min={0}
                value={newMinExp}
                onChange={(e) => setNewMinExp(Number(e.target.value))}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Education Requirement
              </label>
              <Input
                type="text"
                placeholder="Bachelor's Degree in CS/AI"
                value={newEdu}
                onChange={(e) => setNewEdu(e.target.value)}
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="bg-blue-600 text-white hover:bg-blue-700">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Position'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Edit Job Position */}
      <Modal open={editModalOpen} onClose={() => setEditModalOpen(false)} title="Edit Job Position">
        <form onSubmit={handleEditJobPosition} className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Job Title *
            </label>
            <Input
              type="text"
              required
              placeholder="e.g. Senior Backend Engineer"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Job Description
            </label>
            <textarea
              rows={3}
              placeholder="Description of position requirements..."
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className="w-full p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Required Skills (comma separated) *
              </label>
              <Input
                type="text"
                required
                placeholder="Python, FastAPI, SQL"
                value={editReqSkills}
                onChange={(e) => setEditReqSkills(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Preferred Skills (comma separated)
              </label>
              <Input
                type="text"
                placeholder="Docker, AWS, React"
                value={editPrefSkills}
                onChange={(e) => setEditPrefSkills(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Minimum Experience (Years)
              </label>
              <Input
                type="number"
                min={0}
                value={editMinExp}
                onChange={(e) => setEditMinExp(Number(e.target.value))}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Education Requirement
              </label>
              <Input
                type="text"
                placeholder="Bachelor's Degree"
                value={editEdu}
                onChange={(e) => setEditEdu(e.target.value)}
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setEditModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={editSubmitting} className="bg-blue-600 text-white hover:bg-blue-700">
              {editSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* View Candidate Modal */}
      <ViewCandidateModal candidate={viewingCandidate} onClose={() => setViewingCandidate(null)} />
    </div>
  );
}

