import { MapPin, Users, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PropertyDisplay, PropertyTypeDisplay, PropertyStatusDisplay } from '@/types/property';

const TYPE_LABEL: Record<PropertyTypeDisplay, string> = {
  apartment: 'Appartement', house: 'Maison', villa: 'Villa', condo: 'Condo',
  chalet: 'Chalet', loft: 'Loft', studio: 'Studio', riad: 'Riad',
};
const STATUS_STYLE: Record<PropertyStatusDisplay, string> = {
  active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  inactive: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  maintenance: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  draft: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
};
const STATUS_LABEL: Record<PropertyStatusDisplay, string> = {
  active: 'Actif', inactive: 'Inactif', maintenance: 'Maintenance', draft: 'Brouillon',
};
const FLAG: Record<string, string> = { CA: '🇨🇦', MA: '🇲🇦', FR: '🇫🇷' };
const TYPE_GRADIENT: Partial<Record<PropertyTypeDisplay, string>> = {
  villa: 'from-emerald-900/50 to-emerald-950/80',
  chalet: 'from-amber-900/50 to-amber-950/80',
  riad: 'from-orange-900/50 to-orange-950/80',
  apartment: 'from-blue-900/50 to-blue-950/80',
  studio: 'from-purple-900/50 to-purple-950/80',
  house: 'from-teal-900/50 to-teal-950/80',
  condo: 'from-cyan-900/50 to-cyan-950/80',
  loft: 'from-slate-800/50 to-slate-950/80',
};

interface PropertyCardProps {
  property: PropertyDisplay;
  onClick: () => void;
}

const PropertyCard = ({ property, onClick }: PropertyCardProps) => {
  const gradient = TYPE_GRADIENT[property.property_type] ?? 'from-slate-800/50 to-slate-950/80';

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-card border border-border rounded-xl overflow-hidden hover:border-primary/40 hover:shadow-lg hover:shadow-black/25 transition-all group"
    >
      {/* Color band */}
      <div className={cn('h-24 bg-gradient-to-br relative', gradient)}>
        <div className="absolute inset-0 opacity-5">
          <div className="w-full h-full" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
        </div>
        <div className="absolute inset-x-0 bottom-0 p-3 flex items-center justify-between">
          <span className={cn('text-xs px-2.5 py-1 rounded-full border backdrop-blur-sm', STATUS_STYLE[property.status])}>
            {STATUS_LABEL[property.status]}
          </span>
          {property.internal_code && (
            <span className="text-xs font-mono text-white/30">{property.internal_code}</span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="text-sm font-semibold text-foreground mb-0.5 truncate group-hover:text-primary transition-colors">
          {property.name}
        </h3>
        <p className="text-xs text-muted-foreground mb-3 truncate">
          {TYPE_LABEL[property.property_type]}
          {property.owner_name && <span className="opacity-60"> · {property.owner_name}</span>}
        </p>
        <div className="space-y-1.5">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            {FLAG[property.country] ?? ''} {property.city}
          </p>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="w-3 h-3 flex-shrink-0" />
            {property.total_units} unité{property.total_units !== 1 ? 's' : ''}
            {property.active_units < property.total_units && (
              <span className="text-orange-400 ml-1">({property.active_units} actives)</span>
            )}
          </p>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="w-3 h-3 flex-shrink-0" />
            {property.default_checkin_time} → {property.default_checkout_time}
          </p>
        </div>
        <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
          <span className="text-xs font-mono text-muted-foreground/30">{property.id.slice(0, 8)}…</span>
          <span className="text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity font-medium">
            Détails →
          </span>
        </div>
      </div>
    </button>
  );
};

export default PropertyCard;
