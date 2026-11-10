// AgentsPage — Live Supabase data — ADR-017, ADR-019, ADR-020
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bot, Shield, Clock, Zap, CircleCheck as CheckCircle2, TriangleAlert as AlertTriangle, RefreshCw, Play, Circle as XCircle, ChevronRight, Info, Activity, Lock } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import LoadingSpinner from '@/components/features/LoadingSpinner';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const TENANT_ID = '00000000-0000-0000-0000-000000000001';

type Tab = 'runs' | 'approvals' | 'definitions';

// ── Agent Definitions (ADR-019: 9 specialized agents) ──────────────────────
const AGENT_DEFINITIONS = [
  {
    id: 'guest-agent', name: 'Guest Agent', emoji: '🧳',
    description: 'Gestion des voyageurs, check-in/out, communications automatisées',
    tools: ['guest.lookup', 'reservation.read', 'message.send_draft', 'lock.generate_code'],
    color: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    dot: 'bg-blue-400',
  },
  {
    id: 'housekeeping-agent', name: 'Housekeeping Agent', emoji: '🧹',
    description: 'Planification ménage, attribution des tâches, suivi des jobs',
    tools: ['housekeeping.create_job', 'housekeeping.assign', 'unit.read', 'reservation.read'],
    color: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    dot: 'bg-emerald-400',
  },
  {
    id: 'transport-agent', name: 'Transport Agent', emoji: '🚗',
    description: 'Suivi des vols, coordination chauffeurs, notifications',
    tools: ['transport.create_trip', 'transport.assign_driver', 'flight.lookup', 'driver.notify'],
    color: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
    dot: 'bg-purple-400',
  },
  {
    id: 'maintenance-agent', name: 'Maintenance Agent', emoji: '🔧',
    description: 'Gestion des tickets, escalade, coordination techniciens',
    tools: ['maintenance.create_ticket', 'maintenance.assign', 'approval.request', 'vendor.lookup'],
    color: 'bg-orange-500/10 border-orange-500/20 text-orange-400',
    dot: 'bg-orange-400',
  },
  {
    id: 'owner-agent', name: 'Owner Agent', emoji: '🏠',
    description: 'Rapports propriétaires, relevés financiers, communications',
    tools: ['owner.statement.generate', 'owner.message.send_draft', 'finance.read'],
    color: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400',
    dot: 'bg-cyan-400',
  },
  {
    id: 'revenue-agent', name: 'Revenue Agent', emoji: '📈',
    description: 'Optimisation des tarifs, analyse des canaux, recommandations',
    tools: ['rate.read', 'rate.suggest', 'channel.read', 'calendar.availability.read'],
    color: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
    dot: 'bg-yellow-400',
  },
  {
    id: 'finance-agent', name: 'Finance Agent', emoji: '💰',
    description: 'Écritures comptables, validation paiements, génération états financiers',
    tools: ['ledger.read', 'payment.read', 'approval.request_refund'],
    color: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
    dot: 'bg-rose-400',
    restricted: true,
  },
  {
    id: 'compliance-agent', name: 'Compliance Agent', emoji: '⚖️',
    description: 'RGPD, anonymisation données, audit trails, rapports conformité',
    tools: ['audit.read', 'guest.anonymize', 'report.compliance.generate'],
    color: 'bg-slate-500/10 border-slate-500/20 text-slate-400',
    dot: 'bg-slate-400',
  },
  {
    id: 'incident-agent', name: 'Incident Agent', emoji: '🚨',
    description: 'Détection anomalies, escalade incidents, coordination urgences',
    tools: ['alert.create', 'approval.request_override', 'notification.send_urgent'],
    color: 'bg-red-500/10 border-red-500/20 text-red-400',
    dot: 'bg-red-400',
    restricted: true,
  },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  running: { label: 'En cours', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: Activity },
  completed: { label: 'Terminé', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: CheckCircle2 },
  failed: { label: 'Échec', color: 'bg-red-500/10 text-red-400 border-red-500/20', icon: XCircle },
  awaiting_approval: { label: 'Approbation requise', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', icon: Clock },
  cancelled: { label: 'Annulé', color: 'bg-slate-500/10 text-slate-400 border-slate-500/20', icon: XCircle },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  critical: { label: 'Critique', color: 'text-red-400' },
  high: { label: 'Élevé', color: 'text-orange-400' },
  normal: { label: 'Normal', color: 'text-blue-400' },
  low: { label: 'Faible', color: 'text-slate-400' },
};

// ── Data Fetchers ─────────────────────────────────────────────────────────────
async function fetchAgentRuns() {
  const { data, error } = await supabase
    .from('agent_runs')
    .select('id, agent_id, agent_name, trigger_event, status, tools_called, output_payload, error_message, risk_score, prompt_guard_flags, started_at, completed_at, duration_ms, audit_trail, approval_request_id')
    .eq('tenant_id', TENANT_ID)
    .order('started_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}

async function fetchPendingApprovals() {
  const { data, error } = await supabase
    .from('approval_requests')
    .select('id, scenario, title, description, priority, status, approval_type, required_approvers, current_approvers, entity_type, entity_id, requested_action, deadline, created_at, agent_run_id')
    .eq('tenant_id', TENANT_ID)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

const AgentsPage = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('runs');

  const { data: agentRuns = [], isLoading: runsLoading } = useQuery({
    queryKey: ['agent-runs', TENANT_ID],
    queryFn: fetchAgentRuns,
    staleTime: 15_000,
    refetchInterval: 15_000,
  });

  const { data: pendingApprovals = [], isLoading: approvalsLoading } = useQuery({
    queryKey: ['approvals-pending', TENANT_ID],
    queryFn: fetchPendingApprovals,
    staleTime: 10_000,
    refetchInterval: 10_000,
  });

  const approveRequest = useMutation({
    mutationFn: async ({ id, decision }: { id: string; decision: 'approved' | 'rejected' }) => {
      const { error: decErr } = await supabase.from('approval_decisions').insert({
        tenant_id: TENANT_ID,
        approval_request_id: id,
        decision,
        comment: `${decision === 'approved' ? 'Approuvé' : 'Rejeté'} via AgentsPage`,
      });
      if (decErr) throw decErr;

      const { error: updateErr } = await supabase.from('approval_requests').update({
        status: decision === 'approved' ? 'approved' : 'rejected',
        resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', id);
      if (updateErr) throw updateErr;
    },
    onSuccess: (_, { decision }) => {
      queryClient.invalidateQueries({ queryKey: ['approvals-pending', TENANT_ID] });
      queryClient.invalidateQueries({ queryKey: ['agent-runs', TENANT_ID] });
      toast.success(decision === 'approved' ? 'Action approuvée — W-13 en file' : 'Action rejetée');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Stats
  const running = agentRuns.filter(r => r.status === 'running').length;
  const awaitingApproval = agentRuns.filter(r => r.status === 'awaiting_approval').length;
  const completedToday = agentRuns.filter(r => {
    const started = new Date(r.started_at);
    const today = new Date();
    return r.status === 'completed' && started.toDateString() === today.toDateString();
  }).length;

  const tabs: { id: Tab; label: string; badge?: number }[] = [
    { id: 'runs', label: 'Exécutions', badge: agentRuns.length },
    { id: 'approvals', label: 'Approbations', badge: pendingApprovals.length },
    { id: 'definitions', label: '9 Agents', badge: AGENT_DEFINITIONS.length },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2.5">
              <Bot className="w-5 h-5 text-primary" />
              Agents IA
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              9 agents spécialisés · ADR-017/019/020 · Tool Registry · Approbation humaine obligatoire
            </p>
          </div>
          <button
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ['agent-runs', TENANT_ID] });
              queryClient.invalidateQueries({ queryKey: ['approvals-pending', TENANT_ID] });
              toast.info('Données actualisées');
            }}
            className="flex items-center gap-2 text-xs border border-border bg-secondary rounded-xl px-3 py-2.5 hover:border-primary/30 transition-colors min-h-[44px]">
            <RefreshCw className="w-3.5 h-3.5" /> Actualiser (15s)
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'En cours', value: running, color: 'text-blue-400', bg: 'bg-blue-500/10', icon: Activity },
            { label: 'Approbations', value: pendingApprovals.length, color: 'text-amber-400', bg: 'bg-amber-500/10', icon: Clock },
            { label: 'Terminés (aujourd\'hui)', value: completedToday, color: 'text-emerald-400', bg: 'bg-emerald-500/10', icon: CheckCircle2 },
            { label: 'En attente approbation', value: awaitingApproval, color: 'text-orange-400', bg: 'bg-orange-500/10', icon: Shield },
          ].map(({ label, value, color, bg, icon: Icon }) => (
            <div key={label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
              <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', bg)}>
                <Icon className={cn('w-4 h-4', color)} />
              </div>
              <div>
                <p className={cn('text-2xl font-bold', color)}>{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Security banner */}
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
          <Shield className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            <span className="text-amber-400 font-semibold">ADR-017/019/020 FROZEN</span> —
            Event → Orchestrator → PromptGuard (12 patterns) → PolicyEngine (8 règles) → ToolRegistry (49 outils) → EdgeFn → PostgreSQL.
            Aucun agent n'accède directement à la DB. LLM interdit pour calculs financiers (ADR-015).
            Messages jamais auto-envoyés (ADR-012). Audit trail immuable sur chaque run.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-secondary/40 border border-border rounded-xl p-1 w-fit">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={cn('flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-colors min-h-[36px]',
                activeTab === tab.id ? 'bg-card text-foreground shadow-sm border border-border' : 'text-muted-foreground hover:text-foreground'
              )}>
              {tab.label}
              {tab.badge !== undefined && (
                <span className={cn('text-xs px-1.5 py-0.5 rounded-full',
                  activeTab === tab.id ? 'bg-primary/20 text-primary' : 'bg-secondary/80 text-muted-foreground'
                )}>{tab.badge}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── Runs tab ── */}
        {activeTab === 'runs' && (
          runsLoading ? (
            <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
          ) : agentRuns.length === 0 ? (
            <div className="bg-card border border-border border-dashed rounded-xl p-16 text-center">
              <Bot className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Aucune exécution agent enregistrée</p>
              <p className="text-xs text-muted-foreground/50 mt-1">Les runs apparaissent ici lors du déclenchement d'un agent</p>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-secondary/30">
                      {['Agent', 'Déclencheur', 'Statut', 'Risque', 'Outils', 'Durée', 'Démarré', ''].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-muted-foreground font-medium whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {agentRuns.map(run => {
                      const statusCfg = STATUS_CONFIG[run.status] ?? STATUS_CONFIG.completed;
                      const StatusIcon = statusCfg.icon;
                      const tools = Array.isArray(run.tools_called) ? run.tools_called : [];
                      const flags = Array.isArray(run.prompt_guard_flags) ? run.prompt_guard_flags : [];
                      const agentDef = AGENT_DEFINITIONS.find(a => a.id === run.agent_id);

                      return (
                        <tr key={run.id} className="border-b border-border/40 last:border-0 hover:bg-secondary/20 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="text-base">{agentDef?.emoji ?? '🤖'}</span>
                              <div>
                                <p className="font-semibold text-foreground">{run.agent_name}</p>
                                <p className="text-muted-foreground/60 font-mono text-xs">{run.agent_id}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground max-w-32 truncate">{run.trigger_event}</td>
                          <td className="px-4 py-3">
                            <span className={cn('flex items-center gap-1 px-2 py-0.5 rounded-full border font-medium w-fit', statusCfg.color)}>
                              <StatusIcon className="w-3 h-3" />
                              {statusCfg.label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {run.risk_score != null ? (
                              <span className={cn('font-bold', run.risk_score >= 80 ? 'text-red-400' : run.risk_score >= 50 ? 'text-orange-400' : 'text-emerald-400')}>
                                {run.risk_score}
                              </span>
                            ) : (
                              <span className="text-muted-foreground/40">—</span>
                            )}
                            {flags.length > 0 && (
                              <span className="ml-1 text-red-400" title={`${flags.length} flag(s) Prompt Guard`}>⚠</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="bg-secondary border border-border px-2 py-0.5 rounded-full">{tools.length} outil{tools.length !== 1 ? 's' : ''}</span>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground font-mono">
                            {run.duration_ms != null ? `${run.duration_ms}ms` : run.status === 'running' ? '…' : '—'}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                            {new Date(run.started_at).toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </td>
                          <td className="px-4 py-3">
                            {run.error_message && (
                              <span className="text-red-400 text-xs truncate max-w-20 block" title={run.error_message}>⚠ Err</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )
        )}

        {/* ── Approvals tab ── */}
        {activeTab === 'approvals' && (
          approvalsLoading ? (
            <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
          ) : pendingApprovals.length === 0 ? (
            <div className="bg-card border border-border border-dashed rounded-xl p-16 text-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-400/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Aucune approbation en attente</p>
              <p className="text-xs text-muted-foreground/50 mt-1">Toutes les actions agents sont approuvées ou complétées</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {pendingApprovals.map(ap => {
                const pCfg = PRIORITY_CONFIG[ap.priority] ?? PRIORITY_CONFIG.normal;
                const isDeadlineSoon = ap.deadline && new Date(ap.deadline) < new Date(Date.now() + 3_600_000);
                return (
                  <div key={ap.id} className={cn('bg-card border rounded-xl p-5',
                    ap.priority === 'critical' ? 'border-red-500/30' : ap.priority === 'high' ? 'border-orange-500/30' : 'border-border'
                  )}>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <AlertTriangle className={cn('w-4 h-4 flex-shrink-0', pCfg.color)} />
                          <span className={cn('text-xs font-semibold', pCfg.color)}>{pCfg.label}</span>
                          <span className="text-xs text-muted-foreground/60">· {ap.approval_type}</span>
                        </div>
                        <h3 className="text-sm font-semibold text-foreground">{ap.title}</h3>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{ap.description}</p>
                      </div>
                    </div>

                    {ap.deadline && (
                      <div className={cn('flex items-center gap-1.5 text-xs mb-3', isDeadlineSoon ? 'text-red-400' : 'text-muted-foreground')}>
                        <Clock className="w-3 h-3" />
                        Expiration : {new Date(ap.deadline).toLocaleString('fr-CA', { dateStyle: 'short', timeStyle: 'short' })}
                        {isDeadlineSoon && ' (urgent)'}
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-3 border-t border-border">
                      <button
                        onClick={() => approveRequest.mutate({ id: ap.id, decision: 'approved' })}
                        disabled={approveRequest.isPending}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 rounded-xl text-xs font-semibold hover:bg-emerald-500/20 transition-colors min-h-[44px] disabled:opacity-50">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Approuver
                      </button>
                      <button
                        onClick={() => approveRequest.mutate({ id: ap.id, decision: 'rejected' })}
                        disabled={approveRequest.isPending}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-red-500/10 border border-red-500/25 text-red-400 rounded-xl text-xs font-semibold hover:bg-red-500/20 transition-colors min-h-[44px] disabled:opacity-50">
                        <XCircle className="w-3.5 h-3.5" /> Rejeter
                      </button>
                    </div>

                    <div className="mt-2 text-xs text-muted-foreground/50 font-mono">
                      {ap.scenario} · {new Date(ap.created_at).toLocaleDateString('fr-CA')}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* ── Agent Definitions tab ── */}
        {activeTab === 'definitions' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {AGENT_DEFINITIONS.map(agent => (
              <div key={agent.id} className={cn('bg-card border rounded-xl p-5', agent.color.includes('border') ? agent.color.split(' ').find(c => c.startsWith('border'))! : 'border-border')}>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{agent.emoji}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-foreground">{agent.name}</h3>
                        {agent.restricted && (
                          <span title="Approbation obligatoire"><Lock className="w-3 h-3 text-rose-400" /></span>
                        )}
                      </div>
                      <p className="text-xs font-mono text-muted-foreground/60">{agent.id}</p>
                    </div>
                  </div>
                  <div className={cn('w-2 h-2 rounded-full mt-2 flex-shrink-0', agent.dot)} />
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed mb-3">{agent.description}</p>
                <div className="flex flex-wrap gap-1">
                  {agent.tools.map(tool => (
                    <span key={tool} className="text-xs bg-secondary border border-border text-muted-foreground px-2 py-0.5 rounded-md font-mono">
                      {tool}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ADR footer */}
        <div className="bg-secondary/30 border border-border/50 rounded-xl p-4 text-xs text-muted-foreground flex items-start gap-2">
          <Info className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
          <span>
            <span className="text-orange-400 font-mono font-semibold">ADR-019 FROZEN</span> — 49 outils · 11 domaines · RÈGLE-ORC-001→008 ·
            Zéro DB direct · PromptGuard 12 patterns INJ · Audit trail immuable · tenant_id JWT uniquement ·
            Polling 15s · agent_runs append-only
          </span>
        </div>
      </div>
    </AppLayout>
  );
};

export default AgentsPage;
