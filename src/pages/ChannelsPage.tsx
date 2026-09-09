// ChannelsPage — Live Supabase data — ADR-011
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Globe, Plus, Search, AlertTriangle, CheckCircle2, Wifi, RefreshCw } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import LoadingSpinner from '@/components/features/LoadingSpinner';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

const TENANT_ID = '00000000-0000-0000-0000-000000000001';

const CHANNEL_TYPE_LABELS: Record<string, string> = {
  airbnb: 'Airbnb', booking_com: 'Booking.com', vrbo: 'Vrbo',
  ical: 'iCal', direct: 'Direct', other: 'Autre',
};

const CHANNEL_ICON_COLOR: Record<string, string> = {
  airbnb: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
  booking_com: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  vrbo: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  ical: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  direct: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  other: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
};

const STATUS_COLOR: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  inactive: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  error: 'bg-red-500/10 text-red-400 border-red-500/20',
  syncing: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
};

async function fetchChannels() {
  const { data, error } = await supabase
    .from('channels')
    .select('id, name, channel_type, status, commission_pct, last_sync_at, sync_frequency_minutes, settings, created_at')
    .eq('tenant_id', TENANT_ID)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });
  if (error) throw error;

  // Count listings per channel
  const { data: listings } = await supabase
    .from('channel_listings')
    .select('id, channel_id, status')
    .eq('tenant_id', TENANT_ID)
    .is('deleted_at', null);

  const listingCount: Record<string, number> = {};
  for (const l of listings ?? []) {
    listingCount[l.channel_id] = (listingCount[l.channel_id] ?? 0) + 1;
  }

  return (data ?? []).map(c => ({ ...c, listings_count: listingCount[c.id] ?? 0 }));
}

const ChannelsPage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatus] = useState('all');

  const { data: channels = [], isLoading, refetch } = useQuery({
    queryKey: ['channels', TENANT_ID],
    queryFn: fetchChannels,
    staleTime: 60_000,
  });

  const filtered = channels.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = !q || c.name.toLowerCase().includes(q) || c.channel_type.includes(q);
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const stats = {
    total: channels.length,
    active: channels.filter(c => c.status === 'active').length,
    errors: channels.filter(c => c.status === 'error').length,
    listings: channels.reduce((s, c) => s + c.listings_count, 0),
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2.5">
              <Globe className="w-5 h-5 text-primary" />
              Canaux OTA
              <span className="text-sm font-normal text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">{stats.total}</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">Airbnb, Booking.com, Vrbo, iCal — synchronisation bidirectionnelle</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => refetch()}
              className="flex items-center gap-2 border border-border bg-secondary rounded-xl px-3 py-2.5 text-xs font-medium hover:border-primary/30 transition-colors min-h-[44px]">
              <RefreshCw className="w-3.5 h-3.5" /> Sync
            </button>
            <button onClick={() => navigate('/channels/new')}
              className="flex items-center gap-2 bg-primary text-primary-foreground rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors min-h-[44px]">
              <Plus className="w-4 h-4" /> Connecter un canal
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Connexions', value: stats.total, color: 'text-blue-400', icon: Globe },
            { label: 'Actives', value: stats.active, color: 'text-emerald-400', icon: CheckCircle2 },
            { label: 'En erreur', value: stats.errors, color: 'text-red-400', icon: AlertTriangle },
            { label: 'Listings', value: stats.listings, color: 'text-purple-400', icon: Wifi },
          ].map(({ label, value, color, icon: Icon }) => (
            <div key={label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
              <Icon className={cn('w-5 h-5 flex-shrink-0', color)} />
              <div>
                <div className={cn('text-2xl font-bold', color)}>{value}</div>
                <div className="text-xs text-muted-foreground">{label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Nom ou type…"
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <select value={statusFilter} onChange={e => setStatus(e.target.value)}
            className="text-xs bg-card border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary min-h-[36px]">
            <option value="all">Tous statuts</option>
            {['active','inactive','error','syncing'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <span className="text-xs text-muted-foreground ml-auto">{filtered.length} résultat{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
        ) : filtered.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-12 text-center">
            <Wifi className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Aucun canal connecté</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(c => (
              <button
                key={c.id}
                onClick={() => navigate(`/channels/${c.id}`)}
                className="bg-card border border-border rounded-xl p-5 text-left hover:border-primary/30 hover:bg-secondary/20 transition-colors"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border', CHANNEL_ICON_COLOR[c.channel_type] ?? 'bg-secondary border-border')}>
                    <Globe className="w-5 h-5" />
                  </div>
                  <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium flex-shrink-0', STATUS_COLOR[c.status] ?? 'bg-secondary text-muted-foreground border-border')}>
                    {c.status}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-foreground">{c.name}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{CHANNEL_TYPE_LABELS[c.channel_type] ?? c.channel_type}</p>
                <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                  <span>{c.listings_count} listing{c.listings_count !== 1 ? 's' : ''}</span>
                  <span>{c.commission_pct}% commission</span>
                </div>
                {c.last_sync_at && (
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    Sync : {new Date(c.last_sync_at).toLocaleDateString('fr-CA')}
                  </p>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default ChannelsPage;
