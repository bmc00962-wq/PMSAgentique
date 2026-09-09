import type { ExecutionLog } from '@/types/workflow';
import { EXEC_STATUS_COLORS, EXEC_STATUS_ICONS } from '@/lib/workflowMockData';
import { cn } from '@/lib/utils';

interface Props { log: ExecutionLog; }

const WorkflowLogEntry = ({ log }: Props) => {
  const time = new Date(log.executed_at).toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const date = new Date(log.executed_at).toLocaleDateString('fr', { day: '2-digit', month: '2-digit' });

  return (
    <div className={cn(
      'flex items-start gap-3 py-2.5 border-b border-border/30 last:border-0',
      log.status === 'error' && 'bg-rose-500/4 -mx-1 px-1 rounded',
    )}>
      {/* Status indicator */}
      <div className={cn('w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold',
        log.status === 'success' ? 'bg-emerald-500/15' :
        log.status === 'error' ? 'bg-rose-500/15' :
        log.status === 'warning' ? 'bg-yellow-500/15' : 'bg-blue-500/15',
        EXEC_STATUS_COLORS[log.status],
      )}>
        {EXEC_STATUS_ICONS[log.status]}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-xs font-semibold text-foreground">{log.workflow_name}</span>
          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-shrink-0">
            <span className="font-mono">{(log.duration_ms / 1000).toFixed(2)}s</span>
            <span>{date} {time}</span>
          </div>
        </div>
        {log.edge_fn_called && (
          <span className="text-xs font-mono text-blue-400/70">{log.edge_fn_called}</span>
        )}
        {log.trigger_data && (
          <p className="text-xs text-muted-foreground/60 font-mono mt-0.5 truncate">{log.trigger_data}</p>
        )}
        {log.error_message && (
          <p className="text-xs text-rose-400 mt-1 leading-relaxed">{log.error_message}</p>
        )}
      </div>
    </div>
  );
};

export default WorkflowLogEntry;
