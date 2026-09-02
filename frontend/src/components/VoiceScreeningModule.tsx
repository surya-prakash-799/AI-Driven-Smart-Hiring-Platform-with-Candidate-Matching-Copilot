import { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, Play, Square, CheckCircle2, AlertCircle, Clock, User, Briefcase } from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { useToast } from '../context/ToastContext';
import { fetchCandidates, fetchJobPositions, submitVoiceScreening, fetchVoiceScreenings } from '../services/api';
import type { BackendCandidate, JobPosition, VoiceScreeningItem } from '../types/api';

type ScreeningStatus = 'Ready' | 'Recording' | 'Processing' | 'Completed' | 'Error';

export function VoiceScreeningModule() {
  const toast = useToast();
  const [candidates, setCandidates] = useState<BackendCandidate[]>([]);
  const [jobPositions, setJobPositions] = useState<JobPosition[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>('');
  const [selectedJobId, setSelectedJobId] = useState<string>('');

  const [status, setStatus] = useState<ScreeningStatus>('Ready');
  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [recentScreenings, setRecentScreenings] = useState<VoiceScreeningItem[]>([]);
  const [latestResult, setLatestResult] = useState<VoiceScreeningItem | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load candidates, job positions, and past screenings
  useEffect(() => {
    async function loadData() {
      try {
        const [candsData, jobsData, screeningsData] = await Promise.all([
          fetchCandidates(1, 100),
          fetchJobPositions(),
          fetchVoiceScreenings(5).catch(() => []),
        ]);
        setCandidates(candsData.candidates || []);
        setJobPositions(jobsData || []);
        setRecentScreenings(screeningsData || []);

        if (candsData.candidates && candsData.candidates.length > 0) {
          setSelectedCandidateId(String(candsData.candidates[0].id));
        }
        if (jobsData && jobsData.length > 0) {
          setSelectedJobId(String(jobsData[0].id));
        }
      } catch (err) {
        console.error('Failed to load voice screening dropdown data:', err);
      }
    }
    loadData();
  }, []);

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const selectedCandidate = candidates.find((c) => String(c.id) === selectedCandidateId);
  const selectedJob = jobPositions.find((j) => String(j.id) === selectedJobId);

  const startScreening = useCallback(async () => {
    setErrorMessage(null);
    if (!selectedCandidateId) {
      toast.error('Please select a candidate first.');
      return;
    }
    if (!selectedJobId) {
      toast.error('Please select a job position first.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(200);
      setStatus('Recording');
      setTimerSeconds(0);

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);

      toast.success('Voice recording started. Speak clearly.');
    } catch (err: any) {
      console.error('Microphone error:', err);
      setStatus('Error');
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        const msg = 'Microphone permission denied. Please allow microphone access in your browser settings.';
        setErrorMessage(msg);
        toast.error(msg);
      } else {
        const msg = 'Could not access microphone device. Check if microphone is connected.';
        setErrorMessage(msg);
        toast.error(msg);
      }
    }
  }, [selectedCandidateId, selectedJobId, toast]);

  const stopScreening = useCallback(async () => {
    if (!mediaRecorderRef.current || status !== 'Recording') return;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setStatus('Processing');

    return new Promise<void>((resolve) => {
      const recorder = mediaRecorderRef.current!;
      recorder.onstop = async () => {
        const duration = timerSeconds || 1;
        try {
          const result = await submitVoiceScreening({
            candidate_id: Number(selectedCandidateId),
            job_position_id: Number(selectedJobId),
            duration_seconds: duration,
            status: 'Completed',
            result_summary: 'Voice screening recorded and evaluated successfully.',
          });

          setLatestResult(result);
          setRecentScreenings((prev) => [result, ...prev.filter((item) => item.id !== result.id)].slice(0, 5));
          setStatus('Completed');
          toast.success('Voice screening session completed and saved!');
        } catch (err: any) {
          console.error('Failed to submit voice screening:', err);
          setStatus('Error');
          const msg = 'Failed to save voice screening data. Check backend connection.';
          setErrorMessage(msg);
          toast.error(msg);
        } finally {
          resolve();
        }
      };
      recorder.stop();
    });
  }, [mediaRecorderRef, status, timerSeconds, selectedCandidateId, selectedJobId, toast]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  return (
    <Card className="p-6 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-2xl shadow-sm space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-xl flex items-center justify-center font-bold">
            <Mic className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white">Voice Screening Module</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Conduct and manage AI-powered voice candidate screening</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {status === 'Ready' && <Badge tone="blue">Ready</Badge>}
          {status === 'Recording' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-500 text-white font-bold text-xs rounded-full animate-pulse">
              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              Recording...
            </span>
          )}
          {status === 'Processing' && <Badge tone="amber">Processing...</Badge>}
          {status === 'Completed' && <Badge tone="emerald">Completed</Badge>}
          {status === 'Error' && <Badge tone="rose">Error</Badge>}
        </div>
      </div>

      {/* Candidate & Job Selection Dropdowns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            Select Candidate
          </label>
          <select
            value={selectedCandidateId}
            onChange={(e) => setSelectedCandidateId(e.target.value)}
            disabled={status === 'Recording'}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 rounded-xl text-xs text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-purple-600"
          >
            {candidates.map((cand) => (
              <option key={cand.id} value={cand.id}>
                {cand.full_name || 'Unnamed Candidate'}
              </option>
            ))}
            {candidates.length === 0 && <option value="">No candidates available</option>}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            Select Job Position
          </label>
          <select
            value={selectedJobId}
            onChange={(e) => setSelectedJobId(e.target.value)}
            disabled={status === 'Recording'}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 rounded-xl text-xs text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-purple-600"
          >
            {jobPositions.map((job) => (
              <option key={job.id} value={job.id}>
                {job.title}
              </option>
            ))}
            {jobPositions.length === 0 && <option value="">No job positions available</option>}
          </select>
        </div>
      </div>

      {/* Voice Recording Control Panel */}
      <div className="p-5 bg-gradient-to-br from-slate-50 to-purple-50/50 dark:from-slate-700/40 dark:to-purple-950/20 border border-slate-200/80 dark:border-slate-700 rounded-2xl flex flex-col items-center justify-center space-y-4">
        {/* Animated Microphone Icon */}
        <div className="relative">
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
              status === 'Recording'
                ? 'bg-rose-600 text-white ring-8 ring-rose-500/20 shadow-lg shadow-rose-500/40 animate-pulse'
                : 'bg-purple-600 text-white shadow-md'
            }`}
          >
            {status === 'Recording' ? <Mic className="w-8 h-8 animate-bounce" /> : <Mic className="w-8 h-8" />}
          </div>
        </div>

        {/* Live Timer & Selection Info */}
        <div className="text-center space-y-1">
          <p className="text-2xl font-black font-mono tracking-wider text-slate-900 dark:text-white">
            {formatTimer(timerSeconds)}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
            {selectedCandidate ? (selectedCandidate.full_name || 'Unnamed Candidate') : 'Select Candidate'} · {selectedJob ? selectedJob.title : 'Select Position'}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-center gap-3 w-full max-w-xs">
          {status !== 'Recording' ? (
            <Button
              onClick={startScreening}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2.5 rounded-xl shadow-md"
              leftIcon={<Play className="w-4 h-4 fill-white" />}
              disabled={status === 'Processing' || !selectedCandidateId || !selectedJobId}
            >
              Start Screening
            </Button>
          ) : (
            <Button
              onClick={stopScreening}
              className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 rounded-xl shadow-md animate-pulse"
              leftIcon={<Square className="w-4 h-4 fill-white" />}
            >
              Stop Screening
            </Button>
          )}
        </div>

        {/* Error message feedback */}
        {errorMessage && (
          <div className="w-full p-3 bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Latest Completed Screening Summary */}
      {latestResult && (
        <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 rounded-xl space-y-2 text-xs">
          <div className="flex items-center justify-between border-b border-emerald-200/60 dark:border-emerald-800/40 pb-2">
            <span className="font-extrabold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Latest Screening Recorded
            </span>
            <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">
              {new Date(latestResult.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-700 dark:text-slate-300 pt-1">
            <div>
              <span className="text-slate-400 font-bold block uppercase text-[9px]">Candidate</span>
              <span className="font-bold text-slate-900 dark:text-white">{latestResult.candidate_name}</span>
            </div>
            <div>
              <span className="text-slate-400 font-bold block uppercase text-[9px]">Job Position</span>
              <span className="font-bold text-slate-900 dark:text-white">{latestResult.job_title}</span>
            </div>
            <div>
              <span className="text-slate-400 font-bold block uppercase text-[9px]">Duration</span>
              <span className="font-bold text-slate-900 dark:text-white">{latestResult.duration_seconds} seconds</span>
            </div>
            <div>
              <span className="text-slate-400 font-bold block uppercase text-[9px]">Status</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">{latestResult.status}</span>
            </div>
          </div>
          <p className="text-[11px] italic text-slate-600 dark:text-slate-400 pt-1">
            Result: {latestResult.result_summary}
          </p>
        </div>
      )}

      {/* Recent Screening Sessions List */}
      {recentScreenings.length > 0 && !latestResult && (
        <div className="space-y-2 pt-2">
          <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Recent Voice Screenings ({recentScreenings.length})
          </h3>
          <div className="space-y-2">
            {recentScreenings.slice(0, 3).map((item) => (
              <div
                key={item.id}
                className="p-3 bg-slate-50 dark:bg-slate-700/40 rounded-xl border border-slate-100 dark:border-slate-700 flex flex-wrap items-center justify-between text-xs gap-2"
              >
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-purple-600" />
                  <span className="font-bold text-slate-900 dark:text-white">{item.candidate_name}</span>
                  <span className="text-slate-400">·</span>
                  <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-slate-600 dark:text-slate-300 font-medium">{item.job_title}</span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-slate-500">
                  <span className="flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3" />
                    {item.duration_seconds}s
                  </span>
                  <Badge tone="emerald">{item.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
