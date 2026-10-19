import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { LOGIN_PLANS, LOGIN_PRICING_COPY } from '@/constants/loginPricing';
import { cn } from '@/lib/utils';
import type { Language } from '@/lib/i18n';

interface LoginPricingSummaryProps { language: Language }
const LoginPricingSummary = ({ language }: LoginPricingSummaryProps) => {
  const [currency, setCurrency] = useState<'eur' | 'mad'>('eur');
  const l = LOGIN_PRICING_COPY[language];
  return (
    <section className="border-t border-primary/15 pt-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-foreground">{l.title}</h3>
        <Link to="/pricing" target="_blank" rel="noopener noreferrer" className="flex min-h-[44px] items-center gap-1 text-sm font-medium text-primary hover:underline">{l.seeAll}<ArrowUpRight className="h-4 w-4" /></Link>
      </div>
      <div className="mb-4 inline-flex rounded-xl border border-border bg-card p-1" aria-label={l.title}>
        {(['eur', 'mad'] as const).map(c => (
          <button key={c} type="button" aria-pressed={currency === c} onClick={() => setCurrency(c)} className={cn('min-h-[44px] min-w-[72px] rounded-lg px-4 text-sm font-semibold transition-opacity hover:opacity-80', currency === c ? 'bg-accent text-accent-foreground' : 'text-muted-foreground')}>{c.toUpperCase()}</button>
        ))}
      </div>
      <div className="space-y-2">
        {LOGIN_PLANS.map((plan, index) => {
          const Icon = plan.icon;
          const price = currency === 'eur' ? plan.priceEur : plan.priceMad;
          return (
            <div key={plan.id} className={cn('flex items-center gap-3 rounded-xl border p-3', plan.id === 'professional' ? 'border-primary/30 bg-card shadow-card' : 'border-border/70 bg-card/60')}>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-primary"><Icon className="h-4 w-4" /></div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">{l.names[index]}{plan.id === 'professional' && <span className="ms-2 text-xs font-medium text-primary">{l.popular}</span>}</p>
                <p className="text-xs leading-relaxed text-muted-foreground">{l.limits[index]}</p>
              </div>
              <div className="shrink-0 text-end">
                <p className="text-base font-bold text-primary">{price === 0 ? l.free : `${price} ${currency === 'eur' ? '€' : 'MAD'}`}</p>
                {price > 0 && <p className="text-xs text-muted-foreground">{l.month}</p>}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">{l.note}</p>
    </section>
  );
};
export default LoginPricingSummary;
