import { Bed, Bath, Users, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UnitDisplay, UnitTypeDisplay, UnitStatusDisplay } from '@/types/property';

const TYPE_LABEL: Record<UnitTypeDisplay, string> = {
  studio: 'Studio', one_bedroom: '1 chambre', two_bedroom: '2 chambres',
  three_bedroom: '3 chambres', penthouse: 'Penthouse', suite: 'Suite',
};
const STATUS_STYLE: Record<UnitStatusDisplay, string> = {
  active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  inactive: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  maintenance: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  blocked: 'bg-red-500/10 text-red-400 border-red-500/20',
};
const STATUS_LABEL: Record<UnitStatusDisplay, string> = {
  active: 'Actif', inactive: 'Inactif', maintenance: 'Maintenance', blocked: 'Bloqué',
};

interface UnitCardProps { unit: UnitDisplay; }

const UnitCard = ({ unit }: UnitCardProps) => (
  <div className="bg-secondary/30 border border-border rounded-xl p-4 hover:border-border/80 transition-colors">
    <div className="flex items-start justify-between gap-3 mb-3">
      <div className="min-w-0">
        <h4 className="text-sm font-semibold text-foreground truncate">{unit.name}</h4>
        <p className="text-xs text-muted-foreground mt-0.5">
          {TYPE_LABEL[unit.unit_type]}
          {unit.floor != null && ` · Étage ${unit.floor}`}
          {unit.surface_sqm && ` · ${unit.surface_sqm} m²`}
        </p>
      </div>
      <span className={cn('text-xs px-2 py-0.5 rounded-full border flex-shrink-0', STATUS_STYLE[unit.status])}>
        {STATUS_LABEL[unit.status]}
      </span>
    </div>

    <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-border">
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Bed className="w-3 h-3" />
        {unit.bedrooms === 0 ? 'Ouvert' : `${unit.bedrooms} ch.`}
      </span>
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Bath className="w-3 h-3" />{unit.bathrooms} sdb.
      </span>
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Users className="w-3 h-3" />max {unit.max_guests}
      </span>
      <span className="flex items-center gap-1 text-xs font-semibold text-foreground ml-auto">
        <DollarSign className="w-3 h-3 text-emerald-400" />
        {unit.base_price.toLocaleString('fr-CA')} <span className="font-normal text-muted-foreground">{unit.currency}/nuit</span>
      </span>
    </div>
  </div>
);

export default UnitCard;
