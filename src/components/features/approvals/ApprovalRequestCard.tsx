import { Clock, ChevronRight, CheckCircle2, XCircle, Shield, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { STATUS_COLORS, PRIORITY_COLORS, SCENARIO_LABELS } from '@/lib/approvalMockData';
import type { ApprovalRequest } from '@/types/approval';

const DEMO_NOW = new Date('2026-08-10T14:30:00Z');

function getExpiryInfo(expiresAt: string, status: string) {
  if (status !== 'pending' && status !== 'delegated') return null;
  const diff = (new Date(expiresAt).getTime() - DEMO_NOW.getTime()) / (1000 * 60 * 60);
  if (diff < 0) return { label: 'Expiré', color: 'text-slate-400' };
  if (diff < 2) return { label: `${Math.round(diff * 60)}min`, color: 'text-red-400' };
  if (diff < 8) return { label: `${Math.floor(diff)}h`, color: 'text-amber-400' };
  return { label: `${Math.floor(diff)}h`, color: 'text-muted-foreground' };
}

const TYPE_LABEL: Record<string, string> = {
  single: '1 approb.', double: '2 approb.', owner: 'Propriétaire', manager: 'Manager', finance: 'Finance',
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'En attente', approved: 'Approuvé', rejected: 'Refusé',
  expired: 'Expiré', delegated: 'Délégué', cancelled: 'Annulé',
};

interface Props {
  request: ApprovalRequest;
  compact?: boolean;
}

const ApprovalRequestCard = ({ request, compact = false }: Props) => {
  const navigate = useNavigate();
  const expiry = getExpiryInfo(request.expires_at, request.status);

  return (
    <button
      onClick={() => navigate(`/approvals/${request.id}`)}
      className="w-full text-left bg-card border border-border rounded-xl p-4 hover:bg-secondary/20 transition-colors group"
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', STATUS_COLORS[request.status])}>
              {STATUS_LABEL[request.status] || request.status}
            </span>
            <span className={cn('text-xs font-bold uppercase', PRIORITY_COLORS[request.priority])}>{request.priority}</span>
            <span className="text-xs text-muted-foreground/60">{SCENARIO_LABELS[request.scenario]}</span>
            {request.agent_id && (
              <span className="text-xs flex items-center gap-1 text-purple-400"><Shield className="w-3 h-3" />IA</span>
            )}
          </div>
          <div className="text-sm font-semibold text-foreground leading-snug mb-1">{request.title}</div>
          {!compact && <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{request.description}</p>}
          <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
            <span>{request.requester_name}</span>
            {request.context.amount && (
              <span className="font-mono font-semibold text-foreground">
                {request.context.amount.toLocaleString('fr-CA')} {request.context.currency || 'CAD'}
              </span>
            )}
            <span className="text-muted-foreground/50">{TYPE_LABEL[request.approval_type]}</span>
            {request.required_approvers > 1 && (
              <span className="text-muted-foreground/50">{request.current_approvals}/{request.required_approvers}</span>
            )}
          </div>
        </div>
        <div className="flex-shrink-0 flex flex-col items-end gap-2">
          {expiry && (
            <div className={cn('flex items-center gap-1 text-xs', expiry.color)}>
              <Clock className="w-3 h-3" />{expiry.label}
            </div>
          )}
          <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
        </div>
      </div>
      {request.required_approvers > 1 && request.status === 'pending' && (
        <div className="mt-3 bg-secondary/40 rounded-full h-1">
          <div className="bg-primary h-1 rounded-full transition-all" style={{ width: `${(request.current_approvals / request.required_approvers) * 100}%` }} />
        </div>
      )}
    </button>
  );
};

export default ApprovalRequestCard;
