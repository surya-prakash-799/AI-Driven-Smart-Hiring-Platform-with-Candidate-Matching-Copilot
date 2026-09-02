export type CandidateStatus = 'Completed' | 'Processing' | 'Rejected' | 'Shortlisted';

export interface Candidate {
  id: string;
  backendId?: number;
  name: string;
  email: string;
  phone: string;
  role: string;
  experience: string;
  experienceYears: number;
  location: string;
  matchScore: number;
  education: string;
  skills: string[];
  projectsCount: number;
  projects?: string[];
  certifications?: string[];
  status: CandidateStatus;
  appliedDate: string;
  resumeFileName: string;
  avatarUrl?: string;
  linkedin?: string;
  github?: string;
}

export interface MetricStat {
  title: string;
  value: string | number;
  change: string;
  isPositive: boolean;
  iconName: string;
  progress: number;
  color: 'blue' | 'emerald' | 'amber' | 'indigo' | 'rose';
}

export type CandidateFilterKey = 'status' | 'skill' | 'education' | 'experience';
