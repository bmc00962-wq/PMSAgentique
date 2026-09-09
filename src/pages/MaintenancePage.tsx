// MaintenancePage — Live Supabase data — ADR-014
// Filtres: statut, catégorie, priorité, approbation requise · CSV export · KPIs enrichis
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Plus, Search, Wrench, CheckCircle2, Clock, AlertTriangle,
  Download, ShieldAlert, DollarSign, Filter,
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import LoadingSpinner from '@/components/features/LoadingSpinner';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

const TENANT_ID = '00000000-0000-0000-0000-000000000001';

const TICKET_STATUS_LABELS: Record<string, string> = {
  open: 'Ouvert', assigned: 'Assigné', in_progress: 'En cours',
  pending_parts: 'Pièces attendues', resolved: 'Résolu', closed: 'Fermé', escalated: 'Escaladé',
};

const TICKET_CATEGORY_LABELS: Record<string, string> = {
  plumbing: '🔧 Plomberie', electrical: '⚡ Électricité', hvac: '❄️ Climatisation',
  appliance: '🏠 Électroménager', structural: '🧱 Structure', pest: '🐛 Nuisibles',
  cleaning: '🧹 Nettoyage', general: '🔨 Général', security: '🔒 Sécurité', locksmith: '🔑 Serrurerie',
};

const PRIORITY_LABELS: Record<string, string> = {
  emergency: 'Urgence', urgent: 'Urgent', high: 'Haute', normal: 'Normale', low: 'Basse',
};

const PRIORITY_COLOR: Record<string, string> = {
  emergency: 'bg-red-500/15 text-red-400 border-red-500/25',
  urgent:    'bg-red-500/15 text-red-400 border-red-500/25',
  high:      'bg-orange-500/15 text-orange-400 border-orange-500/25',
  normal:    'bg-yellow-500/15 text-yellow-400 border-yellow-500/25',
  low:       'bg-slate-500/15 text-slate-400 border-slate-500/25',
};

const STATUS_COLOR: Record<string, string> = {
  open:          'bg-yellow-500/15 text-yellow-400 border-yellow-500/25',
  assigned:      'bg-blue-500/15 text-blue-400 border-blue-500/25',
  in_progress:   'bg-indigo-500/15 text-indigo-400 border-indigo-500/25',
  pending_parts: 'bg-purple-500/15 text-purple-400 border-purple-500/25',
  resolved:      'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  closed:        'bg-slate-500/15 text-slate-400 border-slate-500/25',
  escalated:     'bg-red-500/15 text-red-400 border-red-500/25',
};

const STATUSES    = ['open','assigned','in_progress','pending_parts','resolved','closed'];
const CATEGORIES  = ['plumbing','electrical','hvac','appliance','structural','cleaning','general','security','locksmith'];
const PRIORITIES  = ['emergency','urgent','high','normal','low'];

async function fetchTickets() {
  const { data, error } = await supabase
    .from('maintenance_tickets')
    .select('id, unit_id, property_id, title, description, category, priority, status, source, estimated_cost, actual_cost, currency, requires_approval, scheduled_at, resolved_at, created_at, updated_at')
    .eq('tenant_id', TENANT_ID)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (error) throw error;

  // Join properties
  const propIds = [...new Set((data ?? []).map(t => t.property_id).filter(Boolean))];
  const { data: props } = propIds.length > 0
    ? await supabase.from('properties').select('id, name, city').in('id', propIds)
    : { data: [] };
  const propMap: Record<string, { name: string; city: string }> = {};
  for (const p of props ?? []) propMap[p.id] = p;

  // Join units
  const unitIds = [...new Set((data ?? []).map(t => t.unit_id).filter(Boolean))];
  const { data: units } = unitIds.length > 0
    ? await supabase.from('units').select('id, name').in('id', unitIds)
    : { data: [] };
  const unitMap: Record<string, string> = {};
  for (const u of units ?? []) unitMap[u.id] = u.name;

  return (data ?? []).map(t => ({
    ...t,
    property_name: propMap[t.property_id]?.name ?? '—',
    property_city: propMap[t.property_id]?.city ?? '',
    unit_name: unitMap[t.unit_id] ?? '—',
  }));
}

type Ticket = Awaited<ReturnType<typeof fetchTickets>>[number];

const MaintenancePage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [approvalFilter, setApprovalFilter] = useState(false);

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['maintenance-tickets', TENANT_ID],
    queryFn: fetchTickets,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const filtered = tickets.filter((t: Ticket) => {
    const q = search.toLowerCase();
    if (q && !t.title.toLowerCase().includes(q)
          && !t.property_name.toLowerCase().includes(q)
          && !t.unit_name.toLowerCase().includes(q)) return false;
    if (statusFilter   && t.status !== statusFilter)     return false;
    if (categoryFilter && t.category !== categoryFilter) return false;
    if (priorityFilter && t.priority !== priorityFilter) return false;
    if (approvalFilter && !t.requires_approval)          return false;
    return true;
  });

  const stats = {
    open:        tickets.filter((t: Ticket) => t.status === 'open' || t.status === 'assigned').length,
    inProgress:  tickets.filter((t: Ticket) => t.status === 'in_progress' || t.status === 'pending_parts').length,
    resolved:    tickets.filter((t: Ticket) => t.status === 'resolved' || t.status === 'closed').length,
    urgent:      tickets.filter((t: Ticket) => t.priority === 'urgent' || t.priority === 'emergency').length,
    approvals:   tickets.filter((t: Ticket) => t.requires_approval && !['resolved','closed'].includes(t.status)).length,
    totalCost:   tickets.reduce((s: number, t: Ticket) => s + Number(t.actual_cost ?? 0), 0),
  };

  // CSV Export
  const handleCSV = () => {
    const headers = ['Titre','Propriété','Unité','Catégorie','Priorité','Statut','Coût estimé','Coût réel','Devise','Approbation','Créé le'];
    const rows = filtered.map((t: Ticket) => [
      t.title, t.property_name, t.unit_name,
      TICKET_CATEGORY_LABELS[t.category] ?? t.category,
      PRIORITY_LABELS[t.priority] ?? t.priority,
      TICKET_STATUS_LABELS[t.status] ?? t.status,
      Number(t.estimated_cost ?? 0).toFixed(2),
      Number(t.actual_cost ?? 0).toFixed(2),
      t.currency ?? 'CAD',
      t.requires_approval ? 'Oui' : 'Non',
      new Date(t.created_at).toLocaleDateString('fr-CA'),
    ]);
    const csv = '\uFEFF' + [headers, ...rows].map(r =>
      r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `maintenance-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  };

  const hasFilters = search || statusFilter || categoryFilter || priorityFilter || approvalFilter;

  return (
    <AppLayout>
      <div className="space-y-6">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Wrench className="w-5 h-5 text-primary" />
              Maintenance
              <span className="text-sm font-normal bg-secondary px-2 py-0.5 rounded-full text-muted-foreground">
                {tickets.length} ticket{tickets.length !== 1 ? 's' : ''}
              </span>
            </h1>
            <p className="text-xs text-muted-foreground mt-1">Suivi des incidents, interventions techniques et dépenses — ADR-014</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCSV}
              className="flex items-center gap-2 bg-secondary border border-border text-foreground text-xs font-medium px-3 py-2.5 rounded-xl hover:bg-secondary/80 transition-colors min-h-[44px]">
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
            <button
              onClick={() => navigate('/maintenance/new')}
              className="flex items-center gap-2 bg-primary text-primary-foreground text-xs font-semibold px-4 py-2.5 rounded-xl hover:bg-primary/90 transition-colors min-h-[44px]">
              <Plus className="w-3.5 h-3.5" /> Nouveau ticket
            </button>
          </div>
        </div>

        {/* ── KPI Stats ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          {[
            { label: 'Ouverts',          value: stats.open,       Icon: Clock,         color: 'text-yellow-400', bg: 'bg-yellow-500/10',
              onClick: () => { setStatusFilter('open'); setApprovalFilter(false); } },
            { label: 'En cours',         value: stats.inProgress, Icon: Wrench,        color: 'text-indigo-400', bg: 'bg-indigo-500/10',
              onClick: () => { setStatusFilter('in_progress'); setApprovalFilter(false); } },
            { label: 'Résolus/Fermés',   value: stats.resolved,   Icon: CheckCircle2,  color: 'text-emerald-400', bg: 'bg-emerald-500/10',
              onClick: () => { setStatusFilter('resolved'); setApprovalFilter(false); } },
            { label: 'Urgents',          value: stats.urgent,     Icon: AlertTriangle, color: 'text-rose-400',    bg: 'bg-rose-500/10',
              onClick: () => { setPriorityFilter('urgent'); setStatusFilter(''); setApprovalFilter(false); } },
            { label: 'Approbations',     value: stats.approvals,  Icon: ShieldAlert,   color: 'text-orange-400',  bg: 'bg-orange-500/10',
              onClick: () => { setApprovalFilter(true); setStatusFilter(''); } },
            { label: 'Coût réel',
              value: `${stats.totalCost >= 1000 ? (stats.totalCost / 1000).toFixed(1) + 'k' : stats.totalCost.toFixed(0)} CAD`,
              Icon: DollarSign, color: 'text-purple-400', bg: 'bg-purple-500/10', onClick: () => {} },
          ].map(({ label, value, Icon, color, bg, onClick }) => (
            <button key={label} onClick={onClick}
              className="bg-card border border-border rounded-xl p-3 flex items-center gap-2.5 hover:border-primary/30 hover:bg-secondary/20 transition-colors text-left">
              <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0', bg)}>
                <Icon className={cn('w-3.5 h-3.5', color)} />
              </div>
              <div className="min-w-0">
                <p className={cn('text-base font-bold leading-none', color)}>{value}</p>
                <p className="text-xs text-muted-foreground/70 mt-0.5 truncate">{label}</p>
              </div>
            </button>
          ))}
        </div>

        {/* ── Filters ──────────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Titre, propriété, unité…"
              className="w-full pl-9 pr-3 py-2.5 bg-secondary border border-border rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="bg-secondary border border-border rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary min-h-[40px]">
              <option value="">Tous les statuts</option>
              {STATUSES.map(s => <option key={s} value={s}>{TICKET_STATUS_LABELS[s]}</option>)}
            </select>
            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
              className="bg-secondary border border-border rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary min-h-[40px]">
              <option value="">Toutes catégories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{TICKET_CATEGORY_LABELS[c] ?? c}</option>)}
            </select>
            <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}
              className="bg-secondary border border-border rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary min-h-[40px]">
              <option value="">Toutes priorités</option>
              {PRIORITIES.map(p => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
            </select>
            <button
              onClick={() => setApprovalFilter(v => !v)}
              className={cn(
                'flex items-center gap-1.5 text-xs px-3 py-2.5 rounded-xl border transition-colors min-h-[40px]',
                approvalFilter
                  ? 'bg-orange-500/10 border-orange-500/30 text-orange-400'
                  : 'bg-secondary border-border text-muted-foreground hover:text-foreground',
              )}>
              <ShieldAlert className="w-3.5 h-3.5" /> Approbation requise
            </button>
            {hasFilters && (
              <button
                onClick={() => { setSearch(''); setStatusFilter(''); setCategoryFilter(''); setPriorityFilter(''); setApprovalFilter(false); }}
                className="text-xs text-muted-foreground hover:text-foreground border border-border rounded-xl px-3 py-2.5 bg-secondary transition-colors">
                Réinitialiser
              </button>
            )}
          </div>
          <span className="text-xs text-muted-foreground ml-auto">
            {filtered.length} ticket{filtered.length !== 1 ? 's' : ''} affiché{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* ── Results ───────────────────────────────────────────────────── */}
        {isLoading ? (
          <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-card border border-dashed border-border rounded-xl">
            <Wrench className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Aucun ticket trouvé</p>
            <button
              onClick={() => { setSearch(''); setStatusFilter(''); setCategoryFilter(''); setPriorityFilter(''); setApprovalFilter(false); }}
              className="text-xs text-primary mt-2 hover:underline">
              Réinitialiser les filtres
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((ticket: Ticket) => (
              <button
                key={ticket.id}
                onClick={() => navigate(`/maintenance/${ticket.id}`)}
                className={cn(
                  'w-full bg-card border rounded-xl p-4 flex items-center gap-4 hover:border-primary/30 hover:bg-secondary/20 transition-colors text-left',
                  ticket.priority === 'urgent' || ticket.priority === 'emergency'
                    ? 'border-red-500/30'
                    : ticket.requires_approval && !['resolved','closed'].includes(ticket.status)
                      ? 'border-orange-500/25'
                      : 'border-border',
                )}
              >
                {/* Priority icon */}
                <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border', PRIORITY_COLOR[ticket.priority] ?? 'bg-secondary border-border')}>
                  <Wrench className="w-4 h-4" />
                </div>

                {/* Main content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-semibold text-foreground truncate max-w-[300px]">
                      {ticket.title}
                    </span>
                    <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium flex-shrink-0', STATUS_COLOR[ticket.status] ?? 'bg-secondary text-muted-foreground border-border')}>
                      {TICKET_STATUS_LABELS[ticket.status] ?? ticket.status}
                    </span>
                    <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium flex-shrink-0', PRIORITY_COLOR[ticket.priority] ?? 'bg-secondary text-muted-foreground border-border')}>
                      {PRIORITY_LABELS[ticket.priority] ?? ticket.priority}
                    </span>
                    {ticket.requires_approval && !['resolved','closed'].includes(ticket.status) && (
                      <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium bg-orange-500/10 text-orange-400 border-orange-500/20 flex-shrink-0">
                        <ShieldAlert className="w-2.5 h-2.5" /> Approbation requise
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                    <span>{ticket.property_name}</span>
                    {ticket.property_city && <span>· {ticket.property_city}</span>}
                    {ticket.unit_name !== '—' && <span>· {ticket.unit_name}</span>}
                    <span>· {TICKET_CATEGORY_LABELS[ticket.category] ?? ticket.category}</span>
                    {ticket.source && (
                      <span className="text-xs text-muted-foreground/60">
                        · source: {ticket.source.replace(/_/g, ' ')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Costs + Date */}
                <div className="text-right flex-shrink-0 min-w-[100px]">
                  {(ticket.estimated_cost || ticket.actual_cost) ? (
                    <div className="text-xs space-y-0.5">
                      {ticket.actual_cost && (
                        <p className="font-mono font-semibold text-emerald-400">
                          {Number(ticket.actual_cost).toFixed(0)} {ticket.currency ?? 'CAD'}
                        </p>
                      )}
                      {ticket.estimated_cost && !ticket.actual_cost && (
                        <p className="font-mono text-muted-foreground">
                          ~{Number(ticket.estimated_cost).toFixed(0)} {ticket.currency ?? 'CAD'}
                        </p>
                      )}
                      <p className="text-muted-foreground/60 text-xs">
                        {ticket.actual_cost ? 'réel' : 'estimé'}
                      </p>
                    </div>
                  ) : null}
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(ticket.created_at).toLocaleDateString('fr-CA', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default MaintenancePage;
