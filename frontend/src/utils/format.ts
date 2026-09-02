import type { ExperienceItem } from '../types/api';

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '--';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function describeExperience(
  experience: ExperienceItem[] | string | null | undefined
): string {
  if (Array.isArray(experience)) {
    const duration = experience.map((item) => item.duration).find(Boolean);
    if (duration) return duration;
    const role = experience.map((item) => item.role).find(Boolean);
    if (role) return role;
    return '--';
  }
  if (typeof experience === 'string' && experience.trim()) return experience.trim();
  return '--';
}

export function parseExperienceYears(
  experience: ExperienceItem[] | string | null | undefined
): number {
  const raw = Array.isArray(experience)
    ? experience.map((item) => item.duration).filter(Boolean).join(' ')
    : typeof experience === 'string'
      ? experience
      : '';
  const match = raw.match(/(\d+)\s*\+?\s*(?:years?|yrs?)/i);
  return match ? parseInt(match[1], 10) : 0;
}

export function joinList(values: string[] | null | undefined, fallback = '--'): string {
  if (!values || values.length === 0) return fallback;
  return values.join(', ');
}

export function formatFileSize(bytes: number): string {
  if (bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, index)).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}
