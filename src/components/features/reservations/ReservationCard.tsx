import { useNavigate } from 'react-router-dom';
import { MapPin, Moon, Users, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReservationDisplay } from '@/types/reservation';
import { STATUS_LABELS, STATUS_COLORS, CHANNEL_LABELS, CHANNEL_COLORS, COUNTRY_FLAGS } from '@/lib/reservationMockData';

interface Props {
  reservation: ReservationDisplay;
}

const ReservationCard = ({ reservation: r }: Props) => {
  const navigate = useNavigate();
  const flag = COUNTRY_FLAGS[r.guest.country] ?? '🌍';
  const totalGuests = r.adults + r.children + r.infants;

  return (
    <button
      onClick={() => navigate(`/reservations/${r.id}`)}
      className="w-full text-left bg-card border border-border rounded-xl p-4 hover:border-primary/30 hover:bg-card/80 transition-all duration-200 group"
    >
      {/* Status + channel */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium flex-shrink-0', STATUS_COLORS[r.status])}>
          {STATUS_LABELS[r.status]}
        </span>
        <span className={cn('text-xs px-2 py-0.5 rounded-full border flex-shrink-0', CHANNEL_COLORS[r.channel])}>
          {CHANNEL_LABELS[r.channel]}
        </span>
        <span className="text-xs text-muted-foreground/50 ml-auto font-mono truncate">{r.id}</span>
      </div>

      {/* Guest */}
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-bold text-primary">{r.guest.avatar_initials}</span>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
            {r.guest.first_name} {r.guest.last_name}
          </p>
          <p className="text-xs text-muted-foreground">
            {flag} {r.guest.country}{r.guest.verified ? ' · ✓ Vérifié' : ''}
          </p>
        </div>
      </div>

      {/* Property */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
        <MapPin className="w-3 h-3 flex-shrink-0" />
        <span className="truncate">{r.property_name}</span>
        <span className="opacity-40 flex-shrink-0">·</span>
        <span className="text-foreground/70 flex-shrink-0">{r.unit_name}</span>
      </div>

      {/* Dates + guests */}
      <div className="flex items-center gap-3 text-xs mb-3">
        <div className="flex items-center gap-1 text-muted-foreground min-w-0">
          <Calendar className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">{r.check_in} → {r.check_out}</span>
        </div>
        <div className="flex items-center gap-1 text-muted-foreground flex-shrink-0 ml-auto">
          <Moon className="w-3 h-3" /><span>{r.nights}n</span>
          <Users className="w-3 h-3 ml-1" /><span>{totalGuests}</span>
        </div>
      </div>

      {/* Amount */}
      <div className="flex items-center justify-between pt-2 border-t border-border/50">
        <span className="text-xs text-muted-foreground">Total</span>
        <span className="text-sm font-bold text-emerald-400 font-mono">
          {r.total_amount.toLocaleString()} {r.currency}
        </span>
      </div>
    </button>
  );
};

export default ReservationCard;
