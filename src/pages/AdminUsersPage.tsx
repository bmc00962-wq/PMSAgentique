// AdminUsersPage — Gestion complète des utilisateurs et rôles — platform_super_admin
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Users, Search, RefreshCw, Edit3, Shield, UserPlus, ChevronDown,
  Loader2, CheckCircle2, XCircle, Building2, Key, AlertTriangle, Mail,
  UserX, UserCheck, Eye,
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import LoadingSpinner from '@/components/features/LoadingSpinner';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ROLE_LABELS, type SystemRole } from '@/lib/auth';

// ── Types ──────────────────────────────────────────────────────────────────────
interface UserWithMemberships {
  id: string;
  email: string;
  username: string | null;
  memberships: {
    id: string;
    tenant_id: string;
    tenant_name: string;
    tenant_slug: string;
    role: string;
    status: string;
    joined_at: string;
  }[];
  created_at: string;
  last_sign_in_at: string | null;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const ALL_ROLES = [
  'platform_super_admin', 'tenant_admin', 'property_manager', 'ops_manager',
  'accounting', 'housekeeping_supervisor', 'cleaner', 'maintenance_technician',
  'driver', 'inspector', 'owner_portal', 'read_only',
];

const ROLE_LEVEL_COLORS: Record<string, string> = {
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

const ROLE_LEVEL_BADGE: Record<string, string> = {
  platform_super_admin: 'Plateforme',
  tenant_admin: 'Tenant',
  property_manager: 'Tenant',
  ops_manager: 'Tenant',
  accounting: 'Tenant',
  housekeeping_supervisor: 'Opérations',
  cleaner: 'Opérations',
  maintenance_technician: 'Opérations',
  driver: 'Opérations',
  inspector: 'Opérations',
  owner_portal: 'Externe',
  read_only: 'Lecture',
};

// ── Fetch ─────────────────────────────────────────────────────────────────────
async function fetchUsersWithMemberships(): Promise<UserWithMemberships[]> {
  const [profilesRes, membershipsRes, tenantsRes] = await Promise.all([
    supabase.from('user_profiles').select('id, email, username').order('email'),
    supabase.from('tenant_memberships').select('id, tenant_id, user_id, role, status, created_at'),
    supabase.from('tenants').select('id, company_name, slug').is('deleted_at', null),
  ]);

  const profiles = profilesRes.data ?? [];
  const memberships = membershipsRes.data ?? [];
  const tenants = tenantsRes.data ?? [];

  return profiles.map(p => ({
    id: p.id,
    email: p.email,
    username: p.username,
    memberships: memberships
      .filter(m => m.user_id === p.id)
      .map(m => {
        const t = tenants.find(t => t.id === m.tenant_id);
        return {
          id: m.id,
          tenant_id: m.tenant_id,
          tenant_name: t?.company_name ?? m.tenant_id.slice(0, 8),
          tenant_slug: t?.slug ?? '',
          role: m.role,
          status: m.status,
          joined_at: m.created_at,
        };
      }),
    created_at: '',
    last_sign_in_at: null,
  }));
}

// ── Change Role Modal ─────────────────────────────────────────────────────────
interface ChangeRoleModalProps {
  membership: { id: string; tenant_name: string; role: string; user_email: string };
  tenants: { id: string; company_name: string }[];
  onClose: () => void;
  onSaved: () => void;
}

const ChangeRoleModal = ({ membership, onClose, onSaved }: ChangeRoleModalProps) => {
  const [newRole, setNewRole] = useState(membership.role);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (newRole === membership.role) { onClose(); return; }
    setSaving(true);
    const { error } = await supabase
      .from('tenant_memberships')
      .update({ role: newRole, updated_at: new Date().toISOString() })
      .eq('id', membership.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Rôle mis à jour → ${ROLE_LABELS[newRole as SystemRole] ?? newRole}`);
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-purple-500/10 border border-purple-500/20 rounded-lg flex items-center justify-center">
              <Key className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">Changer le rôle</h2>
              <p className="text-xs text-muted-foreground">{membership.user_email} · {membership.tenant_name}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground min-w-[44px] min-h-[44px] flex items-center justify-center text-xl">✕</button>
        </div>

        <div className="p-5 space-y-4">
          {/* Current role */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">Rôle actuel</p>
            <span className={cn('text-xs px-2.5 py-1.5 rounded-full border font-medium', ROLE_LEVEL_COLORS[membership.role] ?? 'text-muted-foreground bg-secondary border-border')}>
              {ROLE_LABELS[membership.role as SystemRole] ?? membership.role}
            </span>
          </div>

          {/* Role selection */}
          <div>
            <p className="text-xs font-medium text-foreground mb-2">Nouveau rôle *</p>
            <div className="grid gap-1.5 max-h-64 overflow-y-auto">
              {ALL_ROLES.filter(r => r !== 'platform_super_admin').map(role => (
                <button
                  key={role}
                  onClick={() => setNewRole(role)}
                  className={cn(
                    'flex items-center justify-between w-full px-3 py-2.5 rounded-xl border text-xs font-medium text-left transition-colors min-h-[44px]',
                    newRole === role
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-primary/30 hover:bg-secondary/50 text-muted-foreground'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className={cn('w-2 h-2 rounded-full', newRole === role ? 'bg-primary' : 'bg-muted-foreground/30')} />
                    <span className="text-foreground">{ROLE_LABELS[role as SystemRole] ?? role}</span>
                    <code className="font-mono text-muted-foreground/60">{role}</code>
                  </div>
                  <span className={cn('text-xs px-1.5 py-0.5 rounded-full', ROLE_LEVEL_COLORS[role] ?? '')}>
                    {ROLE_LEVEL_BADGE[role] ?? ''}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {newRole !== membership.role && (
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-300">
                Ce changement est immédiat et irréversible sans autre modification.
                Les nouvelles permissions s'appliquent dès la prochaine requête.
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-3 px-5 py-4 border-t border-border">
          <button onClick={onClose} className="flex-1 text-sm text-muted-foreground border border-border rounded-xl py-2.5 hover:bg-secondary transition-colors min-h-[44px]">
            Annuler
          </button>
          <button onClick={handleSave} disabled={saving || newRole === membership.role}
            className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors min-h-[44px] disabled:opacity-60">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" />…</> : 'Confirmer'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Add Membership Modal ──────────────────────────────────────────────────────
interface AddMembershipModalProps {
  userId: string;
  userEmail: string;
  existingTenantIds: string[];
  onClose: () => void;
  onSaved: () => void;
}

const AddMembershipModal = ({ userId, userEmail, existingTenantIds, onClose, onSaved }: AddMembershipModalProps) => {
  const [tenantId, setTenantId] = useState('');
  const [role, setRole] = useState('property_manager');
  const [saving, setSaving] = useState(false);

  const { data: tenants = [] } = useQuery({
    queryKey: ['admin-tenants-list'],
    queryFn: async () => {
      const { data } = await supabase.from('tenants').select('id, company_name, slug').is('deleted_at', null).order('company_name');
      return (data ?? []).filter(t => !existingTenantIds.includes(t.id));
    },
  });

  const handleAdd = async () => {
    if (!tenantId) { toast.error('Sélectionnez un tenant'); return; }
    setSaving(true);
    const { error } = await supabase.from('tenant_memberships').insert({
      tenant_id: tenantId,
      user_id: userId,
      role,
      status: 'active',
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Membership ajouté avec succès');
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center justify-center">
              <UserPlus className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">Ajouter à un tenant</h2>
              <p className="text-xs text-muted-foreground">{userEmail}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground min-w-[44px] min-h-[44px] flex items-center justify-center text-xl">✕</button>
        </div>

        <div className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Tenant *</label>
            <select value={tenantId} onChange={e => setTenantId(e.target.value)}
              className="w-full bg-secondary/60 border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary min-h-[44px]">
              <option value="">Sélectionner un tenant…</option>
              {tenants.map(t => <option key={t.id} value={t.id}>{t.company_name} ({t.slug})</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Rôle *</label>
            <select value={role} onChange={e => setRole(e.target.value)}
              className="w-full bg-secondary/60 border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary min-h-[44px]">
              {ALL_ROLES.filter(r => r !== 'platform_super_admin').map(r => (
                <option key={r} value={r}>{ROLE_LABELS[r as SystemRole] ?? r}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-3 px-5 py-4 border-t border-border">
          <button onClick={onClose} className="flex-1 text-sm text-muted-foreground border border-border rounded-xl py-2.5 hover:bg-secondary transition-colors min-h-[44px]">Annuler</button>
          <button onClick={handleAdd} disabled={saving || !tenantId}
            className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors min-h-[44px] disabled:opacity-60">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" />…</> : 'Ajouter'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
const AdminUsersPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [changeRoleModal, setChangeRoleModal] = useState<{ id: string; tenant_name: string; role: string; user_email: string } | null>(null);
  const [addMembershipFor, setAddMembershipFor] = useState<{ userId: string; userEmail: string; existingTenantIds: string[] } | null>(null);

  const { data: users = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-users'],
    queryFn: fetchUsersWithMemberships,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  const deactivateMembership = useMutation({
    mutationFn: async (membershipId: string) => {
      const { error } = await supabase.from('tenant_memberships').update({ status: 'disabled' }).eq('id', membershipId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Membership désactivé');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    const matchSearch = !search || u.email.toLowerCase().includes(q) || (u.username ?? '').toLowerCase().includes(q);
    const matchRole = filterRole === 'all' || u.memberships.some(m => m.role === filterRole);
    return matchSearch && matchRole;
  });

  const totalMemberships = users.reduce((s, u) => s + u.memberships.length, 0);

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
              <span className="text-xs text-foreground font-medium">Utilisateurs & Rôles</span>
            </div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" /> Gestion Utilisateurs & Rôles
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">{users.length} utilisateur(s) · {totalMemberships} memberships</p>
          </div>
          <button onClick={() => refetch()} className="flex items-center gap-1.5 text-xs border border-border bg-secondary rounded-xl px-3 py-2.5 hover:border-primary/30 transition-colors min-h-[44px]">
            <RefreshCw className="w-3.5 h-3.5" /> Actualiser
          </button>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Utilisateurs', value: users.length, color: 'text-foreground' },
            { label: 'Memberships actifs', value: users.reduce((s, u) => s + u.memberships.filter(m => m.status === 'active').length, 0), color: 'text-emerald-400' },
            { label: 'Rôles distincts', value: new Set(users.flatMap(u => u.memberships.map(m => m.role))).size, color: 'text-purple-400' },
            { label: 'Multi-tenant', value: users.filter(u => new Set(u.memberships.map(m => m.tenant_id)).size > 1).length, color: 'text-blue-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-card border border-border rounded-xl p-4 text-center">
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
              placeholder="Rechercher par email, username…"
              className="w-full pl-9 pr-3 py-2.5 bg-secondary/40 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <select value={filterRole} onChange={e => setFilterRole(e.target.value)}
            className="bg-secondary/40 border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary min-h-[44px]">
            <option value="all">Tous les rôles</option>
            {ALL_ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r as SystemRole] ?? r}</option>)}
          </select>
        </div>

        {/* User list */}
        <div className="space-y-3">
          {filtered.length === 0 && (
            <div className="text-center py-16 text-muted-foreground text-sm">
              <Users className="w-8 h-8 mx-auto mb-3 opacity-30" />
              Aucun utilisateur trouvé
            </div>
          )}
          {filtered.map(user => {
            const isExpanded = expandedUser === user.id;
            const activeMemberships = user.memberships.filter(m => m.status === 'active');
            const isSuperAdmin = user.memberships.some(m => m.role === 'platform_super_admin');

            return (
              <div key={user.id} className={cn('bg-card border rounded-2xl transition-colors', isExpanded ? 'border-primary/30' : 'border-border hover:border-primary/20')}>
                {/* User header row */}
                <div className="flex items-center gap-4 p-4 cursor-pointer" onClick={() => setExpandedUser(isExpanded ? null : user.id)}>
                  {/* Avatar */}
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border text-sm font-bold',
                    isSuperAdmin ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' : 'bg-secondary border-border text-foreground')}>
                    {(user.username ?? user.email)[0].toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-foreground">{user.email}</span>
                      {user.username && <span className="text-xs text-muted-foreground">@{user.username}</span>}
                      {isSuperAdmin && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 font-medium flex items-center gap-1">
                          <Shield className="w-3 h-3" /> Super Admin
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {activeMemberships.slice(0, 3).map(m => (
                        <span key={m.id} className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', ROLE_LEVEL_COLORS[m.role] ?? 'text-muted-foreground bg-secondary border-border')}>
                          {ROLE_LABELS[m.role as SystemRole] ?? m.role}
                        </span>
                      ))}
                      {activeMemberships.length > 3 && (
                        <span className="text-xs text-muted-foreground">+{activeMemberships.length - 3} autres</span>
                      )}
                      {activeMemberships.length === 0 && (
                        <span className="text-xs text-muted-foreground/60">Aucun membership actif</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!isSuperAdmin && (
                      <button
                        onClick={e => { e.stopPropagation(); setAddMembershipFor({ userId: user.id, userEmail: user.email, existingTenantIds: user.memberships.map(m => m.tenant_id) }); }}
                        className="flex items-center gap-1 text-xs border border-border rounded-xl px-2.5 py-2 hover:border-blue-500/30 hover:text-blue-400 transition-colors min-h-[36px]"
                        title="Ajouter à un tenant">
                        <UserPlus className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform', isExpanded && 'rotate-180')} />
                  </div>
                </div>

                {/* Expanded: memberships detail */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-border/50 pt-4 space-y-2">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-primary" /> Memberships ({user.memberships.length})
                      </p>
                      {!isSuperAdmin && (
                        <button
                          onClick={() => setAddMembershipFor({ userId: user.id, userEmail: user.email, existingTenantIds: user.memberships.map(m => m.tenant_id) })}
                          className="flex items-center gap-1.5 text-xs border border-blue-500/30 text-blue-400 rounded-xl px-3 py-1.5 hover:bg-blue-500/10 transition-colors min-h-[36px]">
                          <UserPlus className="w-3 h-3" /> Ajouter à un tenant
                        </button>
                      )}
                    </div>

                    {user.memberships.length === 0 ? (
                      <div className="text-center py-6 text-muted-foreground/60 text-xs border border-dashed border-border rounded-xl">
                        Aucun membership — cet utilisateur n'a accès à aucun tenant
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {user.memberships.map(m => (
                          <div key={m.id} className={cn('flex items-center gap-3 p-3 rounded-xl border transition-colors',
                            m.status === 'active' ? 'border-border bg-secondary/20' : 'border-border/40 bg-secondary/10 opacity-60')}>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-medium text-foreground">{m.tenant_name}</span>
                                <code className="text-xs font-mono text-primary/60">{m.tenant_slug}</code>
                                <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', ROLE_LEVEL_COLORS[m.role] ?? 'text-muted-foreground bg-secondary border-border')}>
                                  {ROLE_LABELS[m.role as SystemRole] ?? m.role}
                                </span>
                                {m.status !== 'active' && (
                                  <span className="text-xs text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">Inactif</span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground/60 mt-0.5">
                                {ROLE_LEVEL_BADGE[m.role] ?? ''} · Rejoint le {new Date(m.joined_at).toLocaleDateString('fr-CA')}
                              </p>
                            </div>
                            {/* Actions per membership */}
                            {!isSuperAdmin && m.status === 'active' && (
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => setChangeRoleModal({ id: m.id, tenant_name: m.tenant_name, role: m.role, user_email: user.email })}
                                  className="flex items-center gap-1 text-xs border border-border rounded-lg px-2.5 py-1.5 hover:border-purple-500/30 hover:text-purple-400 transition-colors min-h-[32px]"
                                  title="Changer le rôle">
                                  <Edit3 className="w-3 h-3" /> Rôle
                                </button>
                                <button
                                  onClick={() => {
                                    if (!window.confirm(`Révoquer le membership "${m.tenant_name}" de ${user.email} ?`)) return;
                                    deactivateMembership.mutate(m.id);
                                  }}
                                  className="flex items-center gap-1 text-xs border border-rose-500/20 text-rose-400 rounded-lg px-2.5 py-1.5 hover:bg-rose-500/10 transition-colors min-h-[32px]"
                                  title="Révoquer le membership">
                                  <UserX className="w-3 h-3" /> Révoquer
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* User ID footer */}
                    <div className="pt-2 border-t border-border/50 flex items-center gap-2">
                      <code className="text-xs font-mono text-muted-foreground/50">ID: {user.id}</code>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Change Role Modal */}
      {changeRoleModal && (
        <ChangeRoleModal
          membership={changeRoleModal}
          tenants={[]}
          onClose={() => setChangeRoleModal(null)}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ['admin-users'] })}
        />
      )}

      {/* Add Membership Modal */}
      {addMembershipFor && (
        <AddMembershipModal
          {...addMembershipFor}
          onClose={() => setAddMembershipFor(null)}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ['admin-users'] })}
        />
      )}
    </AppLayout>
  );
};

export default AdminUsersPage;
