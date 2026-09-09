import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, CheckCircle2, Pause, Zap, Calendar, Webhook, Copy } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import WorkflowLogEntry from '@/components/features/integrations/WorkflowLogEntry';
import {
  getWorkflowById, MOCK_EXECUTION_LOGS,
  STATUS_LABELS, STATUS_COLORS, TRIGGER_TYPE_LABELS, TRIGGER_TYPE_COLORS, DOMAIN_COLORS,
} from '@/lib/workflowMockData';
import { cn } from '@/lib/utils';

const N8nWorkflowDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const workflow = id ? getWorkflowById(id) : undefined;
  const logs = MOCK_EXECUTION_LOGS.filter(l => l.workflow_id === id).slice(0, 10);

  if (!workflow) {
    return (
      <AppLayout>
        <div className="text-center py-20">
          <p className="text-muted-foreground">Workflow {id} introuvable.</p>
          <button onClick={() => navigate('/integrations/n8n')} className="mt-4 text-xs text-primary">
            ← Retour aux workflows
          </button>
        </div>
      </AppLayout>
    );
  }

  const successRate = logs.length
    ? Math.round((logs.filter(l => l.status === 'success').length / logs.length) * 100)
    : 0;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <button onClick={() => navigate('/integrations/n8n')} className="flex items-center gap-1 hover:text-foreground transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Workflows n8n
          </button>
          <span>/</span>
          <span className="text-foreground font-mono">{workflow.id}</span>
        </div>

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono font-bold text-muted-foreground">{workflow.id}</span>
              <span className={cn('text-xs px-1.5 py-0.5 rounded font-medium', DOMAIN_COLORS[workflow.domain] ?? 'bg-secondary text-muted-foreground')}>
                {workflow.domain}
              </span>
              <span className={cn('text-xs px-2.5 py-0.5 rounded-full border font-medium', STATUS_COLORS[workflow.status])}>
                {STATUS_LABELS[workflow.status]}
              </span>
            </div>
            <h1 className="text-xl font-bold text-foreground">{workflow.name}</h1>
            <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">{workflow.description}</p>
          </div>
          <div className="flex gap-2">
            <button className="flex items-center gap-1.5 text-xs border border-border bg-secondary rounded-xl px-3 py-2.5 hover:border-primary/30 transition-colors min-h-[44px]">
              {workflow.status === 'active' ? <Pause className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5" />}
              {workflow.status === 'active' ? 'Mettre en pause' : 'Activer'}
            </button>
          </div>
        </div>

        {/* Error banner */}
        {workflow.error_message && (
          <div className="bg-rose-500/8 border border-rose-500/30 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-rose-400 mb-1">Erreur d'exécution</p>
              <p className="text-xs font-mono text-rose-300/80">{workflow.error_message}</p>
            </div>
          </div>
        )}

        {/* Details grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: stats + config */}
          <div className="space-y-4">
            {/* KPIs */}
            <div className="bg-card border border-border rounded-xl p-5 space-y-3">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Statistiques</h2>
              {[
                { label: "Exécutions aujourd'hui", value: workflow.executions_today },
                { label: 'Exécutions totales', value: workflow.executions_total.toLocaleString('fr') },
                { label: 'Durée moyenne', value: workflow.avg_duration_ms ? `${(workflow.avg_duration_ms / 1000).toFixed(1)}s` : '—' },
                { label: 'Taux de succès (10 dern.)', value: `${successRate}%` },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-semibold text-foreground">{value}</span>
                </div>
              ))}
            </div>

            {/* Trigger */}
            <div className="bg-card border border-border rounded-xl p-5 space-y-3">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Déclencheur</h2>
              <div className={cn('flex items-center gap-2 text-sm font-medium', TRIGGER_TYPE_COLORS[workflow.trigger_type])}>
                {workflow.trigger_type === 'schedule' ? <Calendar className="w-4 h-4" /> :
                 workflow.trigger_type === 'webhook' ? <Webhook className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                {TRIGGER_TYPE_LABELS[workflow.trigger_type]}
              </div>
              <code className="text-xs font-mono text-muted-foreground bg-secondary/50 rounded px-2 py-1 block break-all">
                {workflow.trigger_label}
              </code>
            </div>

            {/* Edge Functions */}
            <div className="bg-card border border-border rounded-xl p-5 space-y-3">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Edge Functions appelées</h2>
              <div className="space-y-1.5">
                {workflow.calls_edge_functions.map(fn => (
                  <div key={fn} className="flex items-center justify-between gap-2 bg-secondary/40 rounded-lg px-2.5 py-2">
                    <code className="text-xs font-mono text-blue-300">{fn}</code>
                    <button onClick={() => navigator.clipboard.writeText(fn).catch(() => {})}
                      className="p-1 rounded hover:bg-secondary transition-colors">
                      <Copy className="w-3 h-3 text-muted-foreground" />
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground/60">ADR-016 · jamais accès DB direct</p>
            </div>
          </div>

          {/* Right: execution logs */}
          <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Historique d'exécution
              </h2>
              <span className="text-xs text-muted-foreground">{logs.length} entrées</span>
            </div>
            {logs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Zap className="w-8 h-8 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Aucune exécution enregistrée</p>
              </div>
            ) : (
              <div className="space-y-0">
                {logs.map(log => (
                  <WorkflowLogEntry key={log.id} log={log} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default N8nWorkflowDetailPage;
