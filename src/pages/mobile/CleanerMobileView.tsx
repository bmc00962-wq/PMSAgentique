// CleanerMobileView — Live Supabase data — ADR-013
// Loads housekeeping_jobs assigned to authenticated user (own jobs only — RLS)
// Checklist items from housekeeping_checklist_items (append-only mutations)
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Sparkles, CheckCircle2, Circle, Clock, MapPin, User,
  ChevronLeft, Camera, AlertTriangle, Phone, RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

const TENANT_ID = '00000000-0000-0000-0000-000000000001';

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente', assigned: 'Assigné', in_progress: 'En cours',
  done: 'Terminé', cancelled: 'Annulé', issue_reported: 'Problème signalé',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-slate-500/10 border-slate-500/20 text-slate-400',
  assigned: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
  in_progress: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
  done: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
  cancelled: 'bg-red-500/10 border-red-500/20 text-red-400',
  issue_reported: 'bg-orange-500/10 border-orange-500/20 text-orange-400',
};

// Valid next status transitions (ADR-013 State Machine)
const NEXT_STATUSES: Record<string, { status: string; label: string; color: string }[]> = {
  assigned: [{ status: 'in_progress', label: 'Démarrer', color: 'bg-blue-500 text-white hover:bg-blue-600' }],
  in_progress: [
    { status: 'done', label: 'Terminer ✓', color: 'bg-emerald-500 text-white hover:bg-emerald-600' },
    { status: 'issue_reported', label: 'Signaler problème', color: 'bg-orange-500/20 border border-orange-500/30 text-orange-400 hover:bg-orange-500/30' },
  ],
  pending: [{ status: 'in_progress', label: 'Démarrer', color: 'bg-blue-500 text-white hover:bg-blue-600' }],
};

async function fetchCleanerJobs() {
  // Load jobs for the current tenant (RLS will auto-filter to assigned user in prod)
  const { data: jobs, error } = await supabase
    .from('housekeeping_jobs')
    .select('id, unit_id, job_type, status, scheduled_date, scheduled_time, priority, notes, assigned_to, reservation_id')
    .eq('tenant_id', TENANT_ID)
    .is('deleted_at', null)
    .in('status', ['pending', 'assigned', 'in_progress'])
    .order('scheduled_date', { ascending: true })
    .limit(10);
  if (error) throw error;

  const jobList = jobs ?? [];
  if (jobList.length === 0) return { jobs: [], units: {}, checklists: {} };

  // Load units
  const unitIds = [...new Set(jobList.map(j => j.unit_id))];
  const { data: units } = await supabase
    .from('units')
    .select('id, name, property_id')
    .in('id', unitIds);

  const propIds = [...new Set((units ?? []).map(u => u.property_id))];
  const { data: props } = propIds.length > 0
    ? await supabase.from('properties').select('id, name, address, city').in('id', propIds)
    : { data: [] };

  const unitMap: Record<string, { name: string; propertyName: string; address: string; city: string }> = {};
  for (const u of units ?? []) {
    const p = (props ?? []).find(p => p.id === u.property_id);
    unitMap[u.id] = { name: u.name, propertyName: p?.name ?? '—', address: p?.address ?? '', city: p?.city ?? '' };
  }

  // Load checklist items for all jobs
  const jobIds = jobList.map(j => j.id);
  const { data: checklistItems } = await supabase
    .from('housekeeping_checklist_items')
    .select('id, job_id, label, category, is_completed, item_order')
    .in('job_id', jobIds)
    .order('item_order', { ascending: true });

  const checklistMap: Record<string, typeof checklistItems> = {};
  for (const item of checklistItems ?? []) {
    if (!checklistMap[item.job_id]) checklistMap[item.job_id] = [];
    checklistMap[item.job_id].push(item);
  }

  return { jobs: jobList, units: unitMap, checklists: checklistMap };
}

const CleanerMobileView = () => {
  const queryClient = useQueryClient();
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [issueMode, setIssueMode] = useState(false);
  const [issueDesc, setIssueDesc] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['cleaner-jobs', TENANT_ID],
    queryFn: fetchCleanerJobs,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const jobs = data?.jobs ?? [];
  const units = data?.units ?? {};
  const checklists = data?.checklists ?? {};

  // Set first job as default when loaded
  const activeJobId = selectedJobId ?? jobs[0]?.id ?? null;
  const job = jobs.find(j => j.id === activeJobId);
  const unit = job ? units[job.unit_id] : null;
  const checklistItems = activeJobId ? (checklists[activeJobId] ?? []) : [];

  const totalItems = checklistItems.length;
  const doneItems = checklistItems.filter(i => i.is_completed).length;
  const progress = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;
  const categories = [...new Set(checklistItems.map(i => i.category))];

  // Toggle checklist item (append-only: only allow checking, not unchecking — ADR-013)
  const toggleItem = useMutation({
    mutationFn: async ({ itemId, isCompleted }: { itemId: string; isCompleted: boolean }) => {
      if (!isCompleted) return; // ADR-013: checklist items jamais décochés
      const { error } = await supabase.from('housekeeping_checklist_items').update({
        is_completed: true,
        completed_at: new Date().toISOString(),
      }).eq('id', itemId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cleaner-jobs', TENANT_ID] }),
    onError: (e: Error) => toast.error(e.message),
  });

  // Update job status (state machine transitions)
  const updateJobStatus = useMutation({
    mutationFn: async ({ jobId, status }: { jobId: string; status: string }) => {
      const update: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
      if (status === 'in_progress') update.started_at = new Date().toISOString();
      if (status === 'done') update.completed_at = new Date().toISOString();
      if (status === 'issue_reported' && issueDesc.trim()) update.issue_description = issueDesc.trim();

      const { error } = await supabase.from('housekeeping_jobs').update(update).eq('id', jobId);
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['cleaner-jobs', TENANT_ID] });
      if (status === 'done') toast.success('Job marqué TERMINÉ — Superviseur notifié ✓');
      else if (status === 'in_progress') toast.success('Intervention démarrée');
      else if (status === 'issue_reported') { toast.warning('Problème signalé — Ticket maintenance créé (ADR-014)'); setIssueMode(false); setIssueDesc(''); }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-muted-foreground">Chargement des jobs…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground max-w-sm mx-auto">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <a href="/housekeeping" className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary">
          <ChevronLeft className="w-5 h-5 text-muted-foreground" />
        </a>
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400 flex-shrink-0" />
          <span className="text-sm font-bold text-foreground">Ménage</span>
          {job && (
            <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium flex-shrink-0', STATUS_COLORS[job.status] ?? 'bg-secondary border-border text-muted-foreground')}>
              {STATUS_LABELS[job.status] ?? job.status}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => queryClient.invalidateQueries({ queryKey: ['cleaner-jobs', TENANT_ID] })}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary text-muted-foreground">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          {job && NEXT_STATUSES[job.status]?.some(n => n.status === 'issue_reported') && (
            <button onClick={() => setIssueMode(!issueMode)}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-amber-500/10 text-amber-400">
              <AlertTriangle className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      <div className="px-4 py-4 space-y-4">
        {/* No jobs */}
        {jobs.length === 0 && (
          <div className="bg-card border border-dashed border-border rounded-xl p-12 text-center mt-8">
            <Sparkles className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Aucun job en cours</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Tous les jobs sont terminés ou aucun ne vous est assigné</p>
          </div>
        )}

        {/* Job selector */}
        {jobs.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {jobs.map(j => (
              <button key={j.id}
                onClick={() => setSelectedJobId(j.id)}
                className={cn('flex-shrink-0 px-3 py-2 rounded-lg border text-xs font-medium transition-colors',
                  activeJobId === j.id ? 'bg-primary/10 border-primary/30 text-primary' : 'border-border text-muted-foreground hover:bg-secondary')}>
                <div className="font-semibold">{units[j.unit_id]?.name ?? j.id.slice(0, 8)}</div>
                <div className={cn('mt-0.5', STATUS_COLORS[j.status]?.split(' ').find(c => c.startsWith('text-')) ?? 'text-muted-foreground')}>
                  {STATUS_LABELS[j.status]}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Job card */}
        {job && (
          <>
            <div className="bg-card border border-border rounded-xl p-4 space-y-2">
              <div className="text-base font-bold text-foreground">{unit?.propertyName ?? '—'}</div>
              <div className="text-sm text-primary font-medium">{unit?.name ?? '—'}</div>
              {unit?.address && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                  {unit.address}{unit.city ? `, ${unit.city}` : ''}
                </div>
              )}
              <div className="flex items-center gap-4 pt-1 flex-wrap">
                <div className="flex items-center gap-1.5 text-xs">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">Planifié</span>
                  <span className="font-semibold text-foreground">{job.scheduled_date} {job.scheduled_time ?? ''}</span>
                </div>
                <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', STATUS_COLORS[job.status] ?? 'bg-secondary border-border text-muted-foreground')}>
                  {job.job_type.replace('_', ' ')}
                </span>
              </div>
              {job.notes && (
                <div className="text-xs text-muted-foreground border-t border-border pt-2">{job.notes}</div>
              )}
            </div>

            {/* Progress */}
            {totalItems > 0 && (
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-foreground">Progression checklist</span>
                  <span className={cn('text-sm font-bold', doneItems === totalItems ? 'text-emerald-400' : 'text-primary')}>
                    {doneItems}/{totalItems}
                  </span>
                </div>
                <div className="bg-secondary/60 rounded-full h-2.5 overflow-hidden">
                  <div className={cn('h-2.5 rounded-full transition-all duration-300', doneItems === totalItems ? 'bg-emerald-400' : 'bg-primary')}
                    style={{ width: `${progress}%` }} />
                </div>
                <div className="text-xs text-muted-foreground mt-1">{progress}% · ADR-013 · Append-only</div>
              </div>
            )}

            {/* Issue report */}
            {issueMode && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-semibold text-amber-400">Signaler un problème</span>
                </div>
                <textarea value={issueDesc} onChange={e => setIssueDesc(e.target.value)}
                  placeholder="Décrivez le problème (dommage, équipement défaillant, manque de stock...)"
                  rows={3}
                  className="w-full bg-background/60 border border-amber-500/20 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none focus:ring-2 focus:ring-amber-400/30" />
                <div className="flex gap-2">
                  <button onClick={() => { setIssueMode(false); setIssueDesc(''); }}
                    className="flex-1 py-2.5 border border-border rounded-lg text-sm text-muted-foreground hover:bg-secondary transition-colors">
                    Annuler
                  </button>
                  <button onClick={() => updateJobStatus.mutate({ jobId: job.id, status: 'issue_reported' })}
                    disabled={!issueDesc.trim() || updateJobStatus.isPending}
                    className="flex-1 py-2.5 bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded-lg text-sm font-semibold hover:bg-amber-500/30 transition-colors disabled:opacity-50">
                    Signaler
                  </button>
                </div>
              </div>
            )}

            {/* Checklist by category */}
            {categories.map(cat => {
              const items = checklistItems.filter(i => i.category === cat);
              const catDone = items.filter(i => i.is_completed).length;
              return (
                <div key={cat} className="bg-card border border-border rounded-xl overflow-hidden">
                  <div className="px-4 py-3 bg-secondary/30 flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground uppercase tracking-wide">{cat}</span>
                    <span className="text-xs text-muted-foreground">{catDone}/{items.length}</span>
                  </div>
                  <div className="divide-y divide-border/50">
                    {items.map(item => (
                      <button key={item.id}
                        onClick={() => !item.is_completed && toggleItem.mutate({ itemId: item.id, isCompleted: true })}
                        disabled={item.is_completed}
                        className={cn('w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors min-h-[52px]',
                          item.is_completed ? 'bg-emerald-500/5 cursor-default' : 'hover:bg-secondary/30 active:bg-secondary/50')}>
                        {item.is_completed
                          ? <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                          : <Circle className="w-5 h-5 text-border flex-shrink-0" />
                        }
                        <span className={cn('text-sm flex-1', item.is_completed ? 'line-through text-muted-foreground' : 'text-foreground')}>
                          {item.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* No checklist items */}
            {totalItems === 0 && (
              <div className="bg-card border border-dashed border-border rounded-xl p-8 text-center text-xs text-muted-foreground">
                Aucun item de checklist pour ce job
              </div>
            )}

            {/* Photo button */}
            <button className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-border rounded-xl text-sm text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors min-h-[52px]">
              <Camera className="w-4 h-4" />
              Ajouter photo (Supabase Storage · housekeeping-photos)
            </button>

            {/* Status action buttons */}
            <div className="space-y-2">
              {(NEXT_STATUSES[job.status] ?? []).filter(n => n.status !== 'issue_reported').map(next => (
                <button key={next.status}
                  onClick={() => {
                    if (next.status === 'done' && doneItems < totalItems && totalItems > 0) {
                      toast.error(`${totalItems - doneItems} tâche(s) checklist restante(s).`);
                      return;
                    }
                    updateJobStatus.mutate({ jobId: job.id, status: next.status });
                  }}
                  disabled={updateJobStatus.isPending}
                  className={cn('w-full py-4 rounded-xl text-base font-bold transition-all min-h-[56px] active:scale-[0.98] disabled:opacity-50', next.color)}>
                  {next.label}
                </button>
              ))}
            </div>
          </>
        )}

        <p className="text-xs text-center text-muted-foreground/50 pb-4">
          ADR-013 · Checklist append-only · Supabase RLS · Photos Storage housekeeping-photos
        </p>
      </div>
    </div>
  );
};

export default CleanerMobileView;
