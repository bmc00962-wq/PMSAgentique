// ApprovalDetailPage — Live Supabase data — ADR-020
// Timeline décisions append-only · Boutons Approuver/Refuser avec commentaire
// INSERT approval_decisions + UPDATE approval_requests.status
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Clock, AlertTriangle, CheckCircle2, XCircle, Shield,
  User, Building2, DollarSign, MessageSquare, BookOpen, Info,
  ChevronRight, Loader2, Calendar, Flag,
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import LoadingSpinner from '@/components/features/LoadingSpinner';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

const TENANT_ID = '00000000-0000-0000-0000-000000000001';

const STATUS_COLORS: Record<string, string> = {
  pending:   'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  approved:  'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  rejected:  'bg-red-500/10 text-red-400 border-red-500/20',
  expired:   'bg-slate-500/10 text-slate-400 border-slate-500/20',
  cancelled: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente', approved: 'Approuvé', rejected: 'Refusé',
  expired: 'Expiré', cancelled: 'Annulé',
};

const PRIORITY_COLORS: Record<string, string> = {
  low:    'text-slate-400',
  normal: 'text-blue-400',
  high:   'text-orange-400',
  urgent: 'text-red-400',
  critical:'text-red-500',
};

const SCENARIO_LABELS: Record<string, string> = {
  high_value_refund:       'Remboursement élevé',
  maintenance_budget:      'Budget maintenance',
  early_checkout_discount: 'Remise départ anticipé',
  cancellation_policy:     'Politique annulation',
  late_checkin:            'Arrivée tardive',
  special_request:         'Demande spéciale',
  rate_override:           'Override tarif',
  owner_payout:            'Versement propriétaire',
  guest_complaint:         'Réclamation voyageur',
  extension_request:       'Prolongation séjour',
};

const DECISION_COLOR: Record<string, string> = {
  approved:  'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
  rejected:  'bg-red-500/10 border-red-500/20 text-red-400',
  delegated: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
  abstained: 'bg-slate-500/10 border-slate-500/20 text-slate-400',
};

async function fetchApprovalDetail(id: string) {
  const { data: req, error } = await supabase
    .from('approval_requests')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', TENANT_ID)
    .single();
  if (error) throw error;

  // Fetch decisions
  const { data: decisions } = await supabase
    .from('approval_decisions')
    .select('id, decision, comment, created_at, decided_by')
    .eq('approval_request_id', id)
    .eq('tenant_id', TENANT_ID)
    .order('created_at', { ascending: true });

  // Fetch linked entity if present
  let linkedReservation = null;
  let linkedTicket = null;

  if (req.entity_type === 'reservation' && req.entity_id) {
    const { data: res } = await supabase
      .from('reservations')
      .select('id, guest_first_name, guest_last_name, check_in, check_out, total_amount, currency, status')
      .eq('id', req.entity_id)
      .single();
    linkedReservation = res;
  }

  if (req.entity_type === 'maintenance_ticket' && req.entity_id) {
    const { data: ticket } = await supabase
      .from('maintenance_tickets')
      .select('id, title, priority, status, estimated_cost, currency')
      .eq('id', req.entity_id)
      .single();
    linkedTicket = ticket;
  }

  return {
    request: req,
    decisions: decisions ?? [],
    linkedReservation,
    linkedTicket,
  };
}

const ApprovalDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [decisionType, setDecisionType] = useState<'approved' | 'rejected' | null>(null);
  const [comment, setComment] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['approval-detail', id],
    queryFn: () => fetchApprovalDetail(id!),
    enabled: !!id,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const submitDecision = useMutation({
    mutationFn: async ({ decision, comment }: { decision: string; comment: string }) => {
      const req = data!.request;

      // 1. INSERT approval_decision (append-only ADR-020)
      const { error: decErr } = await supabase.from('approval_decisions').insert({
        tenant_id: TENANT_ID,
        approval_request_id: id!,
        decision,
        decided_by: user?.id ?? null,
        comment: comment.trim() || null,
      });
      if (decErr) throw decErr;

      // 2. UPDATE approval_request status
      const currentApprovers = (req.current_approvers ?? []).length + 1;
      const required = req.required_approvers?.length ?? 1;
      const newStatus = decision === 'rejected'
        ? 'rejected'
        : currentApprovers >= required ? 'approved' : 'pending';

      const { error: reqErr } = await supabase
        .from('approval_requests')
        .update({
          status: newStatus,
          current_approvers: [...(req.current_approvers ?? []), user?.id ?? 'user'],
          resolved_at: newStatus !== 'pending' ? new Date().toISOString() : null,
          version: (req.version ?? 1) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id!)
        .eq('tenant_id', TENANT_ID);
      if (reqErr) throw reqErr;

      return newStatus;
    },
    onSuccess: (newStatus) => {
      queryClient.invalidateQueries({ queryKey: ['approval-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['approvals', TENANT_ID] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      const label = newStatus === 'approved' ? 'Approuvé ✓' : newStatus === 'rejected' ? 'Refusé ✓' : 'Décision enregistrée';
      toast.success(label);
      setDecisionType(null);
      setComment('');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <AppLayout><div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div></AppLayout>;

  if (!data?.request) {
    return (
      <AppLayout>
        <div className="text-center py-20">
          <p className="text-sm text-muted-foreground mb-3">Demande d'approbation introuvable</p>
          <button onClick={() => navigate('/approvals')} className="text-primary text-sm hover:underline">← Approbations</button>
        </div>
      </AppLayout>
    );
  }

  const { request: req, decisions, linkedReservation, linkedTicket } = data;
  const isPending = req.status === 'pending';
  const isDeadlinePassed = req.deadline && new Date(req.deadline) < new Date();

  const requestedAction = req.requested_action as Record<string, unknown> ?? {};

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <button onClick={() => navigate('/approvals')} className="hover:text-foreground flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Approbations
          </button>
          <span>/</span>
          <span className="text-foreground truncate max-w-xs">{req.title}</span>
        </div>

        {/* Hero */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-start gap-4 flex-wrap">
            <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <Shield className="w-6 h-6 text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h1 className="text-lg font-bold text-foreground">{req.title}</h1>
                <span className={cn('text-xs px-2.5 py-1 rounded-full border font-medium', STATUS_COLORS[req.status] ?? '')}>
                  {STATUS_LABELS[req.status] ?? req.status}
                </span>
                <span className={cn('text-xs font-semibold uppercase', PRIORITY_COLORS[req.priority] ?? 'text-muted-foreground')}>
                  {req.priority}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{req.description}</p>
              <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                <span className="bg-secondary px-2 py-0.5 rounded font-mono">{SCENARIO_LABELS[req.scenario] ?? req.scenario}</span>
                <span>Type: <strong className="text-foreground capitalize">{req.approval_type}</strong></span>
                <span>{(req.current_approvers ?? []).length}/{(req.required_approvers ?? []).length} approbateurs</span>
              </div>
            </div>
          </div>
        </div>

        {/* Deadline warning */}
        {isPending && isDeadlinePassed && (
          <div className="flex items-center gap-2 bg-red-500/5 border border-red-500/20 rounded-xl p-3">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <p className="text-xs text-red-400">
              La date limite a expiré le {new Date(req.deadline).toLocaleDateString('fr-CA', { dateStyle: 'long' })}.
              Cette demande peut être auto-rejetée.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left — Context + action */}
          <div className="lg:col-span-2 space-y-5">

            {/* Context card */}
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contexte de la demande</h3>

              {/* Requested action */}
              {Object.keys(requestedAction).length > 0 && (
                <div className="bg-secondary/20 border border-border rounded-xl p-4 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Action demandée</p>
                  {Object.entries(requestedAction).map(([k, v]) => (
                    <div key={k} className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground capitalize">{k.replace(/_/g, ' ')} :</span>
                      <span className="text-foreground font-medium">{String(v)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Linked reservation */}
              {linkedReservation && (
                <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
                  <p className="text-xs font-medium text-blue-400 mb-2 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5" /> Réservation liée
                  </p>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {linkedReservation.guest_first_name} {linkedReservation.guest_last_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {linkedReservation.check_in} → {linkedReservation.check_out}
                        {' · '}
                        <span className="font-mono font-semibold text-emerald-400">
                          {Number(linkedReservation.total_amount).toFixed(2)} {linkedReservation.currency}
                        </span>
                      </p>
                    </div>
                    <button onClick={() => navigate(`/reservations/${linkedReservation.id}`)}
                      className="text-xs text-primary hover:underline flex-shrink-0 flex items-center gap-1">
                      Voir <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}

              {/* Linked maintenance ticket */}
              {linkedTicket && (
                <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-4">
                  <p className="text-xs font-medium text-orange-400 mb-2 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5" /> Ticket maintenance lié
                  </p>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{linkedTicket.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Priorité: {linkedTicket.priority} · Statut: {linkedTicket.status}
                        {linkedTicket.estimated_cost ? ` · ~${Number(linkedTicket.estimated_cost).toFixed(2)} ${linkedTicket.currency}` : ''}
                      </p>
                    </div>
                    <button onClick={() => navigate(`/maintenance/${linkedTicket.id}`)}
                      className="text-xs text-primary hover:underline flex-shrink-0 flex items-center gap-1">
                      Voir <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-secondary/20 border border-border rounded-lg p-3">
                  <p className="text-muted-foreground mb-1">Créé le</p>
                  <p className="font-medium text-foreground">{new Date(req.created_at).toLocaleDateString('fr-CA', { dateStyle: 'long' })}</p>
                </div>
                {req.deadline && (
                  <div className={cn('border rounded-lg p-3', isDeadlinePassed ? 'bg-red-500/5 border-red-500/20' : 'bg-secondary/20 border-border')}>
                    <p className="text-muted-foreground mb-1">Échéance</p>
                    <p className={cn('font-medium', isDeadlinePassed ? 'text-red-400' : 'text-foreground')}>
                      {new Date(req.deadline).toLocaleDateString('fr-CA', { dateStyle: 'long' })}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Decision form */}
            {isPending && (
              <div className="bg-card border border-border rounded-xl p-5 space-y-4">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Flag className="w-3.5 h-3.5" /> Votre décision
                </h3>

                {/* Decision type selector */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setDecisionType(decisionType === 'approved' ? null : 'approved')}
                    className={cn(
                      'flex items-center gap-3 p-4 rounded-xl border-2 transition-all',
                      decisionType === 'approved'
                        ? 'border-emerald-500/50 bg-emerald-500/10'
                        : 'border-border bg-secondary/20 hover:border-emerald-500/30',
                    )}>
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    <div className="text-left">
                      <p className="text-sm font-semibold text-foreground">Approuver</p>
                      <p className="text-xs text-muted-foreground">Valider la demande</p>
                    </div>
                  </button>
                  <button
                    onClick={() => setDecisionType(decisionType === 'rejected' ? null : 'rejected')}
                    className={cn(
                      'flex items-center gap-3 p-4 rounded-xl border-2 transition-all',
                      decisionType === 'rejected'
                        ? 'border-red-500/50 bg-red-500/10'
                        : 'border-border bg-secondary/20 hover:border-red-500/30',
                    )}>
                    <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                    <div className="text-left">
                      <p className="text-sm font-semibold text-foreground">Refuser</p>
                      <p className="text-xs text-muted-foreground">Rejeter la demande</p>
                    </div>
                  </button>
                </div>

                {/* Comment field */}
                {decisionType && (
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-foreground">
                      Commentaire <span className="text-muted-foreground font-normal">(optionnel)</span>
                    </label>
                    <textarea
                      value={comment}
                      onChange={e => setComment(e.target.value)}
                      rows={3}
                      placeholder={decisionType === 'approved' ? 'Raison de l\'approbation, conditions éventuelles…' : 'Raison du refus, actions alternatives suggérées…'}
                      className="w-full bg-secondary/40 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <button
                      onClick={() => submitDecision.mutate({ decision: decisionType, comment })}
                      disabled={submitDecision.isPending}
                      className={cn(
                        'w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all min-h-[48px]',
                        decisionType === 'approved'
                          ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                          : 'bg-red-600 text-white hover:bg-red-700',
                        'disabled:opacity-50',
                      )}>
                      {submitDecision.isPending
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Enregistrement…</>
                        : decisionType === 'approved'
                        ? <><CheckCircle2 className="w-4 h-4" /> Confirmer l'approbation</>
                        : <><XCircle className="w-4 h-4" /> Confirmer le refus</>
                      }
                    </button>
                    <p className="text-xs text-muted-foreground/60 text-center">
                      Décision enregistrée en append-only · ADR-020 RÈGLE-APPR-002
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right — Timeline */}
          <div className="space-y-5">
            {/* Decision timeline */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" /> Journal des décisions
              </h3>

              {decisions.length === 0 ? (
                <div className="text-center py-6">
                  <Clock className="w-6 h-6 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Aucune décision enregistrée</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {decisions.map((d, i) => (
                    <div key={d.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={cn(
                          'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 border',
                          DECISION_COLOR[d.decision] ?? 'bg-secondary border-border text-muted-foreground',
                        )}>
                          {d.decision === 'approved'
                            ? <CheckCircle2 className="w-3.5 h-3.5" />
                            : d.decision === 'rejected'
                            ? <XCircle className="w-3.5 h-3.5" />
                            : <User className="w-3.5 h-3.5" />
                          }
                        </div>
                        {i < decisions.length - 1 && (
                          <div className="w-px flex-1 bg-border mt-1 min-h-4" />
                        )}
                      </div>
                      <div className="flex-1 pb-2">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={cn('text-xs font-semibold capitalize', DECISION_COLOR[d.decision]?.split(' ')[2] ?? 'text-foreground')}>
                            {d.decision === 'approved' ? 'Approuvé' : d.decision === 'rejected' ? 'Refusé' : d.decision}
                          </span>
                        </div>
                        {d.comment && (
                          <p className="text-xs text-foreground bg-secondary/30 rounded-lg px-2.5 py-1.5 mb-1">{d.comment}</p>
                        )}
                        <p className="text-xs text-muted-foreground/60">
                          {new Date(d.created_at).toLocaleDateString('fr-CA', { dateStyle: 'medium' })}
                          {' '}
                          {new Date(d.created_at).toLocaleTimeString('fr-CA', { timeStyle: 'short' })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Required approvers */}
            {req.required_approvers && req.required_approvers.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                  <User className="w-3.5 h-3.5" /> Approbateurs requis
                </h3>
                <div className="space-y-2">
                  {req.required_approvers.map((approver: string) => {
                    const hasDecided = (req.current_approvers ?? []).includes(approver);
                    return (
                      <div key={approver} className="flex items-center gap-2 text-xs">
                        <div className={cn('w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0',
                          hasDecided ? 'bg-emerald-500/20' : 'bg-secondary',
                        )}>
                          {hasDecided
                            ? <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            : <Clock className="w-3 h-3 text-muted-foreground" />
                          }
                        </div>
                        <span className={hasDecided ? 'text-emerald-400' : 'text-muted-foreground'}>
                          {approver.replace(/_/g, ' ')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ADR note */}
            <div className="flex items-start gap-2 bg-blue-500/5 border border-blue-500/20 rounded-xl p-3">
              <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-400/80">
                <span className="font-semibold text-blue-400">ADR-020 ·</span> approval_decisions append-only.
                approval_requests.status = approved quand tous les approbateurs requis ont validé.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default ApprovalDetailPage;
