import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Pause, CheckCircle2, Zap, Calendar, Webhook } from 'lucide-react';
import type { WorkflowDefinition } from '@/types/workflow';
import {
  STATUS_LABELS, STATUS_COLORS, TRIGGER_TYPE_LABELS, TRIGGER_TYPE_COLORS, DOMAIN_COLORS,
} from '@/lib/workflowMockData';
import { cn } from '@/lib/utils';

interface Props { workflow: WorkflowDefinition; }

const TriggerIcon = ({ type }: { type: WorkflowDefinition['trigger_type'] }) => {
  if (type === 'schedule') return <Calendar className="w-3 h-3" />;
  if (type === 'webhook') return <Webhook className="w-3 h-3" />;
  return <Zap className="w-3 h-3" />;
};

const StatusIcon = ({ status }: { status: WorkflowDefinition['status'] }) => {
  if (status === 'active') return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
  if (status === 'error') return <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />;
  if (status === 'paused') return <Pause className="w-3.5 h-3.5 text-yellow-400" />;
  return <span className="w-3.5 h-3.5 rounded-full bg-slate-600 inline-block" />;
};

const WorkflowCard = ({ workflow: w }: Props) => {
  const navigate = useNavigate();
  const lastExecTime = w.last_execution_at
    ? new Date(w.last_execution_at).toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit' })
    : '—';

  return (
    <div
      onClick={() => navigate(`/integrations/n8n/${w.id}`)}
      className={cn(
        'bg-card border rounded-xl p-4 cursor-pointer hover:border-primary/30 transition-all group',
        w.status === 'error' ? 'border-rose-500/30 bg-rose-500/4' : 'border-border',
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <StatusIcon status={w.status} />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono font-bold text-muted-foreground">{w.id}</span>
              <span className={cn('text-xs px-1.5 py-0.5 rounded font-medium', DOMAIN_COLORS[w.domain] ?? 'bg-secondary text-muted-foreground')}>
                {w.domain}
              </span>
            </div>
            <p className="text-sm font-semibold text-foreground mt-0.5 leading-tight truncate">{w.name}</p>
          </div>
        </div>
        <span className={cn('text-xs px-2 py-0.5 rounded-full border flex-shrink-0 font-medium', STATUS_COLORS[w.status])}>
          {STATUS_LABELS[w.status]}
        </span>
      </div>

      {/* Description */}
      <p className="text-xs text-muted-foreground leading-relaxed mb-3 line-clamp-2">{w.description}</p>

      {/* Error message */}
      {w.error_message && (
        <div className="bg-rose-500/8 border border-rose-500/20 rounded-lg px-3 py-2 mb-3">
          <p className="text-xs text-rose-400 font-mono leading-relaxed">{w.error_message}</p>
        </div>
      )}

      {/* Trigger */}
      <div className={cn('flex items-center gap-1.5 text-xs mb-3', TRIGGER_TYPE_COLORS[w.trigger_type])}>
        <TriggerIcon type={w.trigger_type} />
        <span className="font-medium">{TRIGGER_TYPE_LABELS[w.trigger_type]}</span>
        <span className="text-muted-foreground font-mono truncate">· {w.trigger_label}</span>
      </div>

      {/* Stats row */}
      <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border/50 pt-3 gap-2 flex-wrap">
        <div className="flex gap-3">
          <span>
            <span className="text-foreground font-semibold">{w.executions_today}</span> aujourd'hui
          </span>
          <span>
            <span className="text-foreground font-semibold">{w.executions_total.toLocaleString('fr')}</span> total
          </span>
          {w.avg_duration_ms && (
            <span>
              <span className="text-foreground font-semibold">{(w.avg_duration_ms / 1000).toFixed(1)}s</span> moy.
            </span>
          )}
        </div>
        <span className="font-mono opacity-70">{lastExecTime}</span>
      </div>
    </div>
  );
};

export default WorkflowCard;
