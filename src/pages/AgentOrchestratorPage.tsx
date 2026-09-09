// AgentOrchestratorPage — Live Supabase data for Runs tab — ADR-019
// Architecture, Agents, Tools, Security tabs: static definitions (ADR-frozen)
// Runs tab: real agent_runs from Supabase with polling 15s
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bot, Shield, Database, Network, Lock, CheckCircle2,
  Clock, AlertTriangle, ArrowRight, Activity, RefreshCw, XCircle,
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import OrchestratorView from '@/components/features/agents/OrchestratorView';
import ToolRegistryPanel from '@/components/features/agents/ToolRegistryPanel';
import { AGENT_DEFINITIONS, RUN_STATUS_CONFIG } from '@/lib/agentDefinitions';
import { TOOL_REGISTRY } from '@/lib/toolRegistry';
import { CROSS_TENANT_TESTS } from '@/lib/promptGuard';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

const TENANT_ID = '00000000-0000-0000-0000-000000000001';

type Tab = 'architecture' | 'agents' | 'tools' | 'security' | 'runs';

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'architecture', label: 'Architecture', icon: Network },
  { id: 'agents', label: '9 Agents', icon: Bot },
  { id: 'tools', label: `Tools (${TOOL_REGISTRY.length})`, icon: Database },
  { id: 'security', label: 'Sécurité', icon: Shield },
  { id: 'runs', label: 'Runs live', icon: Activity },
];

const AUTONOMY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  approval_only: { label: 'Approbation', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
  supervised: { label: 'Supervisé', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
  full: { label: 'Autonome', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
};

const POLICY_RULES = [
  { id: 'RULE-POL-001', desc: 'Tool not in registry → deny', type: 'deny' },
  { id: 'RULE-POL-002', desc: 'Cross-tenant input detected → deny (RÈGLE-ORC-005)', type: 'deny' },
  { id: 'RULE-POL-003', desc: 'Agent not authorized for this tool → deny', type: 'deny' },
  { id: 'RULE-POL-004', desc: 'Tool explicitly forbidden for agent → deny', type: 'deny' },
  { id: 'RULE-POL-005', desc: 'impact=critical → require double approval', type: 'approval' },
  { id: 'RULE-POL-006', desc: 'domain=finance + impact=high → require finance approval', type: 'approval' },
  { id: 'RULE-POL-007', desc: 'approval_required=true → require_approval (per tool type)', type: 'approval' },
  { id: 'RULE-POL-008', desc: 'MAX_STEPS reached → deny', type: 'deny' },
  { id: 'RULE-POL-PASS', desc: 'All rules passed → allow execution', type: 'allow' },
];

// ── Live Runs Fetcher ─────────────────────────────────────────────────────────
async function fetchLiveRuns() {
  const { data, error } = await supabase
    .from('agent_runs')
    .select('id, agent_id, agent_name, trigger_event, status, tools_called, risk_score, prompt_guard_flags, started_at, completed_at, duration_ms, error_message, approval_request_id')
    .eq('tenant_id', TENANT_ID)
    .order('started_at', { ascending: false })
    .limit(30);
  if (error) throw error;
  return data ?? [];
}

const RUN_STATUS_LIVE: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  running: { label: 'En cours', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: Activity },
  completed: { label: 'Terminé', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: CheckCircle2 },
  failed: { label: 'Échec', color: 'bg-red-500/10 text-red-400 border-red-500/20', icon: XCircle },
  awaiting_approval: { label: 'Approbation', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', icon: Clock },
  cancelled: { label: 'Annulé', color: 'bg-slate-500/10 text-slate-400 border-slate-500/20', icon: XCircle },
};

// 9 agents emoji map
const AGENT_EMOJI: Record<string, string> = {
  'guest-agent': '🧳', 'housekeeping-agent': '🧹', 'transport-agent': '🚗',
  'maintenance-agent': '🔧', 'owner-agent': '🏠', 'revenue-agent': '📈',
  'finance-agent': '💰', 'compliance-agent': '⚖️', 'incident-agent': '🚨',
};

const AgentOrchestratorPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('architecture');

  const { data: liveRuns = [], isLoading: runsLoading } = useQuery({
    queryKey: ['orchestrator-runs', TENANT_ID],
    queryFn: fetchLiveRuns,
    staleTime: 15_000,
    refetchInterval: 15_000,
    enabled: tab === 'runs',
  });

  const activeAgents = AGENT_DEFINITIONS.filter(a => a.status === 'active').length;
  const approvalOnlyAgents = AGENT_DEFINITIONS.filter(a => a.autonomy_level === 'approval_only').length;
  const waitingApprovals = liveRuns.filter(r => r.status === 'awaiting_approval').length;
  const passedTests = CROSS_TENANT_TESTS.filter(t => t.passed).length;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start gap-4 flex-wrap">
          <div className="w-10 h-10 bg-purple-500/10 border border-purple-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <Bot className="w-5 h-5 text-purple-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-foreground">Agent Orchestrator</h1>
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 font-medium">ADR-019</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Event → Orchestrator → PromptGuard → PolicyEngine → ToolRegistry → Edge Function → PostgreSQL
            </p>
          </div>
          <div className="flex items-center gap-2">
            {tab === 'runs' && (
              <button
                onClick={() => queryClient.invalidateQueries({ queryKey: ['orchestrator-runs', TENANT_ID] })}
                className="flex items-center gap-1.5 text-xs border border-border bg-secondary rounded-xl px-3 py-2.5 hover:border-primary/30 transition-colors min-h-[40px]">
                <RefreshCw className="w-3.5 h-3.5" /> 15s
              </button>
            )}
            <button
              onClick={() => navigate('/agents')}
              className="flex items-center gap-2 text-sm px-4 py-2 bg-secondary border border-border rounded-xl hover:bg-secondary/80 transition-colors min-h-[44px]">
              <ArrowRight className="w-4 h-4" /> Agents v1
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Agents actifs', value: activeAgents, icon: Bot, color: 'text-purple-400' },
            { label: 'Approbation requise', value: `${approvalOnlyAgents}/9`, icon: Clock, color: 'text-amber-400' },
            { label: 'Runs live', value: liveRuns.length, icon: Activity, color: 'text-blue-400' },
            { label: 'Tests CT passés', value: `${passedTests}/${CROSS_TENANT_TESTS.length}`, icon: CheckCircle2, color: 'text-emerald-400' },
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
        <div className="flex items-center gap-1 bg-secondary/30 border border-border rounded-xl p-1 flex-wrap">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                'flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg transition-colors flex-1 justify-center min-h-[36px]',
                tab === id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              )}>
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* ── Architecture tab ── */}
        {tab === 'architecture' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <Network className="w-4 h-4 text-blue-400" /> Flux d'orchestration
              </h3>
              <OrchestratorView />
            </div>
            <div className="space-y-4">
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-rose-400" /> 8 Règles RÈGLE-ORC
                </h3>
                <div className="space-y-2">
                  {[
                    'RÈGLE-ORC-001: Zéro accès DB direct',
                    'RÈGLE-ORC-002: Tool Registry point d\'entrée unique',
                    'RÈGLE-ORC-003: Policy Engine évalué en premier',
                    'RÈGLE-ORC-004: Prompt Guard à l\'ingress',
                    'RÈGLE-ORC-005: tenant_id depuis JWT uniquement',
                    'RÈGLE-ORC-006: Approbation humaine gate obligatoire',
                    'RÈGLE-ORC-007: Audit trail immuable obligatoire',
                    'RÈGLE-ORC-008: LLM interdit pour calculs financiers',
                  ].map(r => (
                    <div key={r} className="flex items-start gap-2 text-xs">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{r}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-amber-400" /> Policy Engine — 9 règles
                </h3>
                <div className="space-y-1.5">
                  {POLICY_RULES.map(r => (
                    <div key={r.id} className="flex items-start gap-2 text-xs">
                      <span className={cn('flex-shrink-0 font-bold mt-0.5', r.type === 'deny' ? 'text-rose-400' : r.type === 'approval' ? 'text-amber-400' : 'text-emerald-400')}>
                        {r.type === 'deny' ? '✗' : r.type === 'approval' ? '⏸' : '✓'}
                      </span>
                      <span className="font-mono text-muted-foreground/60 w-28 flex-shrink-0">{r.id}</span>
                      <span className="text-muted-foreground">{r.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Agents tab ── */}
        {tab === 'agents' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {AGENT_DEFINITIONS.map(agent => {
              const autonomy = AUTONOMY_CONFIG[agent.autonomy_level];
              return (
                <div key={agent.id} className="bg-card border border-border rounded-xl p-4 hover:bg-secondary/10 transition-colors">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="text-2xl flex-shrink-0">{agent.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className={cn('text-sm font-semibold', agent.color)}>{agent.name_fr}</h3>
                        {autonomy && (
                          <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', autonomy.bg, autonomy.color)}>
                            {autonomy.label}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 font-mono">{agent.id}</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{agent.ROLE}</p>
                  <div className="space-y-2">
                    <div>
                      <div className="text-xs text-muted-foreground/50 font-medium mb-1">OUTILS ({agent.TOOLS.length})</div>
                      <div className="flex flex-wrap gap-1">
                        {agent.TOOLS.slice(0, 4).map(t => (
                          <span key={t} className="text-xs font-mono bg-secondary/60 px-1.5 py-0.5 rounded text-muted-foreground">{t.replace('tool-', '')}</span>
                        ))}
                        {agent.TOOLS.length > 4 && <span className="text-xs text-muted-foreground/50">+{agent.TOOLS.length - 4}</span>}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border text-xs text-center">
                      <div><div className="font-semibold text-foreground">{agent.TIMEOUT}s</div><div className="text-muted-foreground/50">timeout</div></div>
                      <div><div className="font-semibold text-foreground">{agent.MAX_STEPS}</div><div className="text-muted-foreground/50">max steps</div></div>
                      <div><div className="font-semibold text-foreground">{agent.APPROVAL_RULES.length}</div><div className="text-muted-foreground/50">règles</div></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Tools tab ── */}
        {tab === 'tools' && (
          <div className="bg-card border border-border rounded-xl p-5">
            <ToolRegistryPanel />
          </div>
        )}

        {/* ── Security tab ── */}
        {tab === 'security' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <Shield className="w-4 h-4 text-amber-400" /> Prompt Injection Guard — 12 patterns
              </h3>
              <div className="space-y-2">
                {[
                  'INJ-001 CRITICAL: System instruction override',
                  'INJ-002 CRITICAL: System role injection',
                  'INJ-003 HIGH: Role confusion / DAN attack',
                  'INJ-004 HIGH: Restriction bypass attempt',
                  'INJ-005 HIGH: Privilege escalation',
                  'INJ-006 HIGH: Cross-tenant ID injection',
                  'INJ-007 MEDIUM: SQL injection keywords',
                  'INJ-008 MEDIUM: SQL comment injection',
                  'INJ-009 MEDIUM: Code execution attempt',
                  'INJ-010 LOW: System prompt probing',
                  'INJ-011 MEDIUM: Data exfiltration attempt',
                  'INJ-012 CRITICAL: Secret credential probe',
                ].map(p => {
                  const level = p.includes('CRITICAL') ? 'text-rose-400' : p.includes('HIGH') ? 'text-orange-400' : p.includes('MEDIUM') ? 'text-amber-400' : 'text-blue-400';
                  return <div key={p} className="text-xs text-muted-foreground flex items-center gap-2"><span className={cn('flex-shrink-0', level)}>●</span>{p}</div>;
                })}
              </div>
              <div className="mt-3 p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl text-xs text-amber-400">
                Risk score: low(1) · medium(5) · high(10) · critical(20). Score ≥ 10 → BLOCKED
              </div>
            </div>
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Tests Cross-Tenant — {passedTests}/{CROSS_TENANT_TESTS.length} PASS
              </h3>
              <div className="space-y-2">
                {CROSS_TENANT_TESTS.map(test => (
                  <div key={test.test_id} className="flex items-start gap-2 text-xs">
                    <CheckCircle2 className={cn('w-3.5 h-3.5 flex-shrink-0 mt-0.5', test.passed ? 'text-emerald-400' : 'text-rose-400')} />
                    <div className="flex-1 min-w-0">
                      <span className="font-mono text-muted-foreground/60 mr-2">{test.test_id}</span>
                      <span className="text-muted-foreground">{test.description}</span>
                      <div className="text-muted-foreground/50 mt-0.5">{test.defense_mechanism}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Runs Live tab — Real Supabase data ── */}
        {tab === 'runs' && (
          runsLoading ? (
            <div className="flex justify-center py-16">
              <div className="text-center space-y-2">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-muted-foreground">Chargement des runs…</p>
              </div>
            </div>
          ) : liveRuns.length === 0 ? (
            <div className="bg-card border border-dashed border-border rounded-xl p-16 text-center">
              <Activity className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Aucun run agent enregistré</p>
              <p className="text-xs text-muted-foreground/50 mt-1">Les exécutions apparaissent ici en temps réel · Polling 15s</p>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-border flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-400" /> Runs Supabase réels
                  <span className="text-xs text-muted-foreground font-normal">({liveRuns.length})</span>
                </h3>
                <span className="text-xs text-muted-foreground">Polling 15s · agent_runs append-only</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-secondary/30">
                      {['Agent', 'Déclencheur', 'Statut', 'Risque', 'Outils', 'Durée', 'Démarré'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-muted-foreground font-medium whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {liveRuns.map(run => {
                      const statusCfg = RUN_STATUS_LIVE[run.status] ?? RUN_STATUS_LIVE.completed;
                      const StatusIcon = statusCfg.icon;
                      const tools = Array.isArray(run.tools_called) ? run.tools_called : [];
                      const flags = Array.isArray(run.prompt_guard_flags) ? run.prompt_guard_flags : [];

                      return (
                        <tr key={run.id} className="border-b border-border/40 last:border-0 hover:bg-secondary/20 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="text-base flex-shrink-0">{AGENT_EMOJI[run.agent_id] ?? '🤖'}</span>
                              <div>
                                <p className="font-semibold text-foreground">{run.agent_name}</p>
                                <p className="text-muted-foreground/60 font-mono">{run.agent_id}</p>
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
                            ) : <span className="text-muted-foreground/40">—</span>}
                            {flags.length > 0 && <span className="ml-1 text-red-400" title={`${flags.length} Prompt Guard flag(s)`}>⚠</span>}
                          </td>
                          <td className="px-4 py-3">
                            <span className="bg-secondary border border-border px-2 py-0.5 rounded-full">
                              {tools.length} outil{tools.length !== 1 ? 's' : ''}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground font-mono">
                            {run.duration_ms != null ? `${run.duration_ms}ms` : run.status === 'running' ? '…' : '—'}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                            {new Date(run.started_at).toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
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

        {/* Footer */}
        <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-4 text-xs text-muted-foreground/70 flex items-start gap-2">
          <Lock className="w-3.5 h-3.5 text-purple-400 flex-shrink-0 mt-0.5" />
          <span>
            ADR-019 RÈGLE-ORC-001 — <strong className="text-purple-400">Aucun agent n'accède directement à PostgreSQL.</strong>{' '}
            Tous les accès données passent par Tool Registry → Edge Function → canUserPerform() + RLS.
            tenant_id toujours depuis le JWT authentifié. Onglet Runs : données Supabase réelles · Polling 15s.
          </span>
        </div>
      </div>
    </AppLayout>
  );
};

export default AgentOrchestratorPage;
