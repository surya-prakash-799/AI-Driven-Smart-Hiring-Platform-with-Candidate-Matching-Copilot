import { useEffect, useMemo, useState } from 'react';
import {
  Cpu,
  CheckCircle2,
  User,
  Mail,
  Phone,
  Briefcase,
  GraduationCap,
  Wrench,
  FolderGit2,
  Award,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Clock,
  Link,
  Github,
  UploadCloud,
  FileText,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ExtractedData } from '../types/api';
import { describeExperience, joinList } from '../utils/format';
import { cn } from '../utils/cn';
import { EmptyState } from './ui/EmptyState';
import { Badge } from './ui/Badge';

interface ProgressCardProps {
  extractedProfile: ExtractedData | null;
  uploadedFileName?: string;
}

export function ProgressCard({ extractedProfile, uploadedFileName }: ProgressCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (extractedProfile) {
      setAnimating(true);
      setIsExpanded(true);
      const timer = window.setTimeout(() => setAnimating(false), 600);
      return () => window.clearTimeout(timer);
    }
  }, [extractedProfile]);

  const hasData = Boolean(
    extractedProfile &&
      (extractedProfile.full_name || extractedProfile.email || (extractedProfile.skills?.length ?? 0) > 0)
  );

  const displayName = extractedProfile?.full_name || 'Awaiting upload…';
  const displayEmail = extractedProfile?.email || '--';
  const displayPhone = extractedProfile?.phone || '--';
  const displayEducation = joinList(extractedProfile?.education);
  const displayExperience = extractedProfile ? describeExperience(extractedProfile.experience) : '--';
  const displaySkills = extractedProfile?.skills ?? [];
  const displayProjects = extractedProfile?.projects ?? [];
  const displayCerts = extractedProfile?.certifications ?? [];

  const overview = useMemo(
    () => [
      { icon: User, label: 'Name', value: displayName, truncate: true },
      { icon: Mail, label: 'Email', value: displayEmail, truncate: true },
      { icon: Phone, label: 'Phone', value: displayPhone, truncate: true },
    ],
    [displayName, displayEmail, displayPhone]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-700/80 p-6 shadow-subtle flex flex-col justify-between h-full"
    >
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Cpu className={cn('w-5 h-5 text-blue-600', animating && 'animate-pulse')} />
              Parsing Progress
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {hasData ? `Latest: ${uploadedFileName || 'resume'}` : 'Upload a resume to see extracted data here'}
            </p>
          </div>
          <Badge tone={hasData ? 'emerald' : 'amber'} icon={hasData ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}>
            {hasData ? 'Parsing Complete' : 'Waiting for Upload'}
          </Badge>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-200/80 dark:border-slate-700 mb-5">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              Extraction Pipeline Status
            </span>
            <span className={cn('font-extrabold', hasData ? 'text-emerald-600' : 'text-slate-400')}>
              {hasData ? '100% Complete' : 'Idle'}
            </span>
          </div>

          <div className="w-full bg-slate-200/80 h-2.5 rounded-full overflow-hidden mb-4">
            <motion.div
              initial={{ width: '0%' }}
              animate={{ width: hasData ? '100%' : '0%' }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              className={cn(
                'h-full rounded-full relative',
                hasData ? 'bg-gradient-to-r from-emerald-600 to-blue-500' : 'bg-slate-300'
              )}
            >
              {hasData && <div className="absolute inset-0 bg-white/20 animate-pulse" aria-hidden="true" />}
            </motion.div>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-200/60 dark:border-slate-700/60 text-center">
            <div className="bg-white dark:bg-slate-700 p-2 rounded-lg border border-slate-200/60 dark:border-slate-600">
              <p className="text-lg font-black text-blue-600">{displaySkills.length || '--'}</p>
              <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Skills Found</p>
            </div>
            <div className="bg-white dark:bg-slate-700 p-2 rounded-lg border border-slate-200/60 dark:border-slate-600">
              <p className="text-lg font-black text-emerald-600">{displayProjects.length || '--'}</p>
              <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Projects Found</p>
            </div>
            <div className="bg-white dark:bg-slate-700 p-2 rounded-lg border border-slate-200/60 dark:border-slate-600">
              <p className="text-lg font-black text-indigo-600">{displayCerts.length || '--'}</p>
              <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Certifications</p>
            </div>
          </div>
        </div>

        <div className="border border-slate-200/80 dark:border-slate-700 rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setIsExpanded((open) => !open)}
            aria-expanded={isExpanded}
            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-b border-slate-200/80 dark:border-slate-700 flex items-center justify-between cursor-pointer hover:bg-slate-100/70 dark:hover:bg-slate-700/50 transition-colors text-left"
          >
            <span className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                {hasData ? 'Extracted Structured Profile' : 'No Profile Extracted Yet'}
              </span>
            </span>
            <span className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 max-w-[10rem] truncate">{hasData ? displayName : ''}</span>
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </span>
          </button>

          <AnimatePresence initial={false}>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-4 space-y-3.5 bg-white dark:bg-slate-900"
              >
                {!hasData ? (
                  <EmptyState
                    icon={<UploadCloud className="w-7 h-7" />}
                    title="Upload a resume to see extracted data"
                    description="PDF and DOCX files supported"
                  />
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pb-3 border-b border-slate-100 dark:border-slate-700">
                      {overview.map(({ icon: Icon, label, value, truncate }) => (
                        <div key={label} className="flex items-center gap-2 min-w-0">
                          <Icon className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">{label}</p>
                            <p className={cn('text-xs font-bold text-slate-900 dark:text-white', truncate && 'truncate')}>{value}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-3 border-b border-slate-100 dark:border-slate-700">
                      <div className="flex items-start gap-2">
                        <Briefcase className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Experience</p>
                          <p className="text-xs font-medium text-slate-800 dark:text-slate-200">{displayExperience}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <GraduationCap className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Education</p>
                          <p className="text-xs font-medium text-slate-800 dark:text-slate-200">{displayEducation}</p>
                        </div>
                      </div>
                    </div>

                    <div className="pb-3 border-b border-slate-100 dark:border-slate-700">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Wrench className="w-3.5 h-3.5 text-blue-600" />
                        <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                          Skills ({displaySkills.length})
                        </p>
                      </div>
                      {displaySkills.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {displaySkills.map((skill) => (
                            <span
                              key={skill}
                              className="px-2.5 py-1 bg-blue-600 text-white font-semibold text-xs rounded-full shadow-sm cursor-default"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 dark:text-slate-500 italic">No skills detected</p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <FolderGit2 className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                          <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                            Projects ({displayProjects.length})
                          </p>
                        </div>
                        {displayProjects.length > 0 ? (
                          <ul className="space-y-1">
                            {displayProjects.slice(0, 3).map((project) => (
                              <li key={project} className="flex items-start gap-1 text-slate-600 dark:text-slate-400 text-[11px]">
                                <span className="text-blue-500">•</span>
                                <span className="min-w-0">{project}</span>
                              </li>
                            ))}
                            {displayProjects.length > 3 && (
                              <li className="text-blue-600 font-semibold">+{displayProjects.length - 3} more</li>
                            )}
                          </ul>
                        ) : (
                          <p className="text-[11px] text-slate-400 dark:text-slate-500 italic">No projects detected</p>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <Award className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                          <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                            Certifications ({displayCerts.length})
                          </p>
                        </div>
                        {displayCerts.length > 0 ? (
                          <ul className="space-y-1">
                            {displayCerts.slice(0, 3).map((cert) => (
                              <li key={cert} className="flex items-start gap-1 text-slate-600 dark:text-slate-400 text-[11px]">
                                <span className="text-indigo-500">•</span>
                                <span className="min-w-0">{cert}</span>
                              </li>
                            ))}
                            {displayCerts.length > 3 && (
                              <li className="text-blue-600 font-semibold">+{displayCerts.length - 3} more</li>
                            )}
                          </ul>
                        ) : (
                          <p className="text-[11px] text-slate-400 dark:text-slate-500 italic">No certifications detected</p>
                        )}
                      </div>
                    </div>

                    {(extractedProfile?.linkedin || extractedProfile?.github) && (
                      <div className="flex items-center gap-4 pt-2 border-t border-slate-100 dark:border-slate-700 text-[11px]">
                        {extractedProfile?.linkedin && (
                          <a
                            href={extractedProfile.linkedin}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-blue-600 font-semibold hover:underline"
                          >
                            <Link className="w-3 h-3" />
                            LinkedIn
                          </a>
                        )}
                        {extractedProfile?.github && (
                          <a
                            href={extractedProfile.github}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-semibold hover:underline"
                          >
                            <Github className="w-3 h-3" />
                            GitHub
                          </a>
                        )}
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
