import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Globe, Mail, Phone, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import AppLayout from '@/components/layout/AppLayout';
import LoadingSpinner from '@/components/features/LoadingSpinner';
import PricingPlanCard from '@/components/features/PricingPlanCard';
import PricingComparison from '@/components/features/PricingComparison';
import PricingQuestions from '@/components/features/PricingQuestions';
import { PRICING_LABELS } from '@/constants/pricingLabels';
import { fetchPricingPlans } from '@/lib/pricing';
import { cn } from '@/lib/utils';
import { isRTL } from '@/lib/i18n';
import { useAuth } from '@/hooks/useAuth';
import { useI18n } from '@/hooks/useI18n';
import type { PricingCurrency } from '@/types/pricing';

const PricingPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { language } = useI18n();
  const l = PRICING_LABELS[language];
  const [currency, setCurrency] = useState<PricingCurrency>('eur');
  const [annual, setAnnual] = useState(false);
  const { data: plans = [], isLoading, error, refetch } = useQuery({ queryKey: ['plans'], queryFn: fetchPricingPlans, staleTime: 60_000 });
  useEffect(() => { if (error) toast.error(l.loadError); }, [error, l.loadError]);
  return (
    <AppLayout>
      <div className="space-y-10 pb-12" dir={isRTL(language) ? 'rtl' : 'ltr'}>
        <section className="rounded-2xl border border-primary/15 bg-accent/50 px-4 py-8 text-center shadow-card sm:px-8">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-card px-4 py-2 text-sm font-medium text-primary"><Globe className="h-4 w-4" />{l.badge}</p>
          <h1 className="text-3xl font-semibold text-foreground">{l.title}</h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">{l.subtitle}</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
            <div className="flex rounded-xl border border-border bg-card p-1">{(['eur', 'mad'] as const).map(value => <button key={value} type="button" aria-pressed={currency === value} onClick={() => setCurrency(value)} className={cn('min-h-[44px] rounded-lg px-4 text-sm font-semibold hover:opacity-80', currency === value ? 'bg-accent text-primary' : 'text-muted-foreground')}>{value.toUpperCase()}</button>)}</div>
            <div className="flex rounded-xl border border-border bg-card p-1">{[false, true].map(value => <button key={String(value)} type="button" aria-pressed={annual === value} onClick={() => setAnnual(value)} className={cn('min-h-[44px] rounded-lg px-4 text-sm font-semibold hover:opacity-80', annual === value ? 'bg-accent text-primary' : 'text-muted-foreground')}>{value ? l.annual : l.monthly}{value && <span className="ms-2 text-xs text-primary">{l.annualDiscount}</span>}</button>)}</div>
          </div>
        </section>
        {isLoading ? <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div> : error ? (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-danger-border bg-danger-soft p-6 text-danger"><AlertCircle className="h-5 w-5" /><p>{l.loadError}</p><button type="button" onClick={() => void refetch()} className="min-h-[44px] rounded-xl border border-danger-border px-4 py-2 font-semibold hover:opacity-80">{l.retry}</button></div>
        ) : <div className="grid gap-x-5 gap-y-8 pt-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">{plans.map(plan => <PricingPlanCard key={plan.id} plan={plan} currency={currency} annual={annual} language={language} labels={l} onChoose={() => navigate(isAuthenticated ? '/settings' : '/login')} />)}</div>}
        <PricingComparison plans={plans} labels={l} language={language} />
        <PricingQuestions labels={l} />
        <section className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-primary/15 bg-accent/50 p-6 sm:flex-row sm:items-center">
          <div><h2 className="mb-2 text-lg font-semibold text-foreground">{l.contactTitle}</h2><p className="text-base text-muted-foreground">{l.contactDesc}</p></div>
          <div className="flex shrink-0 flex-wrap gap-3"><a href="mailto:contact@pms.ai" className="flex min-h-[44px] items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-primary hover:opacity-80"><Mail className="h-4 w-4" />{l.contactEmail}</a><a href="tel:+212600000000" className="flex min-h-[44px] items-center gap-2 rounded-xl border border-primary/20 px-4 py-3 text-sm font-semibold text-primary hover:bg-accent"><Phone className="h-4 w-4" />{l.contactCall}</a></div>
        </section>
      </div>
    </AppLayout>
  );
};
export default PricingPage;
