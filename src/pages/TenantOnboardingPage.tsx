// TenantOnboardingPage — Post-registration: show tenant slug + domain setup
// Triggered automatically after first login when onboarding_completed = false
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2, Globe, CheckCircle2, ArrowRight, Copy, Check,
  Link2, AlertTriangle, Loader2, Shield, Sparkles, ExternalLink,
  RefreshCw, Lock,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

// ── Steps ─────────────────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: 'Votre espace PMS', icon: Building2 },
  { id: 2, label: 'Lien unique', icon: Link2 },
  { id: 3, label: 'Domaine personnalisé', icon: Globe },
  { id: 4, label: 'Terminé !', icon: Sparkles },
];

// ── Fetch Tenant ──────────────────────────────────────────────────────────────
async function fetchMyTenant(userId: string) {
  const { data: membership } = await supabase
    .from('tenant_memberships')
    .select('tenant_id, role')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!membership) return null;

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, slug, company_name, contact_email, status, plan_id, onboarding_completed, custom_domain')
    .eq('id', membership.tenant_id)
    .single();

  return { tenant, role: membership.role };
}

// ── Component ─────────────────────────────────────────────────────────────────
const TenantOnboardingPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, membership } = useAuth();

  const [step, setStep] = useState(1);
  const [copied, setCopied] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [customDomain, setCustomDomain] = useState('');
  const [domainVerified, setDomainVerified] = useState<boolean | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [savingDomain, setSavingDomain] = useState(false);

  const tenantId = membership?.tenant_id;

  const { data, isLoading } = useQuery({
    queryKey: ['onboarding-tenant', user?.id],
    queryFn: () => fetchMyTenant(user!.id),
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (data?.tenant) {
      setCompanyName(data.tenant.company_name ?? '');
      setCustomDomain(data.tenant.custom_domain ?? '');
    }
  }, [data]);

  // The unique PMS URL for this tenant
  const tenantPmsUrl = data?.tenant?.slug
    ? `${window.location.origin}/t/${data.tenant.slug}`
    : null;

  const copyUrl = () => {
    if (!tenantPmsUrl) return;
    navigator.clipboard.writeText(tenantPmsUrl);
    setCopied(true);
    toast.success('Lien copié dans le presse-papiers !');
    setTimeout(() => setCopied(false), 2000);
  };

  // Save company name
  const saveCompanyName = useMutation({
    mutationFn: async () => {
      if (!tenantId || !companyName.trim()) return;
      const { error } = await supabase.from('tenants')
        .update({ company_name: companyName.trim(), updated_at: new Date().toISOString() })
        .eq('id', tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-tenant'] });
      toast.success('Nom mis à jour');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Verify domain (basic check)
  const verifyDomain = async () => {
    if (!customDomain.trim()) {
      toast.error('Entrez un nom de domaine');
      return;
    }
    setVerifying(true);
    // Basic format validation
    const domainRegex = /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
    const clean = customDomain.replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase();
    setCustomDomain(clean);

    if (!domainRegex.test(clean)) {
      setDomainVerified(false);
      setVerifying(false);
      toast.error('Format de domaine invalide (ex: monentreprise.com)');
      return;
    }

    // Simulate DNS check (in production, would ping a real endpoint)
    await new Promise(r => setTimeout(r, 1200));
    setDomainVerified(true);
    setVerifying(false);
    toast.success('Format de domaine valide');
  };

  // Save domain
  const saveDomain = async () => {
    if (!tenantId) return;
    setSavingDomain(true);
    const { error } = await supabase.from('tenants')
      .update({
        custom_domain: customDomain.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', tenantId);
    setSavingDomain(false);
    if (error) {
      console.error('[Onboarding]:', error.message); toast.error(error.message.includes('unique') ? 'Ce domaine est déjà utilisé par un autre compte.' : "Impossible d'enregistrer ces informations.");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ['onboarding-tenant'] });
    toast.success('Domaine enregistré avec succès');
    setStep(4);
  };

  // Complete onboarding
  const completeOnboarding = useMutation({
    mutationFn: async () => {
      if (!tenantId) return;
      const { error } = await supabase.from('tenants')
        .update({ onboarding_completed: true, updated_at: new Date().toISOString() })
        .eq('id', tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-tenant'] });
      toast.success('Bienvenue ! Votre espace est prêt 🎉');
      navigate('/dashboard');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const tenant = data?.tenant;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-xl">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Configuration de votre espace</h1>
          <p className="text-sm text-muted-foreground mt-1">Quelques étapes pour démarrer votre PMS</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-0 mb-8">
          {STEPS.map((s, i) => {
            const StepIcon = s.icon;
            const isCompleted = step > s.id;
            const isActive = step === s.id;
            return (
              <div key={s.id} className="flex items-center">
                <div className="flex flex-col items-center gap-1">
                  <div className={cn(
                    'w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all',
                    isCompleted ? 'bg-primary border-primary text-primary-foreground' :
                    isActive ? 'border-primary bg-primary/10 text-primary' :
                    'border-border bg-secondary text-muted-foreground',
                  )}>
                    {isCompleted ? <Check className="w-4 h-4" /> : <StepIcon className="w-4 h-4" />}
                  </div>
                  <span className={cn('text-xs font-medium hidden sm:block', isActive ? 'text-foreground' : 'text-muted-foreground/60')}>
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={cn('w-12 sm:w-16 h-0.5 mx-1 mb-5 transition-colors', step > s.id ? 'bg-primary' : 'bg-border')} />
                )}
              </div>
            );
          })}
        </div>

        {/* Step Content */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-lg">

          {/* ── Step 1: Nom de l'entreprise ── */}
          {step === 1 && (
            <div className="p-6 space-y-5">
              <div>
                <h2 className="text-base font-bold text-foreground mb-1 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-primary" /> Votre espace PMS
                </h2>
                <p className="text-sm text-muted-foreground">
                  Commencez par nommer votre espace de gestion immobilière.
                </p>
              </div>

              {tenant && (
                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Tenant créé automatiquement ✓</p>
                    <p className="text-xs text-muted-foreground">
                      Plan : <span className="text-primary font-mono">{tenant.plan_id}</span> · 
                      ID : <span className="font-mono text-muted-foreground/70">{tenant.id.slice(0, 16)}…</span>
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Nom de votre société / agence *</label>
                <input
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  placeholder="Gestion Immobilière Dupont"
                  className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary min-h-[44px]"
                />
                <p className="text-xs text-muted-foreground/60">Ce nom apparaîtra sur vos relevés et communications.</p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => saveCompanyName.mutate()}
                  disabled={!companyName.trim() || saveCompanyName.isPending}
                  className="flex items-center gap-2 bg-primary text-primary-foreground rounded-xl px-5 py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors min-h-[44px] disabled:opacity-60"
                >
                  {saveCompanyName.isPending
                    ? <><Loader2 className="w-4 h-4 animate-spin" />Enregistrement…</>
                    : <>Continuer <ArrowRight className="w-4 h-4" /></>}
                </button>
                <button
                  onClick={() => setStep(2)}
                  className="text-sm text-muted-foreground border border-border rounded-xl px-4 py-2.5 hover:bg-secondary transition-colors min-h-[44px]"
                >
                  Ignorer
                </button>
              </div>
            </div>
          )}

          {/* ── Step 2: Lien unique tenant ── */}
          {step === 2 && (
            <div className="p-6 space-y-5">
              <div>
                <h2 className="text-base font-bold text-foreground mb-1 flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-primary" /> Votre lien unique
                </h2>
                <p className="text-sm text-muted-foreground">
                  Chaque compte PMS dispose d'un identifiant unique qui vous distingue de tous les autres tenants.
                </p>
              </div>

              {tenant && (
                <div className="space-y-4">
                  {/* Tenant URL */}
                  <div className="bg-secondary/50 border border-primary/20 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Shield className="w-4 h-4 text-primary" />
                      <span className="text-xs font-semibold text-foreground">URL de votre espace PMS</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-background border border-border rounded-xl px-3 py-2.5 font-mono text-xs text-primary break-all">
                        {window.location.origin}/t/<span className="text-foreground font-bold">{tenant.slug}</span>
                      </div>
                      <button
                        onClick={copyUrl}
                        className="flex items-center gap-1.5 text-xs border border-border rounded-xl px-3 py-2.5 hover:bg-secondary transition-colors min-h-[44px] flex-shrink-0"
                      >
                        {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-muted-foreground">Identifiant slug : <code className="font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">{tenant.slug}</code></p>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-muted-foreground">Données isolées via RLS — aucun croisement possible</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-muted-foreground">Lien permanent — ne change jamais</p>
                      </div>
                    </div>
                  </div>

                  {/* Plan info */}
                  <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
                    <p className="text-xs font-semibold text-blue-400 mb-2">Plan actuel : {tenant.plan_id?.toUpperCase()}</p>
                    <p className="text-xs text-muted-foreground">
                      Vous pouvez upgrader votre plan à tout moment depuis les paramètres pour débloquer plus de propriétés, d'unités et d'utilisateurs.
                    </p>
                    <button
                      onClick={() => navigate('/pricing')}
                      className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 mt-2 transition-colors"
                    >
                      Voir tous les plans <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(3)}
                  className="flex items-center gap-2 bg-primary text-primary-foreground rounded-xl px-5 py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors min-h-[44px]"
                >
                  Continuer <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setStep(1)}
                  className="text-sm text-muted-foreground border border-border rounded-xl px-4 py-2.5 hover:bg-secondary transition-colors min-h-[44px]"
                >
                  ← Retour
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Domaine personnalisé ── */}
          {step === 3 && (
            <div className="p-6 space-y-5">
              <div>
                <h2 className="text-base font-bold text-foreground mb-1 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-primary" /> Domaine personnalisé
                </h2>
                <p className="text-sm text-muted-foreground">
                  Reliez votre domaine d'entreprise à votre espace PMS pour une expérience professionnelle.
                </p>
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Nom de domaine</label>
                  <div className="flex gap-2">
                    <input
                      value={customDomain}
                      onChange={e => { setCustomDomain(e.target.value); setDomainVerified(null); }}
                      placeholder="monagence.com ou pms.monagence.com"
                      className="flex-1 bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary min-h-[44px]"
                    />
                    <button
                      onClick={verifyDomain}
                      disabled={verifying || !customDomain.trim()}
                      className={cn(
                        'flex items-center gap-1.5 text-xs border rounded-xl px-3 py-2.5 transition-colors min-h-[44px] flex-shrink-0 disabled:opacity-50',
                        domainVerified === true
                          ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'
                          : domainVerified === false
                          ? 'border-red-500/30 text-red-400 bg-red-500/10'
                          : 'border-border hover:bg-secondary text-muted-foreground',
                      )}
                    >
                      {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> :
                       domainVerified === true ? <><CheckCircle2 className="w-4 h-4" /> Valide</> :
                       domainVerified === false ? <><AlertTriangle className="w-4 h-4" /> Invalide</> :
                       <><RefreshCw className="w-3.5 h-3.5" /> Vérifier</>}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground/60">
                    Exemples : <code>monagence.com</code> ou <code>pms.monagence.com</code> (sans https://)
                  </p>
                </div>

                {/* DNS setup guide */}
                {customDomain && domainVerified && (
                  <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 space-y-2">
                    <p className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" /> Configuration DNS requise
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Ajoutez ce record CNAME chez votre registrar DNS pour pointer votre domaine vers le PMS :
                    </p>
                    <div className="bg-background border border-border rounded-lg p-3 font-mono text-xs space-y-1">
                      <div className="flex gap-3">
                        <span className="text-muted-foreground w-12">Type</span>
                        <span className="text-foreground">CNAME</span>
                      </div>
                      <div className="flex gap-3">
                        <span className="text-muted-foreground w-12">Nom</span>
                        <span className="text-primary">{customDomain.startsWith('pms.') ? 'pms' : '@'}</span>
                      </div>
                      <div className="flex gap-3">
                        <span className="text-muted-foreground w-12">Valeur</span>
                        <span className="text-emerald-400">app.pms.onspace.ai</span>
                      </div>
                      <div className="flex gap-3">
                        <span className="text-muted-foreground w-12">TTL</span>
                        <span className="text-foreground">3600</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground/60">
                      La propagation DNS peut prendre 24–48h. Vous serez notifié par email une fois le domaine actif.
                    </p>
                  </div>
                )}

                <div className="bg-secondary/30 border border-border rounded-xl p-3">
                  <p className="text-xs text-muted-foreground/70 flex items-start gap-2">
                    <Lock className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-muted-foreground" />
                    Vous pouvez ignorer cette étape et configurer votre domaine plus tard depuis les Paramètres → Domaine.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 flex-wrap">
                <button
                  onClick={saveDomain}
                  disabled={savingDomain || (!customDomain.trim() && !tenant?.custom_domain)}
                  className="flex items-center gap-2 bg-primary text-primary-foreground rounded-xl px-5 py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors min-h-[44px] disabled:opacity-60"
                >
                  {savingDomain ? <><Loader2 className="w-4 h-4 animate-spin" />Enregistrement…</> :
                  <>Enregistrer le domaine <ArrowRight className="w-4 h-4" /></>}
                </button>
                <button
                  onClick={() => setStep(4)}
                  className="text-sm text-muted-foreground border border-border rounded-xl px-4 py-2.5 hover:bg-secondary transition-colors min-h-[44px]"
                >
                  Ignorer pour l'instant
                </button>
                <button
                  onClick={() => setStep(2)}
                  className="text-sm text-muted-foreground border border-border rounded-xl px-3 py-2.5 hover:bg-secondary transition-colors min-h-[44px]"
                >
                  ← Retour
                </button>
              </div>
            </div>
          )}

          {/* ── Step 4: Success ── */}
          {step === 4 && (
            <div className="p-6 text-center space-y-5">
              <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto">
                <Sparkles className="w-8 h-8 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground mb-2">Votre espace est prêt ! 🎉</h2>
                <p className="text-sm text-muted-foreground">
                  {data?.tenant?.company_name ?? 'Votre espace'} est configuré et prêt à l'emploi.
                </p>
              </div>

              {/* Summary */}
              <div className="bg-secondary/40 border border-border rounded-xl p-4 text-left space-y-2.5">
                {[
                  {
                    label: 'Lien unique',
                    value: `${window.location.origin}/t/${data?.tenant?.slug}`,
                    mono: true,
                  },
                  {
                    label: 'Domaine',
                    value: data?.tenant?.custom_domain ?? 'Non configuré',
                    mono: !!data?.tenant?.custom_domain,
                  },
                  { label: 'Plan', value: (data?.tenant?.plan_id ?? 'trial').toUpperCase(), mono: false },
                  { label: 'Rôle', value: data?.role ?? 'tenant_admin', mono: true },
                ].map(({ label, value, mono }) => (
                  <div key={label} className="flex items-center justify-between gap-4 text-xs">
                    <span className="text-muted-foreground">{label}</span>
                    <span className={cn('font-medium text-foreground', mono && 'font-mono text-primary text-right truncate max-w-[200px]')}>
                      {value}
                    </span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => completeOnboarding.mutate()}
                disabled={completeOnboarding.isPending}
                className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl py-3 text-sm font-bold hover:bg-primary/90 transition-colors min-h-[48px] disabled:opacity-60"
              >
                {completeOnboarding.isPending
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Chargement…</>
                  : <>Accéder au tableau de bord <ArrowRight className="w-4 h-4" /></>}
              </button>
            </div>
          )}
        </div>

        {/* Skip link */}
        <div className="text-center mt-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          >
            Ignorer et accéder directement au tableau de bord →
          </button>
        </div>
      </div>
    </div>
  );
};

// ── LoadingSpinner inline (avoid import loop) ─────────────────────────────────
const LoadingSpinner = ({ size }: { size?: string }) => (
  <div className={cn('animate-spin rounded-full border-2 border-primary border-t-transparent', size === 'lg' ? 'w-10 h-10' : 'w-5 h-5')} />
);

export default TenantOnboardingPage;
