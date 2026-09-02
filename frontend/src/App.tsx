import { lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Candidates = lazy(() => import('./pages/Candidates'));
const ResumeUpload = lazy(() => import('./pages/ResumeUpload'));
const JobPositions = lazy(() => import('./pages/JobPositions'));
const InterviewAssistance = lazy(() => import('./pages/InterviewAssistance'));

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="job-positions" element={<JobPositions />} />
        <Route path="candidates" element={<Candidates />} />
        <Route path="upload" element={<ResumeUpload />} />
        <Route path="interview-assistance" element={<InterviewAssistance />} />
      </Route>
    </Routes>
  );
}
