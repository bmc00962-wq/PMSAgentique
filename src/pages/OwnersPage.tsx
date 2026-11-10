// OwnersPage — Live Supabase data — ADR-004
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, Users, UserCheck, Building2, SlidersHorizontal, Mail, Phone, Download } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import LoadingSpinner from '@/components/features/LoadingSpinner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

const STATUS_FILTERS = [
  { value: 'all', label: 'Tous' },
  { value: 'active', label: 'Actifs' },
  { value: 'inactive', label: 'Inactifs' },
];

const STATUS_COLOR: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  inactive: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
};

async function fetchOwners(tenantId: string) {
  const { data, error } = await supabase
    .from('owners')
    .select('id, first_name, last_name, email, phone, city, country, language, status, notes, created_at')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (error) throw error;

  // Count properties per owner
  const { data: props } = await supabase
    .from('properties')
    .select('id, owner_id')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null);

  const propCount: Record<string, number> = {};
  for (const p of props ?? []) {
    propCount[p.owner_id] = (propCount[p.owner_id] ?? 0) + 1;
  }

  return (data ?? []).map(o => ({ ...o, properties_count: propCount[o.id] ?? 0 }));
}

const OwnersPage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { membership } = useAuth();
  const tenantId = membership?.tenant_id ?? '';

  const { data: owners = [], isPending } = useQuery({
    queryKey: ['owners', tenantId],
    queryFn: () => fetchOwners(tenantId),
    enabled: !!tenantId,
    staleTime: 60_000,
  });

  const filtered = owners.filter(o => {
    const q = search.toLowerCase();
    const matchSearch = !q || `${o.first_name} ${o.last_name} ${o.email} ${o.city}`.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const stats = {
    total: owners.length,
    active: owners.filter(o => o.status === 'active').length,
    properties: owners.reduce((s, o) => s + o.properties_count, 0),
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2.5">
              Propriétaires
              <span className="text-sm font-normal bg-secondary border border-border text-muted-foreground px-2.5 py-0.5 rounded-full">{stats.total}</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">Gérez les propriétaires et leurs contrats de gestion</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const headers = ['Prénom', 'Nom', 'Email', 'Téléphone', 'Ville', 'Pays', 'Langue', 'Statut', 'Propriétés'];
                const rows = filtered.map(o => [
                  o.first_name, o.last_name, o.email ?? '', o.phone ?? '',
                  o.city ?? '', o.country ?? '', o.language ?? '', o.status, o.properties_count,
                ]);
                const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
                const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = 'proprietaires.csv'; a.click();
                URL.revokeObjectURL(url);
              }}
              className="flex items-center gap-2 bg-secondary border border-border text-foreground rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-secondary/80 transition-colors min-h-[44px]"
            >
              <Download className="w-4 h-4" /> CSV
            </button>
            <button
              onClick={() => navigate('/owners/new')}
              className="flex items-center gap-2 bg-primary text-primary-foreground rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors min-h-[44px]"
            >
              <Plus className="w-4 h-4" /> Nouveau propriétaire
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[
            { label: 'Total', value: stats.total, Icon: Users, color: 'text-blue-400' },
            { label: 'Actifs', value: stats.active, Icon: UserCheck, color: 'text-emerald-400' },
            { label: 'Propriétés gérées', value: stats.properties, Icon: Building2, color: 'text-purple-400' },
          ].map(({ label, value, Icon, color }) => (
            <div key={label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
              <Icon className={`w-5 h-5 flex-shrink-0 ${color}`} />
              <div>
                <div className={`text-2xl font-bold ${color}`}>{value}</div>
                <div className="text-xs text-muted-foreground">{label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher par nom, email, ville…"
              className="w-full bg-secondary border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
            />
          </div>
          <div className="flex items-center gap-1 bg-secondary border border-border rounded-xl p-1">
            <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground mx-1.5" />
            {STATUS_FILTERS.map(({ value, label }) => (
              <button key={value} onClick={() => setStatusFilter(value)}
                className={cn('text-xs px-3 py-1.5 rounded-lg transition-colors min-h-[36px]',
                  statusFilter === value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                )}>{label}</button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {isPending ? (
          <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(owner => (
              <button
                key={owner.id}
                onClick={() => navigate(`/owners/${owner.id}`)}
                className="bg-card border border-border rounded-xl p-5 text-left hover:border-primary/30 hover:bg-secondary/20 transition-colors"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="w-10 h-10 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium flex-shrink-0', STATUS_COLOR[owner.status] ?? 'bg-secondary text-muted-foreground border-border')}>
                    {owner.status}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-foreground">{owner.first_name} {owner.last_name}</h3>
                <div className="mt-2 space-y-1">
                  {owner.email && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Mail className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{owner.email}</span>
                    </div>
                  )}
                  {owner.phone && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Phone className="w-3 h-3 flex-shrink-0" />
                      <span>{owner.phone}</span>
                    </div>
                  )}
                  {owner.city && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Building2 className="w-3 h-3 flex-shrink-0" />
                      <span>{owner.city}, {owner.country}</span>
                    </div>
                  )}
                </div>
                <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{owner.properties_count} propriété{owner.properties_count !== 1 ? 's' : ''}</span>
                  <span className="text-xs text-primary">Voir détails →</span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="bg-card border border-border border-dashed rounded-xl p-12 text-center">
            <Users className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Aucun propriétaire{search ? ` correspondant à « ${search} »` : ''}</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default OwnersPage;
