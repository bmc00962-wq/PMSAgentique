import { useNavigate } from 'react-router-dom';
import { Bot, CheckCircle2, Clock, Activity, Pause, AlertCircle, Zap } from 'lucide-react';
import type { AgentDefinition } from '@/types/agent';
import { AGENT_STATUS_CONFIG, CAPABILITY_LABELS, DOMAIN_BADGE_COLORS } from '@/lib/agentMockData';
import { cn } from '@/lib/utils';

const STATUS_ICONS = {
  active: CheckCircle2, idle: Clock, running: Activity, paused: Pause, error: AlertCircle,
};

interface Props { agent: AgentDefinition; }

const AgentCard = ({ agent }: Props) => {
  const navigate = useNavigate();
  const cfg = AGENT_STATUS_CONFIG[agent.status];
  const StatusIcon = STATUS_ICONS[agent.status];

  return (
    <div
      onClick={() => navigate(`/agents/${agent.id}`)}
      className="bg-card border border-border rounded-xl p-4 cursor-pointer hover:border-primary/30 transition-all"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', cfg.bg)}>
            <Bot className={cn('w-4 h-4', cfg.color)} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{agent.name}</p>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <span className={cn('text-xs px-1.5 py-0.5 rounded font-medium', DOMAIN_BADGE_COLORS[agent.domain] ?? 'bg-secondary text-muted-foreground')}>
                {agent.domain}
              </span>
              <code className="text-xs text-muted-foreground/60 font-mono">{agent.model}</code>
            </div>
          </div>
        </div>
        <span className={cn('text-xs px-2 py-0.5 rounded-full border flex-shrink-0 flex items-center gap-1', cfg.bg, cfg.color, cfg.border)}>
          <StatusIcon className="w-2.5 h-2.5" />
          {cfg.label}
        </span>
      </div>

      {/* Description */}
      <p className="text-xs text-muted-foreground leading-relaxed mb-3 line-clamp-2">{agent.description}</p>

      {/* Capabilities */}
      <div className="flex flex-wrap gap-1 mb-3">
        {agent.capabilities.map(cap => (
          <span key={cap} className="text-xs px-1.5 py-0.5 bg-secondary/60 text-muted-foreground rounded border border-border/50">
            {CAPABILITY_LABELS[cap]}
          </span>
        ))}
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-xs border-t border-border/50 pt-3">
        <div className="flex gap-3 text-muted-foreground">
          <span><span className="text-foreground font-semibold">{agent.actions_today}</span> actions</span>
          <span><span className="text-foreground font-semibold">{agent.success_rate}%</span> succès</span>
        </div>
        {agent.approvals_pending > 0 && (
          <span className="flex items-center gap-1 text-amber-400 font-medium">
            <Zap className="w-3 h-3" />
            {agent.approvals_pending} en attente
          </span>
        )}
      </div>
    </div>
  );
};

export default AgentCard;
