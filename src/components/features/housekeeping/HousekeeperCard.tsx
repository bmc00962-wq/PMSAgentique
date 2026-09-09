import { Phone, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Housekeeper } from '@/types/housekeeping';

interface Props { housekeeper: Housekeeper; compact?: boolean; }

const HousekeeperCard = ({ housekeeper: h, compact = false }: Props) => (
  <div className={cn('bg-card border border-border rounded-xl p-4', compact && 'flex items-center gap-3')}>
    <div className={cn(
      'rounded-full flex items-center justify-center font-bold flex-shrink-0',
      h.avatar_color,
      compact ? 'w-10 h-10 text-sm' : 'w-12 h-12 text-base'
    )}>
      {h.avatar_initials}
    </div>

    <div className={compact ? 'min-w-0 flex-1' : 'mt-3'}>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-semibold text-foreground">{h.first_name} {h.last_name}</span>
        {!h.is_active && (
          <span className="text-xs text-muted-foreground/50 bg-secondary px-1.5 py-0.5 rounded border border-border">
            Inactif
          </span>
        )}
      </div>

      {!compact && (
        <>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
            <Phone className="w-3 h-3 flex-shrink-0" />
            <span>{h.phone}</span>
          </div>
          <div className="flex items-center justify-between mt-3 text-xs">
            <div>
              <p className="text-muted-foreground/60">Ce mois</p>
              <p className="font-bold text-foreground text-base">{h.jobs_this_month}</p>
              <p className="text-muted-foreground/60 text-xs">jobs</p>
            </div>
            <div className="text-center">
              <p className="text-muted-foreground/60">Total</p>
              <p className="font-bold text-foreground text-base">{h.jobs_completed}</p>
              <p className="text-muted-foreground/60 text-xs">jobs</p>
            </div>
            <div className="text-right">
              <p className="text-muted-foreground/60">Note</p>
              <div className="flex items-center gap-1 justify-end">
                <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                <span className="font-bold text-yellow-400">{h.rating.toFixed(1)}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-1 mt-3 flex-wrap">
            {h.languages.map(l => (
              <span key={l} className="text-xs bg-secondary border border-border px-1.5 py-0.5 rounded font-mono uppercase">
                {l}
              </span>
            ))}
          </div>
        </>
      )}

      {compact && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
          <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
          <span className="text-yellow-400 font-medium">{h.rating.toFixed(1)}</span>
          <span className="text-muted-foreground/40">·</span>
          <span>{h.jobs_completed} jobs</span>
        </div>
      )}
    </div>
  </div>
);

export default HousekeeperCard;
