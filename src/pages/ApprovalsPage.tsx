// ApprovalsPage — Live Supabase data + Bulk Actions — ADR-020
// Bulk approve/reject avec checkboxes, commentaire modal sur rejet
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Clock, CheckCircle2, XCircle, AlertTriangle, Shield,
  Search, Plus, Square, CheckSquare, MessageSquare,
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import LoadingSpinner from '@/components/features/LoadingSpinner';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const TENANT_ID = '00000000-0000-0000-0000-000000000001';
const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001';

const SCENARIO_LABELS: Record<string, string> = {
  forced_cancellation: 'Annulation forcée',
  large_refund: 'Remboursement élevé',
  damage_claim: 'Sinistre / Dommages',
  iban_change: 'Changement IBAN',
  vendor_payment: 'Paiement fournisseur',
  maintenance_expense: 'Dépense maintenance',
  listing_publication: 'Publication listing',
  guest_complaint: 'Plainte voyageur',
  property_suspension: 'Suspension propriété',
  financial_config: 'Config. financière',
};

const APPROVAL_TYPE_LABELS: Record<string, string> = {
  single: 'Simple', double: 'Double', owner: 'Propriétaire',
  manager: 'Gestionnaire', finance: 'Finance',
};

const PRIORITY_COLOR: Record<string, string> = {
  critical: 'bg-red-500/10 text-red-400 border-red-500/20',
  high:     'bg-orange-500/10 text-orange-400 border-orange-500/20',
  normal:   'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  low:      'bg-slate-500/10 text-slate-400 border-slate-500/20',
};

const STATUS_COLOR: Record<string, string> = {
  pending:   'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  approved:  'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  rejected:  'bg-red-500/10 text-red-400 border-red-500/20',
  expired:   'bg-slate-500/10 text-slate-400 border-slate-500/20',
  delegated: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  cancelled: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente', approved: 'Approuvé', rejected: 'Refusé',
  expired: 'Expiré', delegated: 'Délégué', cancelled: 'Annulé',
};

type TabId = 'pending' | 'all' | 'policies' | 'history';

const APPROVAL_POLICIES = [
  { scenario: 'forced_cancellation',  type: 'double',  roles: ['ops_manager','tenant_admin'], deadline_h: 4 },
  { scenario: 'large_refund',         type: 'finance', roles: ['accounting'],                 deadline_h: 24 },
  { scenario: 'damage_claim',         type: 'owner',   roles: ['owner','tenant_admin'],       deadline_h: 48 },
  { scenario: 'iban_change',          type: 'double',  roles: ['accounting','tenant_admin'],  deadline_h: 24 },
  { scenario: 'vendor_payment',       type: 'finance', roles: ['accounting'],                 deadline_h: 72 },
  { scenario: 'maintenance_expense',  type: 'manager', roles: ['property_manager','tenant_admin'], deadline_h: 48 },
  { scenario: 'listing_publication',  type: 'manager', roles: ['property_manager'],           deadline_h: 72 },
  { scenario: 'guest_complaint',      type: 'single',  roles: ['ops_manager'],                deadline_h: 12 },
  { scenario: 'property_suspension',  type: 'single',  roles: ['tenant_admin'],               deadline_h: 2 },
  { scenario: 'financial_config',     type: 'double',  roles: ['tenant_admin','accounting'],  deadline_h: 24 },
];

async function fetchApprovals() {
  const { data, error } = await supabase
    .from('approval_requests')
    .select('id, scenario, title, description, priority, status, approval_type, required_approvers, current_approvers, deadline, created_at, updated_at, resolved_at')
    .eq('tenant_id', TENANT_ID)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

async function seedDemoApproval() {
  const { error } = await supabase.from('approval_requests').insert({
    tenant_id: TENANT_ID,
    scenario: 'forced_cancellation',
    title: 'Annulation forcée — Réservation Marie Dubois',
    description: 'Le voyageur demande une annulation 48h avant check-in. Remboursement complet requis (>500 CAD). Double validation ops_manager + tenant_admin.',
    priority: 'critical',
    status: 'pending',
    approval_type: 'double',
    required_approvers: ['ops_manager', 'tenant_admin'],
    current_approvers: [],
    deadline: new Date(Date.now() + 4 * 3600_000).toISOString(),
    requested_action: { action: 'cancel_reservation', refund_amount: 1581.19 },
  });
  if (error) throw error;
}

// ── Rejection Modal ───────────────────────────────────────────────────────────
const RejectionModal = ({
  onConfirm, onCancel, isPending, count,
}: { onConfirm: (comment: string) => void; onCancel: () => void; isPending: boolean; count: number }) => {
  const [comment, setComment] = useState('');
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <XCircle className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Refuser {count > 1 ? `${count} demandes` : 'cette demande'}
            </h2>
            <p className="text-xs text-muted-foreground">ADR-020 · Décision append-only</p>
          </div>
        </div>
        <div className="mb-4">
          <label className="text-xs font-medium text-foreground mb-1.5 flex items-center gap-1">
            <MessageSquare className="w-3 h-3" /> Motif du refus (optionnel)
          </label>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            rows={3}
            placeholder="Raison du refus, informations complémentaires…"
            className="w-full bg-secondary/40 border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 resize-none focus:outline-none focus:ring-1 focus:ring-red-400"
            autoFocus
          />
        </div>
        <div className="flex gap-2">
          <button onClick={onCancel} disabled={isPending}
            className="flex-1 py-2.5 border border-border rounded-xl text-sm text-muted-foreground hover:bg-secondary transition-colors min-h-[44px]">
            Annuler
          </button>
          <button
            onClick={() => onConfirm(comment)}
            disabled={isPending}
            className="flex-1 py-2.5 bg-red-500/10 border border-red-500/25 text-red-400 rounded-xl text-sm font-semibold hover:bg-red-500/20 transition-colors min-h-[44px] disabled:opacity-50">
            {isPending ? 'Refus…' : 'Confirmer le refus'}
          </button>
        </div>
      </div>
    </div>
  );
};

const ApprovalsPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabId>('pending');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null); // null = bulk

  const { data: approvals = [], isLoading } = useQuery({
    queryKey: ['approvals', TENANT_ID],
    queryFn: fetchApprovals,
    staleTime: 15_000,
  });

  // ── Single decision ──
  const decide = useMutation({
    mutationFn: async ({ ids, decision, comment }: { ids: string[]; decision: 'approved' | 'rejected'; comment?: string }) => {
      for (const id of ids) {
        const { error: dErr } = await supabase.from('approval_decisions').insert({
          tenant_id: TENANT_ID, approval_request_id: id, decision,
          decided_by: DEMO_USER_ID, comment: comment ?? null,
        });
        if (dErr) throw dErr;
        const { error: uErr } = await supabase.from('approval_requests')
          .update({ status: decision, resolved_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq('id', id);
        if (uErr) throw uErr;
      }
    },
    onSuccess: (_, { ids, decision }) => {
      queryClient.invalidateQueries({ queryKey: ['approvals', TENANT_ID] });
      setSelected(new Set());
      setShowRejectModal(false);
      setRejectTarget(null);
      toast.success(`${ids.length > 1 ? ids.length + ' demandes' : 'Demande'} ${decision === 'approved' ? 'approuvée(s)' : 'refusée(s)'} ✓`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const seedMutation = useMutation({
    mutationFn: seedDemoApproval,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['approvals', TENANT_ID] }); toast.success('Demande démo créée'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const pending  = approvals.filter(a => a.status === 'pending');
  const history  = approvals.filter(a => a.status !== 'pending');
  const filtered = approvals.filter(a => {
    const q = search.toLowerCase();
    const matchSearch  = !q || a.title.toLowerCase().includes(q) || a.scenario.includes(q);
    const matchStatus  = statusFilter === 'all' || a.status === statusFilter;
    return matchSearch && matchStatus;
  });
  const critical = pending.filter(a => a.priority === 'critical').length;

  // Bulk selection helpers
  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const selectAll = () => {
    if (selected.size === pending.length) setSelected(new Set());
    else setSelected(new Set(pending.map(a => a.id)));
  };

  const handleBulkApprove = () => {
    if (selected.size === 0) return;
    decide.mutate({ ids: Array.from(selected), decision: 'approved' });
  };
  const handleBulkReject = () => {
    if (selected.size === 0) return;
    setRejectTarget(null); // bulk
    setShowRejectModal(true);
  };
  const handleSingleReject = (id: string) => {
    setRejectTarget(id);
    setShowRejectModal(true);
  };
  const confirmReject = (comment: string) => {
    const ids = rejectTarget ? [rejectTarget] : Array.from(selected);
    decide.mutate({ ids, decision: 'rejected', comment: comment || undefined });
  };

  const TABS = [
    { id: 'pending'  as TabId, label: 'En attente',  count: pending.length },
    { id: 'all'      as TabId, label: 'Toutes',       count: null },
    { id: 'policies' as TabId, label: 'Politiques',   count: null },
    { id: 'history'  as TabId, label: 'Historique',   count: null },
  ];

  return (
    <AppLayout>
      {/* Rejection modal */}
      {showRejectModal && (
        <RejectionModal
          count={rejectTarget ? 1 : selected.size}
          onConfirm={confirmReject}
          onCancel={() => { setShowRejectModal(false); setRejectTarget(null); }}
          isPending={decide.isPending}
        />
      )}

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Moteur d'Approbations
              {pending.length > 0 && (
                <span className="text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/25 px-2 py-0.5 rounded-full">
                  {pending.length} en attente
                </span>
              )}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">Human-in-the-Loop · ADR-020 · 10 scénarios obligatoires</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {critical > 0 && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span className="text-sm font-semibold text-red-400">{critical} critique{critical > 1 ? 's' : ''}</span>
              </div>
            )}
            <button
              onClick={() => seedMutation.mutate()}
              disabled={seedMutation.isPending}
              className="flex items-center gap-2 border border-border bg-secondary text-muted-foreground hover:text-foreground rounded-xl px-3 py-2.5 text-xs font-medium transition-colors min-h-[44px]">
              <Plus className="w-3.5 h-3.5" /> Créer démo
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'En attente', value: pending.length, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10' },
            { label: 'Critiques',  value: critical,       icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10' },
            { label: 'Résolus',    value: history.filter(a => ['approved','rejected'].includes(a.status)).length, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
            { label: 'Total',      value: approvals.length, icon: Shield, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
              <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', bg)}>
                <Icon className={cn('w-4 h-4', color)} />
              </div>
              <div>
                <div className={cn('text-xl font-bold', color)}>{value}</div>
                <div className="text-xs text-muted-foreground">{label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border gap-1">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id); setSelected(new Set()); }}
              className={cn('px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-2',
                activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground')}>
              {tab.label}
              {tab.count !== null && (
                <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-bold',
                  tab.count > 0 ? 'bg-amber-500/20 text-amber-400' : 'bg-secondary text-muted-foreground'
                )}>{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
        ) : (
          <>
            {/* ── Pending tab with bulk actions ── */}
            {activeTab === 'pending' && (
              <div className="space-y-3">
                {/* Bulk toolbar */}
                {pending.length > 0 && (
                  <div className="flex items-center gap-3 flex-wrap">
                    {/* Select all */}
                    <button
                      onClick={selectAll}
                      className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors min-h-[36px] px-2">
                      {selected.size === pending.length && pending.length > 0
                        ? <CheckSquare className="w-4 h-4 text-primary" />
                        : <Square className="w-4 h-4" />
                      }
                      {selected.size > 0 ? `${selected.size} sélectionné${selected.size > 1 ? 's' : ''}` : 'Tout sélectionner'}
                    </button>

                    {selected.size > 0 && (
                      <>
                        <div className="h-4 w-px bg-border" />
                        <button
                          onClick={handleBulkApprove}
                          disabled={decide.isPending}
                          className="flex items-center gap-1.5 text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-2 rounded-lg hover:bg-emerald-500/20 transition-colors min-h-[36px] font-medium disabled:opacity-50">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Approuver {selected.size > 1 ? `(${selected.size})` : ''}
                        </button>
                        <button
                          onClick={handleBulkReject}
                          disabled={decide.isPending}
                          className="flex items-center gap-1.5 text-xs bg-red-500/10 text-red-400 border border-red-500/20 px-3 py-2 rounded-lg hover:bg-red-500/20 transition-colors min-h-[36px] font-medium disabled:opacity-50">
                          <XCircle className="w-3.5 h-3.5" />
                          Refuser {selected.size > 1 ? `(${selected.size})` : ''}
                        </button>
                      </>
                    )}
                  </div>
                )}

                {pending.length === 0 ? (
                  <div className="text-center py-16 bg-card border border-border border-dashed rounded-xl">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
                    <p className="text-sm text-muted-foreground">Aucune approbation en attente</p>
                    <button onClick={() => seedMutation.mutate()} className="text-xs text-primary mt-2 hover:underline">
                      Créer une demande de démo
                    </button>
                  </div>
                ) : pending.map(a => (
                  <ApprovalCard
                    key={a.id}
                    approval={a}
                    isSelected={selected.has(a.id)}
                    onToggleSelect={() => toggleSelect(a.id)}
                    onApprove={() => decide.mutate({ ids: [a.id], decision: 'approved' })}
                    onReject={() => handleSingleReject(a.id)}
                    onNavigate={() => navigate(`/approvals/${a.id}`)}
                    deciding={decide.isPending}
                  />
                ))}
              </div>
            )}

            {/* ── All tab ── */}
            {activeTab === 'all' && (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-3">
                  <div className="relative flex-1 min-w-40">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Titre, scénario…"
                      className="w-full pl-9 pr-3 py-2.5 bg-secondary border border-border rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-primary" />
                  </div>
                  <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                    className="bg-secondary border border-border rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary">
                    <option value="all">Tous les statuts</option>
                    {['pending','approved','rejected','expired','delegated'].map(s => (
                      <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                </div>
                {filtered.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">Aucune demande trouvée</div>
                ) : filtered.map(a => (
                  <ApprovalCard
                    key={a.id}
                    approval={a}
                    onApprove={a.status === 'pending' ? () => decide.mutate({ ids: [a.id], decision: 'approved' }) : undefined}
                    onReject={a.status === 'pending' ? () => handleSingleReject(a.id) : undefined}
                    onNavigate={() => navigate(`/approvals/${a.id}`)}
                    deciding={decide.isPending}
                  />
                ))}
              </div>
            )}

            {/* ── Policies tab ── */}
            {activeTab === 'policies' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {APPROVAL_POLICIES.map(p => (
                  <div key={p.scenario} className="bg-card border border-border rounded-xl p-5">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <h3 className="text-sm font-semibold text-foreground">{SCENARIO_LABELS[p.scenario] ?? p.scenario}</h3>
                      <span className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full font-medium flex-shrink-0">
                        {APPROVAL_TYPE_LABELS[p.type] ?? p.type}
                      </span>
                    </div>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex gap-2 flex-wrap">
                        {p.roles.map(r => (
                          <span key={r} className="bg-secondary border border-border px-2 py-0.5 rounded font-mono text-muted-foreground">{r}</span>
                        ))}
                      </div>
                      <p className="text-muted-foreground">Délai : <span className="text-foreground font-medium">{p.deadline_h}h</span></p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── History tab ── */}
            {activeTab === 'history' && (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">{history.length} demandes traitées</p>
                {history.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">Aucun historique</div>
                ) : history.map(a => (
                  <ApprovalCard
                    key={a.id}
                    approval={a}
                    compact
                    onNavigate={() => navigate(`/approvals/${a.id}`)}
                    deciding={false}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* ADR Reference */}
        <div className="bg-secondary/20 border border-border rounded-xl p-4">
          <p className="text-xs font-semibold text-orange-400 mb-2">ADR-020 — RÈGLES GELÉES (Human Approval Engine)</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs text-muted-foreground/70">
            {[
              'RÈGLE-APPR-001: Toute action high/critical = approbation humaine obligatoire',
              'RÈGLE-APPR-002: Décisions append-only — jamais modifiées rétroactivement',
              'RÈGLE-APPR-003: Expiration auto selon politique (auto_reject ou blocage)',
              'RÈGLE-APPR-004: Délégation traçable avec horodatage audit',
              'RÈGLE-APPR-005: Notifications multi-canal (email/SMS/in_app)',
              'RÈGLE-APPR-006: AgentRun pause sur require_approval → reprend post-décision',
              'RÈGLE-APPR-007: Calculs financiers = PostgreSQL uniquement (ADR-015)',
              'RÈGLE-APPR-008: Double approbation obligatoire scénarios critiques',
            ].map(r => (
              <div key={r} className="flex items-start gap-1.5">
                <Shield className="w-3 h-3 flex-shrink-0 mt-0.5 text-orange-400/60" />
                <span>{r}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

// ── ApprovalCard component ────────────────────────────────────────────────────
interface ApprovalCardProps {
  approval: {
    id: string; scenario: string; title: string; description: string;
    priority: string; status: string; approval_type: string;
    required_approvers: string[]; deadline?: string | null; created_at: string;
  };
  isSelected?: boolean;
  onToggleSelect?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  onNavigate?: () => void;
  compact?: boolean;
  deciding?: boolean;
}

const ApprovalCard = ({
  approval: a, isSelected, onToggleSelect, onApprove, onReject, onNavigate, compact, deciding,
}: ApprovalCardProps) => {
  const isOverdue = a.deadline && new Date(a.deadline) < new Date() && a.status === 'pending';

  return (
    <div className={cn(
      'bg-card border rounded-xl p-4 transition-colors',
      isOverdue ? 'border-red-500/30' : isSelected ? 'border-primary/40 bg-primary/3' : 'border-border hover:border-border/80'
    )}>
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        {onToggleSelect && (
          <button onClick={onToggleSelect} className="mt-0.5 flex-shrink-0 min-h-[24px] min-w-[24px] flex items-center justify-center">
            {isSelected
              ? <CheckSquare className="w-4 h-4 text-primary" />
              : <Square className="w-4 h-4 text-muted-foreground/40 hover:text-muted-foreground" />
            }
          </button>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', PRIORITY_COLOR[a.priority] ?? 'bg-secondary text-muted-foreground border-border')}>
                {a.priority}
              </span>
              <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', STATUS_COLOR[a.status] ?? 'bg-secondary text-muted-foreground border-border')}>
                {STATUS_LABELS[a.status] ?? a.status}
              </span>
              <span className="text-xs text-muted-foreground bg-secondary border border-border px-2 py-0.5 rounded-full">
                {SCENARIO_LABELS[a.scenario] ?? a.scenario}
              </span>
            </div>
            <span className="text-xs text-muted-foreground flex-shrink-0">{new Date(a.created_at).toLocaleDateString('fr-CA')}</span>
          </div>

          <h3
            className={cn('text-sm font-semibold text-foreground mb-1', onNavigate && 'cursor-pointer hover:text-primary transition-colors')}
            onClick={onNavigate}
          >
            {a.title}
          </h3>
          {!compact && <p className="text-xs text-muted-foreground mb-2 leading-relaxed line-clamp-2">{a.description}</p>}

          <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
            <span>{APPROVAL_TYPE_LABELS[a.approval_type] ?? a.approval_type}</span>
            {a.required_approvers.length > 0 && (
              <span>Approbateurs : {a.required_approvers.join(', ')}</span>
            )}
            {a.deadline && (
              <span className={cn(isOverdue ? 'text-red-400 font-medium' : '')}>
                Délai : {new Date(a.deadline).toLocaleString('fr-CA', { dateStyle: 'short', timeStyle: 'short' })}
                {isOverdue && ' · EN RETARD'}
              </span>
            )}
          </div>

          {(onApprove || onReject) && a.status === 'pending' && (
            <div className="mt-3 pt-3 border-t border-border flex gap-2">
              {onApprove && (
                <button
                  onClick={onApprove}
                  disabled={deciding}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-2 rounded-lg hover:bg-emerald-500/20 transition-colors min-h-[36px] font-medium disabled:opacity-50">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Approuver
                </button>
              )}
              {onReject && (
                <button
                  onClick={onReject}
                  disabled={deciding}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs bg-red-500/10 text-red-400 border border-red-500/20 px-3 py-2 rounded-lg hover:bg-red-500/20 transition-colors min-h-[36px] font-medium disabled:opacity-50">
                  <XCircle className="w-3.5 h-3.5" /> Refuser
                </button>
              )}
              {onNavigate && (
                <button
                  onClick={onNavigate}
                  className="px-3 py-2 text-xs text-muted-foreground border border-border rounded-lg hover:bg-secondary transition-colors min-h-[36px]">
                  Détails →
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApprovalsPage;
