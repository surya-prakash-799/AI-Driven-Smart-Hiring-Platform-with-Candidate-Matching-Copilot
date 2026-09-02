import { useCallback, useEffect, useRef, useState } from 'react';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  Sparkles,
  ListChecks,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getErrorMessage, uploadResume, type UploadResponse } from '../services/api';
import { validateResumeFile, ALLOWED_EXTENSIONS, MAX_FILE_SIZE_MB } from '../utils/validation';
import { formatFileSize } from '../utils/format';
import { useToast } from '../context/ToastContext';
import { cn } from '../utils/cn';
import { Spinner } from './ui/Spinner';

interface UploadCardProps {
  onUploadSuccess?: (fileName: string, response: UploadResponse) => void;
}

type UploadStatus = 'pending' | 'uploading' | 'parsing' | 'done' | 'error';

interface UploadItem {
  id: string;
  file: File;
  status: UploadStatus;
  progress: number;
  error?: string;
}

const PARSING_STEPS = [
  'Parsing document text…',
  'Detecting skills, education & experience…',
  'Finalizing structured profile…',
];

function generateItemId(file: File): string {
  const random = Math.random().toString(36).slice(2, 9);
  return `${file.name}-${Date.now()}-${random}`;
}

export function UploadCard({ onUploadSuccess }: UploadCardProps) {
  const toast = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const [queue, setQueue] = useState<UploadItem[]>([]);
  const [parsingStep, setParsingStep] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timersRef = useRef<number[]>([]);
  const queueRef = useRef<UploadItem[]>([]);
  const isRunningRef = useRef(false);
  const cancelRef = useRef(false);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const updateQueue = useCallback((updater: (items: UploadItem[]) => UploadItem[]) => {
    queueRef.current = updater(queueRef.current);
    setQueue(queueRef.current);
  }, []);

  const processQueue = useCallback(async () => {
    if (isRunningRef.current) return;
    isRunningRef.current = true;
    cancelRef.current = false;
    clearTimers();
    setIsUploading(true);

    while (!cancelRef.current) {
      const pending = queueRef.current.find((item) => item.status === 'pending');
      if (!pending) break;
      const id = pending.id;

      updateQueue((items) =>
        items.map((item) => (item.id === id ? { ...item, status: 'uploading', progress: 0, error: undefined } : item))
      );

      try {
        const response = await uploadResume(pending.file, (percent) => {
          updateQueue((items) =>
            items.map((item) => (item.id === id ? { ...item, progress: percent } : item))
          );
        });
        if (cancelRef.current) break;

        updateQueue((items) =>
          items.map((item) => (item.id === id ? { ...item, status: 'parsing' } : item))
        );
        setParsingStep(0);
        const totalDelay = PARSING_STEPS.reduce((sum, _, index) => sum + (index + 1) * 700, 0);
        PARSING_STEPS.forEach((_, index) => {
          const timer = window.setTimeout(() => setParsingStep(index), (index + 1) * 700);
          timersRef.current.push(timer);
        });
        await new Promise<void>((resolve) => window.setTimeout(resolve, totalDelay));
        if (cancelRef.current) break;

        updateQueue((items) =>
          items.map((item) => (item.id === id ? { ...item, progress: 100, status: 'done' } : item))
        );
        onUploadSuccess?.(pending.file.name, response);
        toast.success('Upload complete', `Resume "${pending.file.name}" was parsed successfully.`);
      } catch (err) {
        if (cancelRef.current) break;
        const message = getErrorMessage(err);
        updateQueue((items) =>
          items.map((item) => (item.id === id ? { ...item, status: 'error', error: message } : item))
        );
        toast.error('Upload failed', message);
      }
    }

    clearTimers();
    setIsUploading(false);
    isRunningRef.current = false;
  }, [clearTimers, onUploadSuccess, toast, updateQueue]);

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const newItems: UploadItem[] = [];
      Array.from(files).forEach((file) => {
        const validation = validateResumeFile(file);
        if (!validation.valid) {
          toast.error('Invalid file', validation.message);
          return;
        }
        newItems.push({ id: generateItemId(file), file, status: 'pending', progress: 0 });
      });

      if (newItems.length === 0) return;
      updateQueue((items) => [...items, ...newItems]);
      processQueue();
    },
    [processQueue, toast, updateQueue]
  );

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      setIsDragging(false);
      const dropped = event.dataTransfer.files;
      if (dropped && dropped.length > 0) addFiles(dropped);
    },
    [addFiles]
  );

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const selected = event.target.files;
      if (selected && selected.length > 0) addFiles(selected);
      event.target.value = '';
    },
    [addFiles]
  );

  const removeItem = useCallback(
    (id: string) => {
      updateQueue((items) => items.filter((item) => item.id !== id));
    },
    [updateQueue]
  );

  const retryItem = useCallback(
    (id: string) => {
      updateQueue((items) =>
        items.map((item) => (item.id === id ? { ...item, status: 'pending', progress: 0, error: undefined } : item))
      );
      processQueue();
    },
    [processQueue, updateQueue]
  );

  const handleReset = useCallback(() => {
    cancelRef.current = true;
    clearTimers();
    queueRef.current = [];
    setQueue([]);
    setParsingStep(0);
  }, [clearTimers]);

  const openFilePicker = useCallback(() => fileInputRef.current?.click(), []);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openFilePicker();
      }
    },
    [openFilePicker]
  );

  const totalFiles = queue.length;
  const doneCount = queue.filter((item) => item.status === 'done').length;
  const errorCount = queue.filter((item) => item.status === 'error').length;
  const hasPending = queue.some((item) => item.status === 'pending');

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-700/80 p-6 shadow-subtle flex flex-col justify-between h-full"
    >
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-blue-600" />
              Upload Resumes
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Select multiple resumes to parse &amp; extract candidate data</p>
          </div>
          <span className="text-[11px] font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2.5 py-1 rounded-full border border-blue-100 dark:border-blue-800 flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            AI Parser Ready
          </span>
        </div>

        <div
          role="button"
          tabIndex={0}
          aria-label="Choose one or more PDF or DOCX resumes to upload"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={openFilePicker}
          onKeyDown={handleKeyDown}
          className={cn(
            'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 outline-none',
            'focus-visible:ring-2 focus-visible:ring-blue-600/50',
            isDragging
              ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-900/30 scale-[1.01]'
              : 'border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:bg-slate-50/80 dark:hover:bg-slate-800/50'
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            accept={ALLOWED_EXTENSIONS.map((ext) => `.${ext}`).join(',')}
            className="hidden"
            aria-hidden="true"
          />

          <motion.div
            animate={{ y: isDragging ? -5 : 0 }}
            className="w-14 h-14 bg-blue-50 dark:bg-blue-900/30 rounded-2xl text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-3 border border-blue-100 dark:border-blue-800 shadow-sm"
          >
            <UploadCloud className="w-7 h-7" />
          </motion.div>

          <p className="text-sm font-bold text-slate-900 dark:text-white">
            Drag &amp; drop PDF or DOCX resumes here
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">or click to browse — multiple files allowed</p>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400 px-1">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Supported formats:</span>
            {ALLOWED_EXTENSIONS.map((ext) => (
              <span key={ext} className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded font-mono font-medium text-[10px] uppercase">
                {ext}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Maximum file size:</span>
            <span className="font-semibold text-slate-900 dark:text-white">{MAX_FILE_SIZE_MB} MB</span>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {totalFiles > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-700"
          >
            <div className="flex items-center justify-between gap-3 mb-3">
              <p className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <ListChecks className="w-4 h-4 text-blue-600" />
                Selected files ({totalFiles})
                {doneCount === totalFiles && totalFiles > 0 && (
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">
                    All parsed
                  </span>
                )}
                {errorCount > 0 && (
                  <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/30 px-2 py-0.5 rounded-full">
                    {errorCount} failed
                  </span>
                )}
              </p>
              <div className="flex items-center gap-1.5">
                {isUploading ? (
                  <span className="text-[10px] font-semibold text-blue-600 flex items-center gap-1.5">
                    <Spinner size="sm" />
                    Uploading…
                  </span>
                ) : (
                  hasPending && (
                    <button
                      type="button"
                      onClick={processQueue}
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-colors"
                    >
                      Upload all
                    </button>
                  )
                )}
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={isUploading}
                  title="Clear all files"
                  aria-label="Clear all selected files"
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {queue.map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl p-3.5 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                        item.status === 'done'
                          ? 'bg-emerald-100 text-emerald-700'
                          : item.status === 'error'
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-blue-100 text-blue-700'
                      )}
                    >
                      {item.status === 'done' ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : item.status === 'error' ? (
                        <AlertCircle className="w-5 h-5" />
                      ) : (
                        <FileText className="w-5 h-5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{item.file.name}</p>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0">({formatFileSize(item.file.size)})</span>
                      </div>

                      <p className="mt-0.5 text-[11px] font-semibold flex items-center gap-1.5">
                        {item.status === 'done' && (
                          <span className="flex items-center gap-1 text-emerald-600">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Uploaded &amp; parsed successfully
                          </span>
                        )}
                        {item.status === 'error' && <span className="text-rose-600">{item.error}</span>}
                        {item.status === 'uploading' && (
                          <span className="text-blue-600 flex items-center gap-1.5">
                            <Spinner size="sm" />
                            Uploading… ({item.progress}%)
                          </span>
                        )}
                        {item.status === 'parsing' && (
                          <span className="text-blue-600 flex items-center gap-1.5">
                            <Spinner size="sm" />
                            {PARSING_STEPS[parsingStep]}
                          </span>
                        )}
                        {item.status === 'pending' && (
                          <span className="text-slate-500 dark:text-slate-400">Queued for upload</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {(item.status === 'error' || item.status === 'pending') && (
                      <button
                        type="button"
                        onClick={() => retryItem(item.id)}
                        disabled={isUploading}
                        title="Upload this file"
                        aria-label={`Upload ${item.file.name}`}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      disabled={isUploading && (item.status === 'uploading' || item.status === 'parsing')}
                      title="Remove file"
                      aria-label={`Remove ${item.file.name}`}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
