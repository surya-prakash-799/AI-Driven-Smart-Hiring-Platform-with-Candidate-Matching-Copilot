export const ALLOWED_EXTENSIONS = ['pdf', 'docx'] as const;
export const MAX_FILE_SIZE_MB = 10;

export interface FileValidationResult {
  valid: boolean;
  message?: string;
}

export function getFileExtension(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  return ext;
}

export function validateResumeFile(file: File): FileValidationResult {
  const extension = getFileExtension(file.name);

  if (!ALLOWED_EXTENSIONS.includes(extension as (typeof ALLOWED_EXTENSIONS)[number])) {
    return {
      valid: false,
      message: `Unsupported file type ".${extension}". Only PDF or DOCX files are allowed.`,
    };
  }

  if (file.size === 0) {
    return { valid: false, message: 'The selected file is empty.' };
  }

  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    return {
      valid: false,
      message: `File size exceeds the ${MAX_FILE_SIZE_MB} MB limit (${(file.size / (1024 * 1024)).toFixed(1)} MB).`,
    };
  }

  return { valid: true };
}
