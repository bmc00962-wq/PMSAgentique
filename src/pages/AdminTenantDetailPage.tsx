// AdminTenantDetailPage — Détail complet d'un tenant — platform_super_admin
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Users, Settings, ChartBar as BarChart2, Activity, CreditCard as Edit3, UserPlus, CircleCheck as CheckCircle2, Circle as XCircle, RefreshCw, Key, Shield, Globe, DollarSign, Loader as Loader2, ChevronRight, Trash2, TriangleAlert as AlertTriangle } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import LoadingSpinner from '@/components/features/LoadingSpinner';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ROLE_LABELS, type SystemRole } from '@/lib/auth';

// ── Constants ──────────────────────────────────────────────────────────────────
const ROLE_COLORS: Record<string, string> = {
  platform_super_admin: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
  tenant_admin: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
  property_manager: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  ops_manager: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
  accounting: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  housekeeping_supervisor: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  cleaner: 'text-slate-400 bg-slate-500/10 border-slate-500/30',
  maintenance_technician: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
  driver: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
  inspector: 'text-teal-400 bg-teal-500/10 border-teal-500/30',
  owner_portal: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  read_only: 'text-muted-foreground bg-secondary border-border',
};

const ALL_ROLES_ASSIGNABLE = [
  'tenant_admin', 'property_manager', 'ops_manager', 'accounting',
  'housekeeping_supervisor', 'cleaner', 'maintenance_technician',
  'driver', 'inspector', 'owner_portal', 'read_only',
];

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

// ── Fetch ──────────────────────────────────────────────────────────────────────
async function fetchTenantDetail(tenantId: string) {
  const [tenantRes, membershipsRes, propsRes, unitsRes, reservationsRes, settingsRes] = await Promise.all([
    supabase.from('tenants').select('*').eq('id', tenantId).single(),
    supabase.from('tenant_memberships')
      .select('id, user_id, role, status, created_at')
      .eq('tenant_id', tenantId)
      .order('created_at'),
    supabase.from('properties').select('id, name, status, city, country').eq('tenant_id', tenantId).is('deleted_at', null),
    supabase.from('units').select('id, name, status, base_rate').eq('tenant_id', tenantId).is('deleted_at', null),
    supabase.from('reservations').select('id, status, total_amount, currency, check_in, check_out').eq('tenant_id', tenantId).is('deleted_at', null).order('check_in', { ascending: false }).limit(10),
    supabase.from('tenant_settings').select('*').eq('tenant_id', tenantId).maybeSingle(),
  ]);

  if (tenantRes.error) throw tenantRes.error;

  // Get user profiles for memberships
  const userIds = (membershipsRes.data ?? []).map(m => m.user_id);
  let profiles: { id: string; email: string; username: string | null }[] = [];
  if (userIds.length > 0) {
    const { data } = await supabase.from('user_profiles').select('id, email, username').in('id', userIds);
    profiles = data ?? [];
  }

  const memberships = (membershipsRes.data ?? []).map(m => ({
    ...m,
    joined_at: m.created_at,
    profile: profiles.find(p => p.id === m.user_id),
  }));

  const confirmedRevenue = (reservationsRes.data ?? [])
    .filter(r => ['confirmed', 'checked_in', 'checked_out'].includes(r.status))
    .reduce((s, r) => s + Number(r.total_amount), 0);

  return {
    tenant: tenantRes.data,
    memberships,
    properties: propsRes.data ?? [],
    units: unitsRes.data ?? [],
    reservations: reservationsRes.data ?? [],
    settings: settingsRes.data,
    stats: {
      members: memberships.filter(m => m.status === 'active').length,
      properties: (propsRes.data ?? []).length,
      units: (unitsRes.data ?? []).length,
      reservations: (reservationsRes.data ?? []).length,
      revenue: confirmedRevenue,
      activeUnits: (unitsRes.data ?? []).filter(u => u.status === 'active').length,
    },
  };
}

type DetailTab = 'overview' | 'members' | 'properties' | 'settings';

// ── Main Page ─────────────────────────────────────────────────────────────────
const AdminTenantDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<DetailTab>('overview');
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('property_manager');
  const [addingMember, setAddingMember] = useState(false);
  const [editingMemberRole, setEditingMemberRole] = useState<{ id: string; currentRole: string; email: string } | null>(null);
  const [newRoleValue, setNewRoleValue] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-tenant-detail', id],
    queryFn: () => fetchTenantDetail(id!),
    enabled: !!id,
    staleTime: 30_000,
  });

  const updateTenantStatus = useMutation({
    mutationFn: async (status: string) => {
      const { error } = await supabase.from('tenants').update({ status, updated_at: new Date().toISOString() }).eq('id', id!);
      if (error) throw error;
    },
    onSuccess: (_, status) => {
      queryClient.invalidateQueries({ queryKey: ['admin-tenant-detail', id] });
      toast.success(`Statut mis à jour → ${status}`);
    },
  });

  const updatePlan = useMutation({
    mutationFn: async (plan_id: string) => {
      const { error } = await supabase.from('tenants').update({ plan_id, updated_at: new Date().toISOString() }).eq('id', id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tenant-detail', id] });
      toast.success('Plan mis à jour');
    },
  });

  const changeRole = useMutation({
    mutationFn: async ({ membershipId, role }: { membershipId: string; role: string }) => {
      const { error } = await supabase.from('tenant_memberships').update({ role }).eq('id', membershipId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tenant-detail', id] });
      setEditingMemberRole(null);
      toast.success('Rôle modifié');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deactivateMember = useMutation({
    mutationFn: async (membershipId: string) => {
      const { error } = await supabase.from('tenant_memberships').update({ status: 'inactive' }).eq('id', membershipId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tenant-detail', id] });
      toast.success('Membre désactivé');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleAddMember = async () => {
    if (!newMemberEmail.trim()) { toast.error("Email requis"); return; }
    setAddingMember(true);
    // Find user profile by email
    const { data: profile } = await supabase.from('user_profiles').select('id').eq('email', newMemberEmail.trim()).maybeSingle();
    if (!profile) {
      toast.error("Aucun utilisateur trouvé avec cet email. L'utilisateur doit d'abord créer un compte.");
      setAddingMember(false);
      return;
    }
    // Check existing membership
    const { data: existing } = await supabase.from('tenant_memberships')
      .select('id').eq('tenant_id', id!).eq('user_id', profile.id).maybeSingle();
    if (existing) {
      // Reactivate + update role
      const { error } = await supabase.from('tenant_memberships').update({ role: newMemberRole, status: 'active' }).eq('id', existing.id);
      if (error) { toast.error(error.message); setAddingMember(false); return; }
    } else {
      const { error } = await supabase.from('tenant_memberships').insert({ tenant_id: id!, user_id: profile.id, role: newMemberRole, status: 'active' });
      if (error) { toast.error(error.message); setAddingMember(false); return; }
    }
    setAddingMember(false);
    setShowAddMember(false);
    setNewMemberEmail('');
    queryClient.invalidateQueries({ queryKey: ['admin-tenant-detail', id] });
    toast.success("Membre ajouté avec succès");
  };

  if (isLoading) return <AppLayout><div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div></AppLayout>;
  if (!data) return <AppLayout><div className="text-center py-20 text-muted-foreground">Tenant introuvable</div></AppLayout>;

  const { tenant, memberships, properties, units, reservations, stats, settings } = data;

  const TABS: { id: DetailTab; label: string }[] = [
    { id: 'overview', label: 'Vue d\'ensemble' },
    { id: 'members', label: `Membres (${memberships.length})` },
    { id: 'properties', label: `Propriétés (${properties.length})` },
    { id: 'settings', label: 'Paramètres' },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Breadcrumb + Header */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <button onClick={() => navigate('/saas-admin')} className="hover:text-primary transition-colors">Admin</button>
              <ChevronRight className="w-3 h-3" />
              <button onClick={() => navigate('/saas-admin/tenants')} className="hover:text-primary transition-colors">Tenants</button>
              <ChevronRight className="w-3 h-3" />
              <span className="text-foreground">{tenant.company_name}</span>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-foreground">{tenant.company_name}</h1>
              <code className="text-xs font-mono text-primary/70 bg-primary/5 px-2 py-0.5 rounded">{tenant.slug}</code>
              <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', STATUS_COLORS[tenant.status])}>
                {tenant.status}
              </span>
              <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', PLAN_COLORS[tenant.plan_id ?? 'trial'])}>
                {(tenant.plan_id ?? 'trial').toUpperCase()}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => refetch()} className="flex items-center gap-1.5 text-xs border border-border bg-secondary rounded-xl px-3 py-2.5 hover:border-primary/30 transition-colors min-h-[44px]">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            {/* Quick Plan Change */}
            <select
              defaultValue={tenant.plan_id}
              onChange={e => updatePlan.mutate(e.target.value)}
              className="bg-secondary border border-border rounded-xl px-3 py-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary min-h-[44px]">
              <option value="trial">Essai</option>
              <option value="starter">Starter</option>
              <option value="growth">Growth</option>
              <option value="enterprise">Enterprise</option>
            </select>
            {tenant.status !== 'active' ? (
              <button onClick={() => updateTenantStatus.mutate('active')}
                className="flex items-center gap-1.5 text-xs border border-emerald-500/30 text-emerald-400 rounded-xl px-3 py-2.5 hover:bg-emerald-500/10 transition-colors min-h-[44px]">
                <CheckCircle2 className="w-3.5 h-3.5" /> Activer
              </button>
            ) : (
              <button onClick={() => { if (!window.confirm('Suspendre ce tenant ?')) return; updateTenantStatus.mutate('suspended'); }}
                className="flex items-center gap-1.5 text-xs border border-rose-500/30 text-rose-400 rounded-xl px-3 py-2.5 hover:bg-rose-500/10 transition-colors min-h-[44px]">
                <XCircle className="w-3.5 h-3.5" /> Suspendre
              </button>
            )}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Membres', value: stats.members, icon: Users, color: 'text-blue-400' },
            { label: 'Propriétés', value: stats.properties, icon: Building2, color: 'text-purple-400' },
            { label: 'Unités', value: stats.units, icon: Globe, color: 'text-cyan-400' },
            { label: 'Unités actives', value: stats.activeUnits, icon: CheckCircle2, color: 'text-emerald-400' },
            { label: 'Réservations', value: stats.reservations, icon: BarChart2, color: 'text-amber-400' },
            { label: `Revenus (${tenant.default_currency})`, value: stats.revenue.toFixed(0), icon: DollarSign, color: 'text-emerald-400' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-card border border-border rounded-xl p-3 text-center">
              <Icon className={cn('w-4 h-4 mx-auto mb-1', color)} />
              <div className={cn('text-lg font-bold', color)}>{value}</div>
              <div className="text-xs text-muted-foreground leading-tight">{label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border pb-3 overflow-x-auto">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={cn('px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap min-h-[40px]',
                activeTab === tab.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary')}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Overview ── */}
        {activeTab === 'overview' && (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" /> Informations générales
              </h3>
              {[
                { label: 'Société', value: tenant.company_name },
                { label: 'Slug', value: <code className="font-mono text-primary/80 text-xs">{tenant.slug}</code> },
                { label: 'E-mail', value: tenant.contact_email ?? '—' },
                { label: 'Téléphone', value: tenant.contact_phone ?? '—' },
                { label: 'Site web', value: tenant.website ?? '—' },
                { label: 'Région données', value: tenant.data_region ?? '—' },
                { label: 'Créé le', value: new Date(tenant.created_at).toLocaleDateString('fr-CA') },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between gap-4 py-1.5 border-b border-border/30 last:border-0">
                  <span className="text-xs text-muted-foreground">{label}</span>
                  <span className="text-xs text-foreground font-medium">{value}</span>
                </div>
              ))}
            </div>

            <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Settings className="w-4 h-4 text-blue-400" /> Paramètres opérationnels
              </h3>
              {[
                { label: 'Langue', value: tenant.default_language?.toUpperCase() },
                { label: 'Devise', value: tenant.default_currency },
                { label: 'Fuseau horaire', value: tenant.timezone },
                { label: 'Frais gestion', value: `${tenant.management_fee_pct}%` },
                { label: 'Check-in', value: tenant.default_check_in_time },
                { label: 'Check-out', value: tenant.default_check_out_time },
                { label: 'Séjour minimum', value: `${tenant.minimum_stay_nights} nuits` },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between gap-4 py-1.5 border-b border-border/30 last:border-0">
                  <span className="text-xs text-muted-foreground">{label}</span>
                  <span className="text-xs text-foreground font-medium">{value}</span>
                </div>
              ))}
            </div>

            {/* Recent reservations */}
            <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
                <Activity className="w-4 h-4 text-emerald-400" /> Dernières réservations
              </h3>
              {reservations.length === 0 ? (
                <p className="text-xs text-muted-foreground/60 text-center py-6">Aucune réservation</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border">
                        {['ID', 'Check-in', 'Check-out', 'Statut', 'Montant'].map(h => (
                          <th key={h} className="text-left px-2 py-2 text-muted-foreground font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {reservations.map(r => (
                        <tr key={r.id} className="border-b border-border/30 last:border-0 hover:bg-secondary/20">
                          <td className="px-2 py-2 font-mono text-primary/70">{r.id.slice(0, 8)}…</td>
                          <td className="px-2 py-2 text-muted-foreground">{r.check_in}</td>
                          <td className="px-2 py-2 text-muted-foreground">{r.check_out}</td>
                          <td className="px-2 py-2">
                            <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium',
                              r.status === 'confirmed' ? 'bg-emerald-500/10 text-emerald-400' :
                                r.status === 'cancelled' ? 'bg-red-500/10 text-red-400' :
                                  'bg-secondary text-muted-foreground')}>
                              {r.status}
                            </span>
                          </td>
                          <td className="px-2 py-2 text-foreground font-medium">{Number(r.total_amount).toFixed(2)} {r.currency}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Members ── */}
        {activeTab === 'members' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">Membres ({memberships.length})</p>
              <button onClick={() => setShowAddMember(true)}
                className="flex items-center gap-1.5 bg-primary text-primary-foreground rounded-xl px-4 py-2.5 text-xs font-semibold hover:bg-primary/90 transition-colors min-h-[44px]">
                <UserPlus className="w-3.5 h-3.5" /> Ajouter un membre
              </button>
            </div>

            {showAddMember && (
              <div className="bg-card border border-primary/30 rounded-2xl p-5 space-y-4">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-primary" /> Ajouter un membre existant
                </h3>
                <p className="text-xs text-muted-foreground/80">L'utilisateur doit déjà avoir un compte sur la plateforme.</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">E-mail de l'utilisateur *</label>
                    <input
                      type="email"
                      value={newMemberEmail}
                      onChange={e => setNewMemberEmail(e.target.value)}
                      placeholder="user@example.com"
                      className="w-full bg-secondary/60 border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary min-h-[44px]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Rôle à attribuer *</label>
                    <select value={newMemberRole} onChange={e => setNewMemberRole(e.target.value)}
                      className="w-full bg-secondary/60 border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary min-h-[44px]">
                      {ALL_ROLES_ASSIGNABLE.map(r => <option key={r} value={r}>{ROLE_LABELS[r as SystemRole] ?? r}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShowAddMember(false)} className="text-sm text-muted-foreground border border-border rounded-xl px-4 py-2.5 hover:bg-secondary transition-colors min-h-[44px]">
                    Annuler
                  </button>
                  <button onClick={handleAddMember} disabled={addingMember}
                    className="flex items-center gap-2 bg-primary text-primary-foreground rounded-xl px-5 py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors min-h-[44px] disabled:opacity-60">
                    {addingMember ? <><Loader2 className="w-4 h-4 animate-spin" />Ajout…</> : 'Ajouter'}
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {memberships.length === 0 && (
                <div className="text-center py-10 text-muted-foreground/60 text-sm border border-dashed border-border rounded-2xl">
                  Aucun membre dans ce tenant
                </div>
              )}
              {memberships.map(m => (
                <div key={m.id} className={cn('bg-card border rounded-xl p-4 flex items-center gap-4 flex-wrap',
                  m.status === 'active' ? 'border-border' : 'border-border/30 opacity-60')}>
                  <div className="w-9 h-9 bg-secondary rounded-xl flex items-center justify-center flex-shrink-0 border border-border text-sm font-bold text-foreground">
                    {(m.profile?.username ?? m.profile?.email ?? '?')[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-foreground">{m.profile?.email ?? m.user_id}</span>
                      {m.profile?.username && <span className="text-xs text-muted-foreground">@{m.profile.username}</span>}
                      <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', ROLE_COLORS[m.role] ?? 'text-muted-foreground bg-secondary border-border')}>
                        {ROLE_LABELS[m.role as SystemRole] ?? m.role}
                      </span>
                      {m.status !== 'active' && <span className="text-xs text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">Inactif</span>}
                    </div>
                    <p className="text-xs text-muted-foreground/60 mt-0.5">
                      Rejoint le {new Date(m.joined_at).toLocaleDateString('fr-CA')}
                    </p>
                  </div>
                  {m.status === 'active' && m.role !== 'platform_super_admin' && (
                    <div className="flex items-center gap-2">
                      {editingMemberRole?.id === m.id ? (
                        <div className="flex items-center gap-2">
                          <select value={newRoleValue} onChange={e => setNewRoleValue(e.target.value)}
                            className="bg-secondary border border-border rounded-xl px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                            {ALL_ROLES_ASSIGNABLE.map(r => <option key={r} value={r}>{ROLE_LABELS[r as SystemRole] ?? r}</option>)}
                          </select>
                          <button onClick={() => changeRole.mutate({ membershipId: m.id, role: newRoleValue })}
                            disabled={changeRole.isPending}
                            className="text-xs border border-emerald-500/30 text-emerald-400 rounded-lg px-2.5 py-1.5 hover:bg-emerald-500/10 transition-colors min-h-[32px]">
                            ✓
                          </button>
                          <button onClick={() => setEditingMemberRole(null)}
                            className="text-xs border border-border rounded-lg px-2.5 py-1.5 hover:bg-secondary transition-colors min-h-[32px]">
                            ✕
                          </button>
                        </div>
                      ) : (
                        <>
                          <button onClick={() => { setEditingMemberRole({ id: m.id, currentRole: m.role, email: m.profile?.email ?? '' }); setNewRoleValue(m.role); }}
                            className="flex items-center gap-1 text-xs border border-border rounded-xl px-2.5 py-2 hover:border-purple-500/30 hover:text-purple-400 transition-colors min-h-[36px]">
                            <Key className="w-3 h-3" /> Rôle
                          </button>
                          <button onClick={() => { if (!window.confirm('Désactiver ce membre ?')) return; deactivateMember.mutate(m.id); }}
                            className="flex items-center gap-1 text-xs border border-rose-500/20 text-rose-400 rounded-xl px-2.5 py-2 hover:bg-rose-500/10 transition-colors min-h-[36px]">
                            <XCircle className="w-3 h-3" /> Retirer
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Properties ── */}
        {activeTab === 'properties' && (
          <div className="space-y-3">
            {properties.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground/60 text-sm border border-dashed border-border rounded-2xl">
                Aucune propriété enregistrée
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {properties.map(p => (
                  <div key={p.id} className="bg-card border border-border rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-secondary rounded-lg flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.city}, {p.country}</p>
                        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block',
                          p.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-secondary text-muted-foreground')}>
                          {p.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Settings ── */}
        {activeTab === 'settings' && (
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Settings className="w-4 h-4 text-blue-400" /> Paramètres du tenant
            </h3>
            {settings ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {[
                  { label: 'Check-in', value: settings.default_checkin_time },
                  { label: 'Check-out', value: settings.default_checkout_time },
                  { label: 'Frais gestion (%)', value: settings.management_fee_pct },
                  { label: 'Séjour minimum', value: `${settings.min_stay_nights} nuits` },
                  { label: 'Devise', value: settings.default_currency },
                  { label: 'Langue', value: settings.default_language?.toUpperCase() },
                  { label: 'Langues supportées', value: (settings.supported_languages ?? []).join(', ').toUpperCase() },
                  { label: 'Taxe QC (%)', value: settings.tax_qc_pct ?? '18.475' },
                  { label: 'Taxe Maroc (%)', value: settings.tax_morocco_pct ?? '10' },
                  { label: 'Notif Email', value: settings.notification_email ? '✓ Activé' : '✗ Désactivé' },
                  { label: 'Notif SMS', value: settings.notification_sms ? '✓ Activé' : '✗ Désactivé' },
                  { label: 'Notif WhatsApp', value: settings.notification_whatsapp ? '✓ Activé' : '✗ Désactivé' },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-secondary/40 border border-border rounded-xl p-3">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-sm font-semibold text-foreground mt-0.5">{String(value ?? '—')}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground/60 text-center py-6">Paramètres non initialisés</p>
            )}

            <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-300/80 flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-amber-400" />
              La modification des paramètres opérationnels du tenant est disponible depuis la page principale des paramètres du tenant (SettingsPage).
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default AdminTenantDetailPage;
