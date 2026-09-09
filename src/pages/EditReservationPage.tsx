// EditReservationPage — Changement de statut + notes internes — ADR-010
// State machine immutable : STATUS_TRANSITIONS définit les transitions autorisées
// Insertion dans reservation_status_history (append-only) + UPDATE reservations.version++
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, BookOpen, CheckCircle2, AlertTriangle,
  Clock, MessageSquare, Save, Loader2, ArrowRight, Info,
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import LoadingSpinner from '@/components/features/LoadingSpinner';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const TENANT_ID = '00000000-0000-0000-0000-000000000001';

// ── Immutable state machine (ADR-010) ────────────────────────────────────────
const STATUS_TRANSITIONS: Record<string, string[]> = {
  inquiry:     ['pending', 'cancelled'],
  pending:     ['confirmed', 'cancelled'],
  confirmed:   ['checked_in', 'cancelled'],
  checked_in:  ['checked_out', 'no_show'],
  checked_out: [],
  cancelled:   [],
  no_show:     [],
};

const STATUS_LABELS: Record<string, string> = {
  inquiry:     'Demande initiale',
  pending:     'En attente',
  confirmed:   'Confirmée',
  checked_in:  'Arrivé',
  checked_out: 'Parti',
  cancelled:   'Annulée',
  no_show:     'Non-présentation',
};

const STATUS_COLORS: Record<string, string> = {
  inquiry:     'bg-purple-500/10 text-purple-400 border-purple-500/20',
  pending:     'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  confirmed:   'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  checked_in:  'bg-blue-500/10 text-blue-400 border-blue-500/20',
  checked_out: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  cancelled:   'bg-red-500/10 text-red-400 border-red-500/20',
  no_show:     'bg-red-500/10 text-red-400 border-red-500/20',
};

const TERMINAL_STATUSES = new Set(['checked_out', 'cancelled', 'no_show']);

const CANCEL_STATUSES = new Set(['cancelled', 'no_show']);

const editSchema = z.object({
  new_status:     z.string().min(1, 'Sélectionnez un statut'),
  reason:         z.string().min(3, 'Raison requise (min 3 caractères)').max(300),
  internal_notes: z.string().max(1000).optional(),
});
type EditFormData = z.infer<typeof editSchema>;

const inputCls =
  'w-full bg-secondary/40 border border-border rounded-xl px-4 py-3 text-sm text-foreground ' +
  'placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary ' +
  'focus:border-primary transition-colors';

const EditReservationPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: reservation, isLoading } = useQuery({
    queryKey: ['reservation-edit', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reservations')
        .select('id, status, version, guest_first_name, guest_last_name, check_in, check_out, internal_notes, channel, total_amount, currency')
        .eq('id', id!)
        .eq('tenant_id', TENANT_ID)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
    staleTime: 30_000,
  });

  const nextStatuses = reservation ? (STATUS_TRANSITIONS[reservation.status] ?? []) : [];

  const { register, handleSubmit, watch, formState: { errors, isValid } } = useForm<EditFormData>({
    resolver: zodResolver(editSchema),
    defaultValues: { new_status: '', reason: '', internal_notes: '' },
    mode: 'onChange',
  });

  const selectedStatus = watch('new_status');

  const updateStatus = useMutation({
    mutationFn: async (data: EditFormData) => {
      const oldStatus = reservation!.status;

      // 1. UPDATE reservations (status + notes + version++)
      const { error: updateErr } = await supabase
        .from('reservations')
        .update({
          status:         data.new_status,
          internal_notes: data.internal_notes?.trim() || reservation!.internal_notes,
          version:        (reservation!.version ?? 1) + 1,
          updated_at:     new Date().toISOString(),
        })
        .eq('id', id!)
        .eq('tenant_id', TENANT_ID);
      if (updateErr) throw updateErr;

      // 2. INSERT reservation_status_history (append-only ADR-010)
      const { error: histErr } = await supabase
        .from('reservation_status_history')
        .insert({
          tenant_id:      TENANT_ID,
          reservation_id: id!,
          from_status:    oldStatus,
          to_status:      data.new_status,
          reason:         data.reason.trim(),
        });
      if (histErr) throw histErr;
    },
    onSuccess: (_, data) => {
      queryClient.invalidateQueries({ queryKey: ['reservation-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['reservations', TENANT_ID] });
      queryClient.invalidateQueries({ queryKey: ['reservation-edit', id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success(`Statut mis à jour → ${STATUS_LABELS[data.new_status] ?? data.new_status}`);
      navigate(`/reservations/${id}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return <AppLayout><div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div></AppLayout>;
  }

  if (!reservation) {
    return (
      <AppLayout>
        <div className="text-center py-20">
          <p className="text-sm text-muted-foreground mb-3">Réservation introuvable</p>
          <button onClick={() => navigate('/reservations')} className="text-primary text-sm hover:underline">← Retour</button>
        </div>
      </AppLayout>
    );
  }

  const isTerminal = TERMINAL_STATUSES.has(reservation.status);

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <button onClick={() => navigate('/reservations')} className="hover:text-foreground transition-colors">Réservations</button>
          <span>/</span>
          <button onClick={() => navigate(`/reservations/${id}`)} className="hover:text-foreground transition-colors">
            {reservation.guest_first_name} {reservation.guest_last_name}
          </button>
          <span>/</span>
          <span className="text-foreground">Modifier statut</span>
        </div>

        {/* Title */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">
              {reservation.guest_first_name} {reservation.guest_last_name}
            </h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={cn('text-xs px-2.5 py-1 rounded-full border font-medium', STATUS_COLORS[reservation.status] ?? '')}>
                {STATUS_LABELS[reservation.status] ?? reservation.status}
              </span>
              <span className="text-xs text-muted-foreground">
                {reservation.check_in} → {reservation.check_out}
                {reservation.total_amount > 0 && ` · ${Number(reservation.total_amount).toFixed(2)} ${reservation.currency}`}
              </span>
            </div>
          </div>
        </div>

        {/* Terminal state warning */}
        {isTerminal && (
          <div className="bg-red-500/5 border border-red-500/20 rounded-xl px-5 py-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-400">État terminal — aucune transition autorisée</p>
              <p className="text-xs text-red-400/70 mt-1">
                Les réservations <strong>{STATUS_LABELS[reservation.status]}</strong> ne peuvent plus être modifiées (ADR-010 — immutable state machine).
              </p>
            </div>
          </div>
        )}

        {/* ADR Note */}
        <div className="flex items-start gap-2 bg-blue-500/5 border border-blue-500/20 rounded-xl px-4 py-3">
          <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-400/80 leading-relaxed">
            <span className="font-semibold text-blue-400">ADR-010 ·</span> Machine d'état immutable — seules les transitions ci-dessous sont autorisées.
            Chaque changement génère une entrée append-only dans <code className="font-mono">reservation_status_history</code>.
          </p>
        </div>

        {!isTerminal && nextStatuses.length === 0 && (
          <div className="bg-secondary border border-border rounded-xl p-5 text-center">
            <Clock className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Aucune transition disponible depuis l'état actuel.</p>
          </div>
        )}

        {nextStatuses.length > 0 && (
          <form onSubmit={handleSubmit(d => updateStatus.mutate(d))} className="space-y-6">

            {/* Status selector */}
            <section className="bg-card border border-border rounded-xl p-5 space-y-4">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <ArrowRight className="w-4 h-4 text-primary" /> Choisir le nouveau statut
              </h2>
              <div className="space-y-2">
                {nextStatuses.map(ns => {
                  const isCancel = CANCEL_STATUSES.has(ns);
                  const isSelected = selectedStatus === ns;
                  return (
                    <label key={ns} className="cursor-pointer block">
                      <input type="radio" value={ns} {...register('new_status')} className="sr-only peer" />
                      <div className={cn(
                        'flex items-center gap-4 p-4 rounded-xl border-2 transition-all',
                        isSelected
                          ? isCancel
                            ? 'border-red-500/40 bg-red-500/5'
                            : 'border-primary/40 bg-primary/5'
                          : 'border-border bg-secondary/20 hover:border-border/70',
                      )}>
                        <div className={cn(
                          'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border',
                          STATUS_COLORS[ns] ?? 'bg-secondary border-border',
                        )}>
                          {isCancel
                            ? <AlertTriangle className="w-5 h-5" />
                            : <CheckCircle2 className="w-5 h-5" />
                          }
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-foreground">{STATUS_LABELS[ns]}</p>
                          <p className="text-xs text-muted-foreground">
                            {reservation.status} → {ns}
                          </p>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className={cn('w-5 h-5 flex-shrink-0', isCancel ? 'text-red-400' : 'text-primary')} />
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
              {errors.new_status && <p className="text-xs text-red-400">{errors.new_status.message}</p>}
            </section>

            {/* Reason + notes */}
            <section className="bg-card border border-border rounded-xl p-5 space-y-4">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-muted-foreground" /> Raison & notes
              </h2>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Raison du changement <span className="text-red-400">*</span>
                </label>
                <input
                  {...register('reason')}
                  placeholder="Ex: Paiement reçu, client confirmé, voyage annulé…"
                  className={inputCls}
                />
                {errors.reason && <p className="text-xs text-red-400">{errors.reason.message}</p>}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Notes internes (optionnel)
                </label>
                <textarea
                  {...register('internal_notes')}
                  rows={3}
                  placeholder="Contexte interne, demandes spéciales, suivi opérationnel…"
                  className={inputCls + ' resize-none'}
                />
                <p className="text-xs text-muted-foreground/60">
                  Ces notes sont visibles uniquement par votre équipe, jamais par le voyageur.
                </p>
              </div>
            </section>

            {/* Preview */}
            {selectedStatus && (
              <div className={cn(
                'rounded-xl px-5 py-4 border',
                CANCEL_STATUSES.has(selectedStatus)
                  ? 'bg-red-500/5 border-red-500/20'
                  : 'bg-emerald-500/5 border-emerald-500/20',
              )}>
                <p className={cn('text-xs font-semibold mb-1', CANCEL_STATUSES.has(selectedStatus) ? 'text-red-400' : 'text-emerald-400')}>
                  Aperçu de la transition
                </p>
                <div className="flex items-center gap-2 text-xs">
                  <span className={cn('px-2 py-0.5 rounded-full border font-medium', STATUS_COLORS[reservation.status] ?? '')}>
                    {STATUS_LABELS[reservation.status]}
                  </span>
                  <ArrowRight className="w-3 h-3 text-muted-foreground" />
                  <span className={cn('px-2 py-0.5 rounded-full border font-medium', STATUS_COLORS[selectedStatus] ?? '')}>
                    {STATUS_LABELS[selectedStatus]}
                  </span>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 pb-8">
              <button
                type="button"
                onClick={() => navigate(`/reservations/${id}`)}
                className="flex items-center gap-2 px-5 py-3 border border-border rounded-xl text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors min-h-[48px]"
              >
                <ArrowLeft className="w-4 h-4" /> Annuler
              </button>
              <button
                type="submit"
                disabled={updateStatus.isPending || !isValid}
                className={cn(
                  'flex-1 py-3 rounded-xl text-sm font-semibold transition-all min-h-[48px] flex items-center justify-center gap-2',
                  !updateStatus.isPending && isValid
                    ? CANCEL_STATUSES.has(selectedStatus)
                      ? 'bg-red-500 text-white hover:bg-red-600 active:scale-[0.99]'
                      : 'bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.99]'
                    : 'bg-secondary text-muted-foreground cursor-not-allowed',
                )}
              >
                {updateStatus.isPending
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Mise à jour…</>
                  : <><Save className="w-4 h-4" /> Confirmer le changement de statut</>
                }
              </button>
            </div>
          </form>
        )}
      </div>
    </AppLayout>
  );
};

export default EditReservationPage;
