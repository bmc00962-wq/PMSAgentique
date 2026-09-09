import type { PlanId } from '@/types/settings';
import { PLAN_CONFIG } from '@/lib/settingsMockData';
import { cn } from '@/lib/utils';

interface Props {
  plan: PlanId;
  size?: 'sm' | 'md';
  showPrice?: boolean;
  priceMonthly?: number;
}

const PlanBadge = ({ plan, size = 'md', showPrice, priceMonthly }: Props) => {
  const cfg = PLAN_CONFIG[plan];
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-full border font-semibold',
      cfg.bg, cfg.color, cfg.border,
      size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1',
    )}>
      {cfg.label}
      {showPrice && priceMonthly !== undefined && (
        <span className="font-normal opacity-70">
          · {priceMonthly === 0 ? 'Gratuit' : `${priceMonthly} CAD/mois`}
        </span>
      )}
    </span>
  );
};

export default PlanBadge;
