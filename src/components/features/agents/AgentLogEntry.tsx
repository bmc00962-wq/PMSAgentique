import type { AgentLog } from '@/types/agent';
import { cn } from '@/lib/utils';

const STATUS_STYLE: Record<string, string> = {
  success: 'text-emerald-400 bg-emerald-500/15',
  error: 'text-rose-400 bg-rose-500/15',
  warning: 'text-yellow-400 bg-yellow-500/15',
  info: 'text-blue-400 bg-blue-500/15',
  blocked: 'text-orange-400 bg-orange-500/15',
};
const STATUS_ICON: Record<string, string> = {
  success: '✓', error: '✗', warning: '⚠', info: 'ℹ', blocked: '⊘',
};

interface Props { log: AgentLog; }

const AgentLogEntry = ({ log }: Props) => {
  const time = new Date(log.executed_at).toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit' });
  const date = new Date(log.executed_at).toLocaleDateString('fr', { day: '2-digit', month: '2-digit' });

  return (
    <div className={cn(
      'flex items-start gap-3 py-2.5 border-b border-border/30 last:border-0',
      (log.status === 'error' || log.status === 'blocked') && 'bg-orange-500/4 -mx-1 px-1 rounded',
    )}>
      <div className={cn(
        'w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold',
        STATUS_STYLE[log.status],
      )}>
        {STATUS_ICON[log.status]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-semibold text-foreground truncate">{log.action_name}</span>
            <span className="text-xs text-muted-foreground/60 truncate hidden sm:inline">{log.agent_name}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-shrink-0">
            {log.duration_ms > 0 && <span className="font-mono">{(log.duration_ms / 1000).toFixed(2)}s</span>}
            <span>{date} {time}</span>
          </div>
        </div>
        {log.result_summary && (
          <p className="text-xs text-muted-foreground/60 mt-0.5 truncate">{log.result_summary}</p>
        )}
        {log.error_message && (
          <p className="text-xs text-rose-400/80 mt-1 leading-relaxed">{log.error_message}</p>
        )}
        {log.approval_id && (
          <span className="text-xs font-mono text-amber-400/70 mt-0.5 inline-block">→ {log.approval_id}</span>
        )}
      </div>
    </div>
  );
};

export default AgentLogEntry;
