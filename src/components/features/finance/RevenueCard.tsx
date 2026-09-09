import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface Props {
  label: string;
  value: string;
  sub?: string;
  trend?: number;       // positive = up, negative = down, 0 = flat
  Icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  valueColor?: string;
}

const RevenueCard = ({ label, value, sub, trend, Icon, iconColor, iconBg, valueColor }: Props) => (
  <div className="bg-card border border-border rounded-xl p-5">
    <div className="flex items-start justify-between mb-3">
      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', iconBg)}>
        <Icon className={cn('w-4.5 h-4.5', iconColor)} />
      </div>
      {trend !== undefined && (
        <span className={cn(
          'flex items-center gap-1 text-xs font-medium',
          trend > 0 ? 'text-emerald-400' : trend < 0 ? 'text-rose-400' : 'text-muted-foreground'
        )}>
          {trend > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : trend < 0 ? <TrendingDown className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
          {Math.abs(trend)}%
        </span>
      )}
    </div>
    <p className={cn('text-2xl font-bold', valueColor ?? 'text-foreground')}>{value}</p>
    <p className="text-xs font-medium text-foreground/70 mt-0.5">{label}</p>
    {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
  </div>
);

export default RevenueCard;
