import { useState, useEffect, useCallback } from 'react';
import {
  MessageSquare,
  Play,
  CheckCircle,
  Send,
  Bot,
  User,
  Sparkles,
  RefreshCw,
  Briefcase,
  Inbox,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Spinner } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';
import { Card } from '../components/ui/Card';
import { TypewriterText } from '../components/TypewriterText';
import {
  fetchJobPositions,
  fetchCandidates,
  generateQuestionsForJob,
  startInterviewSimulation,
  submitSimulationAnswer,
  getErrorMessage,
} from '../services/api';
import type {
  JobPosition,
  BackendCandidate,
  QuestionGeneratorResponse,
  SimulationStartResponse,
  SimulationQuestion,
} from '../services/api';
import { useToast } from '../context/ToastContext';
import { cn } from '../utils/cn';

const INTERVIEW_TYPES = [
  { value: 'Technical', label: 'Technical' },
  { value: 'HR', label: 'HR' },
  { value: 'Behavioral', label: 'Behavioral' },
  { value: 'Mixed', label: 'Mixed' },
];

const CATEGORY_COLORS: Record<string, string> = {
  Technical: 'bg-blue-100 text-blue-700',
  HR: 'bg-purple-100 text-purple-700',
  Behavioral: 'bg-amber-100 text-amber-700',
  Mixed: 'bg-cyan-100 text-cyan-700',
};

export default function InterviewAssistance() {
  const { success, error: showError } = useToast();

  // Shared dropdown data
  const [jobPositions, setJobPositions] = useState<JobPosition[]>([]);
  const [candidates, setCandidates] = useState<BackendCandidate[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Question Generator state (left panel)
  const [genJobId, setGenJobId] = useState<number | ''>('');
  const [genType, setGenType] = useState('Technical');
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<QuestionGeneratorResponse | null>(null);

  // Interview Simulation state (right panel)
  const [simJobId, setSimJobId] = useState<number | ''>('');
  const [simType, setSimType] = useState('Technical');
  const [simCandidateId, setSimCandidateId] = useState<number | ''>('');
  const [starting, setStarting] = useState(false);
  const [simulation, setSimulation] = useState<SimulationStartResponse | null>(null);
  const [current, setCurrent] = useState<SimulationQuestion | null>(null);
  const [answerText, setAnswerText] = useState('');
  const [qaHistory, setQaHistory] = useState<{ question_number: number; question: string; answer: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [completedResult, setCompletedResult] = useState<{
    average_score: number;
    answered_questions: number;
    total_questions: number;
  } | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoadingData(true);
        const [jobsData, candsData] = await Promise.all([
          fetchJobPositions(),
          fetchCandidates(1, 100),
        ]);
        setJobPositions(jobsData);
        setCandidates(candsData.candidates);
      } catch (err) {
        showError(getErrorMessage(err));
      } finally {
        setLoadingData(false);
      }
    }
    loadData();
  }, [showError]);

  const resetSimulation = useCallback(() => {
    setSimulation(null);
    setCurrent(null);
    setAnswerText('');
    setQaHistory([]);
    setCompletedResult(null);
  }, []);




  // ---------------- QUESTION GENERATOR ----------------
  const handleGenerate = useCallback(async () => {
    if (!genJobId) {
      showError('Please select a job position');
      return;
    }
    if (!genType) {
      showError('Please select an interview type');
      return;
    }

    try {
      setGenerating(true);
      setGenerated(null);
      const result = await generateQuestionsForJob({
        job_position_id: genJobId as number,
        interview_type: genType,
      });
      setGenerated(result);
      success('Questions generated successfully');
    } catch (err) {
      showError(getErrorMessage(err, 'Failed to generate questions.'));
    } finally {
      setGenerating(false);
    }
  }, [genJobId, genType, showError, success]);

  // ---------------- INTERVIEW SIMULATION ----------------
  const handleStartSimulation = useCallback(async () => {
    if (!simJobId) {
      showError('Please select a job position for the simulation');
      return;
    }
    if (!simType) {
      showError('Please select an interview type for the simulation');
      return;
    }
    if (!simCandidateId) {
      showError('Please select a candidate for the simulation');
      return;
    }

    try {
      setStarting(true);
      resetSimulation();
      const result = await startInterviewSimulation({
        job_position_id: simJobId as number,
        interview_type: simType,
        candidate_id: simCandidateId as number,
      });
      setSimulation(result);
      if (result.question) {
        setCurrent(result.question);
      }
      success('Interview started');
    } catch (err) {
      showError(getErrorMessage(err, 'Failed to start the interview.'));
    } finally {
      setStarting(false);
    }
  }, [simJobId, simType, simCandidateId, showError, success, resetSimulation]);

  const handleSubmitAnswer = useCallback(async () => {
    if (!simulation || !current) return;
    if (!answerText.trim()) {
      showError('Please type your answer before submitting');
      return;
    }

    try {
      setSubmitting(true);
      const submittedAnswer = answerText.trim();
      const currentQ = current;

      const result = await submitSimulationAnswer({
        session_id: simulation.session_id,
        answer: submittedAnswer,
      });

      // Save answered question to history transcript
      setQaHistory((prev) => [
        ...prev,
        {
          question_number: currentQ.question_number,
          question: currentQ.question,
          answer: submittedAnswer,
        },
      ]);

      if (result.status === 'completed') {


        setCompletedResult({
          average_score: result.average_score || 0,
          answered_questions: result.answered_questions || 0,
          total_questions: result.total_questions || simulation.total_questions,
        });
        setCurrent(null);
        success('Interview completed');
      } else if (result.next_question) {
        setCurrent(result.next_question);
        setAnswerText('');
        if (result.total_questions || result.answered_questions) {
          setSimulation((prev) =>
            prev
              ? {
                  ...prev,
                  total_questions: result.total_questions || prev.total_questions,
                  answered_questions: result.answered_questions || prev.answered_questions + 1,
                  remaining_questions: result.remaining_questions ?? (prev.remaining_questions - 1),
                }
              : null
          );
        }
      }
    } catch (err) {
      showError(getErrorMessage(err, 'Failed to submit your answer.'));
    } finally {
      setSubmitting(false);
    }
  }, [simulation, current, answerText, showError, success]);


  const jobLabel = (id: number | '') =>
    jobPositions.find((j) => j.id === id)?.title || 'Unknown';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Interview Assistance"
        subtitle="Generate interview questions for a role, or run a personalized interview simulation with a candidate."
      />

      {loadingData ? (
        <div className="flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-3">
            <Spinner size="lg" className="text-blue-600" />
            <p className="text-sm font-semibold text-slate-400 dark:text-slate-500">Loading data...</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ============ LEFT: INTERVIEW QUESTION GENERATOR ============ */}
          <Card className="overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-gradient-to-r from-blue-50 to-white dark:from-blue-900/20 dark:to-slate-900">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Interview Question Generator</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Generate a list of questions for a job</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <Select
                label="Job Position"
                value={genJobId}
                onChange={(e) => setGenJobId(e.target.value ? Number(e.target.value) : '')}
                options={jobPositions.map((j) => ({ value: String(j.id), label: j.title }))}
                placeholder="Select a job position"
              />

              <Select
                label="Interview Type"
                value={genType}
                onChange={(e) => setGenType(e.target.value)}
                options={INTERVIEW_TYPES}
              />

              <Button
                onClick={handleGenerate}
                loading={generating}
                disabled={!genJobId || !genType}
                className="w-full"
                size="md"
                leftIcon={<Sparkles className="w-4 h-4" />}
              >
                {generating ? 'Generating...' : 'Generate Questions'}
              </Button>

              {/* Generated questions list */}
              {generated && (
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                      Generated Questions ({generated.total})
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                      {generated.job_title}
                    </span>
                  </div>

                  {generated.questions.map((q, i) => (
                    <div
                      key={i}
                      className="bg-gradient-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                          Question {i + 1}
                        </span>
                        <span
                          className={cn(
                            'text-[10px] font-bold px-2 py-0.5 rounded-full',
                            CATEGORY_COLORS[generated.interview_type] || 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                          )}
                        >
                          {generated.interview_type}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
                        <TypewriterText text={q.question} speed={25} />
                      </p>
                    </div>
                  ))}

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={handleGenerate}
                    loading={generating}
                    leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                  >
                    Regenerate
                  </Button>
                </div>
              )}

              {!generated && !generating && (
                <EmptyState
                  icon={<Sparkles className="w-7 h-7" />}
                  title="No questions generated yet"
                  description="Select a job position and interview type, then click Generate."
                />
              )}
            </div>
          </Card>

          {/* ============ RIGHT: INTERVIEW SIMULATION ============ */}
          <Card className="overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-gradient-to-r from-purple-50 to-white dark:from-purple-900/20 dark:to-slate-900">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Interview Simulation</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Conduct a personalized interview with a candidate</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              {!simulation ? (
                <div className="space-y-4">
                  <Select
                    label="Job Position"
                    value={simJobId}
                    onChange={(e) => setSimJobId(e.target.value ? Number(e.target.value) : '')}
                    options={jobPositions.map((j) => ({ value: String(j.id), label: j.title }))}
                    placeholder="Select a job position"
                  />

                  <Select
                    label="Interview Type"
                    value={simType}
                    onChange={(e) => setSimType(e.target.value)}
                    options={INTERVIEW_TYPES}
                  />

                  <Select
                    label="Candidate Name"
                    value={simCandidateId}
                    onChange={(e) => setSimCandidateId(e.target.value ? Number(e.target.value) : '')}
                    options={candidates.map((c) => ({
                      value: String(c.id),
                      label: c.full_name || c.email || `Candidate #${c.id}`,
                    }))}
                    placeholder="Select a candidate"
                  />

                  <Button
                    onClick={handleStartSimulation}
                    loading={starting}
                    disabled={!simJobId || !simType || !simCandidateId}
                    className="w-full"
                    size="md"
                    leftIcon={<Play className="w-4 h-4" />}
                  >
                    {starting ? 'Starting...' : 'Start Interview'}
                  </Button>

                  <EmptyState
                    icon={<Inbox className="w-7 h-7" />}
                    title="No active simulation"
                    description="Select a job position, interview type and candidate, then click Start Interview."
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Simulation context header */}
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Candidate:</span>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">{simulation.candidate_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Job Position:</span>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">{simulation.job_title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Interview Type:</span>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">{simulation.interview_type}</span>
                    </div>
                  </div>

                  {completedResult ? (
                    <div className="space-y-4">
                      <div className="text-center py-4">
                        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/40 rounded-2xl flex items-center justify-center mx-auto mb-3">
                          <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Interview Completed!</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Here are the results</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                          <p className="text-3xl font-black text-blue-600 dark:text-blue-400">
                            {completedResult.average_score.toFixed(0)}%
                          </p>
                          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">Average Score</p>
                        </div>
                        <div className="text-center p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                          <p className="text-3xl font-black text-green-600 dark:text-green-400">
                            {completedResult.answered_questions}/{completedResult.total_questions}
                          </p>
                          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">Answered</p>
                        </div>
                      </div>

                      {/* Full Transcript Overview on Completion */}
                      {qaHistory.length > 0 && (
                        <div className="mt-4 space-y-3">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                            Interview Transcript ({qaHistory.length} Questions Answered)
                          </h4>
                          <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                            {qaHistory.map((item) => (
                              <div
                                key={item.question_number}
                                className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700 space-y-2 text-xs"
                              >
                                <div className="flex items-start gap-2 font-semibold text-purple-700 dark:text-purple-300">
                                  <Bot className="w-4 h-4 shrink-0 mt-0.5 text-purple-600 dark:text-purple-400" />
                                  <div>
                                    <span className="font-bold">Q{item.question_number}: </span>
                                    <span>{item.question}</span>
                                  </div>
                                </div>
                                <div className="flex items-start gap-2 font-medium text-slate-800 dark:text-slate-200 pl-6 pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60">
                                  <User className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400" />
                                  <p className="whitespace-pre-wrap">{item.answer}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          resetSimulation();
                        }}
                      >
                        Start New Interview
                      </Button>
                    </div>
                  ) : current ? (
                    <div className="space-y-4">
                      {/* Past Questions & Answers History Transcript */}
                      {qaHistory.length > 0 && (
                        <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                            Previous Questions & Answers ({qaHistory.length})
                          </p>
                          {qaHistory.map((item) => (
                            <div
                              key={item.question_number}
                              className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700 space-y-2 text-xs"
                            >
                              <div className="flex items-start gap-2 font-semibold text-purple-700 dark:text-purple-300">
                                <Bot className="w-4 h-4 shrink-0 mt-0.5 text-purple-600 dark:text-purple-400" />
                                <div>
                                  <span className="font-bold">Q{item.question_number}: </span>
                                  <span>{item.question}</span>
                                </div>
                              </div>
                              <div className="flex items-start gap-2 font-medium text-slate-800 dark:text-slate-200 pl-6 pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60">
                                <User className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400" />
                                <p className="whitespace-pre-wrap">{item.answer}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Current question */}
                      <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-xl p-5">


                        <div className="flex items-center gap-2 mb-3">
                          <Bot className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                          <span className="text-xs font-bold text-purple-700 dark:text-purple-400">AI Interviewer</span>
                          <span className="text-[10px] font-semibold text-purple-500 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/40 px-2 py-0.5 rounded-full">
                            Question {current.question_number} of {simulation.total_questions}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
                          <TypewriterText text={current.question} speed={40} />
                        </p>
                      </div>


                      {/* Answer input */}
                      <div className="space-y-3">
                        <div className="relative">
                          <textarea
                            value={answerText}
                            onChange={(e) => setAnswerText(e.target.value)}
                            placeholder="Type your answer here..."
                            className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder:text-slate-500 resize-none focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600"
                            rows={4}
                            disabled={submitting}
                          />
                        </div>
                        <Button
                          onClick={handleSubmitAnswer}
                          loading={submitting}
                          disabled={!answerText.trim()}
                          className="w-full"
                          size="md"
                          leftIcon={<Send className="w-4 h-4" />}
                        >
                          {submitting ? 'Submitting...' : 'Submit Answer'}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-sm text-slate-500 dark:text-slate-400">
                      <Spinner className="mb-3" />
                      <p>Loading interview...</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
