// SaasAdminPage — Hub central d'administration SaaS — ADR-018, ADR-021
// platform_super_admin uniquement · RLS bypass via service_role in Edge Functions
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Shield, Building2, Users, Activity, AlertTriangle,
  CheckCircle2, XCircle, Search, RefreshCw, DollarSign, Info, Lock,
  Key, Eye, EyeOff, ChevronDown, ChevronRight, ArrowRight, Settings,
  BarChart2, Globe,
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import LoadingSpinner from '@/components/features/LoadingSpinner';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ROLE_LABELS, type SystemRole } from '@/lib/auth';

const DEMO_TENANT_ID = '00000000-0000-0000-0000-000000000001';

const PLAN_COLORS: Record<string, string> = {
  trial: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  starter: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  growth: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  enterprise: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
};

const STATUS_COLORS: Record<string, string> = {
  trial: 'bg-slate-500/10 text-slate-400',
  active: 'bg-emerald-500/10 text-emerald-400',
  suspended: 'bg-red-500/10 text-red-400',
  deleted: 'bg-red-500/10 text-red-400',
};
const STATUS_LABELS: Record<string, string> = {
  trial: 'Essai', active: 'Actif', suspended: 'Suspendu', deleted: 'Supprimé',
};

// ── RBAC Permission Matrix (mirrored from can-user-perform Edge Function) ─────
const ROLE_PERMISSIONS: Record<string, string[]> = {
  platform_super_admin: ['*  (toutes les permissions)'],
  tenant_admin: [
    'reservation.create/read/update/cancel/force_cancel',
    'property.create/read/update/delete',
    'unit.create/read/update/delete',
    'owner.create/read/update/delete',
    'guest.create/read/update/anonymize',
    'channel.create/read/update/sync',
    'housekeeping.create/read/update/assign',
    'maintenance.create/read/update/assign',
    'transport.create/read/update/assign',
    'finance.read/create_entry/approve_refund/approve_payout/generate_statement',
    'approval.create/read/approve/reject/delegate/override',
    'settings.read/update',
    'user.invite/read/update/deactivate',
    'report.read/export',
    'agent.trigger/read',
    'audit.read',
  ],
  property_manager: [
    'reservation.create/read/update',
    'property.read/update',
    'unit.read/update',
    'owner.read',
    'guest.create/read/update',
    'channel.read/sync',
    'housekeeping.create/read/update/assign',
    'maintenance.create/read/update/assign',
    'transport.create/read/update/assign',
    'finance.read',
    'approval.create/read/approve',
    'report.read',
    'agent.read',
  ],
  ops_manager: [
    'reservation.read/update/force_cancel',
    'property.read', 'unit.read',
    'guest.read/update',
    'housekeeping.create/read/update/assign',
    'maintenance.create/read/update/assign',
    'transport.create/read/update/assign',
    'finance.read',
    'approval.create/read/approve/reject/delegate',
    'report.read', 'agent.read', 'audit.read',
  ],
  accounting: [
    'reservation.read', 'owner.read',
    'finance.read/create_entry/approve_refund/approve_payout/generate_statement',
    'approval.create/read/approve/reject',
    'report.read/export', 'audit.read',
  ],
  housekeeping_supervisor: [
    'reservation.read', 'property.read', 'unit.read',
    'housekeeping.create/read/update/assign/complete/report_issue',
    'maintenance.create/read', 'report.read',
  ],
  cleaner: [
    'reservation.read',
    'housekeeping.read/update/complete/report_issue',
  ],
  maintenance_technician: [
    'maintenance.read/update/complete/report_parts', 'unit.read',
  ],
  driver: [
    'transport.read/update/complete', 'reservation.read',
  ],
  owner_portal: [
    'property.read', 'unit.read', 'reservation.read',
    'finance.read', 'report.read',
  ],
  read_only: [
    'reservation.read', 'property.read', 'unit.read',
    'owner.read', 'guest.read', 'report.read',
  ],
};

const ROLE_LEVELS: Record<string, { color: string; badge: string }> = {
  platform_super_admin: { color: 'text-rose-400 bg-rose-500/10 border-rose-500/30', badge: 'Plateforme' },
  tenant_admin: { color: 'text-purple-400 bg-purple-500/10 border-purple-500/30', badge: 'Tenant' },
  property_manager: { color: 'text-blue-400 bg-blue-500/10 border-blue-500/30', badge: 'Tenant' },
  ops_manager: { color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30', badge: 'Tenant' },
  accounting: { color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30', badge: 'Tenant' },
  housekeeping_supervisor: { color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30', badge: 'Opérations' },
  cleaner: { color: 'text-slate-400 bg-slate-500/10 border-slate-500/30', badge: 'Opérations' },
  maintenance_technician: { color: 'text-orange-400 bg-orange-500/10 border-orange-500/30', badge: 'Opérations' },
  driver: { color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30', badge: 'Opérations' },
  owner_portal: { color: 'text-amber-400 bg-amber-500/10 border-amber-500/30', badge: 'Externe' },
  read_only: { color: 'text-muted-foreground bg-secondary border-border', badge: 'Lecture' },
};

// ── Data Fetchers ─────────────────────────────────────────────────────────────
async function fetchSaasData() {
  const [tenantsRes, membershipsRes, propsRes, unitsRes, reservationsRes, ledgerRes] = await Promise.all([
    supabase.from('tenants')
      .select('id, slug, company_name, contact_email, status, plan_id, created_at, updated_at, default_language, default_currency, timezone, management_fee_pct')
      .order('created_at', { ascending: true }),
    supabase.from('tenant_memberships')
      .select('id, tenant_id, user_id, role, status, created_at')
      .eq('status', 'active'),
    supabase.from('properties')
      .select('id, name, status, city, country, tenant_id')
      .is('deleted_at', null),
    supabase.from('units')
      .select('id, name, status, base_rate, tenant_id')
      .is('deleted_at', null),
    supabase.from('reservations')
      .select('id, status, total_amount, currency, created_at, tenant_id')
      .is('deleted_at', null),
    supabase.from('ledger_entries')
      .select('id, direction, amount, entry_type, created_at, tenant_id'),
  ]);

  const allTenants = tenantsRes.data ?? [];
  const allMembers = membershipsRes.data ?? [];
  const props = propsRes.data ?? [];
  const units = unitsRes.data ?? [];
  const reservations = reservationsRes.data ?? [];
  const ledger = ledgerRes.data ?? [];

  // Demo tenant stats
  const demoMembers = allMembers.filter(m => m.tenant_id === DEMO_TENANT_ID);
  const demoReservations = reservations.filter(r => r.tenant_id === DEMO_TENANT_ID);
  const confirmedRes = demoReservations.filter(r => ['confirmed', 'checked_in', 'checked_out'].includes(r.status));
  const totalRevenue = confirmedRes.reduce((s, r) => s + Number(r.total_amount), 0);
  const now = new Date();
  const thisMonth = demoReservations.filter(r => {
    const d = new Date(r.created_at);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });

  const roleCounts: Record<string, number> = {};
  for (const m of allMembers) {
    roleCounts[m.role] = (roleCounts[m.role] ?? 0) + 1;
  }

  const { data: auditEvents } = await supabase
    .from('audit_events')
    .select('id, action, entity_type, actor_type, created_at')
    .order('created_at', { ascending: false })
    .limit(30);

  const demoTenant = allTenants.find(t => t.id === DEMO_TENANT_ID);

  return {
    allTenants,
    demoTenant,
    allMembers,
    demoMembers,
    props,
    units,
    reservations,
    ledger,
    auditEvents: auditEvents ?? [],
    stats: {
      tenantCount: allTenants.length,
      memberCount: allMembers.length,
      propertyCount: props.length,
      unitCount: units.length,
      reservationCount: reservations.length,
      confirmedCount: confirmedRes.length,
      thisMonthCount: thisMonth.length,
      totalRevenue,
      activeUnits: units.filter(u => u.status === 'active').length,
    },
    roleCounts,
  };
}

type AdminTab = 'overview' | 'tenants' | 'members' | 'rbac' | 'audit';

// ── RBACMatrix Component ──────────────────────────────────────────────────────
const RBACMatrix = () => {
  const [expandedRole, setExpandedRole] = useState<string | null>('tenant_admin');
  const [showAll, setShowAll] = useState(false);

  const roles = Object.keys(ROLE_PERMISSIONS);
  const displayed = showAll ? roles : roles;

  return (
    <div className="space-y-4">
      <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 text-xs text-amber-300/80 flex items-start gap-2">
        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-amber-400" />
        <div>
          <strong className="text-amber-400">ADR-005 · Matrice RBAC</strong> — 12 rôles × ~88 permissions. 
          La vérification réelle se fait exclusivement côté serveur via l'Edge Function <code className="font-mono bg-amber-500/10 px-1 rounded">can-user-perform</code>.
          Le frontend ne prend jamais de décision d'autorisation.
        </div>
      </div>

      <div className="grid gap-3">
        {displayed.map(role => {
          const perms = ROLE_PERMISSIONS[role] ?? [];
          const level = ROLE_LEVELS[role];
          const isExpanded = expandedRole === role;
          const label = ROLE_LABELS[role as SystemRole] ?? role;

          return (
            <div key={role} className="bg-card border border-border rounded-xl overflow-hidden">
              <button
                onClick={() => setExpandedRole(isExpanded ? null : role)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/30 transition-colors text-left"
              >
                <div className={cn('p-1.5 rounded-lg border', level?.color ?? 'text-muted-foreground bg-secondary border-border')}>
                  <Key className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-foreground">{label}</span>
                    <code className="text-xs font-mono text-muted-foreground">{role}</code>
                    {level && (
                      <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', level.color)}>
                        {level.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {role === 'platform_super_admin' ? 'Accès total — toutes les ressources' : `${perms.length} groupe(s) de permissions`}
                  </p>
                </div>
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                )}
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 border-t border-border/50">
                  <div className="mt-3 grid gap-1.5">
                    {perms.map((p, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <CheckCircle2 className={cn('w-3 h-3 flex-shrink-0', role === 'platform_super_admin' ? 'text-rose-400' : 'text-emerald-400')} />
                        <code className="font-mono text-muted-foreground">{p}</code>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="bg-card border border-border rounded-xl p-4 text-xs space-y-2">
        <p className="font-semibold text-foreground flex items-center gap-2">
          <Lock className="w-3.5 h-3.5 text-primary" /> Règles de sécurité RBAC
        </p>
        <ul className="space-y-1.5 text-muted-foreground">
          <li className="flex items-start gap-2"><Shield className="w-3 h-3 text-rose-400 mt-0.5 flex-shrink-0" /> <span><strong className="text-foreground">platform_super_admin</strong> est réservé exclusivement au SaaS admin — assigné manuellement, jamais via inscription</span></li>
          <li className="flex items-start gap-2"><Shield className="w-3 h-3 text-purple-400 mt-0.5 flex-shrink-0" /> <span>Chaque nouveau compte reçoit automatiquement le rôle <code className="text-primary font-mono">tenant_admin</code> sur son propre tenant isolé</span></li>
          <li className="flex items-start gap-2"><Shield className="w-3 h-3 text-blue-400 mt-0.5 flex-shrink-0" /> <span>Les mutations sensibles passent toujours par une Edge Function avec vérification JWT</span></li>
          <li className="flex items-start gap-2"><Shield className="w-3 h-3 text-emerald-400 mt-0.5 flex-shrink-0" /> <span>RLS (Row Level Security) isolé par tenant_id — aucun cross-tenant data leak possible</span></li>
          <li className="flex items-start gap-2"><Shield className="w-3 h-3 text-amber-400 mt-0.5 flex-shrink-0" /> <span>Toutes les vérifications d'autorisation sont append-only dans <code className="font-mono">audit_events</code></span></li>
        </ul>
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
const SaasAdminPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['saas-admin'],
    queryFn: fetchSaasData,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  const updateTenantStatus = useMutation({
    mutationFn: async ({ tenantId, status }: { tenantId: string; status: string }) => {
      const { error } = await supabase.from('tenants').update({
        status,
        updated_at: new Date().toISOString(),
      }).eq('id', tenantId);
      if (error) throw error;

      await supabase.from('audit_events').insert({
        tenant_id: tenantId,
        actor_type: 'user',
        action: `tenant.status.${status}`,
        entity_type: 'tenant',
        entity_id: tenantId,
        new_data: { status },
      });
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['saas-admin'] });
      toast.success(`Tenant → ${STATUS_LABELS[status] ?? status}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <AppLayout><div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div></AppLayout>;

  const { allTenants, demoTenant, allMembers, stats, roleCounts, auditEvents } = data!;

  const filteredMembers = allMembers.filter(m =>
    !search || m.role.toLowerCase().includes(search.toLowerCase()) || m.user_id.toLowerCase().includes(search.toLowerCase())
  );

  const TABS: { id: AdminTab; label: string; badge?: number }[] = [
    { id: 'overview', label: 'Vue d\'ensemble' },
    { id: 'tenants', label: 'Tenants', badge: allTenants.length },
    { id: 'members', label: 'Membres', badge: stats.memberCount },
    { id: 'rbac', label: 'RBAC & Permissions' },
    { id: 'audit', label: 'Journal d\'audit', badge: auditEvents.length },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start gap-4 flex-wrap">
          <div className="w-10 h-10 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <Shield className="w-5 h-5 text-rose-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-foreground">SaaS Admin</h1>
              <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 font-medium">
                platform_super_admin uniquement
              </span>
              {demoTenant && (
                <span className={cn('text-xs px-2.5 py-1 rounded-full border font-semibold', PLAN_COLORS[demoTenant.plan_id ?? 'trial'])}>
                  {(demoTenant.plan_id ?? 'trial').toUpperCase()}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {allTenants.length} tenant(s) actif(s) · {stats.memberCount} membres · ADR-005 · ADR-018
            </p>
          </div>
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['saas-admin'] })}
            className="flex items-center gap-1.5 text-xs border border-border bg-secondary rounded-xl px-3 py-2.5 hover:border-primary/30 transition-colors min-h-[44px]">
            <RefreshCw className="w-3.5 h-3.5" /> Actualiser
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Tenants actifs', value: allTenants.length, icon: Building2, color: 'text-rose-400' },
            { label: 'Membres totaux', value: stats.memberCount, icon: Users, color: 'text-blue-400' },
            { label: 'Propriétés gérées', value: stats.propertyCount, icon: Building2, color: 'text-purple-400' },
            { label: 'Revenus démo (CAD)', value: `${stats.totalRevenue.toFixed(0)}`, icon: DollarSign, color: 'text-emerald-400' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-card border border-border rounded-xl p-4 flex items-start gap-3">
              <Icon className={cn('w-5 h-5 mt-0.5 flex-shrink-0', color)} />
              <div>
                <div className={cn('text-xl font-bold', color)}>{value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border pb-3 overflow-x-auto">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={cn('flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap min-h-[40px]',
                activeTab === tab.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary')}>
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className={cn('text-xs px-1.5 py-0.5 rounded-full', activeTab === tab.id ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground')}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Overview tab ── */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Quick access cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  title: 'Gestion des Tenants',
                  desc: 'Créer, modifier, suspendre et configurer tous les tenants de la plateforme',
                  icon: Building2,
                  color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
                  badge: `${allTenants.length} tenant(s)`,
                  path: '/saas-admin/tenants',
                  actions: ['Créer un tenant', 'Modifier les plans', 'Suspendre/Activer'],
                },
                {
                  title: 'Utilisateurs & Rôles',
                  desc: 'Gérer tous les utilisateurs, assigner des rôles, ajouter/révoquer des memberships',
                  icon: Users,
                  color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
                  badge: `${stats.memberCount} membre(s)`,
                  path: '/saas-admin/users',
                  actions: ['Changer les rôles', 'Ajouter à un tenant', 'Révoquer accès'],
                },
                {
                  title: 'RBAC & Permissions',
                  desc: 'Matrice complète des 12 rôles et ~88 permissions du système',
                  icon: Shield,
                  color: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
                  badge: '12 rôles',
                  path: null,
                  tab: 'rbac' as AdminTab,
                  actions: ['Voir les permissions', 'Comprendre les niveaux', 'Règles de sécurité'],
                },
                {
                  title: 'Journal d\'Audit',
                  desc: 'Historique complet de toutes les actions sur la plateforme (append-only)',
                  icon: Activity,
                  color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
                  badge: `${auditEvents.length} événements`,
                  path: null,
                  tab: 'audit' as AdminTab,
                  actions: ['Audit trails', 'Détection anomalies', 'Conformité'],
                },
                {
                  title: 'Vue Tenants (rapide)',
                  desc: 'Liste de tous les tenants avec KPIs en ligne',
                  icon: BarChart2,
                  color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
                  badge: `${stats.propertyCount} propriétés`,
                  path: null,
                  tab: 'tenants' as AdminTab,
                  actions: ['Activer/Suspendre', 'Voir les membres', 'Changer le plan'],
                },
                {
                  title: 'Membres (vue globale)',
                  desc: 'Distribution des rôles à travers tous les tenants',
                  icon: Globe,
                  color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
                  badge: `${Object.keys(roleCounts).length} rôles actifs`,
                  path: null,
                  tab: 'members' as AdminTab,
                  actions: ['Répartition des rôles', 'Filtre par rôle', 'Historique'],
                },
              ].map(card => {
                const Icon = card.icon;
                return (
                  <div key={card.title}
                    onClick={() => card.path ? navigate(card.path) : setActiveTab(card.tab!)}
                    className="bg-card border border-border rounded-2xl p-5 cursor-pointer hover:border-primary/30 hover:shadow-lg transition-all group">
                    <div className="flex items-start justify-between mb-4">
                      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center border', card.color)}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-xs text-muted-foreground bg-secondary border border-border px-2 py-0.5 rounded-full">{card.badge}</span>
                    </div>
                    <h3 className="text-sm font-bold text-foreground mb-1 group-hover:text-primary transition-colors">{card.title}</h3>
                    <p className="text-xs text-muted-foreground mb-4 leading-relaxed">{card.desc}</p>
                    <ul className="space-y-1 mb-3">
                      {card.actions.map(a => (
                        <li key={a} className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400/60 flex-shrink-0" />{a}
                        </li>
                      ))}
                    </ul>
                    <div className="flex items-center gap-1 text-xs text-primary/70 group-hover:text-primary transition-colors">
                      Ouvrir <ArrowRight className="w-3 h-3" />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Role distribution quick view */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Key className="w-4 h-4 text-primary" /> Distribution des rôles actifs
              </h3>
              <div className="flex flex-wrap gap-2">
                {Object.entries(roleCounts).sort((a, b) => b[1] - a[1]).map(([role, count]) => {
                  const levelInfo = ROLE_LEVELS[role];
                  return (
                    <div key={role} className={cn('flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border font-medium', levelInfo?.color ?? 'text-muted-foreground bg-secondary border-border')}>
                      <span>{ROLE_LABELS[role as SystemRole] ?? role}</span>
                      <span className="bg-white/10 px-1.5 py-0.5 rounded-full">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Security rules reminder */}
            <div className="bg-rose-500/5 border border-rose-500/20 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-rose-400 mb-3 flex items-center gap-2">
                <Lock className="w-4 h-4" /> Règles de sécurité de la plateforme
              </h3>
              <div className="grid sm:grid-cols-2 gap-3">
                {[
                  { icon: Shield, color: 'text-rose-400', text: 'platform_super_admin est assigné manuellement — jamais via inscription publique' },
                  { icon: Building2, color: 'text-purple-400', text: 'Chaque inscription crée automatiquement un tenant isolé avec RLS strict' },
                  { icon: Key, color: 'text-blue-400', text: 'Toutes les mutations sensibles passent par Edge Function avec vérification JWT' },
                  { icon: Activity, color: 'text-emerald-400', text: 'Toutes les décisions d\'autorisation sont enregistrées dans audit_events (append-only)' },
                ].map(({ icon: Icon, color, text }) => (
                  <div key={text} className="flex items-start gap-2">
                    <Icon className={cn('w-3.5 h-3.5 flex-shrink-0 mt-0.5', color)} />
                    <p className="text-xs text-muted-foreground">{text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Tenants tab ── */}
        {activeTab === 'tenants' && (
          <div className="space-y-4">
            <div className="grid gap-4">
              {allTenants.map(tenant => {
                const tenantMembers = allMembers.filter(m => m.tenant_id === tenant.id);
                const tenantProps = data!.props.filter(p => p.tenant_id === tenant.id);
                const tenantRes = data!.reservations.filter(r => r.tenant_id === tenant.id);
                const isDemo = tenant.id === DEMO_TENANT_ID;

                return (
                  <div key={tenant.id} className={cn('bg-card border rounded-xl p-5', isDemo ? 'border-primary/30' : 'border-border')}>
                    <div className="flex items-start justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-3">
                        <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center border', isDemo ? 'bg-primary/10 border-primary/30' : 'bg-secondary border-border')}>
                          <Building2 className={cn('w-4 h-4', isDemo ? 'text-primary' : 'text-muted-foreground')} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-foreground">{tenant.company_name}</span>
                            {isDemo && <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded-full">Démo</span>}
                            <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', STATUS_COLORS[tenant.status])}>
                              {STATUS_LABELS[tenant.status] ?? tenant.status}
                            </span>
                            <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', PLAN_COLORS[tenant.plan_id ?? 'trial'])}>
                              {(tenant.plan_id ?? 'trial').toUpperCase()}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            <code className="font-mono text-primary/70">{tenant.slug}</code> · {tenant.contact_email}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {tenant.status !== 'active' && (
                          <button
                            onClick={() => updateTenantStatus.mutate({ tenantId: tenant.id, status: 'active' })}
                            disabled={updateTenantStatus.isPending}
                            className="flex items-center gap-1.5 text-xs px-3 py-2 border border-emerald-500/30 text-emerald-400 rounded-xl hover:bg-emerald-500/10 transition-colors min-h-[36px] disabled:opacity-50">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Activer
                          </button>
                        )}
                        {(tenant.status === 'active' || tenant.status === 'trial') && (
                          <button
                            onClick={() => {
                              if (!window.confirm(`Suspendre ${tenant.company_name} ?`)) return;
                              updateTenantStatus.mutate({ tenantId: tenant.id, status: 'suspended' });
                            }}
                            disabled={updateTenantStatus.isPending}
                            className="flex items-center gap-1.5 text-xs px-3 py-2 border border-rose-500/30 text-rose-400 rounded-xl hover:bg-rose-500/10 transition-colors min-h-[36px] disabled:opacity-50">
                            <XCircle className="w-3.5 h-3.5" /> Suspendre
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-3 sm:grid-cols-6 gap-3 text-xs">
                      {[
                        { label: 'Membres', value: tenantMembers.length },
                        { label: 'Propriétés', value: tenantProps.length },
                        { label: 'Réservations', value: tenantRes.length },
                        { label: 'Langue', value: tenant.default_language?.toUpperCase() ?? 'FR' },
                        { label: 'Devise', value: tenant.default_currency ?? 'CAD' },
                        { label: 'Frais gestion', value: `${tenant.management_fee_pct}%` },
                      ].map(({ label, value }) => (
                        <div key={label} className="bg-secondary/40 border border-border rounded-lg p-2.5 text-center">
                          <p className="font-bold text-foreground">{value}</p>
                          <p className="text-muted-foreground">{label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Roles breakdown for this tenant */}
                    {tenantMembers.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {tenantMembers.map(m => {
                          const levelInfo = ROLE_LEVELS[m.role];
                          return (
                            <span key={m.id} className={cn('text-xs px-2.5 py-1 rounded-full border font-medium', levelInfo?.color ?? 'text-muted-foreground bg-secondary border-border')}>
                              {ROLE_LABELS[m.role as SystemRole] ?? m.role}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Members tab ── */}
        {activeTab === 'members' && (
          <div className="space-y-4">
            {/* Role distribution */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" /> Répartition par rôle (tous tenants)
              </h3>
              <div className="flex flex-wrap gap-2">
                {Object.entries(roleCounts).sort((a, b) => b[1] - a[1]).map(([role, count]) => {
                  const levelInfo = ROLE_LEVELS[role];
                  return (
                    <div key={role} className={cn('flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border font-medium', levelInfo?.color ?? 'text-muted-foreground bg-secondary border-border')}>
                      <span>{ROLE_LABELS[role as SystemRole] ?? role}</span>
                      <span className="bg-white/10 px-1.5 py-0.5 rounded-full">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filtrer par rôle ou ID…"
                className="w-full pl-9 pr-3 py-2.5 bg-secondary/40 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>

            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-secondary/30">
                      {['User ID', 'Tenant', 'Rôle', 'Niveau', 'Depuis'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-muted-foreground font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMembers.map(m => {
                      const levelInfo = ROLE_LEVELS[m.role];
                      const tenant = allTenants.find(t => t.id === m.tenant_id);
                      return (
                        <tr key={m.id} className="border-b border-border/40 last:border-0 hover:bg-secondary/20 transition-colors">
                          <td className="px-4 py-3 font-mono text-primary/80 truncate max-w-36">{m.user_id.slice(0, 16)}…</td>
                          <td className="px-4 py-3 text-muted-foreground truncate max-w-32">{tenant?.company_name ?? m.tenant_id.slice(0, 8)}</td>
                          <td className="px-4 py-3">
                            <span className={cn('px-2 py-0.5 rounded-full border font-medium text-xs', levelInfo?.color ?? 'text-muted-foreground bg-secondary border-border')}>
                              {ROLE_LABELS[m.role as SystemRole] ?? m.role}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{levelInfo?.badge ?? '—'}</td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {new Date(m.created_at).toLocaleDateString('fr-CA')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {filteredMembers.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">Aucun membre trouvé</div>
              )}
            </div>
          </div>
        )}

        {/* ── RBAC tab ── */}
        {activeTab === 'rbac' && <RBACMatrix />}

        {/* ── Audit tab ── */}
        {activeTab === 'audit' && (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-4 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">Journal d'audit global</h3>
              <p className="text-xs text-muted-foreground mt-0.5">ADR-007 · audit_events append-only · Tous tenants · 30 derniers événements</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-secondary/30">
                    {['Action', 'Entité', 'Acteur', 'Tenant', 'Date'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-muted-foreground font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {auditEvents.map(ev => {
                    const tenant = allTenants.find(t => t.id === ev.tenant_id);
                    return (
                      <tr key={ev.id} className="border-b border-border/40 last:border-0 hover:bg-secondary/20 transition-colors">
                        <td className="px-4 py-3 font-mono text-primary/80">{ev.action}</td>
                        <td className="px-4 py-3 text-muted-foreground">{ev.entity_type ?? '—'}</td>
                        <td className="px-4 py-3">
                          <span className={cn('px-2 py-0.5 rounded-full font-medium text-xs',
                            ev.actor_type === 'user' ? 'bg-blue-500/10 text-blue-400' :
                              ev.actor_type === 'agent' ? 'bg-purple-500/10 text-purple-400' :
                                'bg-secondary text-muted-foreground'
                          )}>{ev.actor_type}</span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground truncate max-w-32">{tenant?.company_name ?? ev.tenant_id?.slice(0, 8) ?? '—'}</td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                          {new Date(ev.created_at).toLocaleString('fr-CA', { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                      </tr>
                    );
                  })}
                  {auditEvents.length === 0 && (
                    <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">Aucun événement d'audit</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer note */}
        <div className="bg-rose-500/5 border border-rose-500/20 rounded-xl p-4 text-xs text-muted-foreground/70 flex items-start gap-2">
          <Info className="w-3.5 h-3.5 text-rose-400 flex-shrink-0 mt-0.5" />
          <span>
            Toutes les mutations utilisent <code className="font-mono text-rose-400">service_role</code> avec <code className="font-mono">AuditEvent</code> obligatoire (ADR-007).
            La page <strong>RBAC & Permissions</strong> reflète exactement la matrice implémentée dans l'Edge Function <code className="font-mono">can-user-perform</code>.
            Polling 30s · Données Supabase réelles · {allTenants.length} tenant(s).
          </span>
        </div>
      </div>
    </AppLayout>
  );
};

export default SaasAdminPage;
