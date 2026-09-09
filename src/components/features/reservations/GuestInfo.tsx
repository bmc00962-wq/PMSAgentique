import { Mail, Phone, Globe, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GuestDisplay } from '@/types/reservation';
import { COUNTRY_FLAGS, LANG_LABELS } from '@/lib/reservationMockData';

interface Props {
  guest: GuestDisplay;
  compact?: boolean;
}

const GuestInfo = ({ guest, compact = false }: Props) => {
  const flag = COUNTRY_FLAGS[guest.country] ?? '🌍';

  return (
    <div className={cn('bg-secondary/30 border border-border rounded-xl space-y-3', compact ? 'p-3 space-y-2' : 'p-4')}>
      {/* Avatar + name */}
      <div className="flex items-center gap-3">
        <div className={cn(
          'rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 font-bold text-primary',
          compact ? 'w-9 h-9 text-xs' : 'w-12 h-12 text-sm'
        )}>
          {guest.avatar_initials}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className={cn('font-semibold text-foreground', compact ? 'text-sm' : 'text-base')}>
              {guest.first_name} {guest.last_name}
            </p>
            {guest.verified && (
              <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded-full flex-shrink-0">
                ✓ Vérifié
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
            <span className="flex-shrink-0">{flag} {guest.country}</span>
            {guest.rating && (
              <span className="flex items-center gap-0.5 text-yellow-400 flex-shrink-0">
                <Star className="w-3 h-3 fill-current" /> {guest.rating}
              </span>
            )}
            {guest.total_stays > 0 && (
              <span className="flex-shrink-0">{guest.total_stays} séjour{guest.total_stays > 1 ? 's' : ''}</span>
            )}
          </div>
        </div>
      </div>

      {/* Contact details (non-compact only) */}
      {!compact && (
        <div className="space-y-1.5 pt-2 border-t border-border/50">
          <div className="flex items-center gap-2 text-xs">
            <Mail className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <a href={`mailto:${guest.email}`} className="text-blue-400 hover:underline truncate">{guest.email}</a>
          </div>
          {guest.phone && (
            <div className="flex items-center gap-2 text-xs">
              <Phone className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <span className="text-foreground">{guest.phone}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-xs">
            <Globe className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <span className="text-foreground">{LANG_LABELS[guest.language] ?? guest.language}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default GuestInfo;
