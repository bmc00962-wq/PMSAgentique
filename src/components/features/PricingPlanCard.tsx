import { Building2, Zap, Star, Sparkles, Crown, CheckCircle2, ArrowRight, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { pricingPlanName, pricingPlanDescription } from '@/lib/pricing';
import type { Language } from '@/lib/i18n';
import type { PricingPlan, PricingCurrency, PricingCopy } from '@/types/pricing';

interface PricingPlanCardProps {
  plan: PricingPlan; currency: PricingCurrency; annual: boolean;
  language: Language; labels: PricingCopy; onChoose: () => void;
}
const ICONS: Record<string, LucideIcon> = { trial: Zap, starter: Building2, professional: Star, growth: Sparkles, enterprise: Crown };
const PricingPlanCard = ({ plan, currency, annual, language, labels: l, onChoose }: PricingPlanCardProps) => {
  const Icon = ICONS[plan.id] ?? Building2;
  const featured = plan.id === 'professional';
  const free = plan.price_eur === 0;
  const base = currency === 'eur' ? plan.price_eur : plan.price_mad;
  const price = annual ? base * 10 : base;
  const badge = featured ? l.popular : plan.id === 'starter' ? l.beginner : plan.id === 'growth' ? l.recommended : plan.id === 'enterprise' ? l.custom : undefined;
  return (
    <article className={cn('relative flex flex-col rounded-2xl border p-5 shadow-card transition-transform duration-200 hover:-translate-y-1', featured ? 'border-primary/40 bg-accent/35 shadow-soft' : 'border-border bg-card')}>
      {badge && <p className={cn('absolute -top-3 start-4 rounded-full border px-3 py-1 text-xs font-semibold', featured ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-primary')}>{badge}</p>}
      <div className="mb-4 mt-2"><div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-primary"><Icon className="h-5 w-5" /></div><h2 className="text-lg font-semibold text-foreground">{pricingPlanName(plan, language)}</h2><p className="mt-2 min-h-[48px] text-sm leading-relaxed text-muted-foreground">{pricingPlanDescription(plan, language)}</p></div>
      <div className="mb-5">
        <p className="text-3xl font-bold text-primary">{free ? l.free : <>{price.toFixed(0)} <span className="text-base font-medium">{currency === 'eur' ? '€' : 'MAD'}</span></>}</p>
        <p className="mt-1 text-sm text-muted-foreground">{free ? l.freeDuration : annual ? l.perYear : l.perMonth}</p>
        {!free && annual && <p className="mt-1 text-xs font-semibold text-primary">{l.twoMonthsFree}</p>}
        {!free && <p className="mt-1 text-xs text-muted-foreground">≈ {currency === 'eur' ? `${(plan.price_mad * (annual ? 10 : 1)).toFixed(0)} MAD` : `${(plan.price_eur * (annual ? 10 : 1)).toFixed(0)} €`} {annual ? l.perYear : l.perMonth}</p>}
      </div>
      <dl className="mb-5 grid grid-cols-3 gap-2">
        {[{ label: l.properties, value: plan.max_properties }, { label: l.units, value: plan.max_units }, { label: l.users, value: plan.max_users }].map(({ label, value }) => <div key={label} className="rounded-lg border border-border bg-background/70 px-1 py-2 text-center"><dd className="text-base font-bold text-primary">{value ?? '∞'}</dd><dt className="text-xs text-muted-foreground">{label}</dt></div>)}
      </dl>
      <ul className="mb-6 flex-1 space-y-2">{plan.features.slice(0, 7).map((feature, i) => <li key={i} className="flex items-start gap-2 text-sm leading-relaxed text-muted-foreground"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-primary" />{feature}</li>)}{plan.features.length > 7 && <li className="text-xs text-muted-foreground">{l.moreFeatures(plan.features.length - 7)}</li>}</ul>
      <button type="button" onClick={onChoose} className={cn('flex min-h-[44px] items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-semibold transition-transform duration-150 hover:opacity-90 active:scale-[0.99]', featured ? 'border-primary bg-primary text-primary-foreground' : 'border-primary/20 bg-accent/60 text-primary')}>
        {free ? l.startFree : plan.id === 'enterprise' ? l.contactUs : l.choosePlan}{plan.id !== 'enterprise' && <ArrowRight className="h-4 w-4 shrink-0" />}
      </button>
      {plan.id === 'enterprise' && <p className="mt-2 text-center text-xs text-muted-foreground">{l.customPricing}</p>}
    </article>
  );
};
export default PricingPlanCard;
