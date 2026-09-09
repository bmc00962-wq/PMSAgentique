// HousekeepingDetailPage — Live Supabase data — ADR-013
// Job ménage avec checklist interactive (toggle is_completed), machine d'état, notes
// Statuts: pending → assigned → in_progress → done | cancelled
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Sparkles, Calendar, Clock, User, Building2,
  CheckCircle2, Circle, ChevronRight, AlertTriangle, BookOpen,
  Info, Loader2, Plus, X,
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import LoadingSpinner from '@/components/features/LoadingSpinner';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const TENANT_ID = '00000000-0000-0000-0000-000000000001';

const STATUS_TRANSITIONS: Record<string, string[]> = {
  pending:     ['assigned', 'in_progress', 'cancelled'],
  assigned:    ['in_progress', 'cancelled'],
  in_progress: ['done', 'cancelled'],
  done:        [],
  cancelled:   [],
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente', assigned: 'Assigné', in_progress: 'En cours',
  done: 'Terminé', cancelled: 'Annulé',
};

const STATUS_COLOR: Record<string, string> = {
  pending:     'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  assigned:    'bg-blue-500/10 text-blue-400 border-blue-500/20',
  in_progress: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  done:        'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  cancelled:   'bg-slate-500/10 text-slate-400 border-slate-500/20',
};

const PRIORITY_COLOR: Record<string, string> = {
  urgent: 'text-red-400', high: 'text-orange-400', normal: 'text-yellow-400', low: 'text-slate-400',
};

const JOB_TYPE_LABELS: Record<string, string> = {
  checkout_clean:    'Nettoyage post-départ',
  checkin_prep:      'Préparation arrivée',
  mid_stay_clean:    'Nettoyage en cours de séjour',
  deep_clean:        'Grand nettoyage',
  inspection:        'Inspection',
  maintenance_prep:  'Préparation maintenance',
  custom:            'Personnalisé',
};

const CHECKLIST_CATEGORY_LABELS: Record<string, string> = {
  kitchen:    'Cuisine', bathroom: 'Salle de bain', bedroom: 'Chambre',
  living:     'Salon', outdoor: 'Extérieur', general: 'Général',
  linen:      'Linge', supplies: 'Consommables',
};

async function fetchJobDetail(id: string) {
  const { data: job, error } = await supabase
    .from('housekeeping_jobs')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', TENANT_ID)
    .single();
  if (error) throw error;

  const [unitRes, checklistRes, reservationRes] = await Promise.all([
    supabase.from('units')
      .select('id, name, unit_type, property_id')
      .eq('id', job.unit_id)
      .single(),
    supabase.from('housekeeping_checklist_items')
      .select('id, label, category, item_order, is_completed, completed_at, note, photo_url')
      .eq('job_id', id)
      .eq('tenant_id', TENANT_ID)
      .order('item_order', { ascending: true }),
    job.reservation_id
      ? supabase.from('reservations')
          .select('id, guest_first_name, guest_last_name, check_in, check_out')
          .eq('id', job.reservation_id)
          .single()
      : Promise.resolve({ data: null }),
  ]);

  const unit = unitRes.data;
  const { data: property } = unit?.property_id
    ? await supabase.from('properties').select('id, name, city').eq('id', unit.property_id).single()
    : { data: null };

  const checklist = checklistRes.data ?? [];
  const completedCount = checklist.filter(i => i.is_completed).length;

  return {
    job,
    unit,
    property,
    reservation: reservationRes.data,
    checklist,
    completedCount,
    totalCount: checklist.length,
  };
}

const HousekeepingDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [issueText, setIssueText] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['housekeeping-detail', id],
    queryFn: () => fetchJobDetail(id!),
    enabled: !!id,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  // Toggle checklist item
  const toggleItem = useMutation({
    mutationFn: async ({ itemId, isCompleted }: { itemId: string; isCompleted: boolean }) => {
      const { error } = await supabase
        .from('housekeeping_checklist_items')
        .update({
          is_completed: isCompleted,
          completed_at: isCompleted ? new Date().toISOString() : null,
        })
        .eq('id', itemId)
        .eq('tenant_id', TENANT_ID);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['housekeeping-detail', id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Update job status
  const updateStatus = useMutation({
    mutationFn: async (newStatus: string) => {
      const { error } = await supabase
        .from('housekeeping_jobs')
        .update({
          status: newStatus,
          version: (data!.job.version ?? 1) + 1,
          updated_at: new Date().toISOString(),
          ...(newStatus === 'in_progress' ? { started_at: new Date().toISOString() } : {}),
          ...(newStatus === 'done'        ? { completed_at: new Date().toISOString() } : {}),
        })
        .eq('id', id!)
        .eq('tenant_id', TENANT_ID);
      if (error) throw error;
    },
    onSuccess: (_, ns) => {
      queryClient.invalidateQueries({ queryKey: ['housekeeping-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['housekeeping-jobs', TENANT_ID] });
      toast.success(`Statut → ${STATUS_LABELS[ns]}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Report issue
  const reportIssue = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('housekeeping_jobs')
        .update({
          issue_description: issueText.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id!)
        .eq('tenant_id', TENANT_ID);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['housekeeping-detail', id] });
      toast.success('Incident signalé ✓');
      setShowIssueForm(false);
      setIssueText('');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <AppLayout><div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div></AppLayout>;

  if (!data?.job) {
    return (
      <AppLayout>
        <div className="text-center py-20">
          <p className="text-sm text-muted-foreground mb-3">Job introuvable</p>
          <button onClick={() => navigate('/housekeeping')} className="text-primary text-sm hover:underline">← Planning ménage</button>
        </div>
      </AppLayout>
    );
  }

  const { job: j, unit, property, reservation, checklist, completedCount, totalCount } = data;
  const nextStatuses = STATUS_TRANSITIONS[j.status] ?? [];
  const isTerminal = j.status === 'done' || j.status === 'cancelled';
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Group checklist by category
  const byCategory: Record<string, typeof checklist> = {};
  for (const item of checklist) {
    const cat = item.category ?? 'general';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(item);
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <button onClick={() => navigate('/housekeeping')} className="hover:text-foreground transition-colors flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Ménage
          </button>
          <span>/</span>
          <span className="text-foreground truncate">{property?.name ?? '—'} · {unit?.name ?? '—'}</span>
        </div>

        {/* Hero */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-start gap-4 flex-wrap">
            <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 border', STATUS_COLOR[j.status] ?? 'bg-secondary border-border')}>
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h1 className="text-lg font-bold text-foreground">{JOB_TYPE_LABELS[j.job_type] ?? j.job_type}</h1>
                <span className={cn('text-xs px-2.5 py-1 rounded-full border font-medium', STATUS_COLOR[j.status] ?? '')}>
                  {STATUS_LABELS[j.status] ?? j.status}
                </span>
                <span className={cn('text-xs font-semibold uppercase', PRIORITY_COLOR[j.priority] ?? 'text-muted-foreground')}>
                  {j.priority}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {property?.name ?? '—'} · {unit?.name ?? '—'}
                {property?.city ? ` · ${property.city}` : ''}
              </p>
              {j.scheduled_date && (
                <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(j.scheduled_date).toLocaleDateString('fr-CA', { dateStyle: 'full' })}
                  {j.scheduled_time && ` à ${j.scheduled_time}`}
                </div>
              )}
            </div>

            {/* Status transition buttons */}
            {!isTerminal && nextStatuses.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {nextStatuses.map(ns => (
                  <button
                    key={ns}
                    onClick={() => updateStatus.mutate(ns)}
                    disabled={updateStatus.isPending}
                    className={cn(
                      'flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl border font-medium transition-colors min-h-[36px] disabled:opacity-50',
                      ns === 'cancelled'
                        ? 'bg-slate-500/10 border-slate-500/20 text-slate-400 hover:bg-slate-500/20'
                        : ns === 'done'
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                        : 'bg-primary/10 border-primary/20 text-primary hover:bg-primary/20',
                    )}>
                    {updateStatus.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <ChevronRight className="w-3 h-3" />}
                    {STATUS_LABELS[ns]}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Issue alert */}
        {j.issue_description && (
          <div className="flex items-start gap-3 bg-red-500/5 border border-red-500/20 rounded-xl p-4">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-400 mb-1">Incident signalé</p>
              <p className="text-sm text-foreground">{j.issue_description}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Info panel */}
          <div className="space-y-5">

            {/* Job details */}
            <div className="bg-card border border-border rounded-xl p-5 space-y-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Détails</h3>

              {unit && (
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  <button onClick={() => navigate(`/units/${unit.id}`)} className="text-primary hover:underline">
                    {unit.name}
                  </button>
                </div>
              )}

              {reservation && (
                <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-3">
                  <p className="text-xs font-medium text-blue-400 mb-1 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5" /> Réservation liée
                  </p>
                  <button onClick={() => navigate(`/reservations/${reservation.id}`)}
                    className="text-sm font-semibold text-foreground hover:text-primary transition-colors">
                    {reservation.guest_first_name} {reservation.guest_last_name}
                  </button>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {reservation.check_in} → {reservation.check_out}
                  </p>
                </div>
              )}

              <div className="space-y-2 text-xs text-muted-foreground">
                {j.started_at && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                    Démarré: {new Date(j.started_at).toLocaleTimeString('fr-CA', { timeStyle: 'short' })}
                  </div>
                )}
                {j.completed_at && (
                  <div className="flex items-center gap-2 text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                    Terminé: {new Date(j.completed_at).toLocaleTimeString('fr-CA', { timeStyle: 'short' })}
                  </div>
                )}
                {j.duration_minutes && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                    Durée: {Math.floor(j.duration_minutes / 60) > 0 ? `${Math.floor(j.duration_minutes / 60)}h ` : ''}{j.duration_minutes % 60 > 0 ? `${j.duration_minutes % 60}min` : ''}
                  </div>
                )}
              </div>

              {j.notes && (
                <div className="bg-secondary/20 border border-border rounded-xl p-3">
                  <p className="text-xs text-muted-foreground mb-1">Notes</p>
                  <p className="text-xs text-foreground">{j.notes}</p>
                </div>
              )}
            </div>

            {/* Report issue button */}
            {!isTerminal && !showIssueForm && (
              <button
                onClick={() => setShowIssueForm(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs font-medium text-red-400 hover:bg-red-500/20 transition-colors min-h-[44px]">
                <AlertTriangle className="w-3.5 h-3.5" /> Signaler un incident
              </button>
            )}

            {showIssueForm && (
              <div className="bg-card border border-red-500/20 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-red-400">Signaler un incident</span>
                  <button onClick={() => setShowIssueForm(false)}><X className="w-3.5 h-3.5 text-muted-foreground" /></button>
                </div>
                <textarea value={issueText} onChange={e => setIssueText(e.target.value)} rows={3}
                  placeholder="Décrivez le problème constaté, dégâts, équipement défaillant…"
                  className="w-full bg-secondary/40 border border-border rounded-xl px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/40 resize-none focus:outline-none focus:ring-1 focus:ring-red-400" />
                <button
                  onClick={() => reportIssue.mutate()}
                  disabled={reportIssue.isPending || !issueText.trim()}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-600 text-white rounded-xl text-xs font-semibold disabled:opacity-50 transition-colors">
                  {reportIssue.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <AlertTriangle className="w-3 h-3" />}
                  Confirmer le signalement
                </button>
              </div>
            )}

            {/* ADR note */}
            <div className="flex items-start gap-2 bg-blue-500/5 border border-blue-500/20 rounded-xl p-3">
              <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-400/80">
                <span className="font-semibold text-blue-400">ADR-013 ·</span> Machine d'état pending → assigned → in_progress → done.
                Checklist interactive avec toggle en temps réel.
              </p>
            </div>
          </div>

          {/* Right: Checklist */}
          <div className="lg:col-span-2">
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              {/* Progress header */}
              <div className="px-5 py-4 border-b border-border">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Checklist
                    <span className="text-xs font-normal text-muted-foreground">
                      {completedCount}/{totalCount} tâches
                    </span>
                  </h3>
                  <span className={cn(
                    'text-xs font-bold',
                    progressPct === 100 ? 'text-emerald-400' : progressPct > 50 ? 'text-blue-400' : 'text-muted-foreground',
                  )}>
                    {progressPct}%
                  </span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                  <div
                    className={cn('h-2 rounded-full transition-all duration-500', progressPct === 100 ? 'bg-emerald-400' : 'bg-primary')}
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>

              <div className="p-5">
                {totalCount === 0 ? (
                  <div className="text-center py-10">
                    <Sparkles className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Aucune tâche dans la checklist</p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {Object.entries(byCategory).map(([cat, items]) => (
                      <div key={cat}>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                          {CHECKLIST_CATEGORY_LABELS[cat] ?? cat}
                          <span className="ml-2 font-normal">({items.filter(i => i.is_completed).length}/{items.length})</span>
                        </p>
                        <div className="space-y-1.5">
                          {items.map(item => (
                            <button
                              key={item.id}
                              onClick={() => {
                                if (!isTerminal) toggleItem.mutate({ itemId: item.id, isCompleted: !item.is_completed });
                              }}
                              disabled={isTerminal || toggleItem.isPending}
                              className={cn(
                                'w-full flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all',
                                item.is_completed
                                  ? 'bg-emerald-500/5 border-emerald-500/15 opacity-80'
                                  : 'bg-secondary/20 border-border hover:border-primary/25',
                                !isTerminal && 'cursor-pointer',
                              )}>
                              {item.is_completed
                                ? <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                                : <Circle className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />
                              }
                              <span className={cn(
                                'text-sm flex-1 text-left',
                                item.is_completed ? 'line-through text-muted-foreground' : 'text-foreground',
                              )}>
                                {item.label}
                              </span>
                              {item.is_completed && item.completed_at && (
                                <span className="text-xs text-emerald-400/60 flex-shrink-0">
                                  {new Date(item.completed_at).toLocaleTimeString('fr-CA', { timeStyle: 'short' })}
                                </span>
                              )}
                              {item.note && (
                                <span className="text-xs text-muted-foreground/60 flex-shrink-0 max-w-[120px] truncate">{item.note}</span>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Completion message */}
                {progressPct === 100 && totalCount > 0 && j.status !== 'done' && (
                  <div className="mt-5 bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 text-center">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-emerald-400">Toutes les tâches complétées !</p>
                    <p className="text-xs text-muted-foreground mt-1 mb-3">Vous pouvez marquer ce job comme terminé</p>
                    <button
                      onClick={() => updateStatus.mutate('done')}
                      disabled={updateStatus.isPending}
                      className="flex items-center gap-2 mx-auto px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors">
                      {updateStatus.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      Marquer terminé
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default HousekeepingDetailPage;
