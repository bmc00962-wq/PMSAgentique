import { Building2, Zap, Star, Sparkles, Crown } from 'lucide-react';
import type { Language } from '@/lib/i18n';

export const LOGIN_PLANS = [
  { id: 'trial', priceEur: 0, priceMad: 0, icon: Zap },
  { id: 'starter', priceEur: 25, priceMad: 275, icon: Building2 },
  { id: 'professional', priceEur: 55, priceMad: 605, icon: Star },
  { id: 'growth', priceEur: 85, priceMad: 935, icon: Sparkles },
  { id: 'enterprise', priceEur: 150, priceMad: 1650, icon: Crown },
];
interface PricingCopy {
  title: string; seeAll: string; free: string; popular: string; month: string;
  note: string; names: string[]; limits: string[];
}
export const LOGIN_PRICING_COPY: Record<Language, PricingCopy> = {
  fr: {
    title: 'Tarification', seeAll: 'Tous les plans', free: 'Gratuit', popular: 'Populaire', month: '/ mois',
    note: 'Prix HT · 1 EUR ≈ 11 MAD · Annuel −17 %',
    names: ['Essai', 'Starter', 'Professionnel', 'Croissance', 'Entreprise'],
    limits: ['1 propriété · 1 unité · 5 réservations/mois', '5 propriétés · 25 unités', '20 propriétés · 100 unités', '50 propriétés · 300 unités', 'Illimité · SLA 99,9 %'],
  },
  en: {
    title: 'Pricing', seeAll: 'All plans', free: 'Free', popular: 'Popular', month: '/ month',
    note: 'Excl. tax · 1 EUR ≈ 11 MAD · Annual −17%',
    names: ['Trial', 'Starter', 'Professional', 'Growth', 'Enterprise'],
    limits: ['1 property · 1 unit · 5 reservations/month', '5 properties · 25 units', '20 properties · 100 units', '50 properties · 300 units', 'Unlimited · SLA 99.9%'],
  },
  ar: {
    title: 'التسعير', seeAll: 'جميع الخطط', free: 'مجاني', popular: 'الأكثر طلباً', month: '/ شهر',
    note: 'بدون ضريبة · 1 EUR ≈ 11 MAD · سنوي −17%',
    names: ['تجربة', 'بداية', 'احترافي', 'نمو', 'مؤسسات'],
    limits: ['عقار واحد · وحدة واحدة · 5 حجوزات/شهر', '5 عقارات · 25 وحدة', '20 عقاراً · 100 وحدة', '50 عقاراً · 300 وحدة', 'غير محدود · SLA 99.9%'],
  },
};
