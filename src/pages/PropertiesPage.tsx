// PropertiesPage — Live Supabase data — ADR-004
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, Building2, CircleCheck as CheckCircle2, SlidersHorizontal, MapPin, Chrome as Home } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import LoadingSpinner from '@/components/features/LoadingSpinner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

const tenantId = '00000000-0000-0000-0000-000000000001';

const STATUS_FILTERS = [
  { value: 'all', label: 'Toutes' },
  { value: 'active', label: 'Actives' },
  { value: 'inactive', label: 'Inactives' },
];

const STATUS_COLOR: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  inactive: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  maintenance: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
};

const TYPE_LABELS: Record<string, string> = {
  apartment: 'Appartement', villa: 'Villa', chalet: 'Chalet',
  riad: 'Riad', studio: 'Studio', house: 'Maison', other: 'Autre',
};

async function fetchProperties(tenantId: string) {
  const { data, error } = await supabase
    .from('properties')
    .select('id, name, property_type, address, city, country, status, owner_id, description, amenities, created_at')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (error) throw error;

  // Join owners
  const ownerIds = [...new Set((data ?? []).map(p => p.owner_id))];
  const { data: owners } = await supabase
    .from('owners')
    .select('id, first_name, last_name')
    .in('id', ownerIds);
  const ownerMap: Record<string, string> = {};
  for (const o of owners ?? []) ownerMap[o.id] = `${o.first_name} ${o.last_name}`;

  // Count units per property
  const { data: units } = await supabase
    .from('units')
    .select('id, property_id')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null);
  const unitCount: Record<string, number> = {};
  for (const u of units ?? []) unitCount[u.property_id] = (unitCount[u.property_id] ?? 0) + 1;

  return (data ?? []).map(p => ({
    ...p,
    owner_name: ownerMap[p.owner_id] ?? '—',
    units_count: unitCount[p.id] ?? 0,
  }));
}

const PropertiesPage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { membership } = useAuth();
  const tenantId = membership?.tenant_id ?? '';
  const { data: properties = [], isPending } = useQuery({
    queryKey: ['properties', tenantId],
    queryFn: () => fetchProperties(tenantId),
    enabled: !!tenantId,
    staleTime: 60_000,
  });

  const filtered = properties.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !q || `${p.name} ${p.city} ${p.address} ${p.owner_name}`.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const stats = {
    total: properties.length,
    active: properties.filter(p => p.status === 'active').length,
    units: properties.reduce((s, p) => s + p.units_count, 0),
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2.5">
              Propriétés
              <span className="text-sm font-normal bg-secondary border border-border text-muted-foreground px-2.5 py-0.5 rounded-full">{stats.total}</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">Gérez votre portefeuille de propriétés et leurs unités</p>
          </div>
          <button
            onClick={() => navigate('/properties/new')}
            className="flex items-center gap-2 bg-primary text-primary-foreground rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors min-h-[44px]"
          >
            <Plus className="w-4 h-4" /> Nouvelle propriété
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[
            { label: 'Total', value: stats.total, Icon: Building2, color: 'text-blue-400' },
            { label: 'Actives', value: stats.active, Icon: CheckCircle2, color: 'text-emerald-400' },
            { label: 'Unités gérées', value: stats.units, Icon: Home, color: 'text-purple-400' },
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
              placeholder="Rechercher par nom, ville, propriétaire…"
              className="w-full bg-secondary border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
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
            {filtered.map(property => (
              <button
                key={property.id}
                onClick={() => navigate(`/properties/${property.id}`)}
                className="bg-card border border-border rounded-xl p-5 text-left hover:border-primary/30 hover:bg-secondary/20 transition-colors"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="w-10 h-10 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-5 h-5 text-blue-400" />
                  </div>
                  <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium flex-shrink-0', STATUS_COLOR[property.status] ?? 'bg-secondary text-muted-foreground border-border')}>
                    {property.status}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-foreground">{property.name}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{TYPE_LABELS[property.property_type] ?? property.property_type}</p>
                <div className="mt-2 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{property.city}, {property.country}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">Propriétaire : {property.owner_name}</div>
                </div>
                <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{property.units_count} unité{property.units_count !== 1 ? 's' : ''}</span>
                  <span className="text-xs text-primary">Voir détails →</span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="bg-card border border-border border-dashed rounded-xl p-12 text-center">
            <Building2 className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Aucune propriété{search ? ` pour « ${search} »` : ''}</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default PropertiesPage;
