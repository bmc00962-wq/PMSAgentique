import { Clock, CheckCircle2, XCircle } from 'lucide-react';
import type { ApprovalRequest } from '@/types/agent';
import { IMPACT_CONFIG } from '@/lib/agentMockData';
import { cn } from '@/lib/utils';

const getExpiryLabel = (expiresAt: string) => {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff < 0) return 'Expiré';
  const hours = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  if (hours >= 24) return `Expire dans ${Math.floor(hours / 24)}j`;
  if (hours > 0) return `Expire dans ${hours}h`;
  return `Expire dans ${mins}min`;
};

interface Props {
  approval: ApprovalRequest;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
}

const ApprovalCard = ({ approval: ap, onApprove, onReject }: Props) => {
  const cfg = IMPACT_CONFIG[ap.impact];
  const expiryLabel = getExpiryLabel(ap.expires_at);
  const isUrgent = new Date(ap.expires_at).getTime() - Date.now() < 3600000;

  return (
    <div className={cn('bg-card border rounded-xl p-4 space-y-3', cfg.border)}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn('text-xs font-bold px-2 py-0.5 rounded border', cfg.bg, cfg.color, cfg.border)}>
              Impact {cfg.label}
            </span>
            <span className="text-xs text-muted-foreground/60">{ap.agent_name}</span>
          </div>
          <p className="text-sm font-semibold text-foreground leading-tight">{ap.action_name}</p>
        </div>
        <div className={cn('flex items-center gap-1 text-xs flex-shrink-0', isUrgent ? 'text-rose-400' : 'text-muted-foreground')}>
          <Clock className="w-3 h-3" />
          {expiryLabel}
        </div>
      </div>

      {/* Context */}
      <div className="bg-secondary/30 rounded-lg px-3 py-2">
        <p className="text-xs text-muted-foreground leading-relaxed">{ap.context_summary}</p>
        {ap.suggested_value && (
          <div className="mt-2 pt-2 border-t border-border/50">
            <span className="text-xs text-muted-foreground/60">Valeur proposée : </span>
            <span className="text-xs font-mono font-medium text-foreground">{ap.suggested_value}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={(e) => { e.stopPropagation(); onApprove?.(ap.id); }}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg py-2 hover:bg-emerald-500/20 transition-colors min-h-[44px]"
        >
          <CheckCircle2 className="w-3.5 h-3.5" /> Approuver
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onReject?.(ap.id); }}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium border border-border text-muted-foreground rounded-lg py-2 hover:border-rose-500/30 hover:text-rose-400 transition-colors min-h-[44px]"
        >
          <XCircle className="w-3.5 h-3.5" /> Rejeter
        </button>
      </div>

      {/* ADR note */}
      {(ap.impact === 'critical' || ap.impact === 'high') && (
        <p className="text-xs text-muted-foreground/50 border-t border-border/30 pt-2">
          <span className="text-orange-400 font-mono">ADR-017</span> — Approbation humaine requise
          {ap.n8n_workflow_ref && <span> · {ap.n8n_workflow_ref} exécutera après validation</span>}
        </p>
      )}
    </div>
  );
};

export default ApprovalCard;
