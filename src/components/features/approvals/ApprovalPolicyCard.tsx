import { Clock, ShieldAlert, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ApprovalPolicy } from '@/types/approval';
import { PRIORITY_COLORS } from '@/lib/approvalMockData';

const TYPE_LABEL: Record<string, string> = {
  single: 'Simple (1 approb.)', double: 'Double (2 approb.)',
  owner: 'Propriétaire', manager: 'Manager', finance: 'Finance',
};

interface Props { policy: ApprovalPolicy }

const ApprovalPolicyCard = ({ policy }: Props) => (
  <div className="bg-card border border-border rounded-xl p-4 space-y-3">
    <div className="flex items-start justify-between gap-2">
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-foreground">{policy.name_fr}</span>
          <span className={cn('text-xs font-bold uppercase', PRIORITY_COLORS[policy.priority])}>{policy.priority}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{policy.description}</p>
      </div>
      <span className="text-xs font-mono text-muted-foreground/50 flex-shrink-0">{policy.id}</span>
    </div>
    <div className="grid grid-cols-2 gap-2 text-xs">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Users className="w-3.5 h-3.5 flex-shrink-0" />
        <span>{TYPE_LABEL[policy.approval_type]}</span>
      </div>
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Clock className="w-3.5 h-3.5 flex-shrink-0" />
        <span>{policy.timeout_hours}h expiration</span>
      </div>
      {policy.escalate_after_hours && (
        <div className="flex items-center gap-1.5 text-amber-400/80">
          <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0" />
          <span>Escalade à {policy.escalate_after_hours}h</span>
        </div>
      )}
      {policy.amount_threshold && (
        <div className="text-amber-400/80 text-xs">
          Seuil : {policy.amount_threshold.toLocaleString()} {policy.currency}
        </div>
      )}
    </div>
    <div className="flex items-center gap-1.5 flex-wrap">
      {policy.notification_channels.map(ch => (
        <span key={ch} className="text-xs px-1.5 py-0.5 bg-secondary/40 border border-border rounded-full text-muted-foreground">
          {ch === 'email' ? 'Email' : ch === 'sms' ? 'SMS' : 'App'}
        </span>
      ))}
      {policy.auto_reject_on_expiry && (
        <span className="text-xs px-1.5 py-0.5 bg-red-500/10 border border-red-500/20 rounded-full text-red-400">
          Rejet auto
        </span>
      )}
    </div>
    <div className="flex flex-wrap gap-1">
      {policy.notify_roles.map(r => (
        <span key={r} className="text-xs font-mono px-1.5 py-0.5 bg-secondary/40 rounded text-muted-foreground/60">{r}</span>
      ))}
    </div>
  </div>
);

export default ApprovalPolicyCard;
