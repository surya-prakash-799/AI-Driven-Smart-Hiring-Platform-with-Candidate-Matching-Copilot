import { useCallback, useState } from 'react';
import { GraduationCap, Wrench, FileText, Download, Save, Clock, CheckCircle2 } from 'lucide-react';
import type { Candidate, CandidateStatus } from '../types/candidate';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Avatar } from './ui/Avatar';
import { Badge } from './ui/Badge';
import { StatusBadge } from './ui/StatusBadge';
import { useToast } from '../context/ToastContext';
import { formatDate } from '../utils/format';
import { getStatusReason } from '../utils/candidateMapping';

interface ViewCandidateModalProps {
  candidate: Candidate | null;
  onClose: () => void;
}

export function ViewCandidateModal({ candidate, onClose }: ViewCandidateModalProps) {
  return (
    <Modal
      open={Boolean(candidate)}
      onClose={onClose}
      size="lg"
      hideCloseButton
    >
      {candidate && (
        <div className="-mx-6 -mt-5 overflow-hidden">
          <div className="p-6 bg-gradient-to-r from-blue-600 to-blue-700 text-white relative">
            <button
              type="button"
              onClick={onClose}
              aria-label="Close candidate profile"
              className="absolute right-4 top-4 text-white/70 hover:text-white p-1 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            >
              ✕
            </button>

            <div className="flex items-center gap-4">
              <Avatar name={candidate.name} src={candidate.avatarUrl} size="lg" className="ring-4 ring-white/20" />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-xl font-extrabold truncate">{candidate.name}</h3>
                  {candidate.matchScore > 0 && (
                    <span className="bg-white/20 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">
                      {candidate.matchScore}% Match
                    </span>
                  )}
                  <StatusBadge status={candidate.status} />
                </div>
                <p className="text-sm text-blue-100 mt-0.5">{candidate.role}</p>
                <p className="text-xs text-blue-200 mt-1">
                  {candidate.experience} experience · Applied {formatDate(candidate.appliedDate)}
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50 dark:bg-slate-700/60 rounded-xl border border-slate-100 dark:border-slate-600 text-xs">
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Email Address</p>
                <p className="font-semibold text-slate-900 dark:text-white font-mono mt-0.5 break-all">{candidate.email}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Phone</p>
                <p className="font-semibold text-slate-900 dark:text-white mt-0.5">{candidate.phone}</p>
              </div>
            </div>

            <div
              className={`p-3.5 rounded-xl border flex items-start gap-3 text-xs ${
                candidate.status === 'Processing'
                  ? 'bg-amber-50/70 border-amber-100'
                  : 'bg-emerald-50/60 border-emerald-100'
              }`}
            >
              <span
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  candidate.status === 'Processing' ? 'bg-amber-500 text-white' : 'bg-emerald-500 text-white'
                }`}
              >
                {candidate.status === 'Processing' ? (
                  <Clock className="w-4 h-4 animate-pulse" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
              </span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Status Details</p>
                <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 leading-relaxed">{getStatusReason(candidate.status)}</p>
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-blue-600" />
                Education
              </p>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-700/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-600">
                {candidate.education}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Wrench className="w-4 h-4 text-blue-600" />
                Extracted Skills
              </p>
              {candidate.skills.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {candidate.skills.map((skill) => (
                    <span key={skill} className="px-3 py-1 bg-blue-600 text-white font-semibold text-xs rounded-full shadow-sm">
                      {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 dark:text-slate-500 italic">No skills detected</p>
              )}
            </div>

            {candidate.projects && candidate.projects.length > 0 && (
              <div>
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1.5">Key Projects</p>
                <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-700/60 p-3 rounded-xl border border-slate-100 dark:border-slate-600">
                  {candidate.projects.slice(0, 5).map((project) => (
                    <li key={project} className="flex items-start gap-1.5">
                      <span className="text-blue-500">•</span>
                      <span>{project}</span>
                    </li>
                  ))}
                  {candidate.projects.length > 5 && (
                    <li className="text-blue-600 font-semibold">+{candidate.projects.length - 5} more</li>
                  )}
                </ul>
              </div>
            )}

            <div className="p-3.5 bg-blue-50/60 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 bg-blue-600 text-white rounded-lg flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{candidate.resumeFileName || 'Resume attached'}</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Processed by AI Copilot</p>
                </div>
              </div>
              <Button
                variant="primary"
                onClick={() => onClose()}
                aria-label="Download resume"
              >
                <Download className="w-3.5 h-3.5" />
                Download
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

interface EditCandidateModalProps {
  candidate: Candidate | null;
  onClose: () => void;
  onSave: (updated: Candidate) => Promise<void> | void;
}

export function EditCandidateModal({ candidate, onClose, onSave }: EditCandidateModalProps) {
  const toast = useToast();
  const [formData, setFormData] = useState<Candidate | null>(candidate);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateField = useCallback(<K extends keyof Candidate>(key: K, value: Candidate[K]) => {
    setFormData((prev) => (prev ? { ...prev, [key]: value } : prev));
  }, []);

  const validate = (): boolean => {
    const nextErrors: Record<string, string> = {};
    if (!formData?.name.trim()) nextErrors.name = 'Name is required.';
    if (!formData?.email.trim()) nextErrors.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) nextErrors.email = 'Enter a valid email address.';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!formData || !validate()) return;
    setSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch {
      toast.error('Could not save candidate');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={Boolean(candidate)}
      onClose={onClose}
      title="Edit Candidate Profile"
      description="Update the structured candidate information."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="edit-candidate-form" loading={saving}>
            <Save className="w-4 h-4" />
            Save Changes
          </Button>
        </>
      }
    >
      {formData && (
        <form id="edit-candidate-form" onSubmit={handleSubmit} className="space-y-4 text-xs" noValidate>
          <Input
            label="Candidate Name"
            value={formData.name}
            onChange={(event) => updateField('name', event.target.value)}
            error={errors.name}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(event) => updateField('email', event.target.value)}
              error={errors.email}
            />
            <Input
              label="Phone"
              value={formData.phone}
              onChange={(event) => updateField('phone', event.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Role Title"
              value={formData.role}
              onChange={(event) => updateField('role', event.target.value)}
            />
            <Select
              label="Status"
              value={formData.status}
              onChange={(event) => updateField('status', event.target.value as CandidateStatus)}
              options={[
                { value: 'Completed', label: 'Completed' },
                { value: 'Shortlisted', label: 'Shortlisted' },
                { value: 'Processing', label: 'Processing' },
                { value: 'Rejected', label: 'Rejected' },
              ]}
            />
          </div>

          <Input
            label="Skills (comma separated)"
            value={formData.skills.join(', ')}
            onChange={(event) =>
              updateField('skills', event.target.value.split(',').map((s) => s.trim()).filter(Boolean))
            }
            hint="e.g. Python, React, SQL"
          />

          <div className="pt-2 flex flex-wrap gap-1.5">
            {formData.skills.length > 0 ? (
              formData.skills.map((skill) => (
                <Badge key={skill} tone="blue">
                  {skill}
                </Badge>
              ))
            ) : (
              <span className="text-[11px] text-slate-400 dark:text-slate-500 italic">No skills added yet</span>
            )}
          </div>
        </form>
      )}
    </Modal>
  );
}
