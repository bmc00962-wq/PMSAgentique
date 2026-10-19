import type { Language } from '@/lib/i18n';
import type { PricingCopy } from '@/types/pricing';

export const PRICING_LABELS: Record<Language, PricingCopy> = {
  fr: {
    badge: 'Plans disponibles en EUR & MAD', title: 'Tarification transparente',
    subtitle: 'Des plans adaptés aux gestionnaires immobiliers en Europe et au Maroc. Commencez gratuitement, évoluez selon vos besoins.',
    monthly: 'Mensuel', annual: 'Annuel', annualDiscount: '−17 %', free: 'Gratuit', freeDuration: 'Pendant 30 jours', perMonth: '/ mois', perYear: '/ an', twoMonthsFree: '2 mois offerts',
    properties: 'Propriétés', units: 'Unités', users: 'Utilisateurs', popular: 'Le plus populaire', beginner: 'Débutant', recommended: 'Recommandé', custom: 'Sur mesure',
    startFree: 'Commencer gratuitement', contactUs: 'Nous contacter', choosePlan: 'Choisir ce plan', moreFeatures: n => `+${n} fonctionnalités…`,
    comparisonTitle: 'Équivalences EUR ↔ MAD', comparisonNote: '* Taux de conversion indicatif : 1 EUR ≈ 11 MAD. Les prix MAD sont fixes et ne fluctuent pas avec le cours de change.',
    tableHeaders: ['Plan', 'EUR/mois', 'MAD/mois', 'EUR/an (−17 %)', 'MAD/an (−17 %)', 'Propriétés'],
    faqTitle: 'Questions fréquentes', faq: [
      { q: 'Puis-je changer de plan à tout moment ?', a: 'Oui, vous pouvez passer à un plan supérieur ou inférieur depuis votre tableau de bord. Le changement est effectif immédiatement avec calcul prorata.' },
      { q: 'Le prix en MAD inclut-il les taxes marocaines ?', a: 'Les prix affichés sont HT. La TVA marocaine (20%) s’applique pour les entreprises basées au Maroc. Les factures sont conformes aux exigences DGI.' },
      { q: 'Comment fonctionne la période d’essai ?', a: 'La période d’essai est gratuite pendant 30 jours avec accès à 1 propriété, 1 unité et 5 réservations par mois. Aucune carte bancaire requise.' },
      { q: 'Puis-je connecter mon propre domaine ?', a: 'Oui, tous les plans permettent de connecter un domaine personnalisé. Votre URL sera https://votre-domaine.com ou https://pms.votre-domaine.com.' },
      { q: 'Les données sont-elles isolées entre les tenants ?', a: 'Oui, chaque compte bénéficie d’un tenant strictement isolé via RLS (Row Level Security). Aucun accès croisé n’est possible entre les comptes.' },
    ],
    contactTitle: 'Besoin d’une offre personnalisée ?', contactDesc: 'Pour les grandes agences ou un déploiement sur mesure, contactez-nous.', contactEmail: 'Email', contactCall: 'Appel commercial', customPricing: 'Tarification personnalisée selon volume', loadError: 'Impossible de charger les plans. Veuillez réessayer.', retry: 'Réessayer',
  },
  en: {
    badge: 'Plans available in EUR & MAD', title: 'Transparent pricing', subtitle: 'Plans tailored for property managers in Europe and Morocco. Start for free, scale as you grow.',
    monthly: 'Monthly', annual: 'Annual', annualDiscount: '−17%', free: 'Free', freeDuration: 'For 30 days', perMonth: '/ mo', perYear: '/ yr', twoMonthsFree: '2 months free',
    properties: 'Properties', units: 'Units', users: 'Users', popular: 'Most popular', beginner: 'Beginner', recommended: 'Recommended', custom: 'Custom',
    startFree: 'Start for free', contactUs: 'Contact us', choosePlan: 'Choose this plan', moreFeatures: n => `+${n} more features…`,
    comparisonTitle: 'EUR ↔ MAD equivalents', comparisonNote: '* Indicative rate: 1 EUR ≈ 11 MAD. MAD prices are fixed and do not fluctuate with exchange rates.',
    tableHeaders: ['Plan', 'EUR/mo', 'MAD/mo', 'EUR/yr (−17%)', 'MAD/yr (−17%)', 'Properties'],
    faqTitle: 'Frequently asked questions', faq: [
      { q: 'Can I change plans at any time?', a: 'Yes, you can upgrade or downgrade from your dashboard. Changes take effect immediately with prorated billing.' },
      { q: 'Do MAD prices include Moroccan taxes?', a: 'Displayed prices are tax-exclusive. Moroccan VAT (20%) applies for Morocco-based companies. Invoices comply with DGI requirements.' },
      { q: 'How does the free trial work?', a: 'The trial is free for 30 days with access to 1 property, 1 unit and 5 reservations per month. No credit card required.' },
      { q: 'Can I connect my own domain?', a: 'Yes, all plans allow connecting a custom domain. Your URL will be https://your-domain.com or https://pms.your-domain.com.' },
      { q: 'Is data isolated between tenants?', a: 'Yes, each account has a strictly isolated tenant via RLS (Row Level Security). No cross-account data access is possible.' },
    ],
    contactTitle: 'Need a custom offer?', contactDesc: 'For large agencies or custom deployments, get in touch.', contactEmail: 'Email', contactCall: 'Sales call', customPricing: 'Custom pricing based on volume', loadError: 'Unable to load plans. Please try again.', retry: 'Try again',
  },
  ar: {
    badge: 'خطط متاحة باليورو والدرهم المغربي', title: 'تسعير شفاف', subtitle: 'خطط مصممة لمديري العقارات في أوروبا والمغرب. ابدأ مجاناً وتوسّع حسب احتياجاتك.',
    monthly: 'شهري', annual: 'سنوي', annualDiscount: '−17%', free: 'مجاني', freeDuration: 'لمدة 30 يوماً', perMonth: '/ شهر', perYear: '/ سنة', twoMonthsFree: 'شهران مجانان',
    properties: 'عقارات', units: 'وحدات', users: 'مستخدمون', popular: 'الأكثر طلباً', beginner: 'مبتدئ', recommended: 'موصى به', custom: 'مخصص',
    startFree: 'ابدأ مجاناً', contactUs: 'تواصل معنا', choosePlan: 'اختر هذه الخطة', moreFeatures: n => `+${n} ميزات أخرى…`,
    comparisonTitle: 'مقارنة EUR ↔ MAD', comparisonNote: '* سعر صرف استرشادي: 1 EUR ≈ 11 MAD. أسعار الدرهم ثابتة ولا تتغير مع سعر الصرف.',
    tableHeaders: ['الخطة', 'EUR/شهر', 'MAD/شهر', 'EUR/سنة (−17%)', 'MAD/سنة (−17%)', 'عقارات'],
    faqTitle: 'الأسئلة الشائعة', faq: [
      { q: 'هل يمكنني تغيير الخطة في أي وقت؟', a: 'نعم، يمكنك الترقية أو التخفيض من لوحة التحكم. يسري التغيير فوراً مع احتساب الفارق بالتناسب.' },
      { q: 'هل تشمل أسعار الدرهم الضرائب المغربية؟', a: 'الأسعار المعروضة بدون ضريبة. تُطبَّق TVA المغربية (20%) على الشركات المقيمة بالمغرب. الفواتير متوافقة مع متطلبات DGI.' },
      { q: 'كيف تعمل الفترة التجريبية؟', a: 'الفترة التجريبية مجانية لمدة 30 يوماً مع الوصول إلى عقار واحد، وحدة واحدة، و5 حجوزات شهرياً. لا يلزم بطاقة بنكية.' },
      { q: 'هل يمكنني ربط نطاقي الخاص؟', a: 'نعم، تتيح جميع الخطط ربط نطاق مخصص. سيكون عنوانك https://your-domain.com أو https://pms.your-domain.com.' },
      { q: 'هل البيانات معزولة بين المستأجرين؟', a: 'نعم، يتمتع كل حساب بمستأجر معزول تماماً عبر RLS (أمان على مستوى الصف). لا يمكن الوصول المتبادل بين الحسابات.' },
    ],
    contactTitle: 'هل تحتاج عرضاً مخصصاً؟', contactDesc: 'للوكالات الكبيرة أو النشر المخصص، تواصل معنا.', contactEmail: 'بريد إلكتروني', contactCall: 'مكالمة مبيعات', customPricing: 'تسعير مخصص حسب الحجم', loadError: 'تعذر تحميل الخطط. يرجى المحاولة مجدداً.', retry: 'إعادة المحاولة',
  },
};
