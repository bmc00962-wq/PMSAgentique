import { useNavigate } from 'react-router-dom';
import { MapPin, Clock, Users, Plane } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Trip } from '@/types/transport';
import { TRIP_STATUS_LABELS, TRIP_STATUS_COLORS, TRIP_TYPE_LABELS } from '@/lib/transportMockData';

interface Props { trip: Trip; }

const TripCard = ({ trip: t }: Props) => {
  const navigate = useNavigate();
  const dt = new Date(t.scheduled_at);
  const dateStr = dt.toLocaleDateString('fr-CA', { month: 'short', day: 'numeric' });
  const timeStr = dt.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' });

  return (
    <button
      onClick={() => navigate(`/transport/${t.id}`)}
      className="w-full text-left bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-all duration-200 group"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-foreground/50 mb-0.5">{TRIP_TYPE_LABELS[t.type]}</p>
          <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
            {t.guest_name}
          </p>
          <p className="text-xs text-muted-foreground">{t.property_name}</p>
        </div>
        <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full border flex-shrink-0', TRIP_STATUS_COLORS[t.status])}>
          {TRIP_STATUS_LABELS[t.status]}
        </span>
      </div>

      <div className="space-y-1.5 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3 h-3 flex-shrink-0" />
          <span>{dateStr} · {timeStr}</span>
          {t.flight_number && (
            <span className="flex items-center gap-1 ml-auto text-blue-400">
              <Plane className="w-3 h-3" />{t.flight_number}
            </span>
          )}
        </div>
        <div className="flex items-start gap-1.5">
          <MapPin className="w-3 h-3 flex-shrink-0 mt-0.5 text-emerald-400" />
          <span className="truncate">{t.pickup_address}</span>
        </div>
        <div className="flex items-start gap-1.5">
          <MapPin className="w-3 h-3 flex-shrink-0 mt-0.5 text-rose-400" />
          <span className="truncate">{t.dropoff_address}</span>
        </div>
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/60">
        <div className="flex items-center gap-2 text-xs">
          {t.driver_name ? (
            <>
              <div className={cn('w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0', t.driver_color)}>
                {t.driver_initials}
              </div>
              <span className="text-muted-foreground truncate">{t.driver_name}</span>
            </>
          ) : (
            <span className="text-muted-foreground/40 italic">Non assigne</span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Users className="w-3 h-3 text-muted-foreground" />
          <span className="text-muted-foreground">{t.guest_count} pers.</span>
          {t.price_eur && <span className="text-primary font-semibold">{t.price_eur} €</span>}
        </div>
      </div>
    </button>
  );
};

export default TripCard;
