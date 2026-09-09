// HousekeepingPage — Live Supabase data — ADR-013
// Pagination 15/page · filtres statut/type/date · badge overdue · lien détail
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Search, CheckCircle2, Clock, AlertTriangle, Sparkles,
  ChevronLeft, ChevronRight, Download, Calendar, Filter,
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import LoadingSpinner from '@/components/features/LoadingSpinner';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const TENANT_ID = '00000000-0000-0000-0000-000000000001';
const PAGE_SIZE = 15;

const JOB_STATUS_LABELS: Record<string, string> = {
  pending: 'En attente', assigned: 'Assigné', in_progress: 'En cours',
  done: 'Terminé', cancelled: 'Annulé', issue_reported: 'Incident',
};

const JOB_TYPE_LABELS: Record<string, string> = {
  checkout_clean: '🧹 Ménage départ', checkin_prep: '✨ Prép. arrivée',
  mid_stay: '🏠 Ménage séjour', deep_clean: '🫧 Grand ménage',
  inspection: '🔍 Inspection', turnover: '🔄 Turnover',
};

const PRIORITY_COLOR: Record<string, string> = {
  urgent: 'text-red-400', high: 'text-orange-400', normal: 'text-yellow-400', low: 'text-muted-foreground',
};

const STATUS_COLOR: Record<string, string> = {
  pending:        'bg-yellow-500/15 text-yellow-400 border-yellow-500/25',
  assigned:       'bg-blue-500/15 text-blue-400 border-blue-500/25',
  in_progress:    'bg-indigo-500/15 text-indigo-400 border-indigo-500/25',
  done:           'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  cancelled:      'bg-slate-500/15 text-slate-400 border-slate-500/25',
  issue_reported: 'bg-red-500/15 text-red-400 border-red-500/25',
};

const STATUSES = ['pending','assigned','in_progress','done','cancelled','issue_reported'];
const TYPES    = ['checkout_clean','checkin_prep','mid_stay','deep_clean','inspection','turnover'];

async function fetchAllJobs() {
  const { data, error } = await supabase
    .from('housekeeping_jobs')
    .select('id, unit_id, reservation_id, job_type, status, scheduled_date, scheduled_time, priority, notes, assigned_to, started_at, completed_at, created_at')
    .eq('tenant_id', TENANT_ID)
    .is('deleted_at', null)
    .order('scheduled_date', { ascending: true });
  if (error) throw error;

  const unitIds = [...new Set((data ?? []).map(j => j.unit_id).filter(Boolean))];
  const { data: units } = unitIds.length > 0
    ? await supabase.from('units').select('id, name, property_id').in('id', unitIds)
    : { data: [] };

  const propIds = [...new Set((units ?? []).map(u => u.property_id).filter(Boolean))];
  const { data: props } = propIds.length > 0
    ? await supabase.from('properties').select('id, name, city').in('id', propIds)
    : { data: [] };

  const unitMap: Record<string, { name: string; property_id: string }> = {};
  for (const u of units ?? []) unitMap[u.id] = u;
  const propMap: Record<string, { name: string; city: string }> = {};
  for (const p of props ?? []) propMap[p.id] = p;

  return (data ?? []).map(j => ({
    ...j,
    unit_name: unitMap[j.unit_id]?.name ?? '—',
    property_name: propMap[unitMap[j.unit_id]?.property_id ?? '']?.name ?? '—',
    property_city: propMap[unitMap[j.unit_id]?.property_id ?? '']?.city ?? '',
  }));
}

type Job = Awaited<ReturnType<typeof fetchAllJobs>>[number];

const HousekeepingPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [page, setPage] = useState(0);

  const today = new Date().toISOString().slice(0, 10);

  const resetFilters = () => {
    setSearch(''); setStatusFilter(''); setTypeFilter(''); setDateFilter(''); setPage(0);
  };

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['housekeeping-jobs', TENANT_ID],
    queryFn: fetchAllJobs,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('housekeeping_jobs')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['housekeeping-jobs', TENANT_ID] });
      toast.success('Statut mis à jour ✓');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Stats
  const stats = {
    today:      jobs.filter((j: Job) => j.scheduled_date === today).length,
    overdue:    jobs.filter((j: Job) => j.scheduled_date < today && !['done','cancelled'].includes(j.status)).length,
    inProgress: jobs.filter((j: Job) => j.status === 'in_progress' || j.status === 'assigned').length,
    done:       jobs.filter((j: Job) => j.status === 'done').length,
    issues:     jobs.filter((j: Job) => j.status === 'issue_reported').length,
  };

  // Filtered list
  const filtered = jobs.filter((j: Job) => {
    const q = search.toLowerCase();
    if (q && !j.property_name.toLowerCase().includes(q)
          && !j.unit_name.toLowerCase().includes(q)
          && !(j.notes ?? '').toLowerCase().includes(q)) return false;
    if (statusFilter && j.status !== statusFilter) return false;
    if (typeFilter   && j.job_type !== typeFilter)  return false;
    if (dateFilter   && j.scheduled_date !== dateFilter) return false;
    return true;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated  = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // CSV export
  const handleCSV = () => {
    const headers = ['Propriété','Unité','Type','Statut','Priorité','Date prévue','Heure','Notes'];
    const rows = filtered.map((j: Job) => [
      j.property_name, j.unit_name,
      JOB_TYPE_LABELS[j.job_type]?.replace(/^[^\s]+\s/, '') ?? j.job_type,
      JOB_STATUS_LABELS[j.status] ?? j.status,
      j.priority, j.scheduled_date, j.scheduled_time ?? '',
      j.notes ?? '',
    ]);
    const csv = '\uFEFF' + [headers, ...rows].map(r =>
      r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `housekeeping-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const hasFilters = search || statusFilter || typeFilter || dateFilter;

  return (
    <AppLayout>
      <div className="space-y-6">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Ménage & Inspection
              <span className="text-sm font-normal bg-secondary px-2 py-0.5 rounded-full text-muted-foreground">
                {jobs.length} job{jobs.length !== 1 ? 's' : ''}
              </span>
            </h1>
            <p className="text-xs text-muted-foreground mt-1">Planning et suivi des jobs de ménage et inspection — ADR-013</p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleCSV}
              className="flex items-center gap-2 bg-secondary border border-border text-foreground text-xs font-medium px-3 py-2.5 rounded-xl hover:bg-secondary/80 transition-colors min-h-[44px]">
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
            <button
              onClick={() => navigate('/housekeeping/new')}
              className="flex items-center gap-2 bg-primary text-primary-foreground text-xs font-semibold px-4 py-2.5 rounded-xl hover:bg-primary/90 transition-colors min-h-[44px]">
              <Plus className="w-3.5 h-3.5" /> Nouveau job
            </button>
          </div>
        </div>

        {/* ── KPI Stats ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { label: "Aujourd'hui",  value: stats.today,      Icon: Calendar,     color: 'text-blue-400',    bg: 'bg-blue-500/10',
              onClick: () => { setDateFilter(today); setPage(0); } },
            { label: 'En retard',    value: stats.overdue,    Icon: AlertTriangle, color: 'text-red-400',    bg: 'bg-red-500/10',
              onClick: () => { setStatusFilter('pending'); setPage(0); } },
            { label: 'En cours',     value: stats.inProgress, Icon: Sparkles,     color: 'text-indigo-400',  bg: 'bg-indigo-500/10',
              onClick: () => { setStatusFilter('in_progress'); setPage(0); } },
            { label: 'Terminés',     value: stats.done,       Icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10',
              onClick: () => { setStatusFilter('done'); setPage(0); } },
            { label: 'Incidents',    value: stats.issues,     Icon: AlertTriangle, color: 'text-rose-400',   bg: 'bg-rose-500/10',
              onClick: () => { setStatusFilter('issue_reported'); setPage(0); } },
          ].map(({ label, value, Icon, color, bg, onClick }) => (
            <button key={label} onClick={onClick}
              className="bg-card border border-border rounded-xl p-3 flex items-center gap-2.5 hover:border-primary/30 hover:bg-secondary/20 transition-colors text-left">
              <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0', bg)}>
                <Icon className={cn('w-3.5 h-3.5', color)} />
              </div>
              <div className="min-w-0">
                <p className={cn('text-lg font-bold leading-none', color)}>{value}</p>
                <p className="text-xs text-muted-foreground/70 mt-0.5 truncate">{label}</p>
              </div>
            </button>
          ))}
        </div>

        {/* ── Filters ──────────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0); }}
              placeholder="Propriété, unité, notes…"
              className="w-full pl-9 pr-3 py-2.5 bg-secondary border border-border rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setPage(0); }}
              className="bg-secondary border border-border rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary min-h-[40px]">
              <option value="">Tous les statuts</option>
              {STATUSES.map(s => <option key={s} value={s}>{JOB_STATUS_LABELS[s]}</option>)}
            </select>
            <select
              value={typeFilter}
              onChange={e => { setTypeFilter(e.target.value); setPage(0); }}
              className="bg-secondary border border-border rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary min-h-[40px]">
              <option value="">Tous les types</option>
              {TYPES.map(t => <option key={t} value={t}>{JOB_TYPE_LABELS[t]?.replace(/^[^\s]+\s/, '') ?? t}</option>)}
            </select>
            <input
              type="date"
              value={dateFilter}
              onChange={e => { setDateFilter(e.target.value); setPage(0); }}
              className="bg-secondary border border-border rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary min-h-[40px]"
            />
            {hasFilters && (
              <button onClick={resetFilters}
                className="text-xs text-muted-foreground hover:text-foreground border border-border rounded-xl px-3 py-2.5 bg-secondary transition-colors">
                Réinitialiser
              </button>
            )}
          </div>
          <span className="text-xs text-muted-foreground ml-auto">
            {filtered.length} job{filtered.length !== 1 ? 's' : ''}
            {totalPages > 1 && ` · Page ${page + 1}/${totalPages}`}
          </span>
        </div>

        {/* ── Results ───────────────────────────────────────────────────── */}
        {isLoading ? (
          <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
        ) : paginated.length === 0 ? (
          <div className="text-center py-16 bg-card border border-dashed border-border rounded-xl">
            <Sparkles className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Aucun job trouvé</p>
            {hasFilters && (
              <button onClick={resetFilters} className="text-xs text-primary mt-2 hover:underline">
                Réinitialiser les filtres
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {paginated.map((job: Job) => {
                const isOverdue = job.scheduled_date < today && !['done','cancelled'].includes(job.status);
                const isToday   = job.scheduled_date === today;
                return (
                  <div
                    key={job.id}
                    className={cn(
                      'bg-card border rounded-xl p-4 flex items-center gap-4 transition-colors',
                      isOverdue ? 'border-red-500/30 hover:border-red-500/50'
                        : isToday  ? 'border-primary/30 hover:border-primary/50'
                        : 'border-border hover:border-primary/30 hover:bg-secondary/20',
                    )}
                  >
                    {/* Icon */}
                    <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border', STATUS_COLOR[job.status] ?? 'bg-secondary border-border')}>
                      <Sparkles className="w-4 h-4" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-semibold text-foreground">
                          {JOB_TYPE_LABELS[job.job_type] ?? job.job_type}
                        </span>
                        <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium flex-shrink-0', STATUS_COLOR[job.status] ?? 'bg-secondary text-muted-foreground border-border')}>
                          {JOB_STATUS_LABELS[job.status] ?? job.status}
                        </span>
                        <span className={cn('text-xs font-semibold flex-shrink-0', PRIORITY_COLOR[job.priority])}>
                          {job.priority}
                        </span>
                        {isOverdue && (
                          <span className="text-xs bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full font-semibold flex-shrink-0 flex items-center gap-1">
                            <AlertTriangle className="w-2.5 h-2.5" /> En retard
                          </span>
                        )}
                        {isToday && !isOverdue && (
                          <span className="text-xs bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full font-semibold flex-shrink-0">
                            Aujourd'hui
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {job.property_name}
                        {job.property_city && ` · ${job.property_city}`}
                        {job.unit_name !== '—' && ` · ${job.unit_name}`}
                        {` · ${job.scheduled_date}`}
                        {job.scheduled_time && ` à ${job.scheduled_time}`}
                      </div>
                      {job.notes && (
                        <p className="text-xs text-muted-foreground/60 truncate mt-0.5 max-w-xl">{job.notes}</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <select
                        value={job.status}
                        onChange={e => { e.stopPropagation(); updateStatus.mutate({ id: job.id, status: e.target.value }); }}
                        onClick={e => e.stopPropagation()}
                        className="text-xs bg-secondary border border-border rounded-lg px-2 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary min-h-[36px]"
                      >
                        {STATUSES.map(s => <option key={s} value={s}>{JOB_STATUS_LABELS[s]}</option>)}
                      </select>
                      <button
                        onClick={() => navigate(`/housekeeping/${job.id}`)}
                        className="text-xs px-3 py-1.5 border border-border bg-secondary rounded-lg hover:bg-secondary/80 transition-colors min-h-[36px]">
                        Détail →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between gap-4 pt-2">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="flex items-center gap-2 text-xs border border-border rounded-xl px-4 py-2.5 bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors min-h-[44px] disabled:opacity-40 disabled:cursor-not-allowed">
                  <ChevronLeft className="w-3.5 h-3.5" /> Précédent
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                    const pageNum = totalPages <= 7 ? i
                      : page < 4 ? i
                      : page > totalPages - 4 ? totalPages - 7 + i
                      : page - 3 + i;
                    return (
                      <button key={pageNum} onClick={() => setPage(pageNum)}
                        className={cn(
                          'w-9 h-9 text-xs rounded-lg font-medium transition-colors',
                          pageNum === page
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:text-foreground hover:bg-secondary border border-border',
                        )}>
                        {pageNum + 1}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="flex items-center gap-2 text-xs border border-border rounded-xl px-4 py-2.5 bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors min-h-[44px] disabled:opacity-40 disabled:cursor-not-allowed">
                  Suivant <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <p className="text-xs text-center text-muted-foreground/60">
              Affichage {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} sur {filtered.length} jobs
            </p>
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default HousekeepingPage;
