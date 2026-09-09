import { useNavigate } from 'react-router-dom';
import { BadgeCheck, Star, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GuestProfile } from '@/types/guest';
import { COUNTRY_FLAGS, LANG_LABELS } from '@/lib/guestMockData';

interface Props { guest: GuestProfile; }

const GuestCard = ({ guest: g }: Props) => {
  const navigate = useNavigate();
  const flag = COUNTRY_FLAGS[g.country_code] ?? '🌍';

  return (
    <button
      onClick={() => navigate(`/guests/${g.id}`)}
      className="w-full text-left bg-card border border-border rounded-xl p-5 hover:border-primary/30 hover:bg-card/80 transition-all duration-200 group"
    >
      <div className="flex items-start gap-3 mb-4">
        <div className={cn('w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0', g.avatar_color)}>
          {g.avatar_initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
              {g.first_name} {g.last_name}
            </span>
            {g.is_verified && <BadgeCheck className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
            <span>{flag}</span>
            <span>{LANG_LABELS[g.language]}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
          <span className="text-xs font-bold text-yellow-400">{g.rating.toFixed(1)}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-secondary/40 rounded-lg p-2">
          <p className="text-xs text-muted-foreground">Séjours</p>
          <p className="text-xl font-bold text-foreground">{g.total_stays}</p>
        </div>
        <div className="bg-secondary/40 rounded-lg p-2">
          <p className="text-xs text-muted-foreground">Dépenses</p>
          <p className="text-sm font-bold text-emerald-400 font-mono">
            {g.total_spent.toLocaleString()} {g.currency}
          </p>
        </div>
      </div>

      {g.last_stay_at && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60">
          <Calendar className="w-3 h-3 flex-shrink-0" />
          <span>Dernier séjour : {new Date(g.last_stay_at).toLocaleDateString('fr-CA', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
        </div>
      )}
    </button>
  );
};

export default GuestCard;
