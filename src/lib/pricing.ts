import { supabase } from '@/lib/supabase';
import type { Language } from '@/lib/i18n';
import type { PricingPlan } from '@/types/pricing';

export async function fetchPricingPlans(): Promise<PricingPlan[]> {
  const { data, error } = await supabase.from('plans').select('*').eq('is_active', true).order('sort_order').returns<PricingPlan[]>();
  if (error) throw error;
  return (data ?? []).map(plan => ({
    ...plan, price_eur: Number(plan.price_eur), price_mad: Number(plan.price_mad),
    features: Array.isArray(plan.features) ? plan.features : [],
  }));
}
export function pricingPlanName(plan: PricingPlan, language: Language) {
  return plan[`name_${language}`] || plan.name_fr;
}
export function pricingPlanDescription(plan: PricingPlan, language: Language) {
  if (language === 'en') return plan.description_en || plan.description_fr;
  if (language === 'ar') {
    const descriptions: Record<string, string> = {
      trial: 'ابدأ بعقار واحد ووحدة واحدة و5 حجوزات شهرياً.',
      starter: 'لإدارة محفظة عقارية صغيرة.', professional: 'للإدارة اليومية لمحفظة متنامية.',
      growth: 'للفرق والوكالات المتوسعة.', enterprise: 'للمؤسسات والمحافظ العقارية الكبيرة.',
    };
    return descriptions[plan.id] || plan.description_en;
  }
  return plan.description_fr;
}
