import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';
import type {
  BackendCandidate,
  CandidateListResponse,
  CandidateSearchParams,
  CandidateUpdateInput,
  DashboardStats,
  ExtractedData,
  ExperienceItem,
  UploadResponse,
  JobPosition,
  JobPositionCreateInput,
  JobPositionUpdateInput,
  VoiceScreeningInput,
  VoiceScreeningItem,
  VoiceScreeningTranscriptResponse,
  CandidateMatchItem,


  JobPositionCandidatesResponse,
  SkillSearchResponse,
  SkillGapItem,
  SkillGapAnalysisResponse,
  ShortlistResponse,
  Interview,
  InterviewGenerateInput,
  InterviewAnswer,
  InterviewAnswerInput,
  InterviewQuestion,
  QuestionGeneratorRequest,
  QuestionGeneratorResponse,
  SimulationStartRequest,
  SimulationStartResponse,
  SimulationAnswerRequest,
  SimulationAnswerResponse,
  SimulationQuestion,
  SimulationAnswerFeedback,
} from '../types/api';


export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';


export type {
  BackendCandidate,
  CandidateListResponse,
  CandidateSearchParams,
  CandidateUpdateInput,
  DashboardStats,
  ExtractedData,
  ExperienceItem,
  UploadResponse,
  JobPosition,
  JobPositionCreateInput,
  CandidateMatchItem,
  JobPositionCandidatesResponse,
  SkillSearchResponse,
  SkillGapItem,
  SkillGapAnalysisResponse,
  ShortlistResponse,
  Interview,
  InterviewGenerateInput,
  InterviewAnswer,
  InterviewAnswerInput,
  InterviewQuestion,
  QuestionGeneratorRequest,
  QuestionGeneratorResponse,
  SimulationStartRequest,
  SimulationStartResponse,
  SimulationAnswerRequest,
  SimulationAnswerResponse,
  SimulationQuestion,
  SimulationAnswerFeedback,
  VoiceScreeningInput,
  VoiceScreeningItem,
  VoiceScreeningTranscriptResponse,
} from '../types/api';


const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    return Promise.reject(error);
  }
);

export function getErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    const serverMessage = (data as { detail?: string } | undefined)?.detail;
    if (serverMessage) return serverMessage;
    const status = error.response?.status;

    // The Vite dev proxy forwards a 500 with an empty/raw body when the backend is unreachable.
    // Detect that case so users see an actionable message instead of a generic server error.
    const isBackendUnreachable =
      status === 500 &&
      (data === undefined ||
        data === null ||
        data === '' ||
        typeof data === 'string' ||
        (typeof data === 'object' && !('detail' in (data as Record<string, unknown>))));

    if (isBackendUnreachable) return 'Cannot reach the backend server. Please verify the backend status.';
    if (status === 413) return 'File is too large (maximum 10 MB).';
    if (status === 400) return 'Invalid request. Please check your input.';
    if (status === 404) return 'The requested resource was not found.';
    if (status === 401 || status === 403) return 'You are not authorized to perform this action.';
    if (status === 500) return 'The server encountered an error. Please try again later.';
    if (!error.response) return 'Cannot connect to backend server. This may be caused by a CORS restriction or the backend waking up.';
    return error.message || fallback;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

export async function fetchCandidates(
  page = 1,
  perPage = 20,
  search?: string
): Promise<CandidateListResponse> {
  const params: Record<string, string | number> = { page, per_page: perPage };
  if (search) params.search = search;
  const { data } = await apiClient.get<CandidateListResponse>('/candidates', { params });
  return data;
}

export async function searchCandidates(
  filters: CandidateSearchParams,
  page = 1,
  perPage = 20
): Promise<CandidateListResponse> {
  const params: Record<string, string | number> = { page, per_page: perPage };
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params[key] = value;
  });
  const { data } = await apiClient.get<CandidateListResponse>('/search', { params });
  return data;
}

export async function fetchCandidate(id: number): Promise<BackendCandidate> {
  const { data } = await apiClient.get<BackendCandidate>(`/candidates/${id}`);
  return data;
}

export async function updateCandidate(
  id: number,
  payload: CandidateUpdateInput
): Promise<BackendCandidate> {
  const { data } = await apiClient.put<BackendCandidate>(`/candidates/${id}`, payload);
  return data;
}

export async function deleteCandidate(id: number): Promise<void> {
  await apiClient.delete(`/candidates/${id}`);
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const { data } = await apiClient.get<DashboardStats>('/dashboard');
  return data;
}

export async function uploadResume(
  file: File,
  onProgress?: (percent: number) => void
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const config: AxiosRequestConfig = {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 180000,
    onUploadProgress: (event) => {
      if (event.total && onProgress) {
        onProgress(Math.min(Math.round((event.loaded / event.total) * 100), 99));
      }
    },
  };

  const { data } = await apiClient.post<UploadResponse>('/upload', formData, config);
  return data;
}

export async function fetchJobPositions(): Promise<JobPosition[]> {
  const { data } = await apiClient.get<JobPosition[]>('/job-positions');
  return data;
}

export async function createJobPosition(payload: JobPositionCreateInput): Promise<JobPosition> {
  const { data } = await apiClient.post<JobPosition>('/job-positions', payload);
  return data;
}

export async function updateJobPosition(jobId: number, payload: JobPositionUpdateInput): Promise<JobPosition> {
  const { data } = await apiClient.put<JobPosition>(`/job-positions/${jobId}`, payload);
  return data;
}

export async function deleteJobPosition(jobId: number): Promise<void> {
  await apiClient.delete(`/job-positions/${jobId}`);
}

export async function submitVoiceScreening(payload: VoiceScreeningInput): Promise<VoiceScreeningItem> {
  const { data } = await apiClient.post<VoiceScreeningItem>('/voice-screening/submit', payload);
  return data;
}

export async function transcribeVoiceScreening(
  candidateId: number,
  jobPositionId: number,
  audioBlob: Blob,
  durationSeconds: number = 0
): Promise<VoiceScreeningTranscriptResponse> {
  const formData = new FormData();
  formData.append('candidate_id', String(candidateId));
  formData.append('job_position_id', String(jobPositionId));
  formData.append('duration_seconds', String(durationSeconds));
  formData.append('audio', audioBlob, 'recording.webm');

  const config: AxiosRequestConfig = {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000,
  };

  const { data } = await apiClient.post<VoiceScreeningTranscriptResponse>(
    '/voice-screening/transcribe',
    formData,
    config
  );
  return data;
}

export async function fetchVoiceScreenings(limit: number = 10): Promise<VoiceScreeningItem[]> {
  const { data } = await apiClient.get<VoiceScreeningItem[]>('/voice-screening', { params: { limit } });
  return data;
}



export async function fetchJobPositionMatching(
  jobId: number,
  skill?: string
): Promise<JobPositionCandidatesResponse> {
  const params: Record<string, string> = {};
  if (skill) params.skill = skill;
  const { data } = await apiClient.get<JobPositionCandidatesResponse>(`/job-positions/${jobId}/matching`, { params });
  return data;
}

export async function searchCandidatesBySkill(
  skill: string,
  jobId?: number
): Promise<SkillSearchResponse> {
  const params: Record<string, string | number> = { skill };
  if (jobId) params.job_id = jobId;
  const { data } = await apiClient.get<SkillSearchResponse>('/candidates/search', { params });
  return data;
}

export async function shortlistCandidate(
  jobId: number,
  candidateId: number
): Promise<ShortlistResponse> {
  const { data } = await apiClient.post<ShortlistResponse>(`/job-positions/${jobId}/shortlist/${candidateId}`);
  return data;
}

export async function fetchSkillGapAnalysis(
  candidateId: number,
  jobId: number
): Promise<SkillGapAnalysisResponse> {
  const { data } = await apiClient.get<SkillGapAnalysisResponse>(`/candidates/${candidateId}/skill-gap/${jobId}`);
  return data;
}

export async function generateInterview(
  payload: InterviewGenerateInput
): Promise<Interview> {
  const { data } = await apiClient.post<Interview>('/interviews/generate', payload);
  return data;
}

export async function fetchInterview(interviewId: number): Promise<Interview> {
  const { data } = await apiClient.get<Interview>(`/interviews/${interviewId}`);
  return data;
}

export async function submitInterviewAnswer(
  interviewId: number,
  payload: InterviewAnswerInput
): Promise<InterviewAnswer> {
  const { data } = await apiClient.post<InterviewAnswer>(`/interviews/${interviewId}/answers`, payload);
  return data;
}

export async function completeInterview(
  interviewId: number
): Promise<{ interview_id: number; status: string; average_score: number; total_questions: number; answered_questions: number }> {
  const { data } = await apiClient.post(`/interviews/${interviewId}/complete`);
  return data;
}

export async function fetchInterviewQuestions(interviewId: number): Promise<{ interview_id: number; questions: (InterviewQuestion & { has_answer: boolean })[] }> {
  const { data } = await apiClient.get(`/interviews/${interviewId}/questions`);
  return data;
}

// --- AI Interview Assistant (Question Generator + Simulation) ---

export async function generateQuestionsForJob(
  payload: QuestionGeneratorRequest
): Promise<QuestionGeneratorResponse> {
  const { data } = await apiClient.post<QuestionGeneratorResponse>('/interview/generate', payload);
  return data;
}

export async function startInterviewSimulation(
  payload: SimulationStartRequest
): Promise<SimulationStartResponse> {
  const { data } = await apiClient.post<SimulationStartResponse>('/interview/simulation/start', payload);
  return data;
}

export async function submitSimulationAnswer(
  payload: SimulationAnswerRequest
): Promise<SimulationAnswerResponse> {
  const { data } = await apiClient.post<SimulationAnswerResponse>('/interview/simulation/answer', payload);
  return data;
}

export default apiClient;

