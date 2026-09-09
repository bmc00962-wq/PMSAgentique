// N8nDashboardPage — Live Supabase data — ADR-003, ADR-016
// n8n = orchestration only · jamais source de vérité · jamais DB directe
// Données réelles: integration_events + sync_logs + channels depuis Supabase
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Activity, AlertTriangle, CheckCircle2, Pause, Zap, RefreshCw,
  Play, XCircle, Clock, ChevronRight, Info, Database, Webhook,
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import LoadingSpinner from '@/components/features/LoadingSpinner';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const TENANT_ID = '00000000-0000-0000-0000-000000000001';

// ── n8n Workflow Definitions (ADR-016: 14 workflows W-00 → W-13) ─────────────
const WORKFLOW_DEFINITIONS = [
  { id: 'W-00', name: 'Health Check', desc: 'Vérification santé système toutes les 5 min', status: 'active', trigger: 'cron', domain: 'platform' },
  { id: 'W-01', name: 'Reservation Created', desc: 'Déclenche housekeeping + transport + guest onboarding', status: 'active', trigger: 'webhook', domain: 'reservation' },
  { id: 'W-02', name: 'Guest Check-in', desc: 'Génère code accès, envoie instructions arrivée', status: 'active', trigger: 'webhook', domain: 'reservation' },
  { id: 'W-03', name: 'Guest Check-out', desc: 'Déclenche ménage, libère calendrier, génère review request', status: 'active', trigger: 'webhook', domain: 'reservation' },
  { id: 'W-04', name: 'Airbnb iCal Sync', desc: 'Synchronise calendrier Airbnb toutes les 30 min', status: 'active', trigger: 'cron', domain: 'channel' },
  { id: 'W-05', name: 'Booking.com iCal Sync', desc: 'Synchronise calendrier Booking toutes les 30 min', status: 'active', trigger: 'cron', domain: 'channel' },
  { id: 'W-06', name: 'Vrbo iCal Sync', desc: 'Synchronise calendrier Vrbo toutes les 30 min', status: 'paused', trigger: 'cron', domain: 'channel' },
  { id: 'W-07', name: 'Maintenance Escalation', desc: 'Escalade tickets maintenance non résolus après 24h', status: 'active', trigger: 'cron', domain: 'maintenance' },
  { id: 'W-08', name: 'Owner Statement', desc: 'Génère relevés propriétaires le 1er du mois', status: 'active', trigger: 'cron', domain: 'finance' },
  { id: 'W-09', name: 'Auto Housekeeping Job', desc: 'Crée checkout_clean auto sur checkout confirmé', status: 'active', trigger: 'webhook', domain: 'housekeeping' },
  { id: 'W-10', name: 'Flight Tracker', desc: 'Suivi vols en temps réel, met à jour transport (adjusted_at non-destructif)', status: 'active', trigger: 'cron', domain: 'transport' },
  { id: 'W-11', name: 'Finance Reconciliation', desc: 'Réconciliation grand livre mensuelle', status: 'active', trigger: 'cron', domain: 'finance' },
  { id: 'W-12', name: 'RGPD Anonymization', desc: 'Anonymise données voyageurs après 3 ans inactivité', status: 'active', trigger: 'cron', domain: 'compliance' },
  { id: 'W-13', name: 'Agent Action Executor', desc: 'Exécute actions approuvées par agents IA (W-13 suspendu → approbation validée)', status: 'paused', trigger: 'webhook', domain: 'agents' },
];

const DOMAIN_COLORS: Record<string, string> = {
  platform: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  reservation: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  channel: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  maintenance: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  finance: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  housekeeping: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  transport: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  compliance: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  agents: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
};

const EVENT_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  processing: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  succeeded: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  failed: 'bg-red-500/10 text-red-400 border-red-500/20',
};

type Tab = 'workflows' | 'events' | 'sync_logs' | 'channels';

// ── Data Fetchers ─────────────────────────────────────────────────────────────
async function fetchN8nData() {
  const [eventsRes, syncLogsRes, channelsRes] = await Promise.all([
    supabase.from('integration_events')
      .select('id, event_type, source, status, attempt_count, error_details, idempotency_key, created_at, processed_at')
      .eq('tenant_id', TENANT_ID)
      .order('created_at', { ascending: false })
      .limit(30),
    supabase.from('sync_logs')
      .select('id, channel_id, sync_type, status, records_processed, records_failed, error_details, started_at, completed_at')
      .eq('tenant_id', TENANT_ID)
      .order('started_at', { ascending: false })
      .limit(20),
    supabase.from('channels')
      .select('id, name, channel_type, status, last_sync_at, sync_frequency_minutes, commission_pct')
      .eq('tenant_id', TENANT_ID)
      .is('deleted_at', null),
  ]);

  return {
    events: eventsRes.data ?? [],
    syncLogs: syncLogsRes.data ?? [],
    channels: channelsRes.data ?? [],
  };
}

const N8nDashboardPage = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('workflows');
  const [wfFilter, setWfFilter] = useState<'all' | 'active' | 'paused'>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['n8n-dashboard', TENANT_ID],
    queryFn: fetchN8nData,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  // Replay a failed event by setting status back to pending
  const replayEvent = useMutation({
    mutationFn: async (eventId: string) => {
      const { error } = await supabase.from('integration_events')
        .update({ status: 'pending', attempt_count: 0, error_details: null, processed_at: null })
        .eq('id', eventId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['n8n-dashboard', TENANT_ID] });
      toast.success('Événement remis en file pending — n8n retraitera au prochain poll');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filteredWorkflows = wfFilter === 'all'
    ? WORKFLOW_DEFINITIONS
    : WORKFLOW_DEFINITIONS.filter(w => w.status === wfFilter);

  const wfStats = {
    active: WORKFLOW_DEFINITIONS.filter(w => w.status === 'active').length,
    paused: WORKFLOW_DEFINITIONS.filter(w => w.status === 'paused').length,
  };

  const eventStats = {
    pending: data?.events.filter(e => e.status === 'pending').length ?? 0,
    processing: data?.events.filter(e => e.status === 'processing').length ?? 0,
    succeeded: data?.events.filter(e => e.status === 'succeeded').length ?? 0,
    failed: data?.events.filter(e => e.status === 'failed').length ?? 0,
  };

  const TABS: { id: Tab; label: string; badge?: number }[] = [
    { id: 'workflows', label: 'Workflows', badge: WORKFLOW_DEFINITIONS.length },
    { id: 'events', label: 'Événements', badge: data?.events.length },
    { id: 'sync_logs', label: 'Sync Logs', badge: data?.syncLogs.length },
    { id: 'channels', label: 'Canaux', badge: data?.channels.length },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2.5">
              <Activity className="w-5 h-5 text-primary" />
              Intégration n8n
              <span className="text-xs px-2 py-0.5 rounded-full border font-medium bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                Connecté
              </span>
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              14 workflows W-00→W-13 · ADR-003/016 · n8n = orchestration uniquement, jamais source de vérité · Polling 30s
            </p>
          </div>
          <button
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ['n8n-dashboard', TENANT_ID] });
              toast.info('Données actualisées');
            }}
            className="flex items-center gap-1.5 text-xs border border-border bg-secondary rounded-xl px-3 py-2.5 hover:border-primary/30 transition-colors min-h-[44px]">
            <RefreshCw className="w-3.5 h-3.5" /> Actualiser (30s)
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Workflows actifs', value: wfStats.active, Icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
            { label: 'En pause', value: wfStats.paused, Icon: Pause, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
            { label: 'Événements failed', value: eventStats.failed, Icon: AlertTriangle, color: eventStats.failed > 0 ? 'text-red-400' : 'text-slate-400', bg: eventStats.failed > 0 ? 'bg-red-500/10' : 'bg-secondary' },
            { label: 'Événements succeeds', value: eventStats.succeeded, Icon: Zap, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          ].map(({ label, value, Icon, color, bg }) => (
            <div key={label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
              <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', bg)}>
                <Icon className={cn('w-4 h-4', color)} />
              </div>
              <div>
                <p className={cn('text-2xl font-bold', color)}>{value ?? '—'}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
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
              {tab.badge !== undefined && (
                <span className={cn('text-xs px-1.5 py-0.5 rounded-full', activeTab === tab.id ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground')}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Workflows tab ── */}
        {activeTab === 'workflows' && (
          <div className="space-y-4">
            <div className="flex gap-2">
              {(['all', 'active', 'paused'] as const).map(f => (
                <button key={f} onClick={() => setWfFilter(f)}
                  className={cn('text-xs px-3 py-1.5 rounded-xl border transition-colors min-h-[36px]',
                    wfFilter === f ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:text-foreground')}>
                  {f === 'all' ? `Tous (${WORKFLOW_DEFINITIONS.length})` : f === 'active' ? `Actifs (${wfStats.active})` : `En pause (${wfStats.paused})`}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredWorkflows.map(wf => (
                <div key={wf.id} className={cn('bg-card border rounded-xl p-5',
                  wf.status === 'active' ? 'border-border' : 'border-border/50 opacity-75'
                )}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                        wf.status === 'active' ? 'bg-emerald-500/10' : 'bg-secondary'
                      )}>
                        {wf.status === 'active'
                          ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          : <Pause className="w-4 h-4 text-yellow-400" />
                        }
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-primary">{wf.id}</span>
                          <span className={cn('text-xs px-1.5 py-0.5 rounded-full border', DOMAIN_COLORS[wf.domain] ?? DOMAIN_COLORS.platform)}>
                            {wf.domain}
                          </span>
                        </div>
                        <h3 className="text-sm font-semibold text-foreground mt-0.5">{wf.name}</h3>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium',
                        wf.trigger === 'webhook' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                      )}>
                        {wf.trigger === 'webhook' ? '⚡ webhook' : '⏰ cron'}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">{wf.desc}</p>
                  {wf.id === 'W-13' && (
                    <div className="mt-3 bg-amber-500/5 border border-amber-500/20 rounded-lg p-2.5 flex items-center gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                      <span className="text-xs text-amber-400">ADR-016 · W-13 suspendu — requiert système d'approbation validé</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Integration Events tab ── */}
        {activeTab === 'events' && (
          isLoading ? (
            <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
          ) : (
            <div className="space-y-4">
              {/* Event stats row */}
              <div className="flex flex-wrap gap-2">
                {Object.entries(eventStats).map(([status, count]) => (
                  <span key={status} className={cn('text-xs px-3 py-1.5 rounded-full border font-medium', EVENT_STATUS_COLORS[status] ?? 'bg-secondary text-muted-foreground border-border')}>
                    {status} ({count})
                  </span>
                ))}
              </div>

              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-secondary/30">
                        {['Type', 'Source', 'Statut', 'Tentatives', 'Idempotency', 'Créé', 'Action'].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-muted-foreground font-medium whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data?.events.map(ev => (
                        <tr key={ev.id} className="border-b border-border/40 last:border-0 hover:bg-secondary/20 transition-colors">
                          <td className="px-4 py-3 font-mono text-foreground truncate max-w-32">{ev.event_type}</td>
                          <td className="px-4 py-3 text-muted-foreground">{ev.source}</td>
                          <td className="px-4 py-3">
                            <span className={cn('px-2 py-0.5 rounded-full border font-medium', EVENT_STATUS_COLORS[ev.status] ?? 'bg-secondary text-muted-foreground border-border')}>
                              {ev.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground text-center">{ev.attempt_count}</td>
                          <td className="px-4 py-3 font-mono text-muted-foreground/60 text-xs truncate max-w-24" title={ev.idempotency_key ?? ''}>
                            {ev.idempotency_key ? ev.idempotency_key.slice(0, 10) + '…' : '—'}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                            {new Date(ev.created_at).toLocaleString('fr-CA', { dateStyle: 'short', timeStyle: 'short' })}
                          </td>
                          <td className="px-4 py-3">
                            {ev.status === 'failed' && (
                              <button
                                onClick={() => replayEvent.mutate(ev.id)}
                                disabled={replayEvent.isPending}
                                className="flex items-center gap-1 text-xs px-2 py-1 border border-blue-500/25 text-blue-400 rounded-lg hover:bg-blue-500/10 transition-colors min-h-[32px] disabled:opacity-50">
                                <Play className="w-3 h-3" /> Rejouer
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {(data?.events.length ?? 0) === 0 && (
                        <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">Aucun événement d'intégration enregistré</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )
        )}

        {/* ── Sync Logs tab ── */}
        {activeTab === 'sync_logs' && (
          isLoading ? (
            <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-secondary/30">
                      {['Canal', 'Type sync', 'Statut', 'Traités', 'Échoués', 'Durée', 'Démarré'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-muted-foreground font-medium whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data?.syncLogs.map(log => {
                      const ch = data.channels.find(c => c.id === log.channel_id);
                      const duration = log.completed_at
                        ? Math.round((new Date(log.completed_at).getTime() - new Date(log.started_at).getTime()) / 1000)
                        : null;
                      return (
                        <tr key={log.id} className="border-b border-border/40 last:border-0 hover:bg-secondary/20 transition-colors">
                          <td className="px-4 py-3 text-foreground font-medium">{ch?.name ?? <span className="text-muted-foreground/50 font-mono text-xs">{log.channel_id.slice(0, 8)}…</span>}</td>
                          <td className="px-4 py-3 font-mono text-muted-foreground">{log.sync_type}</td>
                          <td className="px-4 py-3">
                            <span className={cn('px-2 py-0.5 rounded-full border font-medium',
                              log.status === 'success' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                log.status === 'failed' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                  'bg-blue-500/10 text-blue-400 border-blue-500/20'
                            )}>{log.status}</span>
                          </td>
                          <td className="px-4 py-3 text-emerald-400 font-medium">{log.records_processed}</td>
                          <td className="px-4 py-3">
                            {log.records_failed > 0
                              ? <span className="text-red-400 font-medium">{log.records_failed}</span>
                              : <span className="text-muted-foreground">0</span>
                            }
                          </td>
                          <td className="px-4 py-3 text-muted-foreground font-mono">{duration != null ? `${duration}s` : '…'}</td>
                          <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                            {new Date(log.started_at).toLocaleString('fr-CA', { dateStyle: 'short', timeStyle: 'short' })}
                          </td>
                        </tr>
                      );
                    })}
                    {(data?.syncLogs.length ?? 0) === 0 && (
                      <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">Aucun sync log enregistré</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )
        )}

        {/* ── Channels tab ── */}
        {activeTab === 'channels' && (
          isLoading ? (
            <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data?.channels.map(ch => (
                <div key={ch.id} className={cn('bg-card border rounded-xl p-5',
                  ch.status === 'active' ? 'border-emerald-500/25' : 'border-border'
                )}>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{ch.name}</h3>
                      <p className="text-xs text-muted-foreground">{ch.channel_type}</p>
                    </div>
                    <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium flex-shrink-0',
                      ch.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        ch.status === 'inactive' ? 'bg-slate-500/10 text-slate-400 border-slate-500/20' :
                          'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                    )}>{ch.status}</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Commission</span>
                      <span className="text-foreground font-medium">{Number(ch.commission_pct).toFixed(1)}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Sync toutes les</span>
                      <span className="text-foreground font-medium">{ch.sync_frequency_minutes} min</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Dernier sync</span>
                      <span className="text-foreground">
                        {ch.last_sync_at ? new Date(ch.last_sync_at).toLocaleDateString('fr-CA') : '—'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {(data?.channels.length ?? 0) === 0 && (
                <div className="col-span-3 bg-card border border-dashed border-border rounded-xl p-12 text-center">
                  <Database className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Aucun canal configuré</p>
                </div>
              )}
            </div>
          )
        )}

        {/* ADR note */}
        <div className="bg-secondary/30 border border-border/50 rounded-xl p-4 text-xs text-muted-foreground flex items-start gap-2">
          <Info className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
          <span>
            <span className="text-orange-400 font-mono font-semibold">ADR-016 FROZEN</span> — n8n appelle exclusivement des Edge Functions PMS sécurisées ·
            jamais accès DB direct · jamais source de vérité · Retry exponentiel (1min→5min→30min→1h→abandon) ·
            HMAC-SHA256 webhooks · integration_events idempotent · W-13 suspendu ·
            Polling 30s · Rejouer événements failed via mutation Supabase.
          </span>
        </div>
      </div>
    </AppLayout>
  );
};

export default N8nDashboardPage;
