import { Clock, User, FileText } from 'lucide-react';
import type { MaintenanceIntervention } from '@/types/maintenance';

interface Props { interventions: MaintenanceIntervention[]; }

const MaintenanceTimeline = ({ interventions }: Props) => {
  if (interventions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FileText className="w-6 h-6 mx-auto mb-2 opacity-30" />
        <p className="text-xs">Aucune intervention enregistree</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {interventions.map((inv, idx) => (
        <div key={inv.id} className="flex gap-3">
          <div className="flex flex-col items-center flex-shrink-0">
            <div className="w-6 h-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
              <User className="w-3 h-3 text-primary" />
            </div>
            {idx < interventions.length - 1 && (
              <div className="w-px flex-1 bg-border mt-1" />
            )}
          </div>
          <div className="pb-4 min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-xs font-semibold text-foreground">{inv.technician_name}</span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                {new Date(inv.created_at).toLocaleString('fr-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
              {inv.duration_min && (
                <span className="text-xs text-muted-foreground/60">{inv.duration_min} min</span>
              )}
            </div>
            <p className="text-xs text-foreground">{inv.action}</p>
            {inv.notes && (
              <p className="text-xs text-muted-foreground mt-1 bg-secondary/40 rounded-lg px-2 py-1">{inv.notes}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default MaintenanceTimeline;
