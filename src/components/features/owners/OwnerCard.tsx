import { Mail, Phone, MapPin, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OwnerDisplay } from '@/types/owner';

const STATUS_STYLE: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  inactive: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
};
const STATUS_LABEL: Record<string, string> = { active: 'Actif', inactive: 'Inactif', pending: 'En attente' };
const FLAG: Record<string, string> = { CA: '🇨🇦', MA: '🇲🇦', FR: '🇫🇷' };

interface OwnerCardProps {
  owner: OwnerDisplay;
  onClick: () => void;
}

const OwnerCard = ({ owner, onClick }: OwnerCardProps) => {
  const initials = `${owner.first_name[0]}${owner.last_name[0]}`;

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-card border border-border rounded-xl p-4 hover:border-primary/40 hover:shadow-md hover:shadow-black/20 transition-all group"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-bold text-primary">{initials}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="text-sm font-semibold text-foreground leading-tight">
              {owner.first_name} {owner.last_name}
            </p>
            <span className={cn('text-xs px-2 py-0.5 rounded-full border flex-shrink-0', STATUS_STYLE[owner.status])}>
              {STATUS_LABEL[owner.status]}
            </span>
          </div>
          {owner.company_name && (
            <p className="text-xs text-muted-foreground truncate mb-2">{owner.company_name}</p>
          )}
          <div className="space-y-1">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Mail className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{owner.email}</span>
            </p>
            {owner.phone && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Phone className="w-3 h-3 flex-shrink-0" />{owner.phone}
              </p>
            )}
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              {FLAG[owner.country] ?? ''} {owner.city}
            </p>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Building2 className="w-3 h-3" />
          {owner.properties_count} propriété{owner.properties_count !== 1 ? 's' : ''}
        </span>
        <span className="text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity font-medium">
          Voir →
        </span>
      </div>
    </button>
  );
};

export default OwnerCard;
