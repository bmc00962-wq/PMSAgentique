// AdminTenantsPage — Gestion complète des tenants — platform_super_admin uniquement
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Building2, Plus, Search, RefreshCw, CheckCircle2, XCircle, Edit3,
  Trash2, Users, BarChart2, Globe, DollarSign, AlertTriangle,
  Loader2, ChevronRight, Settings, Shield, Activity,
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import LoadingSpinner from '@/components/features/LoadingSpinner';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ── Types ──────────────────────────────────────────────────────────────────────
interface TenantRow {
  id: string;
  slug: string;
  company_name: string;
  contact_email: string | null;
  contact_phone: string | null;
  website: string | null;
  status: string;
  plan_id: string;
  default_language: string;
  default_currency: string;
  timezone: string;
  management_fee_pct: string;
  default_check_in_time: string;
  default_check_out_time: string;
  minimum_stay_nights: number;
  data_region: string;
  created_at: string;
  updated_at: string;
  member_count?: number;
  property_count?: number;
  unit_count?: number;
  reservation_count?: number;
}

// ── Constants ────────────────────────────────────────────────────────────────
const PLAN_OPTIONS = ['trial', 'starter', 'growth', 'enterprise'];
const STATUS_OPTIONS = ['trial', 'active', 'suspended'];
const LANGUAGE_OPTIONS = [
  { value: 'fr', label: 'Français' },
  { value: 'en', label: 'English' },
  { value: 'ar', label: 'العربية' },
];
const CURRENCY_OPTIONS = ['CAD', 'EUR', 'MAD', 'USD'];
const TIMEZONE_OPTIONS = [
  'America/Toronto', 'America/Montreal', 'Europe/Paris', 'Africa/Casablanca', 'UTC',
];
const REGION_OPTIONS = ['ca-central-1', 'eu-west-1', 'me-south-1'];

const PLAN_COLORS: Record<string, string> = {
  trial: 'bg-slate-500/10 text-slate-300 border-slate-500/20',
  starter: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
  growth: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
  enterprise: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
};
const STATUS_COLORS: Record<string, string> = {
  trial: 'bg-slate-500/10 text-slate-300 border-slate-500/20',
  active: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
  suspended: 'bg-red-500/10 text-red-300 border-red-500/20',
};
const STATUS_LABELS: Record<string, string> = {
  trial: 'Essai', active: 'Actif', suspended: 'Suspendu',
};

// ── Empty form ────────────────────────────────────────────────────────────────
const emptyForm = () => ({
  company_name: '',
  contact_email: '',
  contact_phone: '',
  website: '',
  status: 'trial',
  plan_id: 'trial',
  default_language: 'fr',
  default_currency: 'CAD',
  timezone: 'America/Toronto',
  management_fee_pct: '18',
  default_check_in_time: '15:00',
  default_check_out_time: '11:00',
  minimum_stay_nights: '2',
  data_region: 'ca-central-1',
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
async function fetchTenants(): Promise<TenantRow[]> {
  const { data: tenants, error } = await supabase
    .from('tenants')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (error) throw error;

  const [membershipsRes, propsRes, unitsRes, reservationsRes] = await Promise.all([
    supabase.from('tenant_memberships').select('tenant_id').eq('status', 'active'),
    supabase.from('properties').select('tenant_id').is('deleted_at', null),
    supabase.from('units').select('tenant_id').is('deleted_at', null),
    supabase.from('reservations').select('tenant_id').is('deleted_at', null),
  ]);

  const countBy = (rows: { tenant_id: string }[] | null, tid: string) =>
    (rows ?? []).filter(r => r.tenant_id === tid).length;

  return (tenants ?? []).map(t => ({
    ...t,
    member_count: countBy(membershipsRes.data, t.id),
    property_count: countBy(propsRes.data, t.id),
    unit_count: countBy(unitsRes.data, t.id),
    reservation_count: countBy(reservationsRes.data, t.id),
  }));
}

// ── Tenant Form Modal ─────────────────────────────────────────────────────────
interface TenantFormProps {
  initial?: TenantRow | null;
  onClose: () => void;
  onSaved: () => void;
}

const TenantFormModal = ({ initial, onClose, onSaved }: TenantFormProps) => {
  const isEdit = !!initial;
  const [form, setForm] = useState(
    initial
      ? {
          company_name: initial.company_name,
          contact_email: initial.contact_email ?? '',
          contact_phone: initial.contact_phone ?? '',
          website: initial.website ?? '',
          status: initial.status,
          plan_id: initial.plan_id,
          default_language: initial.default_language,
          default_currency: initial.default_currency,
          timezone: initial.timezone,
          management_fee_pct: String(initial.management_fee_pct),
          default_check_in_time: initial.default_check_in_time,
          default_check_out_time: initial.default_check_out_time,
          minimum_stay_nights: String(initial.minimum_stay_nights),
          data_region: initial.data_region,
        }
      : emptyForm()
  );
  const [saving, setSaving] = useState(false);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.company_name.trim()) {
      toast.error('Le nom de la société est requis');
      return;
    }
    setSaving(true);
    const payload = {
      company_name: form.company_name.trim(),
      contact_email: form.contact_email || null,
      contact_phone: form.contact_phone || null,
      website: form.website || null,
      status: form.status,
      plan_id: form.plan_id,
      default_language: form.default_language,
      default_currency: form.default_currency,
      timezone: form.timezone,
      management_fee_pct: parseFloat(form.management_fee_pct) || 18,
      default_check_in_time: form.default_check_in_time,
      default_check_out_time: form.default_check_out_time,
      minimum_stay_nights: parseInt(form.minimum_stay_nights) || 2,
      data_region: form.data_region,
      updated_at: new Date().toISOString(),
    };

    let error;
    if (isEdit) {
      ({ error } = await supabase.from('tenants').update(payload).eq('id', initial!.id));
    } else {
      // Create slug from company name
      const slug = form.company_name.toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        + '-' + Math.random().toString(36).slice(2, 6);
      ({ error } = await supabase.from('tenants').insert({ ...payload, slug }));
    }
    setSaving(false);
    if (error) { console.error('[AdminTenants] save:', error.message); toast.error("Impossible d'enregistrer ce tenant."); return; }
    toast.success(isEdit ? 'Tenant mis à jour' : 'Tenant créé avec succès');
    onSaved();
    onClose();
  };

  const inputCls = "w-full bg-secondary/60 border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary min-h-[40px]";
  const selectCls = inputCls;
  const labelCls = "text-xs font-medium text-muted-foreground";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary/10 border border-primary/20 rounded-lg flex items-center justify-center">
              <Building2 className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">{isEdit ? 'Modifier le tenant' : 'Créer un nouveau tenant'}</h2>
              {isEdit && <p className="text-xs text-muted-foreground font-mono">{initial!.slug}</p>}
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors text-xl font-light min-w-[44px] min-h-[44px] flex items-center justify-center">✕</button>
        </div>

        <div className="p-6 space-y-5">
          {/* Identity */}
          <div>
            <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-primary" /> Identité
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <label className={labelCls}>Nom de la société *</label>
                <input value={form.company_name} onChange={e => set('company_name', e.target.value)} placeholder="Gestion Soleil Inc." className={inputCls} />
              </div>
              <div className="space-y-1">
                <label className={labelCls}>E-mail contact</label>
                <input type="email" value={form.contact_email} onChange={e => set('contact_email', e.target.value)} placeholder="admin@company.com" className={inputCls} />
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Téléphone</label>
                <input type="tel" value={form.contact_phone} onChange={e => set('contact_phone', e.target.value)} placeholder="+1 514 000 0000" className={inputCls} />
              </div>
              <div className="sm:col-span-2 space-y-1">
                <label className={labelCls}>Site web</label>
                <input type="url" value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://..." className={inputCls} />
              </div>
            </div>
          </div>

          {/* Plan & Status */}
          <div>
            <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-purple-400" /> Plan & Statut
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className={labelCls}>Plan</label>
                <select value={form.plan_id} onChange={e => set('plan_id', e.target.value)} className={selectCls}>
                  {PLAN_OPTIONS.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Statut</label>
                <select value={form.status} onChange={e => set('status', e.target.value)} className={selectCls}>
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_LABELS[s] ?? s}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Paramètres opérationnels */}
          <div>
            <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Settings className="w-3.5 h-3.5 text-blue-400" /> Paramètres opérationnels
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className={labelCls}>Langue par défaut</label>
                <select value={form.default_language} onChange={e => set('default_language', e.target.value)} className={selectCls}>
                  {LANGUAGE_OPTIONS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Devise</label>
                <select value={form.default_currency} onChange={e => set('default_currency', e.target.value)} className={selectCls}>
                  {CURRENCY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Fuseau horaire</label>
                <select value={form.timezone} onChange={e => set('timezone', e.target.value)} className={selectCls}>
                  {TIMEZONE_OPTIONS.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Frais gestion (%)</label>
                <input type="number" min="0" max="100" step="0.5" value={form.management_fee_pct} onChange={e => set('management_fee_pct', e.target.value)} className={inputCls} />
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Check-in par défaut</label>
                <input type="time" value={form.default_check_in_time} onChange={e => set('default_check_in_time', e.target.value)} className={inputCls} />
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Check-out par défaut</label>
                <input type="time" value={form.default_check_out_time} onChange={e => set('default_check_out_time', e.target.value)} className={inputCls} />
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Séjour minimum (nuits)</label>
                <input type="number" min="1" max="30" value={form.minimum_stay_nights} onChange={e => set('minimum_stay_nights', e.target.value)} className={inputCls} />
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Région données</label>
                <select value={form.data_region} onChange={e => set('data_region', e.target.value)} className={selectCls}>
                  {REGION_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border sticky bottom-0 bg-card">
          <button onClick={onClose} className="text-sm text-muted-foreground border border-border rounded-xl px-4 py-2.5 hover:bg-secondary transition-colors min-h-[44px]">
            Annuler
          </button>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-primary text-primary-foreground rounded-xl px-5 py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors min-h-[44px] disabled:opacity-60">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Enregistrement…</> : <>{isEdit ? 'Mettre à jour' : 'Créer le tenant'}</>}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
const AdminTenantsPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPlan, setFilterPlan] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingTenant, setEditingTenant] = useState<TenantRow | null>(null);

  const { data: tenants = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-tenants'],
    queryFn: fetchTenants,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.rpc('admin_set_tenant_status', { p_tenant: id, p_status: status });
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-tenants'] });
      toast.success(`Statut mis à jour → ${STATUS_LABELS[status] ?? status}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = tenants.filter(t => {
    const q = search.toLowerCase();
    const matchSearch = !search || t.company_name.toLowerCase().includes(q) || t.slug.toLowerCase().includes(q) || (t.contact_email ?? '').toLowerCase().includes(q);
    const matchStatus = filterStatus === 'all' || t.status === filterStatus;
    const matchPlan = filterPlan === 'all' || t.plan_id === filterPlan;
    return matchSearch && matchStatus && matchPlan;
  });

  const stats = {
    total: tenants.length,
    active: tenants.filter(t => t.status === 'active').length,
    trial: tenants.filter(t => t.status === 'trial').length,
    suspended: tenants.filter(t => t.status === 'suspended').length,
  };

  if (isLoading) return <AppLayout><div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div></AppLayout>;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <button onClick={() => navigate('/saas-admin')} className="text-xs text-muted-foreground hover:text-primary transition-colors">
                ← Admin Plateforme
              </button>
              <span className="text-muted-foreground/40">/</span>
              <span className="text-xs text-foreground font-medium">Tenants</span>
            </div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" /> Gestion des Tenants
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">{tenants.length} tenant(s) au total · Administration SaaS</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => refetch()} className="flex items-center gap-1.5 text-xs border border-border bg-secondary rounded-xl px-3 py-2.5 hover:border-primary/30 transition-colors min-h-[44px]">
              <RefreshCw className="w-3.5 h-3.5" /> Actualiser
            </button>
            <button onClick={() => { setEditingTenant(null); setShowForm(true); }}
              className="flex items-center gap-1.5 bg-primary text-primary-foreground rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors min-h-[44px]">
              <Plus className="w-4 h-4" /> Nouveau tenant
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total', value: stats.total, color: 'text-foreground', bg: 'bg-secondary/40' },
            { label: 'Actifs', value: stats.active, color: 'text-emerald-400', bg: 'bg-emerald-500/5 border-emerald-500/20' },
            { label: 'Essai', value: stats.trial, color: 'text-slate-400', bg: 'bg-slate-500/5 border-slate-500/20' },
            { label: 'Suspendus', value: stats.suspended, color: 'text-red-400', bg: 'bg-red-500/5 border-red-500/20' },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className={cn('border rounded-xl p-4 text-center', bg, 'border-border')}>
              <div className={cn('text-2xl font-bold', color)}>{value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher par nom, slug, email…"
              className="w-full pl-9 pr-3 py-2.5 bg-secondary/40 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="bg-secondary/40 border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary min-h-[44px]">
            <option value="all">Tous les statuts</option>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
          <select value={filterPlan} onChange={e => setFilterPlan(e.target.value)}
            className="bg-secondary/40 border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary min-h-[44px]">
            <option value="all">Tous les plans</option>
            {PLAN_OPTIONS.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
          </select>
        </div>

        {/* Tenant list */}
        <div className="space-y-3">
          {filtered.length === 0 && (
            <div className="text-center py-16 text-muted-foreground text-sm">
              <Building2 className="w-8 h-8 mx-auto mb-3 opacity-30" />
              Aucun tenant trouvé
            </div>
          )}
          {filtered.map(tenant => (
            <div key={tenant.id} className="bg-card border border-border rounded-2xl p-5 hover:border-primary/20 transition-colors">
              <div className="flex items-start gap-4 flex-wrap">
                {/* Avatar + info */}
                <div className="w-10 h-10 bg-secondary border border-border rounded-xl flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-bold text-foreground">{tenant.company_name}</span>
                    <code className="text-xs font-mono text-primary/70 bg-primary/5 px-1.5 py-0.5 rounded">{tenant.slug}</code>
                    <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', STATUS_COLORS[tenant.status])}>
                      {STATUS_LABELS[tenant.status] ?? tenant.status}
                    </span>
                    <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', PLAN_COLORS[tenant.plan_id ?? 'trial'])}>
                      {(tenant.plan_id ?? 'trial').toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                    {tenant.contact_email && <span>✉ {tenant.contact_email}</span>}
                    <span>🌍 {tenant.default_language?.toUpperCase()} · {tenant.default_currency}</span>
                    <span>🕐 Check-in {tenant.default_check_in_time}</span>
                    <span>💼 {tenant.management_fee_pct}% frais gestion</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button onClick={() => navigate(`/saas-admin/tenants/${tenant.id}`)}
                    className="flex items-center gap-1.5 text-xs border border-border rounded-xl px-3 py-2 hover:border-primary/30 hover:text-primary transition-colors min-h-[36px]">
                    <Activity className="w-3.5 h-3.5" /> Détails
                  </button>
                  <button onClick={() => { setEditingTenant(tenant); setShowForm(true); }}
                    className="flex items-center gap-1.5 text-xs border border-border rounded-xl px-3 py-2 hover:border-blue-500/30 hover:text-blue-400 transition-colors min-h-[36px]">
                    <Edit3 className="w-3.5 h-3.5" /> Modifier
                  </button>
                  {tenant.status !== 'active' && (
                    <button onClick={() => updateStatus.mutate({ id: tenant.id, status: 'active' })}
                      disabled={updateStatus.isPending}
                      className="flex items-center gap-1.5 text-xs border border-emerald-500/30 text-emerald-400 rounded-xl px-3 py-2 hover:bg-emerald-500/10 transition-colors min-h-[36px] disabled:opacity-50">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Activer
                    </button>
                  )}
                  {(tenant.status === 'active' || tenant.status === 'trial') && (
                    <button onClick={() => {
                      if (!window.confirm(`Suspendre "${tenant.company_name}" ?`)) return;
                      updateStatus.mutate({ id: tenant.id, status: 'suspended' });
                    }}
                      disabled={updateStatus.isPending}
                      className="flex items-center gap-1.5 text-xs border border-rose-500/30 text-rose-400 rounded-xl px-3 py-2 hover:bg-rose-500/10 transition-colors min-h-[36px] disabled:opacity-50">
                      <XCircle className="w-3.5 h-3.5" /> Suspendre
                    </button>
                  )}
                </div>
              </div>

              {/* Stats row */}
              <div className="mt-4 grid grid-cols-4 gap-2">
                {[
                  { icon: Users, label: 'Membres', value: tenant.member_count ?? 0 },
                  { icon: Building2, label: 'Propriétés', value: tenant.property_count ?? 0 },
                  { icon: Globe, label: 'Unités', value: tenant.unit_count ?? 0 },
                  { icon: BarChart2, label: 'Réservations', value: tenant.reservation_count ?? 0 },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="bg-secondary/40 rounded-xl p-2.5 text-center">
                    <div className="flex items-center justify-center gap-1 mb-0.5">
                      <Icon className="w-3 h-3 text-muted-foreground/60" />
                    </div>
                    <div className="text-sm font-bold text-foreground">{value}</div>
                    <div className="text-xs text-muted-foreground">{label}</div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground/60">
                <span>ID : <code className="font-mono">{tenant.id}</code></span>
                <span>Créé le {new Date(tenant.created_at).toLocaleDateString('fr-CA')}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <TenantFormModal
          initial={editingTenant}
          onClose={() => { setShowForm(false); setEditingTenant(null); }}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ['admin-tenants'] })}
        />
      )}
    </AppLayout>
  );
};

export default AdminTenantsPage;
