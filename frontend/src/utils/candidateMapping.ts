import type { BackendCandidate } from '../types/api';
import type { Candidate, CandidateStatus } from '../types/candidate';
import { describeExperience, getInitials, parseExperienceYears } from './format';

const MATCH_SCORE_DEFAULT = 0;

export function toBackendStatus(status: CandidateStatus): string {
  switch (status) {
    case 'Completed':
      // Backend accepts only: pending, shortlisted, rejected, review.
      return 'review';
    case 'Shortlisted':
      return 'shortlisted';
    case 'Rejected':
      return 'rejected';
    case 'Processing':
    default:
      return 'pending';
  }
}

const STATUS_REASONS: Record<CandidateStatus, string> = {
  Processing:
    'Resume parsing and AI profile extraction are still in progress. The candidate will be ready for review shortly.',
  Completed: 'Profile extraction is complete and the candidate is ready for review.',
  Shortlisted: 'This candidate matched a requisition and has been shortlisted.',
  Rejected: 'This candidate was not selected for the current requisition.',
};

export function getStatusReason(status: CandidateStatus): string {
  return STATUS_REASONS[status] ?? STATUS_REASONS.Processing;
}

export function toFrontendStatus(status: string | null | undefined): CandidateStatus {
  switch ((status || '').toLowerCase()) {
    case 'completed':
      return 'Completed';
    case 'shortlisted':
      return 'Shortlisted';
    case 'rejected':
      return 'Rejected';
    case 'pending':
    case 'review':
    default:
      return 'Processing';
  }
}

export function mapBackendToCandidate(b: BackendCandidate): Candidate {
  const skills = Array.isArray(b.skills) ? b.skills.filter(Boolean) : [];
  const projects = Array.isArray(b.projects) ? b.projects.filter(Boolean) : [];
  const certifications = Array.isArray(b.certifications) ? b.certifications.filter(Boolean) : [];
  const education = Array.isArray(b.education) && b.education.length > 0 ? b.education.join(', ') : '--';
  const experience = describeExperience(b.experience);
  const experienceYears = parseExperienceYears(b.experience);

  return {
    id: `cand-${b.id}`,
    backendId: b.id,
    name: b.full_name || 'Unknown',
    email: b.email || '--',
    phone: b.phone || '--',
    role: experience,
    experience,
    experienceYears,
    location: '--',
    matchScore: MATCH_SCORE_DEFAULT,
    education,
    skills,
    projectsCount: projects.length,
    projects,
    certifications,
    status: toFrontendStatus(b.status),
    appliedDate: b.created_at || new Date().toISOString(),
    resumeFileName: b.resume_file || '',
    linkedin: b.linkedin || undefined,
    github: b.github || undefined,
  };
}

export function toCandidateUpdate(candidate: Candidate) {
  return {
    full_name: candidate.name === 'Unknown' ? undefined : candidate.name,
    email: candidate.email === '--' ? undefined : candidate.email,
    phone: candidate.phone === '--' ? undefined : candidate.phone,
    skills: candidate.skills,
    education: candidate.education === '--' ? undefined : [candidate.education],
    experience: candidate.role && candidate.role !== '--' ? [{ role: candidate.role, duration: candidate.experience }] : undefined,
    projects: candidate.projects,
    certifications: candidate.certifications,
    status: toBackendStatus(candidate.status),
  };
}

export function deriveInitials(candidate: Candidate): string {
  return getInitials(candidate.name);
}
