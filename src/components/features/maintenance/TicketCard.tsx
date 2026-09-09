import { useNavigate } from 'react-router-dom';
import { Wrench, AlertTriangle, Clock, Link } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MaintenanceTicket } from '@/types/maintenance';
import {
  TICKET_STATUS_LABELS, TICKET_STATUS_COLORS, TICKET_PRIORITY_LABELS,
  TICKET_PRIORITY_COLORS, TICKET_PRIORITY_BORDER, TICKET_CATEGORY_LABELS,
} from '@/lib/maintenanceMockData';

interface Props { ticket: MaintenanceTicket; }

const TicketCard = ({ ticket: t }: Props) => {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(`/maintenance/${t.id}`)}
      className={cn(
        'w-full text-left bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-all duration-200 group border-l-4',
        TICKET_PRIORITY_BORDER[t.priority]
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-muted-foreground/60">{TICKET_CATEGORY_LABELS[t.category]}</span>
            {t.housekeeping_job_id && (
              <span className="flex items-center gap-0.5 text-xs text-purple-400">
                <Link className="w-2.5 h-2.5" />Menage
              </span>
            )}
          </div>
          <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors leading-tight">
            {t.title}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{t.property_name} · {t.unit_name}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full border', TICKET_STATUS_COLORS[t.status])}>
            {TICKET_STATUS_LABELS[t.status]}
          </span>
          {t.priority === 'critical' && <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />}
        </div>
      </div>

      <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{t.description}</p>

      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>{new Date(t.created_at).toLocaleDateString('fr-CA', { month: 'short', day: 'numeric' })}</span>
        </div>
        <div className="flex items-center gap-2">
          {t.assigned_name ? (
            <span className="text-muted-foreground">{t.assigned_name}</span>
          ) : (
            <span className="text-muted-foreground/40 italic">Non assigne</span>
          )}
          <div className="flex items-center gap-1">
            <Wrench className="w-3 h-3 text-muted-foreground/50" />
            <span className="text-muted-foreground/60">{t.interventions.length}</span>
          </div>
          <span className={cn('font-semibold', TICKET_PRIORITY_COLORS[t.priority])}>
            {TICKET_PRIORITY_LABELS[t.priority]}
          </span>
        </div>
      </div>
    </button>
  );
};

export default TicketCard;
