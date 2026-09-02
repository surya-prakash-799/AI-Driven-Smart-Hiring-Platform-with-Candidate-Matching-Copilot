import { useState } from 'react';
import { useCandidates } from '../context/CandidatesContext';
import { UploadCard } from '../components/UploadCard';
import { ProgressCard } from '../components/ProgressCard';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { ShieldCheck } from 'lucide-react';
import type { ExtractedData, UploadResponse } from '../types/api';

export default function ResumeUpload() {
  const { refresh } = useCandidates();
  const [latestExtractedProfile, setLatestExtractedProfile] = useState<ExtractedData | null>(null);
  const [latestUploadFileName, setLatestUploadFileName] = useState('');

  const handleUploadSuccess = (fileName: string, response: UploadResponse) => {
    if (response.extracted_data) {
      setLatestExtractedProfile(response.extracted_data);
      setLatestUploadFileName(fileName);
    }
    refresh();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Resume Upload"
        subtitle="Upload one or multiple resumes to auto-extract structured candidate profiles"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UploadCard onUploadSuccess={handleUploadSuccess} />
        <ProgressCard extractedProfile={latestExtractedProfile} uploadedFileName={latestUploadFileName} />
      </div>

      <Card className="p-5">
        <div className="flex items-start gap-3">
          <span className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">How parsing works</h3>
            <ul className="mt-2 space-y-1.5 text-xs text-slate-600 dark:text-slate-400 list-disc list-inside">
              <li>Select <b>multiple</b> PDF or DOCX resumes at once — each file up to <b>10 MB</b> is accepted.</li>
              <li>Files are processed one by one with deep NLP to extract name, contact, skills, education, experience, projects and certifications.</li>
              <li>Extracted profiles appear instantly in the Candidates page and analytics.</li>
              <li>Duplicate emails update the existing candidate instead of creating a new one.</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
