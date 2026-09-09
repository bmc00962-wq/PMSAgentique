import { Star, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Driver } from '@/types/transport';
import { VEHICLE_TYPE_LABELS } from '@/lib/transportMockData';

interface Props { driver: Driver; compact?: boolean; }

const DriverCard = ({ driver: d, compact = false }: Props) => (
  <div className={cn('bg-card border border-border rounded-xl p-4', compact && 'flex items-center gap-3')}>
    <div className={cn(
      'rounded-full flex items-center justify-center font-bold flex-shrink-0',
      d.avatar_color,
      compact ? 'w-10 h-10 text-sm' : 'w-12 h-12 text-base'
    )}>
      {d.avatar_initials}
    </div>

    <div className={compact ? 'min-w-0 flex-1' : 'mt-3'}>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-semibold text-foreground">{d.first_name} {d.last_name}</span>
        {!d.is_active && (
          <span className="text-xs text-muted-foreground/50 bg-secondary px-1.5 py-0.5 rounded border border-border">Inactif</span>
        )}
      </div>

      {compact ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
          <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
          <span className="text-yellow-400 font-medium">{d.rating.toFixed(1)}</span>
          <span className="text-muted-foreground/40">·</span>
          <span>{d.vehicle_model}</span>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
            <Phone className="w-3 h-3" /><span>{d.phone}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{VEHICLE_TYPE_LABELS[d.vehicle_type]} — {d.vehicle_model}</p>
          <p className="text-xs font-mono text-muted-foreground/60">{d.vehicle_plate}</p>
          <div className="flex items-center justify-between mt-3 text-xs">
            <div>
              <p className="text-2xl font-bold text-foreground">{d.trips_completed}</p>
              <p className="text-muted-foreground/60">trajets</p>
            </div>
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              <span className="text-xl font-bold text-yellow-400">{d.rating.toFixed(1)}</span>
            </div>
          </div>
          <div className="flex gap-1 mt-2 flex-wrap">
            {d.languages.map(l => (
              <span key={l} className="text-xs bg-secondary border border-border px-1.5 py-0.5 rounded font-mono uppercase">{l}</span>
            ))}
          </div>
        </>
      )}
    </div>
  </div>
);

export default DriverCard;
