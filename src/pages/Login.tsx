import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Mail, Lock, ArrowRight, Globe, KeyRound, Loader2, UserPlus, CheckCircle2, Zap, Star, Sparkles, Crown, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { SUPPORTED_LANGUAGES, isRTL, type Language } from "@/lib/i18n";

// ── Static Pricing (synced with DB) ──────────────────────────────────────────
const PRICING_PLANS = [
  {
    id: 'trial',
    name: 'Essai',
    priceEur: 0,
    priceMad: 0,
    color: 'text-slate-300',
    border: 'border-slate-500/20',
    bg: 'bg-slate-500/10',
    icon: Zap,
    limits: '1 prop · 1 unité · 5 rés/mois',
    popular: false,
  },
  {
    id: 'starter',
    name: 'Starter',
    priceEur: 25,
    priceMad: 275,
    color: 'text-blue-400',
    border: 'border-blue-500/20',
    bg: 'bg-blue-500/10',
    icon: Building2,
    limits: '5 prop · 25 unités',
    popular: false,
  },
  {
    id: 'professional',
    name: 'Pro',
    priceEur: 55,
    priceMad: 605,
    color: 'text-primary',
    border: 'border-primary/40',
    bg: 'bg-primary/10',
    icon: Star,
    limits: '20 prop · 100 unités',
    popular: true,
  },
  {
    id: 'growth',
    name: 'Croissance',
    priceEur: 85,
    priceMad: 935,
    color: 'text-emerald-400',
    border: 'border-emerald-500/20',
    bg: 'bg-emerald-500/10',
    icon: Sparkles,
    limits: '50 prop · 300 unités',
    popular: false,
  },
  {
    id: 'enterprise',
    name: 'Entreprise',
    priceEur: 150,
    priceMad: 1650,
    color: 'text-amber-400',
    border: 'border-amber-500/20',
    bg: 'bg-amber-500/10',
    icon: Crown,
    limits: 'Illimité · SLA 99.9%',
    popular: false,
  },
];

// ── Translations ──────────────────────────────────────────────────────────────

const LABELS = {
  fr: {
    welcome: "Bienvenue",
    subtitle: "Connectez-vous à votre espace de gestion",
    email: "Adresse e-mail",
    password: "Mot de passe",
    newPassword: "Choisir un mot de passe",
    otp: "Code de vérification (4 chiffres)",
    sendCode: "Envoyer le code",
    sending: "Envoi en cours…",
    signin: "Se connecter",
    signinLoading: "Connexion…",
    createAccount: "Créer mon compte",
    creatingLoading: "Création du compte…",
    switchToRegister: "Créer un compte →",
    switchToLogin: "← Déjà un compte",
    codeSent: (email: string) => `Code envoyé à ${email}`,
    otpHint: "Vérifiez vos e-mails (4 chiffres, valide 1 h)",
    features: [
      { label: "Sécurité multicouche", desc: "RLS · RBAC · JWT · canUserPerform()" },
      { label: "Automatisation agentique", desc: "n8n · AI Agents · Approbations humaines" },
      { label: "Canaux OTA intégrés", desc: "Airbnb · Booking.com · Vrbo · iCal" },
      { label: "Finance & rapports", desc: "Relevés propriétaires · Grand livre · Virements" },
    ],
    pricingTitle: "Tarification",
    pricingSeeAll: "Tout voir",
    pricingNote: "* 1 EUR ≈ 11 MAD · Prix HT · Annuel -17%",
    pricingFree: "Gratuit",
    pricingPopular: "Populaire",
    howItWorksTitle: "Comment fonctionne l'inscription ?",
    howItWorksSteps: [
      "Entrez votre e-mail et envoyez le code OTP (4 chiffres)",
      "Vérifiez votre boîte mail et saisissez le code",
      "Un tenant isolé est créé automatiquement avec le rôle tenant_admin",
    ],
    howItWorksFooter: "Vos données sont isolées via RLS + multitenancy — aucun accès croisé entre comptes.",
    rolesTitle: "Rôles disponibles dans la plateforme",
    rolesFooter: "Rôles assignés par l'admin tenant. Tout nouveau compte = tenant_admin.",
    superAdminTitle: "Accès super admin SaaS (réservé)",
    superAdminDesc: "Réservé exclusivement au gestionnaire de la plateforme.",
    roleLabels: ["Admin Tenant", "Gestionnaire", "Comptable", "Agent Ménage", "Technicien", "Chauffeur"],
  },
  en: {
    welcome: "Welcome back",
    subtitle: "Sign in to your management workspace",
    email: "Email address",
    password: "Password",
    newPassword: "Choose a password",
    otp: "Verification code (4 digits)",
    sendCode: "Send code",
    sending: "Sending…",
    signin: "Sign In",
    signinLoading: "Signing in…",
    createAccount: "Create account",
    creatingLoading: "Creating account…",
    switchToRegister: "Create an account →",
    switchToLogin: "← Already have an account",
    codeSent: (email: string) => `Code sent to ${email}`,
    otpHint: "Check your inbox (4 digits, valid 1 h)",
    features: [
      { label: "Multi-layer security", desc: "RLS · RBAC · JWT · canUserPerform()" },
      { label: "Agentic automation", desc: "n8n · AI Agents · Human approvals" },
      { label: "Integrated OTA channels", desc: "Airbnb · Booking.com · Vrbo · iCal" },
      { label: "Finance & reports", desc: "Owner statements · Ledger · Payouts" },
    ],
    pricingTitle: "Pricing",
    pricingSeeAll: "See all",
    pricingNote: "* 1 EUR ≈ 11 MAD · Excl. tax · Annual -17%",
    pricingFree: "Free",
    pricingPopular: "Popular",
    howItWorksTitle: "How does registration work?",
    howItWorksSteps: [
      "Enter your email and send the OTP code (4 digits)",
      "Check your inbox and enter the code",
      "An isolated tenant is automatically created with the tenant_admin role",
    ],
    howItWorksFooter: "Your data is isolated via RLS + multitenancy — no cross-account access.",
    rolesTitle: "Available roles in the platform",
    rolesFooter: "Roles assigned by the tenant admin. Every new account = tenant_admin.",
    superAdminTitle: "SaaS super admin access (reserved)",
    superAdminDesc: "Reserved exclusively for the platform manager.",
    roleLabels: ["Tenant Admin", "Manager", "Accountant", "Cleaner", "Technician", "Driver"],
  },
  ar: {
    welcome: "مرحباً",
    subtitle: "تسجيل الدخول إلى مساحة الإدارة",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    newPassword: "اختر كلمة مرور",
    otp: "رمز التحقق (4 أرقام)",
    sendCode: "إرسال الرمز",
    sending: "جارٍ الإرسال…",
    signin: "تسجيل الدخول",
    signinLoading: "جارٍ التسجيل…",
    createAccount: "إنشاء الحساب",
    creatingLoading: "جارٍ إنشاء الحساب…",
    switchToRegister: "إنشاء حساب →",
    switchToLogin: "← لديّ حساب بالفعل",
    codeSent: (email: string) => `تم إرسال الرمز إلى ${email}`,
    otpHint: "تحقق من البريد الإلكتروني (4 أرقام، صالح لمدة ساعة)",
    features: [
      { label: "أمان متعدد الطبقات", desc: "RLS · RBAC · JWT" },
      { label: "أتمتة ذكية", desc: "n8n · وكلاء ذكاء اصطناعي" },
      { label: "قنوات OTA متكاملة", desc: "Airbnb · Booking · Vrbo" },
      { label: "المالية والتقارير", desc: "كشوفات الملاك · دفتر الأستاذ" },
    ],
    pricingTitle: "التسعير",
    pricingSeeAll: "عرض الكل",
    pricingNote: "* 1 EUR ≈ 11 MAD · بدون ضريبة · سنوي -17%",
    pricingFree: "مجاني",
    pricingPopular: "الأكثر طلباً",
    howItWorksTitle: "كيف يعمل التسجيل؟",
    howItWorksSteps: [
      "أدخل بريدك الإلكتروني وأرسل رمز OTP (4 أرقام)",
      "تحقق من بريدك وأدخل الرمز",
      "يتم إنشاء مساحة عمل منفصلة تلقائياً بدور tenant_admin",
    ],
    howItWorksFooter: "بياناتك معزولة عبر RLS + multitenancy — لا يوجد وصول مشترك بين الحسابات.",
    rolesTitle: "الأدوار المتاحة في المنصة",
    rolesFooter: "تُعيَّن الأدوار من قِبَل مدير المستأجر. كل حساب جديد = tenant_admin.",
    superAdminTitle: "وصول المدير العام (محجوز)",
    superAdminDesc: "محجوز حصراً لمدير المنصة.",
    roleLabels: ["مدير المستأجر", "مدير العقارات", "محاسب", "عامل نظافة", "تقني", "سائق"],
  },
};

// ── Component ─────────────────────────────────────────────────────────────────

const Login = () => {
  const navigate = useNavigate();
  const [lang, setLang] = useState<Language>(() => {
    try {
      const stored = localStorage.getItem('pms_language') as Language | null;
      if (stored && ['fr', 'en', 'ar'].includes(stored)) return stored;
    } catch {}
    return 'fr';
  });

  const handleLangChange = (code: Language) => {
    setLang(code);
    try { localStorage.setItem('pms_language', code); } catch {}
  };

  // Mode: "login" (email+password) | "register" (email → OTP → password)
  const [mode, setMode] = useState<"login" | "register">("login");

  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  // Loading
  const [isLoading, setIsLoading] = useState(false);

  const l = LABELS[lang];
  const rtl = isRTL(lang);
  const [pricingCurrency, setPricingCurrency] = useState<'eur' | 'mad'>('eur');

  // ── Login: email + password ───────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error(error.message);
      setIsLoading(false);
      return;
    }
    // Don't reset loading — navigate immediately (onAuthStateChange handles state)
    navigate("/dashboard");
  };

  // ── Check if onboarding is needed ────────────────────────────────────────
  const checkOnboarding = async (userId: string): Promise<boolean> => {
    const { data: membership } = await supabase
      .from('tenant_memberships')
      .select('tenant_id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle();
    if (!membership) return false;
    const { data: tenant } = await supabase
      .from('tenants')
      .select('onboarding_completed')
      .eq('id', membership.tenant_id)
      .maybeSingle();
    return tenant?.onboarding_completed === false;
  };

  // ── Register step 1: send OTP ─────────────────────────────────────────────
  const handleSendOtp = async () => {
    if (!email) {
      toast.error("Veuillez saisir votre adresse e-mail.");
      return;
    }
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    if (error) {
      toast.error(error.message);
      setIsLoading(false);
      return;
    }
    setOtpSent(true);
    toast.success(l.codeSent(email));
    setIsLoading(false);
  };

  // ── Register step 2: verify OTP + set password ────────────────────────────
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: otpCode,
      type: "email",
    });
    if (verifyError) {
      toast.error(verifyError.message);
      setIsLoading(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password,
      data: { username: email.split("@")[0] },
    });
    if (updateError) {
      toast.error(updateError.message);
      setIsLoading(false);
      return;
    }

    // New account → redirect to onboarding wizard
    navigate("/onboarding");
  };

  // ── Switch mode ───────────────────────────────────────────────────────────
  const switchMode = () => {
    setMode(m => (m === "login" ? "register" : "login"));
    setOtpSent(false);
    setOtpCode("");
    setPassword("");
  };

  const inputClass =
    "w-full bg-secondary border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors min-h-[44px]";
  const inputClassPlain =
    "w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors min-h-[44px]";

  return (
    <div className={cn("min-h-screen flex bg-background")} dir={rtl ? "rtl" : "ltr"}>
      {/* Left panel — branding */}
      <div className="hidden lg:flex w-[400px] xl:w-[460px] flex-shrink-0 bg-slate-950 flex-col p-8 border-r border-slate-800/60">
        <div className="flex items-center gap-2.5 mb-12">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Building2 className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <div className="text-sm font-bold text-white leading-none">PMS SaaS</div>
            <div className="text-xs text-slate-500 leading-none mt-0.5">Agentique</div>
          </div>
        </div>

        <div className="flex-1 flex flex-col">
          <h2 className="text-2xl font-bold text-white mb-1 leading-tight">{l.welcome}</h2>
          <p className="text-slate-400 text-sm mb-6">{l.subtitle}</p>

          {/* Features compact */}
          <div className="space-y-3 mb-8">
            {l.features.map(({ label, desc }) => (
              <div key={label} className="flex items-start gap-3">
                <CheckCircle2 className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-slate-200">{label}</p>
                  <p className="text-xs text-slate-500 mt-0.5 font-mono">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ── Pricing section ── */}
          <div className="border-t border-slate-800/60 pt-6 flex-1">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider">{l.pricingTitle}</p>
              <a
                href="/pricing"
                target="_blank"
                className="flex items-center gap-1 text-xs text-primary/70 hover:text-primary transition-colors"
              >
                {l.pricingSeeAll} <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* Currency toggle */}
            <div className="flex gap-1 mb-4">
              {(['eur', 'mad'] as const).map(c => (
                <button
                  key={c}
                  onClick={() => setPricingCurrency(c)}
                  className={cn(
                    'text-xs px-3 py-1.5 rounded-lg font-medium transition-colors min-h-[32px]',
                    pricingCurrency === c
                      ? 'bg-primary text-primary-foreground'
                      : 'text-slate-500 hover:text-slate-300 bg-slate-800/60',
                  )}
                >
                  {c === 'eur' ? '🇪🇺 EUR' : '🇲🇦 MAD'}
                </button>
              ))}
            </div>

            {/* Plan cards */}
            <div className="space-y-2">
              {PRICING_PLANS.map(plan => {
                const Icon = plan.icon;
                const price = pricingCurrency === 'eur' ? plan.priceEur : plan.priceMad;
                const symbol = pricingCurrency === 'eur' ? '€' : ' MAD';
                return (
                  <div
                    key={plan.id}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors',
                      plan.popular
                        ? 'border-primary/40 bg-primary/5'
                        : 'border-slate-800/60 bg-slate-900/40 hover:border-slate-700/60',
                    )}
                  >
                    <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center border flex-shrink-0', plan.bg, plan.border)}>
                      <Icon className={cn('w-3.5 h-3.5', plan.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-slate-200">{plan.name}</span>
                        {plan.popular && (
                          <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-medium" style={{fontSize:'10px'}}>{l.pricingPopular}</span>
                        )}
                      </div>
                      <p className="text-slate-600" style={{fontSize:'10px'}}>{plan.limits}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {price === 0 ? (
                        <span className="text-xs font-bold text-slate-300">{l.pricingFree}</span>
                      ) : (
                        <div>
                          <span className={cn('text-sm font-bold', plan.color)}>{price}</span>
                          <span className="text-slate-600" style={{fontSize:'10px'}}>{symbol}/mo</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="text-slate-700 mt-3" style={{fontSize:'10px'}}>{l.pricingNote}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-700 pt-4 border-t border-slate-800/40">
          <span>🇨🇦 Canada</span>
          <span>·</span>
          <span>🇲🇦 Maroc</span>
          <span>·</span>
          <span>🇪🇺 Europe</span>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-[360px]">
          {/* Language switcher */}
          <div className={cn("flex mb-10", rtl ? "justify-start" : "justify-end")}>
            <div className="flex items-center gap-0.5 bg-secondary border border-border rounded-xl p-1">
              <Globe className="w-3.5 h-3.5 text-muted-foreground mx-1.5" />
              {SUPPORTED_LANGUAGES.map(({ code, flag }) => (
                <button
                  key={code}
                  onClick={() => handleLangChange(code)}
                  className={cn(
                    "text-xs px-2.5 py-1 rounded-lg font-medium transition-colors min-h-[32px]",
                    lang === code
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {flag} {code.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Building2 className="w-4 h-4 text-primary-foreground" />
            </div>
            <div className="text-sm font-bold text-foreground">PMS SaaS Agentique</div>
          </div>

          {/* Mode toggle pills */}
          <div className="flex bg-secondary border border-border rounded-xl p-1 mb-8">
            <button
              onClick={() => { setMode("login"); setOtpSent(false); }}
              className={cn(
                "flex-1 text-xs font-semibold py-2 rounded-lg transition-colors min-h-[36px]",
                mode === "login"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {l.signin}
            </button>
            <button
              onClick={() => { setMode("register"); setOtpSent(false); }}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-lg transition-colors min-h-[36px]",
                mode === "register"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <UserPlus className="w-3.5 h-3.5" />
              {l.createAccount}
            </button>
          </div>

          {/* ── LOGIN form ────────────────────────────────────────────────── */}
          {mode === "login" && (
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">{l.email}</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="admin@example.com"
                    autoComplete="email"
                    required
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">{l.password}</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                    minLength={6}
                    className={inputClass}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold hover:bg-primary/90 active:bg-primary/80 transition-colors flex items-center justify-center gap-2 mt-2 min-h-[44px] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />{l.signinLoading}</>
                ) : (
                  <>{l.signin}<ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </form>
          )}

          {/* ── REGISTER form ─────────────────────────────────────────────── */}
          {mode === "register" && (
            <form onSubmit={handleRegister} className="space-y-4">
              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">{l.email}</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="admin@example.com"
                    autoComplete="email"
                    required
                    disabled={otpSent}
                    className={cn(inputClass, otpSent && "opacity-50")}
                  />
                </div>
              </div>

              {!otpSent ? (
                /* Step 1: send OTP */
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={isLoading}
                  className="w-full bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 min-h-[44px] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" />{l.sending}</>
                  ) : (
                    <><KeyRound className="w-4 h-4" />{l.sendCode}</>
                  )}
                </button>
              ) : (
                /* Step 2: OTP + password */
                <>
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-3">
                    <p className="text-xs text-blue-300">{l.otpHint}</p>
                  </div>

                  {/* OTP code */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">{l.otp}</label>
                    <input
                      type="text"
                      value={otpCode}
                      onChange={e => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      placeholder="_ _ _ _"
                      maxLength={4}
                      required
                      className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-lg text-center tracking-[0.6em] font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors min-h-[44px]"
                    />
                  </div>

                  {/* New password */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">{l.newPassword}</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      <input
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="••••••••"
                        autoComplete="new-password"
                        required
                        minLength={6}
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || otpCode.length < 4 || password.length < 6}
                    className="w-full bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 min-h-[44px] disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" />{l.creatingLoading}</>
                    ) : (
                      <>{l.createAccount}<ArrowRight className="w-4 h-4" /></>
                    )}
                  </button>
                </>
              )}
            </form>
          )}

          {/* Mode switch link */}
          <div className="text-center mt-6">
            <button
              type="button"
              onClick={switchMode}
              className="text-xs text-primary hover:text-primary/80 underline-offset-2 hover:underline transition-colors"
            >
              {mode === "login" ? l.switchToRegister : l.switchToLogin}
            </button>
          </div>

          {/* Back to architecture link */}
          <div className="text-center mt-4">
            <a href="/architecture" className="text-xs text-muted-foreground/40 hover:text-muted-foreground transition-colors">
              Documentation architecture →
            </a>
          </div>

          {/* New account info */}
          <div className="mt-4 bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold text-blue-400">🏢 {l.howItWorksTitle}</p>
            <div className="space-y-2">
              {l.howItWorksSteps.map((step, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="w-4 h-4 bg-blue-500/20 text-blue-300 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{i + 1}</span>
                  {i === 2 ? (
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {step.split('tenant_admin')[0]}
                      <span className="font-mono text-primary bg-primary/10 px-1 rounded">tenant_admin</span>
                      {step.split('tenant_admin')[1]}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">{step}</p>
                  )}
                </div>
              ))}
            </div>
            <div className="pt-1 border-t border-blue-500/15">
              <p className="text-xs text-muted-foreground/70">{l.howItWorksFooter}</p>
            </div>
          </div>

          {/* Roles info */}
          <div className="mt-3 bg-secondary/40 border border-border rounded-xl p-3 space-y-2">
            <p className="text-xs font-semibold text-foreground">🎭 {l.rolesTitle}</p>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { idx: 0, color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
                { idx: 1, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
                { idx: 2, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
                { idx: 3, color: 'text-slate-400 bg-slate-500/10 border-slate-500/20' },
                { idx: 4, color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
                { idx: 5, color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' },
              ].map(({ idx, color }) => (
                <div key={idx} className={`flex items-center px-2 py-1.5 rounded-lg border text-xs font-medium ${color}`}>
                  {l.roleLabels[idx]}
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground/60">{l.rolesFooter}</p>
          </div>

          {/* Platform admin hint */}
          <div className="mt-3 bg-rose-500/5 border border-rose-500/20 rounded-xl p-3 space-y-1">
            <p className="text-xs font-semibold text-rose-400">🔐 {l.superAdminTitle}</p>
            <p className="text-xs text-muted-foreground">
              {l.superAdminDesc}
            </p>
            <div className="font-mono text-xs text-muted-foreground/40">
              <div>Rôle : platform_super_admin (non transférable)</div>
            </div>
          </div>

          {/* Security badge */}
          <p className="text-xs text-muted-foreground/40 text-center mt-6 font-mono">
            Supabase Auth · JWT · RLS · RBAC · ADR-005
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
