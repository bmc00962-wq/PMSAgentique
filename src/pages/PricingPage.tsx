// PricingPage — Plans adaptés Europe (EUR) & Maroc (MAD)
// Visible publiquement + depuis le dashboard
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CircleCheck as CheckCircle2, Building2, Users, Globe, Zap, Shield, Star, Crown, ArrowRight, RefreshCw, Phone, Mail, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import LoadingSpinner from '@/components/features/LoadingSpinner';
import AppLayout from '@/components/layout/AppLayout';
import { useAuth } from '@/hooks/useAuth';
import { useI18n } from '@/hooks/useI18n';
import type { Language } from '@/lib/i18n';

// ── Translations ───────────────────────────────────────────────────────────────
const PRICING_LABELS: Record<Language, {
  badge: string;
  title: string;
  subtitle: string;
  monthly: string;
  annual: string;
  annualDiscount: string;
  free: string;
  freeDuration: string;
  perMonth: string;
  perYear: string;
  twoMonthsFree: string;
  properties: string;
  units: string;
  users: string;
  unlimited: string;
  popular: string;
  beginner: string;
  recommended: string;
  custom: string;
  startFree: string;
  contactUs: string;
  currentPlan: string;
  choosePlan: string;
  features: string;
  moreFeatures: (n: number) => string;
  comparisonTitle: string;
  comparisonNote: string;
  tableHeaders: string[];
  faqTitle: string;
  faq: { q: string; a: string }[];
  contactTitle: string;
  contactDesc: string;
  contactEmail: string;
  contactCall: string;
  customPricing: string;
}> = {
  fr: {
    badge: 'Plans disponibles en EUR & MAD',
    title: 'Tarification transparente',
    subtitle: 'Des plans adaptés aux gestionnaires immobiliers en Europe et au Maroc. Commencez gratuitement, évoluez selon vos besoins.',
    monthly: 'Mensuel',
    annual: 'Annuel',
    annualDiscount: '-17%',
    free: 'Gratuit',
    freeDuration: 'Pendant 30 jours',
    perMonth: '/ mois',
    perYear: '/ an',
    twoMonthsFree: '2 mois offerts',
    properties: 'Propriétés',
    units: 'Unités',
    users: 'Utilisateurs',
    unlimited: '∞',
    popular: '⭐ Le plus populaire',
    beginner: 'Débutant',
    recommended: 'Recommandé',
    custom: 'Sur mesure',
    startFree: 'Commencer gratuitement',
    contactUs: 'Nous contacter',
    currentPlan: 'Plan actuel ✓',
    choosePlan: 'Choisir ce plan',
    features: 'fonctionnalités',
    moreFeatures: (n) => `+${n} fonctionnalités…`,
    comparisonTitle: 'Équivalences EUR ↔ MAD',
    comparisonNote: '* Taux de conversion indicatif : 1 EUR ≈ 11 MAD. Les prix MAD sont fixes et ne fluctuent pas avec le cours de change.',
    tableHeaders: ['Plan', '🇪🇺 EUR/mois', '🇲🇦 MAD/mois', 'EUR/an (-17%)', 'MAD/an (-17%)', 'Propriétés'],
    faqTitle: 'Questions fréquentes',
    faq: [
      { q: 'Puis-je changer de plan à tout moment ?', a: 'Oui, vous pouvez passer à un plan supérieur ou inférieur depuis votre tableau de bord. Le changement est effectif immédiatement avec calcul prorata.' },
      { q: 'Le prix en MAD inclut-il les taxes marocaines ?', a: "Les prix affichés sont HT. La TVA marocaine (20%) s'applique pour les entreprises basées au Maroc. Les factures sont conformes aux exigences DGI." },
      { q: 'Comment fonctionne la période d\'essai ?', a: 'La période d\'essai est gratuite pendant 30 jours avec accès à 1 propriété, 1 unité et 5 réservations par mois. Aucune carte bancaire requise.' },
      { q: 'Puis-je connecter mon propre domaine ?', a: 'Oui, tous les plans permettent de connecter un domaine personnalisé. Votre URL sera https://votre-domaine.com ou https://pms.votre-domaine.com.' },
      { q: 'Les données sont-elles isolées entre les tenants ?', a: 'Oui, chaque compte bénéficie d\'un tenant strictement isolé via RLS (Row Level Security). Aucun accès croisé n\'est possible entre les comptes.' },
    ],
    contactTitle: "Besoin d'une offre personnalisée ?",
    contactDesc: "Pour les grandes agences ou un déploiement sur mesure, contactez-nous.",
    contactEmail: 'Email',
    contactCall: 'Appel commercial',
    customPricing: 'Tarification personnalisée selon volume',
  },
  en: {
    badge: 'Plans available in EUR & MAD',
    title: 'Transparent pricing',
    subtitle: 'Plans tailored for property managers in Europe and Morocco. Start for free, scale as you grow.',
    monthly: 'Monthly',
    annual: 'Annual',
    annualDiscount: '-17%',
    free: 'Free',
    freeDuration: 'For 30 days',
    perMonth: '/ mo',
    perYear: '/ yr',
    twoMonthsFree: '2 months free',
    properties: 'Properties',
    units: 'Units',
    users: 'Users',
    unlimited: '∞',
    popular: '⭐ Most popular',
    beginner: 'Beginner',
    recommended: 'Recommended',
    custom: 'Custom',
    startFree: 'Start for free',
    contactUs: 'Contact us',
    currentPlan: 'Current plan ✓',
    choosePlan: 'Choose this plan',
    features: 'features',
    moreFeatures: (n) => `+${n} more features…`,
    comparisonTitle: 'EUR ↔ MAD equivalents',
    comparisonNote: '* Indicative rate: 1 EUR ≈ 11 MAD. MAD prices are fixed and do not fluctuate with exchange rates.',
    tableHeaders: ['Plan', '🇪🇺 EUR/mo', '🇲🇦 MAD/mo', 'EUR/yr (-17%)', 'MAD/yr (-17%)', 'Properties'],
    faqTitle: 'Frequently asked questions',
    faq: [
      { q: 'Can I change plans at any time?', a: 'Yes, you can upgrade or downgrade from your dashboard. Changes take effect immediately with prorated billing.' },
      { q: 'Do MAD prices include Moroccan taxes?', a: 'Displayed prices are tax-exclusive. Moroccan VAT (20%) applies for Morocco-based companies. Invoices comply with DGI requirements.' },
      { q: 'How does the free trial work?', a: 'The trial is free for 30 days with access to 1 property, 1 unit and 5 reservations per month. No credit card required.' },
      { q: 'Can I connect my own domain?', a: 'Yes, all plans allow connecting a custom domain. Your URL will be https://your-domain.com or https://pms.your-domain.com.' },
      { q: 'Is data isolated between tenants?', a: 'Yes, each account has a strictly isolated tenant via RLS (Row Level Security). No cross-account data access is possible.' },
    ],
    contactTitle: 'Need a custom offer?',
    contactDesc: 'For large agencies or custom deployments, get in touch.',
    contactEmail: 'Email',
    contactCall: 'Sales call',
    customPricing: 'Custom pricing based on volume',
  },
  ar: {
    badge: 'خطط متاحة باليورو والدرهم المغربي',
    title: 'تسعير شفاف',
    subtitle: 'خطط مصممة لمديري العقارات في أوروبا والمغرب. ابدأ مجاناً وتوسّع حسب احتياجاتك.',
    monthly: 'شهري',
    annual: 'سنوي',
    annualDiscount: '‎-17%',
    free: 'مجاني',
    freeDuration: 'لمدة 30 يوماً',
    perMonth: '/ شهر',
    perYear: '/ سنة',
    twoMonthsFree: 'شهران مجانان',
    properties: 'عقارات',
    units: 'وحدات',
    users: 'مستخدمون',
    unlimited: '∞',
    popular: '⭐ الأكثر طلباً',
    beginner: 'مبتدئ',
    recommended: 'موصى به',
    custom: 'مخصص',
    startFree: 'ابدأ مجاناً',
    contactUs: 'تواصل معنا',
    currentPlan: 'الخطة الحالية ✓',
    choosePlan: 'اختر هذه الخطة',
    features: 'ميزات',
    moreFeatures: (n) => `+${n} ميزات أخرى…`,
    comparisonTitle: 'مقارنة EUR ↔ MAD',
    comparisonNote: '* سعر صرف استرشادي: 1 EUR ≈ 11 MAD. أسعار الدرهم ثابتة ولا تتغير مع سعر الصرف.',
    tableHeaders: ['الخطة', '🇪🇺 EUR/شهر', '🇲🇦 MAD/شهر', 'EUR/سنة (-17%)', 'MAD/سنة (-17%)', 'عقارات'],
    faqTitle: 'الأسئلة الشائعة',
    faq: [
      { q: 'هل يمكنني تغيير الخطة في أي وقت؟', a: 'نعم، يمكنك الترقية أو التخفيض من لوحة التحكم. يسري التغيير فوراً مع احتساب الفارق بالتناسب.' },
      { q: 'هل تشمل أسعار الدرهم الضرائب المغربية؟', a: 'الأسعار المعروضة بدون ضريبة. تُطبَّق TVA المغربية (20%) على الشركات المقيمة بالمغرب. الفواتير متوافقة مع متطلبات DGI.' },
      { q: 'كيف تعمل الفترة التجريبية؟', a: 'الفترة التجريبية مجانية لمدة 30 يوماً مع الوصول إلى عقار واحد، وحدة واحدة، و5 حجوزات شهرياً. لا يلزم بطاقة بنكية.' },
      { q: 'هل يمكنني ربط نطاقي الخاص؟', a: 'نعم، تتيح جميع الخطط ربط نطاق مخصص. سيكون عنوانك https://your-domain.com أو https://pms.your-domain.com.' },
      { q: 'هل البيانات معزولة بين المستأجرين؟', a: 'نعم، يتمتع كل حساب بمستأجر معزول تماماً عبر RLS (أمان على مستوى الصف). لا يمكن الوصول المتبادل بين الحسابات.' },
    ],
    contactTitle: 'هل تحتاج عرضاً مخصصاً؟',
    contactDesc: 'للوكالات الكبيرة أو النشر المخصص، تواصل معنا.',
    contactEmail: 'بريد إلكتروني',
    contactCall: 'مكالمة مبيعات',
    customPricing: 'تسعير مخصص حسب الحجم',
  },
};

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
  icon: React.ComponentType<{ className?: string }>;
  popular?: boolean;
  badge?: string;
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

const CURRENCY_LABELS: Record<Currency, { symbol: string; flag: string; label: string }> = {
  eur: { symbol: '€', flag: '🇪🇺', label: 'EUR — Europe' },
  mad: { symbol: 'MAD', flag: '🇲🇦', label: 'MAD — Maroc' },
};



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

  const { language } = useI18n();
  const l = PRICING_LABELS[language];

  // Helper: get plan name by language
  const planName = (plan: Plan) => {
    if (language === 'en') return plan.name_en;
    if (language === 'ar') return plan.name_ar;
    return plan.name_fr;
  };
  // Helper: get plan description by language
  const planDesc = (plan: Plan) => {
    if (language === 'en') return plan.description_en;
    return plan.description_fr;
  };

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: fetchPlans,
    staleTime: 60_000,
  });

  const currentPlanId = membership ? undefined : undefined; // from tenant

  const getPrice = (plan: Plan) => {
    if (plan.price_eur === 0) return { main: '0', period: l.perMonth, suffix: l.freeDuration, symbol: '' };
    const base = currency === 'eur' ? plan.price_eur : plan.price_mad;
    const symbol = currency === 'eur' ? '€' : ' MAD';
    const price = billingAnnual ? (base * 10) : base;
    return {
      main: price.toFixed(0),
      period: billingAnnual ? l.perYear : l.perMonth,
      suffix: billingAnnual ? l.twoMonthsFree : undefined,
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
            <Globe className="w-3.5 h-3.5" /> {l.badge}
          </div>
          <h1 className="text-3xl font-bold text-foreground">
            {l.title}
          </h1>
          <p className="text-muted-foreground text-sm max-w-lg mx-auto">
            {l.subtitle}
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
                {l.monthly}
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
                {l.annual}
                <span className="ml-1.5 text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded-full">
                  {l.annualDiscount}
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

              // Badge label by language
              const badgeLabel = style.popular ? l.popular :
                plan.id === 'starter' ? l.beginner :
                plan.id === 'growth' ? l.recommended :
                plan.id === 'enterprise' ? l.custom : undefined;

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
                      {l.popular}
                    </div>
                  )}
                  {badgeLabel && !isPopular && (
                    <div className={cn('absolute -top-2.5 right-4 text-xs font-semibold px-2.5 py-1 rounded-full border', style.bg, style.color, style.border)}>
                      {badgeLabel}
                    </div>
                  )}

                  {/* Plan header */}
                  <div className="mb-4">
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center border mb-3', style.bg, style.border)}>
                      <Icon className={cn('w-5 h-5', style.color)} />
                    </div>
                    <h3 className="text-base font-bold text-foreground">{planName(plan)}</h3>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed min-h-[36px]">{planDesc(plan)}</p>
                  </div>

                  {/* Price */}
                  <div className="mb-5">
                    {plan.price_eur === 0 ? (
                      <div>
                        <span className="text-3xl font-black text-foreground">{l.free}</span>
                        <p className="text-xs text-muted-foreground mt-1">{l.freeDuration}</p>
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
                            ? `${plan.price_mad.toFixed(0)} MAD ${l.perMonth}`
                            : `€${plan.price_eur.toFixed(0)} ${l.perMonth}`}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Limits */}
                  <div className="grid grid-cols-3 gap-1.5 mb-4">
                    {[
                      { label: l.properties, value: plan.max_properties, icon: Building2 },
                      { label: l.units, value: plan.max_units, icon: Globe },
                      { label: l.users, value: plan.max_users, icon: Users },
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
                      <p className="text-xs text-muted-foreground/50 pl-5">{l.moreFeatures(plan.features.length - 7)}</p>
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
                    {plan.id === 'trial' ? l.startFree :
                     plan.id === 'enterprise' ? l.contactUs :
                     isCurrent ? l.currentPlan : l.choosePlan}
                    {plan.id !== 'enterprise' && <ArrowRight className="w-3.5 h-3.5" />}
                  </button>

                  {plan.id === 'enterprise' && (
                    <p className="text-center text-xs text-muted-foreground mt-2">
                      {l.customPricing}
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
            <Globe className="w-4 h-4 text-primary" /> {l.comparisonTitle}
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  {l.tableHeaders.map((h, i) => (
                    <th key={i} className={cn('py-2 px-3 font-medium', i === 0 ? 'text-left text-muted-foreground' : i % 2 === 1 ? 'text-right text-blue-400' : 'text-right text-emerald-400')}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {plans.map(plan => (
                  <tr key={plan.id} className="border-b border-border/30 last:border-0 hover:bg-secondary/20">
                    <td className="py-2.5 px-3 font-semibold text-foreground">{planName(plan)}</td>
                    <td className="py-2.5 px-3 text-right text-blue-400 font-bold">
                      {plan.price_eur === 0 ? l.free : `€${plan.price_eur}`}
                    </td>
                    <td className="py-2.5 px-3 text-right text-emerald-400 font-bold">
                      {plan.price_mad === 0 ? l.free : `${plan.price_mad} MAD`}
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
            {l.comparisonNote}
          </p>
        </div>

        {/* ── FAQ ── */}
        <div className="space-y-3">
          <h2 className="text-base font-bold text-foreground">{l.faqTitle}</h2>
          {l.faq.map((item, i) => (
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
            <h3 className="text-sm font-bold text-foreground mb-1">{l.contactTitle}</h3>
            <p className="text-xs text-muted-foreground">{l.contactDesc}</p>
          </div>
          <div className="flex gap-3 flex-shrink-0">
            <a href="mailto:contact@pms.ai" className="flex items-center gap-1.5 text-xs border border-border rounded-xl px-4 py-2.5 hover:bg-secondary transition-colors min-h-[44px] text-foreground">
              <Mail className="w-3.5 h-3.5" /> {l.contactEmail}
            </a>
            <a href="tel:+212600000000" className="flex items-center gap-1.5 text-xs bg-primary text-primary-foreground rounded-xl px-4 py-2.5 hover:bg-primary/90 transition-colors min-h-[44px]">
              <Phone className="w-3.5 h-3.5" /> {l.contactCall}
            </a>
          </div>
        </div>

      </div>
    </AppLayout>
  );
};

export default PricingPage;
