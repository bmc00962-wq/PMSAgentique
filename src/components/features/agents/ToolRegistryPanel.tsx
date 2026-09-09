import { useState } from 'react';
import { Search, Shield, CheckCircle2, Clock } from 'lucide-react';
import { TOOL_REGISTRY, TOOLS_BY_DOMAIN, TOOL_IMPACT_COLOR, TOOL_IMPACT_BG } from '@/lib/toolRegistry';
import { cn } from '@/lib/utils';
import type { ToolDomain } from '@/types/orchestration';

const DOMAIN_LABELS: Record<string, string> = {
  reservation: 'Réservations', calendar: 'Calendrier', guest: 'Voyageurs',
  communication: 'Communication', housekeeping: 'Ménage', transport: 'Transport',
  maintenance: 'Maintenance', finance: 'Finance', property: 'Propriétés',
  notification: 'Notifications', report: 'Rapports',
};

const DOMAIN_COLORS: Record<string, string> = {
  reservation: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
  calendar: 'bg-teal-500/10 text-teal-300 border-teal-500/20',
  guest: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
  communication: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20',
  housekeeping: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
  transport: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20',
  maintenance: 'bg-orange-500/10 text-orange-300 border-orange-500/20',
  finance: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/20',
  property: 'bg-slate-500/10 text-slate-300 border-slate-500/20',
  notification: 'bg-pink-500/10 text-pink-300 border-pink-500/20',
  report: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
};

const ToolRegistryPanel = () => {
  const [search, setSearch] = useState('');
  const [domainFilter, setDomainFilter] = useState<string>('all');

  const domains = Object.keys(TOOLS_BY_DOMAIN) as ToolDomain[];

  const filtered = TOOL_REGISTRY.filter(t => {
    const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.id.includes(search.toLowerCase());
    const matchDomain = domainFilter === 'all' || t.domain === domainFilter;
    return matchSearch && matchDomain;
  });

  const approvalCount = filtered.filter(t => t.approval_required).length;
  const criticalCount = filtered.filter(t => t.impact === 'critical').length;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total outils', value: TOOL_REGISTRY.length, color: 'text-foreground' },
          { label: 'Approbation requise', value: TOOL_REGISTRY.filter(t => t.approval_required).length, color: 'text-amber-400' },
          { label: 'Impact critique', value: TOOL_REGISTRY.filter(t => t.impact === 'critical').length, color: 'text-rose-400' },
          { label: 'Domaines', value: domains.length, color: 'text-blue-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-3 text-center">
            <div className={cn('text-xl font-bold', color)}>{value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-40">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher outil…" className="w-full pl-9 pr-3 py-2 bg-secondary/40 border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary min-h-[36px]" />
        </div>
        <select value={domainFilter} onChange={e => setDomainFilter(e.target.value)} className="bg-secondary/40 border border-border rounded-lg px-3 py-2 text-sm text-foreground min-h-[36px]">
          <option value="all">Tous les domaines ({TOOL_REGISTRY.length})</option>
          {domains.map(d => <option key={d} value={d}>{DOMAIN_LABELS[d]} ({TOOLS_BY_DOMAIN[d].length})</option>)}
        </select>
      </div>

      {/* Tool list */}
      <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
        {filtered.map(tool => (
          <div key={tool.id} className="bg-card border border-border rounded-lg p-3 hover:bg-secondary/20 transition-colors">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono font-semibold text-foreground">{tool.name}</span>
                  <span className={cn('text-xs px-1.5 py-0.5 rounded-full border font-medium', DOMAIN_COLORS[tool.domain] || 'bg-secondary text-muted-foreground border-border')}>
                    {DOMAIN_LABELS[tool.domain]}
                  </span>
                  <span className={cn('text-xs px-1.5 py-0.5 rounded font-medium border', TOOL_IMPACT_BG[tool.impact])}>
                    <span className={TOOL_IMPACT_COLOR[tool.impact]}>{tool.impact}</span>
                  </span>
                  {tool.approval_required && (
                    <span className="text-xs flex items-center gap-1 text-amber-400">
                      <Clock className="w-3 h-3" />approbation
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{tool.description}</p>
                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  <span className="text-xs font-mono text-muted-foreground/60">{tool.id}</span>
                  <span className="text-xs text-muted-foreground/50">{tool.endpoint}</span>
                </div>
              </div>
              <div className="flex-shrink-0 text-right">
                <div className="text-xs text-muted-foreground/50">{tool.timeout_ms / 1000}s</div>
                <div className="text-xs text-muted-foreground/50 mt-0.5">{tool.parameters.filter(p => p.required).length} params</div>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">Aucun outil trouvé</div>
        )}
      </div>

      {/* Legend */}
      <div className="bg-secondary/20 border border-border rounded-xl p-3">
        <div className="text-xs text-muted-foreground/60 mb-2 font-medium">RÈGLE-ORC-002 — Tout outil doit être enregistré ici. Aucun accès DB direct autorisé.</div>
        <div className="flex flex-wrap gap-3 text-xs">
          {Object.entries(TOOL_IMPACT_COLOR).map(([impact, color]) => (
            <span key={impact} className={cn('flex items-center gap-1', color)}>
              <CheckCircle2 className="w-3 h-3" />{impact}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ToolRegistryPanel;
