import { cn } from '@/lib/utils';
import type { SyncEvent } from '@/types/channel';
import { SYNC_EVENT_LABELS, SYNC_STATUS_COLORS, CHANNEL_DISPLAY } from '@/lib/channelMockData';

interface Props { events: SyncEvent[]; }

const DOT: Record<string, string> = {
  success: 'bg-emerald-400', error: 'bg-red-400', warning: 'bg-yellow-400',
};

const SyncLog = ({ events }: Props) => {
  if (!events.length) return <p className="text-xs text-muted-foreground text-center py-4">Aucun evenement</p>;

  return (
    <div className="divide-y divide-border/40">
      {events.map(e => {
        const ch = CHANNEL_DISPLAY[e.channel];
        return (
          <div key={e.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
            <div className="pt-1.5 flex-shrink-0">
              <div className={cn('w-2 h-2 rounded-full', DOT[e.status])} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                <span className={cn('text-xs font-semibold', SYNC_STATUS_COLORS[e.status])}>
                  {SYNC_EVENT_LABELS[e.event_type] ?? e.event_type}
                </span>
                <span className={cn('text-xs px-1.5 py-0.5 rounded', ch.bg, ch.color)}>{ch.name}</span>
                {e.duration_ms && <span className="text-xs text-muted-foreground/50 ml-auto">{e.duration_ms}ms</span>}
              </div>
              <p className="text-xs text-foreground">{e.message}</p>
              {e.details && <p className="text-xs text-muted-foreground mt-0.5">{e.details}</p>}
              <p className="text-xs text-muted-foreground/40 mt-1">
                {new Date(e.timestamp).toLocaleString('fr-CA', { dateStyle: 'short', timeStyle: 'short' })}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default SyncLog;
