import { cn } from '@/lib/utils';
import type { ReservationTimelineEvent } from '@/types/reservation';
import { STATUS_LABELS, STATUS_COLORS } from '@/lib/reservationMockData';

interface Props {
  events: ReservationTimelineEvent[];
}

const ACTOR_COLORS: Record<string, string> = {
  user: 'text-blue-400', system: 'text-muted-foreground',
  channel: 'text-rose-400', agent: 'text-purple-400',
};

const ReservationTimeline = ({ events }: Props) => {
  if (events.length === 0) {
    return <p className="text-xs text-muted-foreground">Aucun événement</p>;
  }

  return (
    <div className="space-y-0">
      {events.map((event, i) => (
        <div key={event.id} className="flex gap-3 pb-4 last:pb-0 relative">
          {/* Connecting line */}
          {i < events.length - 1 && (
            <div className="absolute left-3 top-5 bottom-0 w-px bg-border" />
          )}
          {/* Dot */}
          <div className="w-6 h-6 rounded-full border-2 border-border bg-card flex-shrink-0 flex items-center justify-center z-10">
            <div className="w-2 h-2 rounded-full bg-primary/50" />
          </div>
          {/* Content */}
          <div className="flex-1 min-w-0 pt-0.5">
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', STATUS_COLORS[event.status])}>
                {STATUS_LABELS[event.status]}
              </span>
              <span className={cn('text-xs font-medium', ACTOR_COLORS[event.actor_type])}>
                {event.actor}
              </span>
            </div>
            {event.note && (
              <p className="text-xs text-muted-foreground mt-0.5">{event.note}</p>
            )}
            <p className="text-xs text-muted-foreground/40 mt-1">
              {new Date(event.timestamp).toLocaleString('fr-CA', { dateStyle: 'short', timeStyle: 'short' })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ReservationTimeline;
