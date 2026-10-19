export interface PricingPlan {
  id: string;
  name_fr: string; name_en: string; name_ar: string;
  description_fr: string | null; description_en: string | null;
  price_eur: number; price_mad: number;
  billing_period: string;
  max_properties: number | null; max_units: number | null; max_users: number | null;
  features: string[];
  sort_order: number;
}
export type PricingCurrency = 'eur' | 'mad';
export interface PricingCopy {
  badge: string; title: string; subtitle: string; monthly: string; annual: string;
  annualDiscount: string; free: string; freeDuration: string; perMonth: string; perYear: string;
  twoMonthsFree: string; properties: string; units: string; users: string; popular: string;
  beginner: string; recommended: string; custom: string; startFree: string; contactUs: string;
  choosePlan: string; moreFeatures: (count: number) => string; comparisonTitle: string;
  comparisonNote: string; tableHeaders: string[]; faqTitle: string; faq: { q: string; a: string }[];
  contactTitle: string; contactDesc: string; contactEmail: string; contactCall: string;
  customPricing: string; loadError: string; retry: string;
}
