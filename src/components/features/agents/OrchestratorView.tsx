import { Shield, Database, Network, ArrowDown, ArrowRight, CheckCircle2, Lock, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FlowStep {
  id: string;
  label: string;
  sublabel: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
  rules?: string[];
}

const FLOW_STEPS: FlowStep[] = [
  { id: 'event', label: 'Event Trigger', sublabel: 'reservation.checked_out · schedule.daily · message.received', icon: Network, color: 'text-slate-300', bg: 'bg-slate-700/40 border-slate-600/40', rules: ['Webhook n8n W-xx', 'Scheduled cron', 'User action'] },
  { id: 'orchestrator', label: 'Agent Orchestrator', sublabel: 'Dispatch · Lifecycle · Tenant isolation from JWT', icon: Bot, color: 'text-blue-400', bg: 'bg-blue-500/8 border-blue-500/25', rules: ['tenant_id from JWT only (RÈGLE-ORC-005)', 'Agent status check', 'Create AgentRun'] },
  { id: 'promptguard', label: 'Prompt Guard', sublabel: '12 injection patterns · InjectionRisk scoring', icon: Shield, color: 'text-amber-400', bg: 'bg-amber-500/8 border-amber-500/25', rules: ['INJ-001→012 scan', 'risk >= high → block', 'Sanitize input'] },
  { id: 'policyengine', label: 'Policy Engine', sublabel: '8 rules · deny-first · approval gate', icon: Lock, color: 'text-rose-400', bg: 'bg-rose-500/8 border-rose-500/25', rules: ['RULE-POL-001: registry check', 'RULE-POL-002: cross-tenant deny', 'RULE-POL-003→004: agent auth', 'RULE-POL-005→007: approval gate', 'RULE-POL-008: MAX_STEPS'] },
  { id: 'toolregistry', label: 'Tool Registry', sublabel: '49 tools · 11 domains · Edge Function endpoints', icon: Database, color: 'text-purple-400', bg: 'bg-purple-500/8 border-purple-500/25', rules: ['Lookup tool definition', 'Validate parameters', 'Check forbidden agents'] },
  { id: 'edgefunction', label: 'Edge Function', sublabel: 'canUserPerform() · RLS · AuditEvent', icon: Network, color: 'text-emerald-400', bg: 'bg-emerald-500/8 border-emerald-500/25', rules: ['canUserPerform() authorization', 'PostgreSQL RLS row filter', 'AuditEvent append-only'] },
  { id: 'postgresql', label: 'PostgreSQL', sublabel: 'Tenant-isolated data · NUMERIC(12,4) · Append-only', icon: Database, color: 'text-teal-400', bg: 'bg-teal-500/8 border-teal-500/25', rules: ['RLS isolation by tenant_id', 'Deterministic finance fns', 'No direct agent access'] },
];

interface Props {
  compact?: boolean;
}

const OrchestratorView = ({ compact = false }: Props) => {
  return (
    <div className={cn('space-y-2', compact && 'space-y-1')}>
      {FLOW_STEPS.map((step, i) => {
        const Icon = step.icon;
        return (
          <div key={step.id}>
            <div className={cn('border rounded-xl p-4 flex items-start gap-3', step.bg, compact && 'p-3')}>
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-background/40', compact && 'w-7 h-7')}>
                <Icon className={cn('w-4 h-4', step.color, compact && 'w-3.5 h-3.5')} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={cn('text-sm font-semibold', step.color, compact && 'text-xs')}>{step.label}</span>
                  {!compact && (
                    <span className={cn('text-xs px-1.5 py-0.5 rounded font-mono font-semibold', step.color, 'opacity-60 bg-current/10')}>
                      {step.id}
                    </span>
                  )}
                </div>
                <p className={cn('text-xs text-muted-foreground mt-0.5', compact && 'text-xs leading-tight')}>{step.sublabel}</p>
                {!compact && step.rules && (
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
                    {step.rules.map(r => (
                      <span key={r} className="text-xs text-muted-foreground/60 flex items-center gap-1">
                        <CheckCircle2 className="w-2.5 h-2.5 flex-shrink-0" />{r}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {i < FLOW_STEPS.length - 1 && (
              <div className="flex justify-center py-1">
                <ArrowDown className="w-4 h-4 text-muted-foreground/30" />
              </div>
            )}
          </div>
        );
      })}

      {/* Decision branches */}
      {!compact && (
        <div className="grid grid-cols-3 gap-3 mt-2">
          {[
            { label: 'ALLOW', desc: 'Tool executes via Edge Fn', color: 'text-emerald-400', bg: 'bg-emerald-500/8 border-emerald-500/25' },
            { label: 'REQUIRE_APPROVAL', desc: 'Run pauses → ApprovalRequest created', color: 'text-amber-400', bg: 'bg-amber-500/8 border-amber-500/25' },
            { label: 'DENY', desc: 'AgentStep fails → audit logged', color: 'text-rose-400', bg: 'bg-rose-500/8 border-rose-500/25' },
          ].map(({ label, desc, color, bg }) => (
            <div key={label} className={cn('border rounded-xl p-3 flex items-start gap-2', bg)}>
              <ArrowRight className={cn('w-4 h-4 flex-shrink-0 mt-0.5', color)} />
              <div>
                <div className={cn('text-xs font-bold font-mono', color)}>{label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrchestratorView;
