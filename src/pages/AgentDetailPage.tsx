import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Bot, Shield, CheckCircle2, AlertCircle } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import ApprovalCard from '@/components/features/agents/ApprovalCard';
import AgentLogEntry from '@/components/features/agents/AgentLogEntry';
import {
  getAgentById, MOCK_APPROVALS, MOCK_AGENT_LOGS,
  AGENT_STATUS_CONFIG, IMPACT_CONFIG,
} from '@/lib/agentMockData';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const CAPABILITY_FULL: Record<string, string> = {
  read_data: 'Lecture seule',
  draft_content: 'Rédaction (brouillon)',
  suggest_action: 'Suggestion',
  execute_with_approval: 'Exécution après approbation',
};

const AgentDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const agent = id ? getAgentById(id) : undefined;
  const agentApprovals = MOCK_APPROVALS.filter(a => a.agent_id === id && a.status === 'pending');
  const agentLogs = MOCK_AGENT_LOGS.filter(l => l.agent_id === id);

  if (!agent) {
    return (
      <AppLayout>
        <div className="text-center py-20">
          <p className="text-muted-foreground">Agent {id} introuvable.</p>
          <button onClick={() => navigate('/agents')} className="mt-4 text-xs text-primary">
            ← Retour aux agents
          </button>
        </div>
      </AppLayout>
    );
  }

  const cfg = AGENT_STATUS_CONFIG[agent.status];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <button onClick={() => navigate('/agents')} className="flex items-center gap-1 hover:text-foreground transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Agents IA
          </button>
          <span>/</span>
          <span className="text-foreground font-mono">{agent.id}</span>
        </div>

        {/* Header */}
        <div className="flex items-start gap-4 flex-wrap">
          <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0', cfg.bg)}>
            <Bot className={cn('w-6 h-6', cfg.color)} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-foreground">{agent.name}</h1>
              <span className={cn('text-xs px-2 py-0.5 rounded-full border flex items-center gap-1', cfg.bg, cfg.color, cfg.border)}>
                {cfg.label}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed max-w-xl">{agent.description}</p>
            <div className="flex items-center gap-3 mt-2 flex-wrap text-xs text-muted-foreground">
              <code className="text-primary bg-primary/10 px-2 py-0.5 rounded font-mono">{agent.model}</code>
              <span>Domaine: {agent.domain}</span>
              <span>{agent.total_executions.toLocaleString('fr')} exécutions · {agent.success_rate}% succès</span>
            </div>
          </div>
        </div>

        {/* Content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Capabilities + Constraints + Actions */}
          <div className="space-y-4">
            {/* Capabilities */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Capacités</h2>
              <div className="space-y-2">
                {agent.capabilities.map(cap => (
                  <div key={cap} className="flex items-center gap-2 text-xs">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                    <span className="text-foreground">{CAPABILITY_FULL[cap]}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Constraints */}
            <div className="bg-card border border-amber-500/20 rounded-xl p-5">
              <h2 className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" /> Contraintes permanentes
              </h2>
              <div className="space-y-2">
                {agent.constraints.map((c, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <span className="text-amber-400 flex-shrink-0 mt-0.5">⊘</span>
                    <span className="text-muted-foreground leading-relaxed">{c}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Available actions */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Actions disponibles</h2>
              <div className="space-y-2">
                {agent.available_actions.map(action => {
                  const imp = IMPACT_CONFIG[action.impact];
                  return (
                    <div key={action.id} className={cn(
                      'rounded-lg p-3 border text-xs',
                      action.forbidden ? 'border-rose-500/20 bg-rose-500/5' : 'border-border bg-secondary/20',
                    )}>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className={cn('font-semibold', action.forbidden ? 'text-rose-400 line-through' : 'text-foreground')}>
                          {action.name}
                        </span>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {action.requires_approval && <span className="text-amber-400 text-xs">✋</span>}
                          {action.forbidden && <span className="text-rose-400 text-xs">⊘</span>}
                          <span className={cn('font-medium text-xs', imp.color)}>{imp.label}</span>
                        </div>
                      </div>
                      <p className="text-muted-foreground/70 leading-relaxed">{action.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: Approvals + Logs + Stats */}
          <div className="lg:col-span-2 space-y-6">
            {/* Pending approvals */}
            {agentApprovals.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                  Approbations en attente ({agentApprovals.length})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {agentApprovals.map(ap => (
                    <ApprovalCard
                      key={ap.id} approval={ap}
                      onApprove={(apId) => toast.success(`${apId} approuvé`)}
                      onReject={(apId) => toast.info(`${apId} rejeté`)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Statistiques</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: "Actions aujourd'hui", value: agent.actions_today },
                  { label: 'Taux de succès', value: `${agent.success_rate}%` },
                  { label: 'Exécutions totales', value: agent.total_executions.toLocaleString('fr') },
                  { label: 'En attente', value: agent.approvals_pending },
                ].map(({ label, value }) => (
                  <div key={label} className="text-center">
                    <p className="text-2xl font-bold text-foreground">{value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Activity logs */}
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-foreground">Activité récente</h2>
                <span className="text-xs text-muted-foreground">{agentLogs.length} entrées</span>
              </div>
              {agentLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Bot className="w-8 h-8 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Aucune activité enregistrée</p>
                </div>
              ) : (
                <div>{agentLogs.map(log => <AgentLogEntry key={log.id} log={log} />)}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default AgentDetailPage;
