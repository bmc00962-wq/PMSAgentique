import type { QuotaUsage } from '@/types/settings';
import { cn } from '@/lib/utils';

interface QuotaBarProps {
  label: string;
  used: number;
  max: number;
  unit?: string;
}

const QuotaBar = ({ label, used, max, unit = '' }: QuotaBarProps) => {
  const pct = Math.min(100, Math.round((used / max) * 100));
  const color = pct >= 90 ? 'bg-rose-500' : pct >= 70 ? 'bg-yellow-500' : 'bg-emerald-500';
  const textColor = pct >= 90 ? 'text-rose-400' : pct >= 70 ? 'text-yellow-400' : 'text-emerald-400';

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground font-medium">{label}</span>
        <span className={cn('font-semibold', textColor)}>
          {used}{unit} <span className="text-muted-foreground/60 font-normal">/ {max}{unit}</span>
        </span>
      </div>
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

interface Props {
  quota: QuotaUsage;
  className?: string;
}

const QuotaWidget = ({ quota, className }: Props) => {
  return (
    <div className={cn('bg-card border border-border rounded-xl p-5 space-y-4', className)}>
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Utilisation du quota
      </h3>
      <QuotaBar
        label="Propriétés"
        used={quota.properties_used}
        max={quota.properties_max}
      />
      <QuotaBar
        label="Unités"
        used={quota.units_used}
        max={quota.units_max}
      />
      <QuotaBar
        label="Membres"
        used={quota.members_used}
        max={quota.members_max}
      />
      <QuotaBar
        label="Stockage"
        used={Math.round(quota.storage_used_gb * 10) / 10}
        max={quota.storage_max_gb}
        unit=" GB"
      />
    </div>
  );
};

export default QuotaWidget;
