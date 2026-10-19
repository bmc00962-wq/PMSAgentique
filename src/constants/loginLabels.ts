import type { Language } from '@/lib/i18n';

export interface LoginCopy {
  welcome: string; subtitle: string; email: string; password: string; newPassword: string;
  otp: string; sendCode: string; sending: string; signin: string; signinLoading: string;
  createAccount: string; creatingLoading: string; switchToRegister: string; switchToLogin: string;
  codeSent: (email: string) => string; otpHint: string; invalidEmail: string; invalidPassword: string; invalidOtp: string;
  features: { label: string; desc: string }[]; howItWorksTitle: string; howItWorksSteps: string[];
  howItWorksFooter: string; rolesTitle: string; rolesFooter: string; roleLabels: string[];
  superAdminTitle: string; superAdminDesc: string; architecture: string;
}
export const LOGIN_LABELS: Record<Language, LoginCopy> = {
  fr: {
    welcome: 'Bienvenue', subtitle: 'Connectez-vous à votre espace de gestion', email: 'Adresse e-mail', password: 'Mot de passe', newPassword: 'Choisir un mot de passe',
    otp: 'Code de vérification (4 chiffres)', sendCode: 'Envoyer le code', sending: 'Envoi en cours…', signin: 'Se connecter', signinLoading: 'Connexion…', createAccount: 'Créer mon compte', creatingLoading: 'Création du compte…',
    switchToRegister: 'Créer un compte →', switchToLogin: '← Déjà un compte', codeSent: email => `Code envoyé à ${email}`, otpHint: 'Vérifiez vos e-mails (4 chiffres, valide 1 h)',
    invalidEmail: 'Saisissez une adresse e-mail valide.', invalidPassword: 'Le mot de passe doit contenir au moins 6 caractères.', invalidOtp: 'Saisissez les 4 chiffres du code.',
    features: [
      { label: 'Sécurité multicouche', desc: 'RLS · RBAC · JWT · canUserPerform()' },
      { label: 'Automatisation agentique', desc: 'n8n · AI Agents · Approbations humaines' },
      { label: 'Canaux OTA intégrés', desc: 'Airbnb · Booking.com · Vrbo · iCal' },
      { label: 'Finance & rapports', desc: 'Relevés propriétaires · Grand livre · Virements' },
    ],
    howItWorksTitle: "Comment fonctionne l'inscription ?", howItWorksSteps: ['Entrez votre e-mail et envoyez le code OTP (4 chiffres)', 'Vérifiez votre boîte mail et saisissez le code', 'Un tenant isolé est créé automatiquement avec le rôle tenant_admin'],
    howItWorksFooter: 'Vos données sont isolées via RLS + multitenancy — aucun accès croisé entre comptes.',
    rolesTitle: 'Rôles disponibles dans la plateforme', rolesFooter: "Rôles assignés par l'admin tenant. Tout nouveau compte = tenant_admin.", roleLabels: ['Admin Tenant', 'Gestionnaire', 'Comptable', 'Agent Ménage', 'Technicien', 'Chauffeur'],
    superAdminTitle: 'Accès super admin SaaS (réservé)', superAdminDesc: 'Réservé exclusivement au gestionnaire de la plateforme.', architecture: 'Documentation architecture →',
  },
  en: {
    welcome: 'Welcome back', subtitle: 'Sign in to your management workspace', email: 'Email address', password: 'Password', newPassword: 'Choose a password',
    otp: 'Verification code (4 digits)', sendCode: 'Send code', sending: 'Sending…', signin: 'Sign in', signinLoading: 'Signing in…', createAccount: 'Create account', creatingLoading: 'Creating account…',
    switchToRegister: 'Create an account →', switchToLogin: '← Already have an account', codeSent: email => `Code sent to ${email}`, otpHint: 'Check your inbox (4 digits, valid 1 h)',
    invalidEmail: 'Enter a valid email address.', invalidPassword: 'Use a password with at least 6 characters.', invalidOtp: 'Enter the 4-digit code.',
    features: [
      { label: 'Multi-layer security', desc: 'RLS · RBAC · JWT · canUserPerform()' },
      { label: 'Agentic automation', desc: 'n8n · AI Agents · Human approvals' },
      { label: 'Integrated OTA channels', desc: 'Airbnb · Booking.com · Vrbo · iCal' },
      { label: 'Finance & reports', desc: 'Owner statements · Ledger · Payouts' },
    ],
    howItWorksTitle: 'How does registration work?', howItWorksSteps: ['Enter your email and send the OTP code (4 digits)', 'Check your inbox and enter the code', 'An isolated tenant is automatically created with the tenant_admin role'],
    howItWorksFooter: 'Your data is isolated via RLS + multitenancy — no cross-account access.',
    rolesTitle: 'Available roles in the platform', rolesFooter: 'Roles assigned by the tenant admin. Every new account = tenant_admin.', roleLabels: ['Tenant Admin', 'Manager', 'Accountant', 'Cleaner', 'Technician', 'Driver'],
    superAdminTitle: 'SaaS super admin access (reserved)', superAdminDesc: 'Reserved exclusively for the platform manager.', architecture: 'Architecture documentation →',
  },
  ar: {
    welcome: 'مرحباً', subtitle: 'تسجيل الدخول إلى مساحة الإدارة', email: 'البريد الإلكتروني', password: 'كلمة المرور', newPassword: 'اختر كلمة مرور',
    otp: 'رمز التحقق (4 أرقام)', sendCode: 'إرسال الرمز', sending: 'جارٍ الإرسال…', signin: 'تسجيل الدخول', signinLoading: 'جارٍ التسجيل…', createAccount: 'إنشاء الحساب', creatingLoading: 'جارٍ إنشاء الحساب…',
    switchToRegister: 'إنشاء حساب →', switchToLogin: '← لديّ حساب بالفعل', codeSent: email => `تم إرسال الرمز إلى ${email}`, otpHint: 'تحقق من البريد الإلكتروني (4 أرقام، صالح لمدة ساعة)',
    invalidEmail: 'أدخل بريداً إلكترونياً صالحاً.', invalidPassword: 'يجب أن تحتوي كلمة المرور على 6 أحرف على الأقل.', invalidOtp: 'أدخل رمز التحقق المكون من 4 أرقام.',
    features: [
      { label: 'أمان متعدد الطبقات', desc: 'RLS · RBAC · JWT' },
      { label: 'أتمتة ذكية', desc: 'n8n · وكلاء ذكاء اصطناعي' },
      { label: 'قنوات OTA متكاملة', desc: 'Airbnb · Booking · Vrbo' },
      { label: 'المالية والتقارير', desc: 'كشوفات الملاك · دفتر الأستاذ' },
    ],
    howItWorksTitle: 'كيف يعمل التسجيل؟', howItWorksSteps: ['أدخل بريدك الإلكتروني وأرسل رمز OTP (4 أرقام)', 'تحقق من بريدك وأدخل الرمز', 'يتم إنشاء مساحة عمل منفصلة تلقائياً بدور tenant_admin'],
    howItWorksFooter: 'بياناتك معزولة عبر RLS + multitenancy — لا يوجد وصول مشترك بين الحسابات.',
    rolesTitle: 'الأدوار المتاحة في المنصة', rolesFooter: 'تُعيَّن الأدوار من قِبَل مدير المستأجر. كل حساب جديد = tenant_admin.', roleLabels: ['مدير المستأجر', 'مدير العقارات', 'محاسب', 'عامل نظافة', 'تقني', 'سائق'],
    superAdminTitle: 'وصول المدير العام (محجوز)', superAdminDesc: 'محجوز حصراً لمدير المنصة.', architecture: 'توثيق البنية →',
  },
};
