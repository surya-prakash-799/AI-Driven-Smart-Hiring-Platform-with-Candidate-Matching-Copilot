import { CheckCircle2, Clock, XCircle, Star } from 'lucide-react';
import { Badge, type BadgeTone } from './Badge';
import type { CandidateStatus } from '../../types/candidate';
import { getStatusReason } from '../../utils/candidateMapping';

const STATUS_CONFIG: Record<CandidateStatus, { tone: BadgeTone; icon: typeof Clock; label: string; pulse?: boolean }> = {
  Completed: { tone: 'emerald', icon: CheckCircle2, label: 'Completed' },
  Shortlisted: { tone: 'blue', icon: Star, label: 'Shortlisted' },
  Rejected: { tone: 'rose', icon: XCircle, label: 'Rejected' },
  Processing: { tone: 'amber', icon: Clock, label: 'Processing', pulse: true },
};

interface StatusBadgeProps {
  status: CandidateStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.Processing;
  const Icon = config.icon;
  return (
    <Badge
      tone={config.tone}
      className={className}
      title={getStatusReason(status)}
      icon={<Icon className={`w-3.5 h-3.5 ${config.pulse ? 'animate-pulse' : ''}`} />}
    >
      {config.label}
    </Badge>
  );
}
