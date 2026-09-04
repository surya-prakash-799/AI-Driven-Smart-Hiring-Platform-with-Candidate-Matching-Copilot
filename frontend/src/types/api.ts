export interface ExperienceItem {
  company?: string | null;
  role?: string | null;
  duration?: string | null;
}

export interface BackendCandidate {
  id: number;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  education: string[] | null;
  experience: ExperienceItem[] | null;
  skills: string[] | null;
  projects: string[] | null;
  certifications: string[] | null;
  linkedin: string | null;
  github: string | null;
  resume_file: string | null;
  resume_text: string | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface CandidateListResponse {
  candidates: BackendCandidate[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface ExtractedData {
  full_name: string | null;
  email: string | null;
  phone: string | null;
  education: string[] | null;
  experience: ExperienceItem[] | null;
  skills: string[];
  projects: string[] | null;
  certifications: string[] | null;
  linkedin: string | null;
  github: string | null;
}

export interface UploadResponse {
  status: string;
  message: string;
  candidate: BackendCandidate | null;
  extracted_data: ExtractedData | null;
}

export interface PipelineStats {
  applied: number;
  shortlisted: number;
  interview: number;
  selected: number;
  rejected: number;
}

export interface AIInsightsStats {
  topCandidate?: string | null;
  bestMatchScore: number;
  mostRequestedSkills: string[];
  highestDemandPosition?: string | null;
  averageMatchScore: number;
  recommendations: string[];
}

export interface TopCandidateMatch {
  candidate_id: number;
  candidate_name: string;
  job_title: string;
  match_score: number;
  matched_skills: string[];
  status: string;
}

export interface InterviewStatusStats {
  scheduled: number;
  in_progress: number;
  completed: number;
  pending: number;
}

export interface RecentActivityItem {
  id: number;
  type: 'upload' | 'shortlist' | 'job' | 'interview';
  message: string;
  time: string;
  timestamp: string;
}


export interface DashboardStats {
  totalCandidates: number;
  activeJobPositions: number;
  shortlistedCandidates: number;
  pendingInterviews: number;
  uploadsToday: number;
  parsed: number;
  pending: number;
  shortlisted: number;
  rejected: number;
  successRate: number;
  pipeline?: PipelineStats;
  aiInsights?: AIInsightsStats;
  topCandidateMatches?: TopCandidateMatch[];
  interviewStatus?: InterviewStatusStats;
  recentActivity?: RecentActivityItem[];
}


export interface CandidateSearchParams {
  name?: string;
  email?: string;
  skill?: string;
  education?: string;
  experience?: string;
  status?: string;
  page?: number;
  per_page?: number;
}

export interface CandidateUpdateInput {
  full_name?: string;
  email?: string;
  phone?: string;
  education?: string[];
  skills?: string[];
  projects?: string[];
  certifications?: string[];
  status?: string;
}

export interface JobPosition {
  id: number;
  title: string;
  description?: string | null;
  required_skills: string[];
  preferred_skills?: string[];
  minimum_experience: number;
  education?: string | null;
  created_at?: string;
  updated_at?: string;
  shortlisted_count?: number;
}

export interface JobPositionCreateInput {
  title: string;
  description?: string;
  required_skills: string[];
  preferred_skills?: string[];
  minimum_experience: number;
  education?: string;
}

export interface JobPositionUpdateInput {
  title?: string;
  description?: string;
  required_skills?: string[];
  preferred_skills?: string[];
  minimum_experience?: number;
  education?: string;
}

export interface VoiceScreeningInput {
  candidate_id: number;
  job_position_id: number;
  duration_seconds: number;
  status?: string;
  result_summary?: string;
}

export interface VoiceScreeningItem {
  id: number;
  candidate_id: number;
  candidate_name: string;
  job_position_id: number;
  job_title: string;
  status: string;
  duration_seconds: number;
  transcript?: string | null;
  result_summary: string;
  created_at: string;
}

export interface VoiceScreeningTranscriptResponse {
  success: boolean;
  candidate_id: number;
  job_position_id: number;
  transcript: string;
  status: string;
}



export interface CandidateMatchItem {
  id: number;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  skills: string[];
  experience_years: number;
  education: string[];
  match_score: number;
  required_match_pct: number;
  preferred_match_pct: number;
  is_shortlisted: boolean;
  rank: number;
}

export interface JobPositionCandidatesResponse {
  job_position: JobPosition;
  total_candidates: number;
  candidates: CandidateMatchItem[];
}

export interface SkillSearchResponse {
  skill: string;
  total_candidates: number;
  candidates: CandidateMatchItem[];
}

export interface SkillGapItem {
  skill_name: string;
  status: 'matching' | 'partial' | 'missing';
  category: 'required' | 'preferred';
  level: string;
}

export interface SkillGapAnalysisResponse {
  candidate_id: number;
  candidate_name: string;
  job_position_id: number;
  job_title: string;
  overall_match_score: number;
  matching_skills_count: number;
  missing_skills_count: number;
  items: SkillGapItem[];
  recommendations: string[];
}

export interface ShortlistResponse {
  status: string;
  message: string;
  shortlist_id: number;
  candidate_id: number;
  job_position_id: number;
  match_score: number;
}

export interface InterviewQuestion {
  id: number;
  question: string;
  category: string;
  skill?: string | null;
  difficulty: string;
  question_order: number;
}

export interface Interview {
  id: number;
  job_position_id: number;
  candidate_id: number;
  interview_type: string;
  difficulty: string;
  status: string;
  candidate_name?: string;
  job_title?: string;
  questions: InterviewQuestion[];
  created_at?: string;
  updated_at?: string;
}

export interface InterviewGenerateInput {
  candidate_id: number;
  job_position_id: number;
  interview_type: string;
  difficulty: string;
  number_of_questions: number;
}

export interface InterviewAnswer {
  id: number;
  question_id: number;
  answer: string;
  score?: number | null;
  feedback?: string | null;
  created_at?: string;
}

export interface InterviewAnswerInput {
  answer: string;
  question_id?: number;
}

// --- AI Interview Assistant (Question Generator + Simulation) ---

export interface QuestionGeneratorRequest {
  job_position_id: number;
  interview_type: string;
}

export interface GeneratedQuestionItem {
  question: string;
}

export interface QuestionGeneratorResponse {
  status: string;
  job_position_id: number;
  job_title: string;
  interview_type: string;
  total: number;
  questions: GeneratedQuestionItem[];
}

export interface SimulationStartRequest {
  job_position_id: number;
  interview_type: string;
  candidate_id: number;
}

export interface SimulationQuestion {
  id: number;
  question: string;
  category?: string | null;
  question_number: number;
}

export interface SimulationAnswerFeedback {
  question_id?: number | null;
  score?: number | null;
  feedback?: string | null;
}

export interface SimulationStartResponse {
  session_id: number;
  status: string;
  job_position_id: number;
  job_title: string;
  candidate_id: number;
  candidate_name: string;
  interview_type: string;
  question_number: number;
  total_questions: number;
  answered_questions: number;
  remaining_questions: number;
  is_last: boolean;
  question?: SimulationQuestion | null;
  last_answer?: SimulationAnswerFeedback | null;
}

export interface SimulationAnswerRequest {
  session_id: number;
  answer: string;
}

export interface SimulationAnswerResponse {
  session_id: number;
  status: string;
  message?: string | null;
  answered_questions?: number | null;
  remaining_questions?: number | null;
  average_score?: number | null;
  total_score?: number | null;
  next_question?: SimulationQuestion | null;
  last_feedback?: string | null;
  job_title?: string | null;
  candidate_name?: string | null;
  interview_type?: string | null;
  question_number?: number | null;
  total_questions?: number | null;
  is_last?: boolean | null;
}

