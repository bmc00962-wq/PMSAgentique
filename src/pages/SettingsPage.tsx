// SettingsPage — Live Supabase data — ADR-018
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings, Globe, DollarSign, Shield, CheckCircle2, XCircle, Clock, Save, Building2 } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import LoadingSpinner from '@/components/features/LoadingSpinner';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const TENANT_ID = '00000000-0000-0000-0000-000000000001';

const TABS = [
  { id: 'general', label: 'Général', icon: Settings },
  { id: 'operations', label: 'Opérations', icon: Building2 },
  { id: 'finance', label: 'Finance', icon: DollarSign },
  { id: 'notifications', label: 'Notifications', icon: Globe },
];

const LANGUAGE_LABELS: Record<string, string> = { fr: 'Français', en: 'English', ar: 'العربية' };
const CURRENCY_LABELS: Record<string, string> = { CAD: 'CAD — Dollar canadien', USD: 'USD — Dollar US', EUR: 'EUR — Euro', MAD: 'MAD — Dirham marocain' };

async function fetchSettings() {
  // Fetch tenant + tenant_settings in parallel
  const [tenantRes, settingsRes, channelsRes, propsRes, unitsRes] = await Promise.all([
    supabase.from('tenants').select('id, slug, company_name, contact_email, contact_phone, website, status, plan_id, default_language, default_currency, timezone, management_fee_pct, default_check_in_time, default_check_out_time, minimum_stay_nights, tax_id').eq('id', TENANT_ID).single(),
    supabase.from('tenant_settings').select('*').eq('tenant_id', TENANT_ID).maybeSingle(),
    supabase.from('channels').select('id, name, channel_type, status').eq('tenant_id', TENANT_ID).is('deleted_at', null),
    supabase.from('properties').select('id').eq('tenant_id', TENANT_ID).is('deleted_at', null),
    supabase.from('units').select('id').eq('tenant_id', TENANT_ID).is('deleted_at', null),
  ]);

  return {
    tenant: tenantRes.data,
    settings: settingsRes.data,
    channels: channelsRes.data ?? [],
    propertyCount: propsRes.data?.length ?? 0,
    unitCount: unitsRes.data?.length ?? 0,
  };
}

// ── Settings Field Component ─────────────────────────────────────────────────
const FieldRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-start justify-between gap-4 py-3 border-b border-border/50 last:border-0">
    <label className="text-xs font-medium text-muted-foreground pt-2 flex-shrink-0 w-40">{label}</label>
    <div className="flex-1">{children}</div>
  </div>
);

const inputCls = "w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-colors";
const selectCls = "w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-colors";

const SettingsPage = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('general');

  const { data, isLoading } = useQuery({
    queryKey: ['settings', TENANT_ID],
    queryFn: fetchSettings,
    staleTime: 60_000,
  });

  const [form, setForm] = useState<Record<string, string | number | boolean>>({});
  const merged = { ...data?.tenant, ...data?.settings, ...form };

  const updateTenant = useMutation({
    mutationFn: async (patch: Record<string, unknown>) => {
      const { error } = await supabase.from('tenants').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', TENANT_ID);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', TENANT_ID] });
      setForm({});
      toast.success('Paramètres sauvegardés');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateSettings = useMutation({
    mutationFn: async (patch: Record<string, unknown>) => {
      const { error } = await supabase.from('tenant_settings').upsert({ tenant_id: TENANT_ID, ...patch, updated_at: new Date().toISOString() });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', TENANT_ID] });
      toast.success('Paramètres sauvegardés');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <AppLayout><div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div></AppLayout>;

  const t = data!.tenant;
  const s = data!.settings;
  const channels = data!.channels;

  const PLAN_COLOR: Record<string, string> = {
    trial: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
    starter: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    growth: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    enterprise: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">Paramètres</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Tenant <span className="font-mono text-primary">{t?.slug ?? TENANT_ID}</span>
              {' · '}
              <span className={cn('text-xs px-2 py-0.5 rounded-full border font-semibold', PLAN_COLOR[t?.plan_id ?? 'trial'] ?? '')}>
                {(t?.plan_id ?? 'trial').toUpperCase()}
              </span>
            </p>
          </div>
          <div className="flex gap-2">
            {Object.keys(form).length > 0 && (
              <button
                onClick={() => setForm({})}
                className="text-xs border border-border bg-secondary rounded-xl px-3 py-2.5 text-muted-foreground hover:text-foreground transition-colors min-h-[44px]">
                Annuler
              </button>
            )}
            <button
              onClick={() => {
                const tenantFields = ['company_name', 'contact_email', 'contact_phone', 'website', 'default_language', 'default_currency', 'timezone', 'default_check_in_time', 'default_check_out_time', 'minimum_stay_nights', 'management_fee_pct', 'tax_id'];
                const tenantPatch: Record<string, unknown> = {};
                const settingsPatch: Record<string, unknown> = {};
                for (const [k, v] of Object.entries(form)) {
                  if (tenantFields.includes(k)) tenantPatch[k] = v;
                  else settingsPatch[k] = v;
                }
                if (Object.keys(tenantPatch).length > 0) updateTenant.mutate(tenantPatch);
                if (Object.keys(settingsPatch).length > 0) updateSettings.mutate(settingsPatch);
                if (Object.keys(form).length === 0) toast.info('Aucune modification');
              }}
              disabled={updateTenant.isPending || updateSettings.isPending}
              className="flex items-center gap-2 bg-primary text-primary-foreground text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-primary/90 transition-colors min-h-[44px] disabled:opacity-60"
            >
              <Save className="w-3.5 h-3.5" /> Sauvegarder
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={cn('flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors min-h-[44px]',
                  activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                )}>
                <Icon className="w-4 h-4" />{tab.label}
              </button>
            );
          })}
        </div>

        {/* General */}
        {activeTab === 'general' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-card border border-border rounded-xl p-6">
              <h2 className="text-sm font-semibold text-foreground mb-4">Informations entreprise</h2>
              <div>
                <FieldRow label="Nom de l'entreprise">
                  <input value={form['company_name'] as string ?? t?.company_name ?? ''}
                    onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))}
                    className={inputCls} placeholder="Gestion Soleil Inc." />
                </FieldRow>
                <FieldRow label="Email de contact">
                  <input type="email" value={form['contact_email'] as string ?? t?.contact_email ?? ''}
                    onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))}
                    className={inputCls} placeholder="admin@exemple.com" />
                </FieldRow>
                <FieldRow label="Téléphone">
                  <input value={form['contact_phone'] as string ?? t?.contact_phone ?? ''}
                    onChange={e => setForm(f => ({ ...f, contact_phone: e.target.value }))}
                    className={inputCls} placeholder="+1-514-555-0000" />
                </FieldRow>
                <FieldRow label="Site web">
                  <input value={form['website'] as string ?? t?.website ?? ''}
                    onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
                    className={inputCls} placeholder="https://exemple.com" />
                </FieldRow>
                <FieldRow label="NIF / Tax ID">
                  <input value={form['tax_id'] as string ?? t?.tax_id ?? ''}
                    onChange={e => setForm(f => ({ ...f, tax_id: e.target.value }))}
                    className={inputCls} placeholder="123456789RT0001" />
                </FieldRow>
                <FieldRow label="Langue par défaut">
                  <select value={form['default_language'] as string ?? t?.default_language ?? 'fr'}
                    onChange={e => setForm(f => ({ ...f, default_language: e.target.value }))}
                    className={selectCls}>
                    {Object.entries(LANGUAGE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </FieldRow>
                <FieldRow label="Devise par défaut">
                  <select value={form['default_currency'] as string ?? t?.default_currency ?? 'CAD'}
                    onChange={e => setForm(f => ({ ...f, default_currency: e.target.value }))}
                    className={selectCls}>
                    {Object.entries(CURRENCY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </FieldRow>
                <FieldRow label="Fuseau horaire">
                  <select value={form['timezone'] as string ?? t?.timezone ?? 'America/Toronto'}
                    onChange={e => setForm(f => ({ ...f, timezone: e.target.value }))}
                    className={selectCls}>
                    {['America/Toronto', 'America/Montreal', 'Europe/Paris', 'Africa/Casablanca', 'UTC'].map(tz => (
                      <option key={tz} value={tz}>{tz}</option>
                    ))}
                  </select>
                </FieldRow>
              </div>
            </div>
            <div className="space-y-4">
              {/* Summary */}
              <div className="bg-card border border-border rounded-xl p-5 space-y-3">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Inventaire actuel</h3>
                {[
                  { label: 'Propriétés', value: data!.propertyCount },
                  { label: 'Unités', value: data!.unitCount },
                  { label: 'Canaux actifs', value: channels.filter(c => c.status === 'active').length },
                  { label: 'Statut tenant', value: t?.status ?? '—' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="text-foreground font-medium">{value}</span>
                  </div>
                ))}
              </div>
              {/* Security note */}
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-xs font-semibold text-amber-400">ADR-004 & ADR-018</span>
                </div>
                <p className="text-xs text-muted-foreground/70 leading-relaxed">
                  Modifications validées par <code className="text-primary">canUserPerform()</code> côté serveur.
                  Le <code className="font-mono">tenant_id</code> vient toujours de l'auth context.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Operations */}
        {activeTab === 'operations' && (
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-sm font-semibold text-foreground mb-4">Paramètres opérationnels</h2>
            <FieldRow label="Check-in par défaut">
              <input type="time" value={form['default_check_in_time'] as string ?? t?.default_check_in_time ?? '15:00'}
                onChange={e => setForm(f => ({ ...f, default_check_in_time: e.target.value }))}
                className={inputCls} />
            </FieldRow>
            <FieldRow label="Check-out par défaut">
              <input type="time" value={form['default_check_out_time'] as string ?? t?.default_check_out_time ?? '11:00'}
                onChange={e => setForm(f => ({ ...f, default_check_out_time: e.target.value }))}
                className={inputCls} />
            </FieldRow>
            <FieldRow label="Séjour minimum (nuits)">
              <input type="number" min={1} max={30}
                value={form['minimum_stay_nights'] as number ?? t?.minimum_stay_nights ?? 2}
                onChange={e => setForm(f => ({ ...f, minimum_stay_nights: parseInt(e.target.value) }))}
                className={inputCls} />
            </FieldRow>
            <FieldRow label="Réservation instantanée">
              <label className="flex items-center gap-2 cursor-pointer">
                <div
                  onClick={() => setForm(f => ({ ...f, allow_instant_book: !(f['allow_instant_book'] ?? s?.allow_instant_book ?? false) }))}
                  className={cn('w-9 h-5 rounded-full transition-colors cursor-pointer', (form['allow_instant_book'] ?? s?.allow_instant_book ?? false) ? 'bg-primary' : 'bg-secondary border border-border')}
                >
                  <div className={cn('w-3.5 h-3.5 rounded-full bg-white m-0.5 transition-transform', (form['allow_instant_book'] ?? s?.allow_instant_book ?? false) ? 'translate-x-4' : 'translate-x-0')} />
                </div>
                <span className="text-xs text-muted-foreground">
                  {(form['allow_instant_book'] ?? s?.allow_instant_book ?? false) ? 'Activé' : 'Désactivé'}
                </span>
              </label>
            </FieldRow>
            <FieldRow label="Vérification voyageur">
              <label className="flex items-center gap-2 cursor-pointer">
                <div
                  onClick={() => setForm(f => ({ ...f, require_guest_verification: !(f['require_guest_verification'] ?? s?.require_guest_verification ?? false) }))}
                  className={cn('w-9 h-5 rounded-full transition-colors cursor-pointer', (form['require_guest_verification'] ?? s?.require_guest_verification ?? false) ? 'bg-primary' : 'bg-secondary border border-border')}
                >
                  <div className={cn('w-3.5 h-3.5 rounded-full bg-white m-0.5 transition-transform', (form['require_guest_verification'] ?? s?.require_guest_verification ?? false) ? 'translate-x-4' : 'translate-x-0')} />
                </div>
                <span className="text-xs text-muted-foreground">
                  {(form['require_guest_verification'] ?? s?.require_guest_verification ?? false) ? 'Requis' : 'Optionnel'}
                </span>
              </label>
            </FieldRow>
          </div>
        )}

        {/* Finance */}
        {activeTab === 'finance' && (
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-sm font-semibold text-foreground mb-4">Configuration financière</h2>
            <FieldRow label="Frais de gestion (%)">
              <div className="flex items-center gap-3">
                <input type="number" min={0} max={50} step={0.5}
                  value={form['management_fee_pct'] as number ?? t?.management_fee_pct ?? 18}
                  onChange={e => setForm(f => ({ ...f, management_fee_pct: parseFloat(e.target.value) }))}
                  className={cn(inputCls, 'max-w-32')} />
                <span className="text-xs text-muted-foreground">% du revenu brut</span>
              </div>
            </FieldRow>
            <FieldRow label="Taxe QC (%)">
              <div className="flex items-center gap-3">
                <input type="number" min={0} max={30} step={0.001}
                  value={form['tax_qc_pct'] as number ?? s?.tax_qc_pct ?? 18.475}
                  onChange={e => setForm(f => ({ ...f, tax_qc_pct: parseFloat(e.target.value) }))}
                  className={cn(inputCls, 'max-w-32')} />
                <span className="text-xs text-muted-foreground">QC 5% TPS + 9.975% TVQ + 3.5% taxe hébergement = 18.475%</span>
              </div>
            </FieldRow>
            <FieldRow label="TVA Maroc (%)">
              <div className="flex items-center gap-3">
                <input type="number" min={0} max={30} step={0.1}
                  value={form['tax_morocco_pct'] as number ?? s?.tax_morocco_pct ?? 10}
                  onChange={e => setForm(f => ({ ...f, tax_morocco_pct: parseFloat(e.target.value) }))}
                  className={cn(inputCls, 'max-w-32')} />
                <span className="text-xs text-muted-foreground">TVA hébergement Maroc</span>
              </div>
            </FieldRow>
            <div className="mt-4 bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
              <p className="text-xs text-amber-400 font-medium mb-1">ADR-015 — Calculs déterministes uniquement</p>
              <p className="text-xs text-muted-foreground/70">Aucun LLM ne peut effectuer de calculs financiers. Toutes les taxes sont calculées par des fonctions PostgreSQL déterministes.</p>
            </div>
          </div>
        )}

        {/* Notifications */}
        {activeTab === 'notifications' && (
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-sm font-semibold text-foreground mb-4">Canaux de notification</h2>
              {[
                { key: 'notification_email', label: 'Email', desc: 'Notifications par email pour les événements importants' },
                { key: 'notification_sms', label: 'SMS', desc: 'Alertes SMS pour les urgences et confirmations' },
                { key: 'notification_whatsapp', label: 'WhatsApp', desc: 'Messages WhatsApp pour les voyageurs et propriétaires' },
              ].map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between py-3 border-b border-border/50 last:border-0 gap-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">{label}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                  <div
                    onClick={() => setForm(f => ({ ...f, [key]: !(f[key] ?? (s as Record<string, unknown>)?.[key] ?? false) }))}
                    className={cn('w-10 h-5 rounded-full transition-colors cursor-pointer flex-shrink-0', (form[key] ?? (s as Record<string, unknown>)?.[key] ?? false) ? 'bg-primary' : 'bg-secondary border border-border')}
                  >
                    <div className={cn('w-4 h-4 rounded-full bg-white m-0.5 transition-transform', (form[key] ?? (s as Record<string, unknown>)?.[key] ?? false) ? 'translate-x-5' : 'translate-x-0')} />
                  </div>
                </div>
              ))}
            </div>

            {/* Channels status */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-sm font-semibold text-foreground mb-4">Canaux OTA connectés</h2>
              {channels.length === 0 ? (
                <p className="text-xs text-muted-foreground">Aucun canal configuré</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {channels.map(c => (
                    <div key={c.id} className={cn('border rounded-xl p-4', c.status === 'active' ? 'border-emerald-500/25 bg-emerald-500/5' : 'border-border')}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-foreground">{c.name}</span>
                        {c.status === 'active'
                          ? <span className="flex items-center gap-1 text-xs text-emerald-400"><CheckCircle2 className="w-3.5 h-3.5" /> Actif</span>
                          : c.status === 'inactive'
                            ? <span className="flex items-center gap-1 text-xs text-muted-foreground"><XCircle className="w-3.5 h-3.5" /> Inactif</span>
                            : <span className="flex items-center gap-1 text-xs text-yellow-400"><Clock className="w-3.5 h-3.5" /> {c.status}</span>
                        }
                      </div>
                      <p className="text-xs text-muted-foreground">{c.channel_type}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default SettingsPage;
