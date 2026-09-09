// ProfilePage — Mon Compte & Préférences — ADR-005, ADR-008
// Affiche les infos du compte connecté, permet modifier username, mot de passe via OTP
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import {
  User, Mail, Lock, Shield, KeyRound, CheckCircle2,
  Loader2, LogOut, Building2, Clock, Globe,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ── Schemas ───────────────────────────────────────────────────────────────────
const usernameSchema = z.object({
  username: z.string().min(2, 'Min 2 caractères').max(40),
});
type UsernameForm = z.infer<typeof usernameSchema>;

const passwordSchema = z.object({
  current_otp: z.string().length(4, '4 chiffres requis'),
  new_password: z.string().min(6, 'Min 6 caractères'),
  confirm:      z.string().min(6),
}).refine(d => d.new_password === d.confirm, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirm'],
});
type PasswordForm = z.infer<typeof passwordSchema>;

// ── Helpers ───────────────────────────────────────────────────────────────────
const ROLE_LABEL: Record<string, { label: string; color: string }> = {
  platform_super_admin: { label: 'Super Admin Plateforme', color: 'text-red-400 bg-red-500/10 border-red-500/20' },
  tenant_admin:         { label: 'Admin Tenant',           color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
  operations_manager:   { label: 'Ops Manager',            color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  property_manager:     { label: 'Property Manager',       color: 'text-sky-400 bg-sky-500/10 border-sky-500/20' },
  accountant:           { label: 'Comptable',              color: 'text-green-400 bg-green-500/10 border-green-500/20' },
  cleaner:              { label: 'Agent Ménage',           color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
  driver:               { label: 'Chauffeur',              color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' },
};

const inputCls =
  'w-full bg-secondary/40 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground ' +
  'placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary transition-colors min-h-[44px]';

const Field = ({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <label className="text-xs font-medium text-foreground">{label}</label>
    {children}
    {error && <p className="text-xs text-red-400">{error}</p>}
  </div>
);

// ── Component ─────────────────────────────────────────────────────────────────
const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, membership, signOut } = useAuth();
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');

  const initials = user?.full_name
    ? user.full_name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
    : '??';

  const roleInfo = ROLE_LABEL[membership?.role ?? ''] ?? {
    label: membership?.role ?? 'Inconnu',
    color: 'text-muted-foreground bg-secondary border-border',
  };

  // ── Username update ───────────────────────────────────────────────────────
  const { register: regU, handleSubmit: submitU, formState: { errors: errU } } = useForm<UsernameForm>({
    resolver: zodResolver(usernameSchema),
    defaultValues: { username: user?.full_name ?? '' },
  });

  const updateUsername = useMutation({
    mutationFn: async (data: UsernameForm) => {
      const { error } = await supabase.auth.updateUser({
        data: { username: data.username, full_name: data.username },
      });
      if (error) throw error;
      // Also update user_profiles table
      const { data: session } = await supabase.auth.getSession();
      if (session.session?.user.id) {
        await supabase
          .from('user_profiles')
          .update({ username: data.username })
          .eq('id', session.session.user.id);
      }
    },
    onSuccess: () => toast.success('Nom d\'utilisateur mis à jour ✓'),
    onError: (e: Error) => toast.error(e.message),
  });

  // ── OTP for password change ───────────────────────────────────────────────
  const handleSendOtp = async () => {
    if (!user?.email) return;
    setSendingOtp(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: user.email,
      options: { shouldCreateUser: false },
    });
    if (error) {
      toast.error(error.message);
    } else {
      setOtpSent(true);
      toast.success(`Code envoyé à ${user.email}`);
    }
    setSendingOtp(false);
  };

  // ── Password update ───────────────────────────────────────────────────────
  const { register: regP, handleSubmit: submitP, formState: { errors: errP }, reset: resetP } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  });

  const updatePassword = useMutation({
    mutationFn: async (data: PasswordForm) => {
      // Verify OTP first
      const { error: verifyErr } = await supabase.auth.verifyOtp({
        email: user!.email,
        token: data.current_otp,
        type: 'email',
      });
      if (verifyErr) throw verifyErr;
      // Set new password
      const { error: pwErr } = await supabase.auth.updateUser({ password: data.new_password });
      if (pwErr) throw pwErr;
    },
    onSuccess: () => {
      toast.success('Mot de passe mis à jour ✓');
      setOtpSent(false);
      resetP();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ── Sign out ──────────────────────────────────────────────────────────────
  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const TABS = [
    { id: 'profile' as const, label: 'Profil', icon: User },
    { id: 'security' as const, label: 'Sécurité', icon: Shield },
  ];

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-start gap-5">
          {/* Avatar */}
          <div className="w-16 h-16 bg-primary/10 border-2 border-primary/20 rounded-2xl flex items-center justify-center flex-shrink-0">
            <span className="text-xl font-bold text-primary">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-foreground truncate">{user?.full_name ?? '—'}</h1>
            <p className="text-sm text-muted-foreground truncate mt-0.5">{user?.email}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className={cn('text-xs px-2.5 py-0.5 rounded-full border font-medium', roleInfo.color)}>
                {roleInfo.label}
              </span>
              {membership?.tenant_id && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  Tenant lié
                </span>
              )}
              {user?.last_login_at && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(user.last_login_at).toLocaleString('fr-CA', { dateStyle: 'short', timeStyle: 'short' })}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-secondary border border-border rounded-xl p-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-colors min-h-[36px]',
                activeTab === id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* ── TAB: PROFIL ── */}
        {activeTab === 'profile' && (
          <div className="space-y-5">
            {/* Infos en lecture seule */}
            <section className="bg-card border border-border rounded-xl p-5 space-y-4">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <User className="w-4 h-4 text-primary" /> Informations du compte
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: 'Email', value: user?.email ?? '—', icon: Mail },
                  { label: 'Rôle', value: roleInfo.label, icon: Shield },
                  { label: 'Langue', value: user?.preferred_language?.toUpperCase() ?? 'FR', icon: Globe },
                  { label: 'Devise', value: user?.preferred_currency ?? 'CAD', icon: Building2 },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="bg-secondary/30 border border-border rounded-xl px-4 py-3">
                    <div className="flex items-center gap-2 mb-0.5">
                      <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{label}</span>
                    </div>
                    <p className="text-sm font-medium text-foreground">{value}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Modifier le nom d'utilisateur */}
            <section className="bg-card border border-border rounded-xl p-5">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
                <User className="w-4 h-4 text-blue-400" /> Modifier le nom d'affichage
              </h2>
              <form onSubmit={submitU(d => updateUsername.mutate(d))} className="space-y-4">
                <Field label="Nom d'utilisateur" error={errU.username?.message}>
                  <input {...regU('username')} placeholder="Marie Dupont" className={inputCls} />
                </Field>
                <button
                  type="submit"
                  disabled={updateUsername.isPending}
                  className={cn(
                    'flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all min-h-[44px]',
                    !updateUsername.isPending
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                      : 'bg-secondary text-muted-foreground cursor-not-allowed',
                  )}
                >
                  {updateUsername.isPending
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Sauvegarde…</>
                    : <><CheckCircle2 className="w-4 h-4" /> Enregistrer</>
                  }
                </button>
              </form>
            </section>
          </div>
        )}

        {/* ── TAB: SÉCURITÉ ── */}
        {activeTab === 'security' && (
          <div className="space-y-5">
            <section className="bg-card border border-border rounded-xl p-5 space-y-4">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Lock className="w-4 h-4 text-orange-400" /> Changer le mot de passe
              </h2>
              <p className="text-xs text-muted-foreground">
                Un code OTP (4 chiffres) sera envoyé à <strong className="text-foreground">{user?.email}</strong> pour confirmer le changement.
              </p>

              {!otpSent ? (
                <button
                  onClick={handleSendOtp}
                  disabled={sendingOtp}
                  className="flex items-center gap-2 px-5 py-2.5 bg-secondary border border-border rounded-xl text-sm font-medium text-foreground hover:bg-secondary/80 transition-colors min-h-[44px] disabled:opacity-60"
                >
                  {sendingOtp
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Envoi…</>
                    : <><KeyRound className="w-4 h-4" /> Envoyer le code OTP</>
                  }
                </button>
              ) : (
                <form onSubmit={submitP(d => updatePassword.mutate(d))} className="space-y-4">
                  <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl px-4 py-3 text-xs text-blue-300">
                    Code OTP envoyé à {user?.email} — 4 chiffres, valide 1 heure
                  </div>

                  <Field label="Code OTP reçu (4 chiffres)" error={errP.current_otp?.message}>
                    <input
                      {...regP('current_otp')}
                      placeholder="_ _ _ _"
                      maxLength={4}
                      className="w-full bg-secondary/40 border border-border rounded-xl px-4 py-2.5 text-lg text-center tracking-[0.5em] font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-colors min-h-[44px]"
                    />
                  </Field>
                  <Field label="Nouveau mot de passe" error={errP.new_password?.message}>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      <input type="password" {...regP('new_password')} placeholder="••••••••"
                        className={inputCls + ' pl-9'} />
                    </div>
                  </Field>
                  <Field label="Confirmer le mot de passe" error={errP.confirm?.message}>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      <input type="password" {...regP('confirm')} placeholder="••••••••"
                        className={inputCls + ' pl-9'} />
                    </div>
                  </Field>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => { setOtpSent(false); resetP(); }}
                      className="px-5 py-2.5 border border-border rounded-xl text-sm text-muted-foreground hover:bg-secondary transition-colors min-h-[44px]"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={updatePassword.isPending}
                      className={cn(
                        'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all min-h-[44px]',
                        !updatePassword.isPending
                          ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                          : 'bg-secondary text-muted-foreground cursor-not-allowed',
                      )}
                    >
                      {updatePassword.isPending
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Mise à jour…</>
                        : <><CheckCircle2 className="w-4 h-4" /> Mettre à jour le mot de passe</>
                      }
                    </button>
                  </div>
                </form>
              )}
            </section>

            {/* Infos sécurité */}
            <section className="bg-card border border-border rounded-xl p-5 space-y-3">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" /> État de la sécurité
              </h2>
              {[
                { label: 'Authentification par e-mail', status: true, desc: 'OTP + mot de passe (ADR-005)' },
                { label: 'Session JWT active', status: true, desc: 'PKCE flow · Supabase Auth' },
                { label: 'Accès tenant isolé (RLS)', status: !!membership, desc: 'RLS PostgreSQL ADR-007' },
                { label: 'MFA TOTP', status: false, desc: 'Disponible en V2' },
              ].map(({ label, status, desc }) => (
                <div key={label} className="flex items-start gap-3 text-xs">
                  <div className={cn(
                    'w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
                    status ? 'bg-emerald-500/20' : 'bg-secondary border border-border',
                  )}>
                    {status
                      ? <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      : <div className="w-2 h-2 rounded-full bg-muted-foreground/20" />
                    }
                  </div>
                  <div>
                    <p className={cn('font-medium', status ? 'text-foreground' : 'text-muted-foreground')}>{label}</p>
                    <p className="text-muted-foreground/60 mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </section>

            {/* Sign out */}
            <section className="bg-card border border-red-500/20 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-red-400 flex items-center gap-2 mb-3">
                <LogOut className="w-4 h-4" /> Déconnexion
              </h2>
              <p className="text-xs text-muted-foreground mb-4">
                La session sera immédiatement invalidée. Vous devrez vous reconnecter.
              </p>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-5 py-2.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm font-medium hover:bg-red-500/20 transition-colors min-h-[44px]"
              >
                <LogOut className="w-4 h-4" /> Se déconnecter
              </button>
            </section>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default ProfilePage;
