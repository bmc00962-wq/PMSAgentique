// ChannelDetailPage — Live Supabase data — ADR-011
// Affiche canal, statut, commission, listings, logs sync, bouton Modifier → EditChannelPage
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Globe, RefreshCw, PauseCircle, PlayCircle,
  Edit, Info, Settings, Calendar, ExternalLink, CheckCircle2,
  Clock, AlertTriangle, BarChart2,
} from 'lucide-react';
import { toast } from 'sonner';
import AppLayout from '@/components/layout/AppLayout';
import LoadingSpinner from '@/components/features/LoadingSpinner';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

const TENANT_ID = '00000000-0000-0000-0000-000000000001';

const CHANNEL_DISPLAY: Record<string, { label: string; color: string; bg: string }> = {
  airbnb:   { label: 'Airbnb',       color: 'text-rose-400',    bg: 'bg-rose-500/10 border-rose-500/20' },
  booking:  { label: 'Booking.com',  color: 'text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/20' },
  vrbo:     { label: 'Vrbo',         color: 'text-indigo-400',  bg: 'bg-indigo-500/10 border-indigo-500/20' },
  expedia:  { label: 'Expedia',      color: 'text-yellow-400',  bg: 'bg-yellow-500/10 border-yellow-500/20' },
  direct:   { label: 'Direct',       color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  ical:     { label: 'iCal',         color: 'text-purple-400',  bg: 'bg-purple-500/10 border-purple-500/20' },
  manual:   { label: 'Manuel',       color: 'text-slate-400',   bg: 'bg-slate-500/10 border-slate-500/20' },
};

const STATUS_COLOR: Record<string, string> = {
  active:        'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  inactive:      'bg-slate-500/10 text-slate-400 border-slate-500/20',
  error:         'bg-red-500/10 text-red-400 border-red-500/20',
  pending_setup: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
};

const LISTING_STATUS_COLOR: Record<string, string> = {
  live:    'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  draft:   'bg-slate-500/10 text-slate-400 border-slate-500/20',
  paused:  'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  error:   'bg-red-500/10 text-red-400 border-red-500/20',
};

async function fetchChannelDetail(id: string) {
  const { data: channel, error } = await supabase
    .from('channels')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', TENANT_ID)
    .single();
  if (error) throw error;

  const [listingsRes, syncLogsRes] = await Promise.all([
    supabase.from('channel_listings')
      .select('id, unit_id, status, title, listing_url, external_listing_id, last_exported_at')
      .eq('channel_id', id)
      .eq('tenant_id', TENANT_ID)
      .is('deleted_at', null)
      .order('created_at', { ascending: false }),
    supabase.from('sync_logs')
      .select('id, sync_type, status, records_processed, records_failed, started_at, completed_at, error_details')
      .eq('channel_id', id)
      .eq('tenant_id', TENANT_ID)
      .order('started_at', { ascending: false })
      .limit(10),
  ]);

  const listings = listingsRes.data ?? [];
  const syncLogs = syncLogsRes.data ?? [];

  // Fetch unit names for listings
  const unitIds = [...new Set(listings.map(l => l.unit_id))];
  const { data: units } = unitIds.length > 0
    ? await supabase.from('units').select('id, name').in('id', unitIds)
    : { data: [] };
  const unitMap: Record<string, string> = {};
  for (const u of units ?? []) unitMap[u.id] = u.name;

  return {
    channel,
    listings: listings.map(l => ({ ...l, unit_name: unitMap[l.unit_id] ?? '—' })),
    syncLogs,
  };
}

const ChannelDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['channel-detail', id],
    queryFn: () => fetchChannelDetail(id!),
    enabled: !!id,
    staleTime: 30_000,
  });

  const toggleStatus = useMutation({
    mutationFn: async () => {
      const ch = data!.channel;
      const newStatus = ch.status === 'active' ? 'inactive' : 'active';
      const { error } = await supabase
        .from('channels')
        .update({ status: newStatus, version: (ch.version ?? 1) + 1, updated_at: new Date().toISOString() })
        .eq('id', id!)
        .eq('tenant_id', TENANT_ID);
      if (error) throw error;
      return newStatus;
    },
    onSuccess: (ns) => {
      queryClient.invalidateQueries({ queryKey: ['channel-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['channels', TENANT_ID] });
      toast.success(ns === 'active' ? 'Canal activé ✓' : 'Canal mis en pause');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <AppLayout><div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div></AppLayout>;

  if (!data?.channel) {
    return (
      <AppLayout>
        <div className="text-center py-20">
          <p className="text-sm text-muted-foreground mb-3">Canal introuvable</p>
          <button onClick={() => navigate('/channels')} className="text-primary text-sm hover:underline">← Canaux OTA</button>
        </div>
      </AppLayout>
    );
  }

  const { channel: ch, listings, syncLogs } = data;
  const display = CHANNEL_DISPLAY[ch.channel_type] ?? CHANNEL_DISPLAY.manual;
  const isActive = ch.status === 'active';

  const totalSynced = syncLogs.reduce((s, l) => s + (l.records_processed ?? 0), 0);
  const totalFailed = syncLogs.reduce((s, l) => s + (l.records_failed ?? 0), 0);
  const lastSync = ch.last_sync_at ? new Date(ch.last_sync_at) : null;

  return (
    <AppLayout>
      <div className="space-y-6">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <button onClick={() => navigate('/channels')} className="hover:text-foreground transition-colors flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Canaux OTA
          </button>
          <span>/</span>
          <span className="text-foreground">{ch.name}</span>
        </div>

        {/* Hero */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-start gap-4 flex-wrap">
            <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 border', display.bg)}>
              <Globe className={cn('w-6 h-6', display.color)} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap mb-1">
                <h1 className="text-xl font-bold text-foreground">{ch.name}</h1>
                <span className={cn('text-xs px-2.5 py-1 rounded-full border font-medium', STATUS_COLOR[ch.status] ?? '')}>
                  {ch.status === 'active' ? 'Actif' : ch.status === 'inactive' ? 'Inactif' : ch.status === 'error' ? 'Erreur' : 'Config. en cours'}
                </span>
                <span className={cn('text-xs px-2.5 py-1 rounded-full border font-medium', display.bg, display.color)}>
                  {display.label}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Commission: {Number(ch.commission_pct).toFixed(2)}% · Sync: toutes les {ch.sync_frequency_minutes} min
                {lastSync ? ` · Dernière sync: ${lastSync.toLocaleDateString('fr-CA')}` : ''}
              </p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              {/* Edit button */}
              <button
                onClick={() => navigate(`/channels/${id}/edit`)}
                className="flex items-center gap-2 px-4 py-2.5 bg-secondary border border-border rounded-xl text-sm font-medium hover:bg-secondary/80 transition-colors min-h-[44px]">
                <Edit className="w-3.5 h-3.5" /> Modifier
              </button>
              {/* Quick toggle */}
              <button
                onClick={() => toggleStatus.mutate()}
                disabled={toggleStatus.isPending}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all min-h-[44px] disabled:opacity-50',
                  isActive
                    ? 'bg-secondary border-border text-yellow-400 hover:bg-yellow-500/10'
                    : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20',
                )}>
                {isActive ? <PauseCircle className="w-3.5 h-3.5" /> : <PlayCircle className="w-3.5 h-3.5" />}
                {isActive ? 'Désactiver' : 'Activer'}
              </button>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Listings', value: listings.length, icon: Globe, color: 'text-blue-400' },
            { label: 'Listings actifs', value: listings.filter(l => l.status === 'live').length, icon: CheckCircle2, color: 'text-emerald-400' },
            { label: 'Records synchro', value: totalSynced, icon: RefreshCw, color: 'text-purple-400' },
            { label: 'Échecs sync', value: totalFailed, icon: AlertTriangle, color: totalFailed > 0 ? 'text-red-400' : 'text-slate-400' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
              <Icon className={cn('w-4 h-4 flex-shrink-0', color)} />
              <div>
                <p className={cn('text-xl font-bold', color)}>{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Listings + Sync logs */}
          <div className="lg:col-span-2 space-y-5">

            {/* Listings */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                <Globe className="w-3.5 h-3.5" /> Listings ({listings.length})
              </h3>
              {listings.length === 0 ? (
                <div className="text-center py-8">
                  <Globe className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Aucun listing associé à ce canal</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {listings.map(listing => (
                    <div key={listing.id} className="flex items-center gap-3 p-3.5 rounded-xl bg-secondary/20 border border-border">
                      <Globe className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{listing.title ?? listing.unit_name}</p>
                        <p className="text-xs text-muted-foreground">{listing.unit_name}</p>
                        {listing.external_listing_id && (
                          <p className="text-xs text-muted-foreground/60 font-mono">ID: {listing.external_listing_id}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium',
                          LISTING_STATUS_COLOR[listing.status] ?? 'bg-secondary text-muted-foreground border-border')}>
                          {listing.status}
                        </span>
                        {listing.listing_url && (
                          <a href={listing.listing_url} target="_blank" rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-primary transition-colors">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sync logs */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                <BarChart2 className="w-3.5 h-3.5" /> Journal de synchronisation ({syncLogs.length})
              </h3>
              {syncLogs.length === 0 ? (
                <div className="text-center py-8">
                  <RefreshCw className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Aucun log de synchronisation</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {syncLogs.map(log => (
                    <div key={log.id} className={cn(
                      'flex items-center gap-3 p-3 rounded-xl border text-xs',
                      log.status === 'success' ? 'bg-emerald-500/5 border-emerald-500/15'
                        : log.status === 'failed' ? 'bg-red-500/5 border-red-500/15'
                        : 'bg-secondary/20 border-border',
                    )}>
                      {log.status === 'success'
                        ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                        : log.status === 'failed'
                        ? <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                        : <Clock className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                      }
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-foreground capitalize">{log.sync_type?.replace(/_/g, ' ')}</span>
                        <span className="text-muted-foreground ml-2">
                          {log.records_processed ?? 0} traités · {log.records_failed ?? 0} échecs
                        </span>
                        {log.error_details && (
                          <p className="text-red-400/80 mt-0.5 truncate">{JSON.stringify(log.error_details).slice(0, 80)}</p>
                        )}
                      </div>
                      <span className="text-muted-foreground/60 flex-shrink-0">
                        {new Date(log.started_at).toLocaleDateString('fr-CA', { dateStyle: 'short' })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Settings panel */}
          <div className="space-y-5">
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                <Settings className="w-3.5 h-3.5" /> Configuration
              </h3>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center py-1.5 border-b border-border/30">
                  <span className="text-muted-foreground">Type</span>
                  <span className={cn('font-medium', display.color)}>{display.label}</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-border/30">
                  <span className="text-muted-foreground">Commission</span>
                  <span className="text-orange-400 font-mono font-semibold">{Number(ch.commission_pct).toFixed(2)}%</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-border/30">
                  <span className="text-muted-foreground">Sync auto</span>
                  <span className="text-foreground">
                    {ch.sync_frequency_minutes >= 60
                      ? `${ch.sync_frequency_minutes / 60}h`
                      : `${ch.sync_frequency_minutes} min`}
                  </span>
                </div>
                {ch.last_sync_at && (
                  <div className="flex justify-between items-center py-1.5 border-b border-border/30">
                    <span className="text-muted-foreground">Dernière sync</span>
                    <span className="text-foreground">{new Date(ch.last_sync_at).toLocaleDateString('fr-CA')}</span>
                  </div>
                )}
                {ch.api_key_ref && (
                  <div className="flex justify-between items-center py-1.5 border-b border-border/30">
                    <span className="text-muted-foreground">Clé API ref</span>
                    <span className="text-foreground font-mono">{ch.api_key_ref}</span>
                  </div>
                )}
                {ch.ical_url && (
                  <div>
                    <p className="text-muted-foreground mb-1">URL iCal</p>
                    <p className="text-foreground font-mono text-xs break-all bg-secondary/30 p-2 rounded-lg">{ch.ical_url.slice(0, 50)}…</p>
                  </div>
                )}
                <div className="flex justify-between items-center py-1.5">
                  <span className="text-muted-foreground">Version</span>
                  <span className="text-foreground font-mono">{ch.version}</span>
                </div>
              </div>
            </div>

            {/* Dates */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5" /> Historique
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Créé le</span>
                  <span className="text-foreground">{new Date(ch.created_at).toLocaleDateString('fr-CA')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Mis à jour</span>
                  <span className="text-foreground">{new Date(ch.updated_at).toLocaleDateString('fr-CA')}</span>
                </div>
              </div>
            </div>

            {/* ADR note */}
            <div className="flex items-start gap-2 bg-blue-500/5 border border-blue-500/20 rounded-xl p-3">
              <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-400/80">
                <span className="font-semibold text-blue-400">ADR-011 ·</span> PMS = source de vérité.
                Import via idempotency_key. Adapter pattern par OTA. iCal = lecture seule.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default ChannelDetailPage;
