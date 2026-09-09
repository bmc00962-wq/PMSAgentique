// PricingPage — Plans adaptés Europe (EUR) & Maroc (MAD)
// Visible publiquement + depuis le dashboard
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  CheckCircle2, Building2, Users, Globe, Zap, Shield, Star,
  Crown, ArrowRight, RefreshCw, Phone, Mail, Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import LoadingSpinner from '@/components/features/LoadingSpinner';
import AppLayout from '@/components/layout/AppLayout';
import { useAuth } from '@/hooks/useAuth';

// ── Types ──────────────────────────────────────────────────────────────────────
interface Plan {
  id: string;
  name_fr: string;
  name_en: string;
  name_ar: string;
  description_fr: string;
  description_en: string;
  price_eur: number;
  price_mad: number;
  billing_period: string;
  max_properties: number | null;
  max_units: number | null;
  max_users: number | null;
  features: string[];
  sort_order: number;
}

// ── Plan Visual Config ─────────────────────────────────────────────────────────
const PLAN_STYLE: Record<string, {
  color: string;
  bg: string;
  border: string;
  badge?: string;
  icon: React.ComponentType<{ className?: string }>;
  popular?: boolean;
}> = {
  trial: {
    color: 'text-slate-300',
    bg: 'bg-slate-500/5',
    border: 'border-slate-500/20',
    icon: Zap,
  },
  starter: {
    color: 'text-blue-400',
    bg: 'bg-blue-500/5',
    border: 'border-blue-500/20',
    icon: Building2,
    badge: 'Débutant',
  },
  professional: {
    color: 'text-primary',
    bg: 'bg-primary/5',
    border: 'border-primary/40',
    icon: Star,
    badge: 'Le plus populaire',
    popular: true,
  },
  growth: {
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/5',
    border: 'border-emerald-500/20',
    icon: Sparkles,
    badge: 'Recommandé',
  },
  enterprise: {
    color: 'text-amber-400',
    bg: 'bg-amber-500/5',
    border: 'border-amber-500/20',
    icon: Crown,
    badge: 'Sur mesure',
  },
};

// ── Currency Toggle ────────────────────────────────────────────────────────────
type Currency = 'eur' | 'mad';

// 1 EUR ≈ 11 MAD (taux indicatif fixe)
const EUR_TO_MAD = 11;

const CURRENCY_LABELS: Record<Currency, { symbol: string; flag: string; label: string }> = {
  eur: { symbol: '€', flag: '🇪🇺', label: 'EUR — Europe' },
  mad: { symbol: 'MAD', flag: '🇲🇦', label: 'MAD — Maroc' },
};

// ── FAQ items ──────────────────────────────────────────────────────────────────
const FAQ = [
  {
    q: 'Puis-je changer de plan à tout moment ?',
    a: 'Oui, vous pouvez passer à un plan supérieur ou inférieur depuis votre tableau de bord. Le changement est effectif immédiatement avec calcul prorata.',
  },
  {
    q: 'Le prix en MAD inclut-il les taxes marocaines ?',
    a: 'Les prix affichés sont HT. La TVA marocaine (20%) s\'applique pour les entreprises basées au Maroc. Les factures sont conformes aux exigences DGI.',
  },
  {
    q: 'Comment fonctionne la période d\'essai ?',
    a: 'La période d\'essai est gratuite pendant 30 jours avec accès à 1 propriété, 1 unité et 5 réservations par mois. Aucune carte bancaire requise.',
  },
  {
    q: 'Puis-je connecter mon propre domaine ?',
    a: 'Oui, tous les plans permettent de connecter un domaine personnalisé. Votre URL sera https://votre-domaine.com ou https://pms.votre-domaine.com.',
  },
  {
    q: 'Les données sont-elles isolées entre les tenants ?',
    a: 'Oui, chaque compte bénéficie d\'un tenant strictement isolé via RLS (Row Level Security). Aucun accès croisé n\'est possible entre les comptes.',
  },
];

// ── Fetch ─────────────────────────────────────────────────────────────────────
async function fetchPlans(): Promise<Plan[]> {
  const { data, error } = await supabase
    .from('plans')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');
  if (error) throw error;
  return (data ?? []).map(p => ({
    ...p,
    features: Array.isArray(p.features) ? p.features : JSON.parse(p.features ?? '[]'),
    price_eur: Number(p.price_eur),
    price_mad: Number(p.price_mad),
    max_properties: p.max_properties ?? null,
    max_units: p.max_units ?? null,
    max_users: p.max_users ?? null,
  }));
}

// ── Main Component ─────────────────────────────────────────────────────────────
const PricingPage = () => {
  const navigate = useNavigate();
  const { membership, isAuthenticated } = useAuth();
  const [currency, setCurrency] = useState<Currency>('eur');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [billingAnnual, setBillingAnnual] = useState(false);

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: fetchPlans,
    staleTime: 60_000,
  });

  const currentPlanId = membership ? undefined : undefined; // from tenant

  const getPrice = (plan: Plan) => {
    if (plan.price_eur === 0) return { main: '0', period: '/ mois', suffix: 'Gratuit 30 jours', symbol: '' };
    const base = currency === 'eur' ? plan.price_eur : plan.price_mad;
    const symbol = currency === 'eur' ? '€' : ' MAD';
    const price = billingAnnual ? (base * 10) : base;
    return {
      main: price.toFixed(0),
      period: billingAnnual ? '/ an' : '/ mois',
      suffix: billingAnnual ? '2 mois offerts' : undefined,
      symbol,
    };
  };

  const formatLimit = (v: number | null, label: string) =>
    v === null ? `${label} illimitées` : `${v} ${label}`;

  return (
    <AppLayout>
      <div className="space-y-12 pb-12">

        {/* ── Hero ── */}
        <div className="text-center space-y-4 pt-4">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 text-xs font-medium text-primary mb-2">
            <Globe className="w-3.5 h-3.5" /> Plans disponibles en EUR & MAD
          </div>
          <h1 className="text-3xl font-bold text-foreground">
            Tarification transparente
          </h1>
          <p className="text-muted-foreground text-sm max-w-lg mx-auto">
            Des plans adaptés aux gestionnaires immobiliers en <strong className="text-foreground">Europe</strong> et au <strong className="text-foreground">Maroc</strong>.
            Commencez gratuitement, évoluez selon vos besoins.
          </p>

          {/* Controls */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            {/* Currency toggle */}
            <div className="flex bg-secondary border border-border rounded-xl p-1">
              {(Object.keys(CURRENCY_LABELS) as Currency[]).map(c => (
                <button
                  key={c}
                  onClick={() => setCurrency(c)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors min-h-[32px]',
                    currency === c
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <span>{CURRENCY_LABELS[c].flag}</span>
                  <span>{CURRENCY_LABELS[c].symbol}</span>
                </button>
              ))}
            </div>

            {/* Billing toggle */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setBillingAnnual(false)}
                className={cn('text-xs font-medium transition-colors', !billingAnnual ? 'text-foreground' : 'text-muted-foreground')}
              >
                Mensuel
              </button>
              <button
                onClick={() => setBillingAnnual(v => !v)}
                className={cn(
                  'relative w-10 h-5 rounded-full transition-colors border',
                  billingAnnual ? 'bg-primary border-primary' : 'bg-secondary border-border',
                )}
              >
                <span className={cn(
                  'absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform',
                  billingAnnual ? 'translate-x-5' : 'translate-x-0.5',
                )} />
              </button>
              <button
                onClick={() => setBillingAnnual(true)}
                className={cn('text-xs font-medium transition-colors', billingAnnual ? 'text-foreground' : 'text-muted-foreground')}
              >
                Annuel
                <span className="ml-1.5 text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded-full">
                  -17%
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* ── Plans Grid ── */}
        {isLoading ? (
          <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {plans.map(plan => {
              const style = PLAN_STYLE[plan.id] ?? PLAN_STYLE.trial;
              const Icon = style.icon;
              const pricing = getPrice(plan);
              const isPopular = style.popular;
              const isCurrent = false; // TODO: compare with tenant plan

              return (
                <div
                  key={plan.id}
                  className={cn(
                    'relative bg-card rounded-2xl border p-5 flex flex-col transition-all',
                    isPopular
                      ? 'border-primary/60 shadow-lg shadow-primary/10 scale-[1.02]'
                      : style.border,
                    isCurrent && 'ring-2 ring-emerald-500/30',
                  )}
                >
                  {/* Popular badge */}
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">
                      ⭐ Le plus populaire
                    </div>
                  )}
                  {style.badge && !isPopular && (
                    <div className={cn('absolute -top-2.5 right-4 text-xs font-semibold px-2.5 py-1 rounded-full border', style.bg, style.color, style.border)}>
                      {style.badge}
                    </div>
                  )}

                  {/* Plan header */}
                  <div className="mb-4">
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center border mb-3', style.bg, style.border)}>
                      <Icon className={cn('w-5 h-5', style.color)} />
                    </div>
                    <h3 className="text-base font-bold text-foreground">{plan.name_fr}</h3>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed min-h-[36px]">{plan.description_fr}</p>
                  </div>

                  {/* Price */}
                  <div className="mb-5">
                    {plan.price_eur === 0 ? (
                      <div>
                        <span className="text-3xl font-black text-foreground">Gratuit</span>
                        <p className="text-xs text-muted-foreground mt-1">Pendant 30 jours</p>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-end gap-1">
                          <span className={cn('text-3xl font-black', style.color)}>
                            {pricing.main}
                          </span>
                          <span className="text-sm text-muted-foreground mb-1">
                            {pricing.symbol ?? (currency === 'eur' ? '€' : ' MAD')}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">{pricing.period}</p>
                        {pricing.suffix && (
                          <span className="text-xs text-emerald-400 font-medium">{pricing.suffix}</span>
                        )}
                        {/* MAD equivalent if showing EUR, and vice versa */}
                        <p className="text-xs text-muted-foreground/50 mt-1">
                          ≈ {currency === 'eur'
                            ? `${plan.price_mad.toFixed(0)} MAD / mois`
                            : `€${plan.price_eur.toFixed(0)} / mois`}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Limits */}
                  <div className="grid grid-cols-3 gap-1.5 mb-4">
                    {[
                      { label: 'Propriétés', value: plan.max_properties, icon: Building2 },
                      { label: 'Unités', value: plan.max_units, icon: Globe },
                      { label: 'Utilisateurs', value: plan.max_users, icon: Users },
                    ].map(({ label, value, icon: LimitIcon }) => (
                      <div key={label} className="bg-secondary/40 border border-border/50 rounded-lg p-2 text-center">
                        <LimitIcon className="w-3 h-3 mx-auto mb-0.5 text-muted-foreground" />
                        <div className={cn('text-sm font-bold', style.color)}>{value ?? '∞'}</div>
                        <div className="text-xs text-muted-foreground/60" style={{ fontSize: '10px' }}>{label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Features */}
                  <div className="flex-1 space-y-1.5 mb-6">
                    {plan.features.slice(0, 7).map((feat, i) => (
                      <div key={i} className="flex items-start gap-1.5">
                        <CheckCircle2 className={cn('w-3.5 h-3.5 flex-shrink-0 mt-0.5', style.color)} />
                        <span className="text-xs text-muted-foreground">{feat}</span>
                      </div>
                    ))}
                    {plan.features.length > 7 && (
                      <p className="text-xs text-muted-foreground/50 pl-5">+{plan.features.length - 7} fonctionnalités…</p>
                    )}
                  </div>

                  {/* CTA */}
                  <button
                    onClick={() => isAuthenticated ? navigate('/settings') : navigate('/login')}
                    className={cn(
                      'w-full py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 min-h-[44px]',
                      isPopular
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                        : plan.id === 'trial'
                        ? 'border border-border bg-secondary hover:bg-secondary/80 text-foreground'
                        : cn('border hover:opacity-90', style.border, style.color, style.bg),
                    )}
                  >
                    {plan.id === 'trial' ? 'Commencer gratuitement' :
                     plan.id === 'enterprise' ? 'Nous contacter' :
                     isCurrent ? 'Plan actuel ✓' : 'Choisir ce plan'}
                    {plan.id !== 'enterprise' && <ArrowRight className="w-3.5 h-3.5" />}
                  </button>

                  {plan.id === 'enterprise' && (
                    <p className="text-center text-xs text-muted-foreground mt-2">
                      Tarification personnalisée selon volume
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Comparison: EUR vs MAD ── */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <h2 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary" /> Équivalences EUR ↔ MAD
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Plan</th>
                  <th className="text-right py-2 px-3 text-blue-400 font-medium">🇪🇺 EUR/mois</th>
                  <th className="text-right py-2 px-3 text-emerald-400 font-medium">🇲🇦 MAD/mois</th>
                  <th className="text-right py-2 px-3 text-blue-400 font-medium">EUR/an (-17%)</th>
                  <th className="text-right py-2 px-3 text-emerald-400 font-medium">MAD/an (-17%)</th>
                  <th className="text-right py-2 px-3 text-muted-foreground font-medium">Propriétés</th>
                </tr>
              </thead>
              <tbody>
                {plans.map(plan => (
                  <tr key={plan.id} className="border-b border-border/30 last:border-0 hover:bg-secondary/20">
                    <td className="py-2.5 px-3 font-semibold text-foreground">{plan.name_fr}</td>
                    <td className="py-2.5 px-3 text-right text-blue-400 font-bold">
                      {plan.price_eur === 0 ? 'Gratuit' : `€${plan.price_eur}`}
                    </td>
                    <td className="py-2.5 px-3 text-right text-emerald-400 font-bold">
                      {plan.price_mad === 0 ? 'Gratuit' : `${plan.price_mad} MAD`}
                    </td>
                    <td className="py-2.5 px-3 text-right text-muted-foreground">
                      {plan.price_eur === 0 ? '—' : `€${(plan.price_eur * 10).toFixed(0)}`}
                    </td>
                    <td className="py-2.5 px-3 text-right text-muted-foreground">
                      {plan.price_mad === 0 ? '—' : `${(plan.price_mad * 10).toFixed(0)} MAD`}
                    </td>
                    <td className="py-2.5 px-3 text-right text-muted-foreground">
                      {plan.max_properties ?? '∞'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground/50 mt-3">
            * Taux de conversion indicatif : 1 EUR ≈ {EUR_TO_MAD} MAD. Les prix MAD sont fixes et ne fluctuent pas avec le cours de change.
          </p>
        </div>

        {/* ── FAQ ── */}
        <div className="space-y-3">
          <h2 className="text-base font-bold text-foreground">Questions fréquentes</h2>
          {FAQ.map((item, i) => (
            <div key={i} className="bg-card border border-border rounded-xl overflow-hidden">
              <button
                onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-secondary/20 transition-colors min-h-[52px]"
              >
                <span className="text-sm font-medium text-foreground">{item.q}</span>
                <span className="text-muted-foreground ml-3 flex-shrink-0">{expandedFaq === i ? '−' : '+'}</span>
              </button>
              {expandedFaq === i && (
                <div className="px-5 pb-4 text-sm text-muted-foreground border-t border-border/50 pt-3">
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ── Contact ── */}
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-foreground mb-1">Besoin d'une offre personnalisée ?</h3>
            <p className="text-xs text-muted-foreground">Pour les grandes agences ou un déploiement sur mesure, contactez-nous.</p>
          </div>
          <div className="flex gap-3 flex-shrink-0">
            <a href="mailto:contact@pms.ai" className="flex items-center gap-1.5 text-xs border border-border rounded-xl px-4 py-2.5 hover:bg-secondary transition-colors min-h-[44px] text-foreground">
              <Mail className="w-3.5 h-3.5" /> Email
            </a>
            <a href="tel:+212600000000" className="flex items-center gap-1.5 text-xs bg-primary text-primary-foreground rounded-xl px-4 py-2.5 hover:bg-primary/90 transition-colors min-h-[44px]">
              <Phone className="w-3.5 h-3.5" /> Appel commercial
            </a>
          </div>
        </div>

      </div>
    </AppLayout>
  );
};

export default PricingPage;
