import { CheckCircle2, XCircle, ArrowRight, AlertTriangle, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ApprovalDecision, ApprovalNotification } from '@/types/approval';

const DECISION_META = {
  approved: { Icon: CheckCircle2, color: 'text-emerald-400', label: 'Approuvé' },
  rejected: { Icon: XCircle, color: 'text-rose-400', label: 'Refusé' },
  delegated: { Icon: ArrowRight, color: 'text-blue-400', label: 'Délégué' },
  expired: { Icon: AlertTriangle, color: 'text-slate-400', label: 'Expiré' },
};

const NOTIF_LABEL: Record<string, string> = {
  new_request: 'Nouvelle demande', reminder: 'Rappel', decision: 'Décision envoyée',
  expiry_warning: 'Avertissement expiration', delegated: 'Délégation notifiée',
};

interface Props {
  decisions: ApprovalDecision[];
  notifications: ApprovalNotification[];
}

type Entry = { type: 'decision'; data: ApprovalDecision } | { type: 'notif'; data: ApprovalNotification };

const ApprovalDecisionLog = ({ decisions, notifications }: Props) => {
  const entries: Entry[] = [
    ...decisions.map(d => ({ type: 'decision' as const, data: d })),
    ...notifications.map(n => ({ type: 'notif' as const, data: n })),
  ].sort((a, b) => {
    const aT = a.type === 'decision' ? a.data.decided_at : a.data.sent_at;
    const bT = b.type === 'decision' ? b.data.decided_at : b.data.sent_at;
    return new Date(bT).getTime() - new Date(aT).getTime();
  });

  if (entries.length === 0) return (
    <div className="text-center py-6 text-muted-foreground text-sm">Aucune activité enregistrée</div>
  );

  return (
    <div className="space-y-3">
      {entries.map(entry => {
        if (entry.type === 'decision') {
          const d = entry.data;
          const meta = DECISION_META[d.decision] || DECISION_META.expired;
          const { Icon, color, label } = meta;
          return (
            <div key={d.id} className="flex items-start gap-3">
              <div className={cn('w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 bg-background border border-border', color)}>
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={cn('text-xs font-semibold', color)}>{label}</span>
                  <span className="text-xs text-muted-foreground">par {d.approver_name}</span>
                  <span className="text-xs text-muted-foreground/50 font-mono">{d.approver_role}</span>
                </div>
                {d.reason && <p className="text-xs text-muted-foreground mt-0.5">{d.reason}</p>}
                {d.conditions && d.conditions.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {d.conditions.map(c => (
                      <span key={c} className="text-xs px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded text-emerald-400">{c}</span>
                    ))}
                  </div>
                )}
                {d.delegated_to && <span className="text-xs text-blue-400 mt-0.5 block">→ Délégué à : {d.delegated_to}</span>}
                <span className="text-xs text-muted-foreground/40 mt-0.5 block">
                  {new Date(d.decided_at).toLocaleString('fr-CA', { dateStyle: 'short', timeStyle: 'short' })}
                </span>
              </div>
            </div>
          );
        } else {
          const n = entry.data;
          return (
            <div key={n.id} className="flex items-start gap-3 opacity-60">
              <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 bg-background border border-border text-muted-foreground">
                <Bell className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground">{NOTIF_LABEL[n.type] || n.type}</span>
                  <span className="text-xs text-muted-foreground/60">→ {n.recipient_name}</span>
                  <span className="text-xs font-mono text-muted-foreground/40">{n.channel}</span>
                </div>
                <span className="text-xs text-muted-foreground/40 mt-0.5 block">
                  {new Date(n.sent_at).toLocaleString('fr-CA', { dateStyle: 'short', timeStyle: 'short' })}
                </span>
              </div>
            </div>
          );
        }
      })}
    </div>
  );
};

export default ApprovalDecisionLog;
