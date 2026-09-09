// OwnerStatementDetailPage — Live Supabase data — ADR-015
// Détail relevé propriétaire: finances, réservations incluses, transitions statut, export PDF
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, FileText, Send, CheckCircle2, Clock,
  DollarSign, Calendar, BookOpen, TrendingUp, Download,
  Printer, AlertTriangle, Info, User,
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import LoadingSpinner from '@/components/features/LoadingSpinner';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const TENANT_ID = '00000000-0000-0000-0000-000000000001';

const STATUS_COLOR: Record<string, string> = {
  draft:            'bg-slate-500/10 text-slate-400 border-slate-500/20',
  pending_approval: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  approved:         'bg-blue-500/10 text-blue-400 border-blue-500/20',
  sent:             'bg-purple-500/10 text-purple-400 border-purple-500/20',
  paid:             'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon', pending_approval: 'En approbation',
  approved: 'Approuvé', sent: 'Envoyé', paid: 'Payé',
};

// State machine: which transitions are allowed
const STATUS_TRANSITIONS: Record<string, { next: string; label: string; icon: React.ReactNode; color: string }[]> = {
  draft:            [{ next: 'sent',  label: 'Marquer envoyé', icon: null, color: 'bg-purple-500/10 text-purple-400 border-purple-500/25 hover:bg-purple-500/20' }],
  pending_approval: [{ next: 'approved', label: 'Approuver', icon: null, color: 'bg-blue-500/10 text-blue-400 border-blue-500/25 hover:bg-blue-500/20' }],
  approved:         [{ next: 'sent',  label: 'Envoyer au propriétaire', icon: null, color: 'bg-purple-500/10 text-purple-400 border-purple-500/25 hover:bg-purple-500/20' }],
  sent:             [{ next: 'paid',  label: 'Marquer payé', icon: null, color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/20' }],
  paid:             [],
};

async function fetchStatementDetail(id: string) {
  const { data: stmt, error } = await supabase
    .from('owner_statements')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', TENANT_ID)
    .single();
  if (error) throw error;

  // Owner info
  const { data: owner } = await supabase
    .from('owners')
    .select('id, first_name, last_name, email, phone, address, city, country, language')
    .eq('id', stmt.owner_id)
    .single();

  // Properties belonging to this owner in the period
  const { data: properties } = await supabase
    .from('properties')
    .select('id, name, city, country')
    .eq('owner_id', stmt.owner_id)
    .eq('tenant_id', TENANT_ID)
    .is('deleted_at', null);

  const propIds = (properties ?? []).map(p => p.id);

  // Units of those properties
  const { data: units } = propIds.length > 0
    ? await supabase.from('units').select('id, name, property_id').in('property_id', propIds)
    : { data: [] };

  const unitIds = (units ?? []).map(u => u.id);

  // Reservations in the statement period
  const { data: reservations } = unitIds.length > 0
    ? await supabase
        .from('reservations')
        .select('id, unit_id, status, channel, check_in, check_out, nights, guest_first_name, guest_last_name, base_rent, cleaning_fee, tax_amount, channel_commission, total_amount, currency')
        .eq('tenant_id', TENANT_ID)
        .in('unit_id', unitIds)
        .in('status', ['confirmed', 'checked_in', 'checked_out'])
        .gte('check_in', stmt.period_start)
        .lte('check_out', stmt.period_end)
        .is('deleted_at', null)
        .order('check_in')
    : { data: [] };

  // Build unit/property maps
  const propMap: Record<string, string> = {};
  for (const p of properties ?? []) propMap[p.id] = p.name;
  const unitMap: Record<string, { name: string; propName: string }> = {};
  for (const u of units ?? []) unitMap[u.id] = { name: u.name, propName: propMap[u.property_id] ?? '—' };

  return {
    stmt,
    owner,
    properties: properties ?? [],
    reservations: (reservations ?? []).map(r => ({
      ...r,
      unit_name: unitMap[r.unit_id]?.name ?? '—',
      property_name: unitMap[r.unit_id]?.propName ?? '—',
    })),
  };
}

const OwnerStatementDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['statement-detail', id],
    queryFn: () => fetchStatementDetail(id!),
    enabled: !!id,
    staleTime: 60_000,
  });

  const transition = useMutation({
    mutationFn: async (nextStatus: string) => {
      const updates: Record<string, unknown> = {
        status: nextStatus,
        updated_at: new Date().toISOString(),
      };
      if (nextStatus === 'sent') updates.sent_at = new Date().toISOString();
      if (nextStatus === 'paid') updates.paid_at = new Date().toISOString();

      const { error } = await supabase
        .from('owner_statements')
        .update(updates)
        .eq('id', id!);
      if (error) throw error;
    },
    onSuccess: (_, nextStatus) => {
      queryClient.invalidateQueries({ queryKey: ['statement-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['owner-statements', TENANT_ID] });
      toast.success(`Relevé → ${STATUS_LABELS[nextStatus] ?? nextStatus} ✓`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const printStatement = () => {
    if (!data) return;
    const { stmt, owner, reservations } = data;
    const lines = [
      '═══════════════════════════════════════════════════════════',
      `RELEVÉ PROPRIÉTAIRE — ${STATUS_LABELS[stmt.status]?.toUpperCase()}`,
      '═══════════════════════════════════════════════════════════',
      '',
      `Propriétaire : ${owner?.first_name} ${owner?.last_name}`,
      owner?.email ? `Email        : ${owner.email}` : '',
      owner?.phone ? `Téléphone    : ${owner.phone}` : '',
      '',
      `Période      : ${stmt.period_start} → ${stmt.period_end}`,
      `Généré le    : ${new Date(stmt.created_at).toLocaleDateString('fr-CA')}`,
      '',
      '───────────────────────────────────────────────────────────',
      'DÉTAIL FINANCIER',
      '───────────────────────────────────────────────────────────',
      `Revenus totaux         : ${Number(stmt.total_revenue).toFixed(2)} ${stmt.currency}`,
      `Frais de gestion (18%) : -${Number(stmt.management_fee).toFixed(2)} ${stmt.currency}`,
      `Frais de ménage        : -${Number(stmt.cleaning_fees).toFixed(2)} ${stmt.currency}`,
      `Maintenance            : -${Number(stmt.maintenance_costs).toFixed(2)} ${stmt.currency}`,
      '───────────────────────────────────────────────────────────',
      `NET À VERSER           : ${Number(stmt.net_payout).toFixed(2)} ${stmt.currency}`,
      '',
      reservations.length > 0 ? '───────────────────────────────────────────────────────────' : '',
      reservations.length > 0 ? 'RÉSERVATIONS INCLUSES' : '',
      reservations.length > 0 ? '───────────────────────────────────────────────────────────' : '',
      ...reservations.map(r =>
        `${r.check_in} → ${r.check_out}  ${r.guest_first_name} ${r.guest_last_name}  ${Number(r.total_amount).toFixed(2)} ${r.currency}  (${r.property_name} · ${r.unit_name})`
      ),
      '',
      stmt.notes ? `Notes : ${stmt.notes}` : '',
      '═══════════════════════════════════════════════════════════',
    ].filter(Boolean);

    const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `releve-${(owner?.last_name ?? 'proprietaire').replace(/ /g, '-')}-${stmt.period_start}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Export TXT téléchargé ✓');
  };

  if (isLoading) return <AppLayout><div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div></AppLayout>;

  if (!data?.stmt) {
    return (
      <AppLayout>
        <div className="text-center py-20">
          <p className="text-sm text-muted-foreground">Relevé introuvable</p>
          <button onClick={() => navigate('/finance/statements')} className="text-xs text-primary mt-2 hover:underline">← Retour</button>
        </div>
      </AppLayout>
    );
  }

  const { stmt, owner, reservations } = data;
  const nextTransitions = STATUS_TRANSITIONS[stmt.status] ?? [];
  const isImmutable = ['sent', 'paid'].includes(stmt.status);

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <button onClick={() => navigate('/finance/statements')} className="hover:text-foreground transition-colors flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Relevés
          </button>
          <span>/</span>
          <span className="text-foreground">{owner?.first_name} {owner?.last_name} · {stmt.period_start}</span>
        </div>

        {/* Header */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <FileText className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-xl font-bold text-foreground">
                    {owner?.first_name} {owner?.last_name}
                  </h1>
                  <span className={cn('text-sm px-3 py-1 rounded-full border font-medium', STATUS_COLOR[stmt.status] ?? 'bg-secondary text-muted-foreground border-border')}>
                    {STATUS_LABELS[stmt.status] ?? stmt.status}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Période : {stmt.period_start} → {stmt.period_end}
                </p>
                {stmt.sent_at && (
                  <p className="text-xs text-muted-foreground/60 mt-0.5">
                    Envoyé le {new Date(stmt.sent_at).toLocaleDateString('fr-CA')}
                  </p>
                )}
                {stmt.paid_at && (
                  <p className="text-xs text-emerald-400 mt-0.5">
                    Payé le {new Date(stmt.paid_at).toLocaleDateString('fr-CA')}
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={printStatement}
                className="flex items-center gap-2 text-xs border border-border bg-secondary px-3 py-2.5 rounded-xl hover:bg-secondary/80 transition-colors min-h-[44px]">
                <Download className="w-3.5 h-3.5" /> Export TXT
              </button>
              {nextTransitions.map(t => (
                <button
                  key={t.next}
                  onClick={() => transition.mutate(t.next)}
                  disabled={transition.isPending}
                  className={cn('flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl border transition-colors min-h-[44px] disabled:opacity-50', t.color)}>
                  {t.next === 'sent' && <Send className="w-3.5 h-3.5" />}
                  {t.next === 'paid' && <CheckCircle2 className="w-3.5 h-3.5" />}
                  {t.next === 'approved' && <CheckCircle2 className="w-3.5 h-3.5" />}
                  {transition.isPending ? 'Mise à jour…' : t.label}
                </button>
              ))}
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Revenus bruts',   value: Number(stmt.total_revenue).toFixed(2),  unit: stmt.currency, color: 'text-emerald-400', icon: TrendingUp },
              { label: 'Frais gestion',   value: Number(stmt.management_fee).toFixed(2), unit: stmt.currency, color: 'text-orange-400',  icon: DollarSign },
              { label: 'Frais ménage',    value: Number(stmt.cleaning_fees).toFixed(2),  unit: stmt.currency, color: 'text-blue-400',    icon: DollarSign },
              { label: 'Net à verser',    value: Number(stmt.net_payout).toFixed(2),     unit: stmt.currency, color: 'text-emerald-400', icon: CheckCircle2 },
            ].map(({ label, value, unit, color, icon: Icon }) => (
              <div key={label} className="bg-secondary/30 border border-border rounded-xl p-4 text-center">
                <Icon className={cn('w-4 h-4 mx-auto mb-2', color)} />
                <p className={cn('text-lg font-bold font-mono', color)}>{value}</p>
                <p className="text-xs text-muted-foreground">{unit}</p>
                <p className="text-xs text-muted-foreground/70 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left: Owner info + Financial breakdown */}
          <div className="space-y-5">
            {/* Owner */}
            {owner && (
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                  <User className="w-3.5 h-3.5" /> Propriétaire
                </h3>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold text-blue-400">
                    {owner.first_name[0]}{owner.last_name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{owner.first_name} {owner.last_name}</p>
                    {owner.email && <p className="text-xs text-muted-foreground">{owner.email}</p>}
                    {owner.phone && <p className="text-xs text-muted-foreground">{owner.phone}</p>}
                  </div>
                </div>
                <button
                  onClick={() => navigate(`/owners/${stmt.owner_id}`)}
                  className="text-xs text-primary hover:underline">
                  Voir le profil propriétaire →
                </button>
              </div>
            )}

            {/* Financial breakdown */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                <DollarSign className="w-3.5 h-3.5" /> Détail financier
              </h3>
              <div className="space-y-2 text-xs">
                {[
                  { label: 'Revenus totaux',   val: stmt.total_revenue,     positive: true,  color: 'text-emerald-400' },
                  { label: 'Frais de gestion', val: stmt.management_fee,    positive: false, color: 'text-orange-400' },
                  { label: 'Frais de ménage',  val: stmt.cleaning_fees,     positive: false, color: 'text-blue-400' },
                  { label: 'Maintenance',      val: stmt.maintenance_costs, positive: false, color: 'text-yellow-400' },
                  { label: 'Total frais',      val: stmt.total_fees,        positive: false, color: 'text-red-400' },
                ].map(({ label, val, positive, color }) => (
                  <div key={label} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
                    <span className="text-muted-foreground">{label}</span>
                    <span className={cn('font-mono font-medium', color)}>
                      {positive ? '+' : '-'}{Number(val).toFixed(2)} {stmt.currency}
                    </span>
                  </div>
                ))}
                <div className="pt-3 border-t border-border flex items-center justify-between">
                  <span className="text-sm font-bold text-foreground">Net à verser</span>
                  <span className="text-sm font-bold font-mono text-emerald-400">
                    {Number(stmt.net_payout).toFixed(2)} {stmt.currency}
                  </span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {stmt.notes && (
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Notes</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{stmt.notes}</p>
              </div>
            )}

            {/* Immutability notice */}
            {isImmutable && (
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-400 leading-relaxed">
                  <span className="font-semibold">ADR-015 :</span> Relevé immutable — statut {STATUS_LABELS[stmt.status]}. Correction = nouveau relevé révisé + écriture d'ajustement dans le grand livre.
                </p>
              </div>
            )}
          </div>

          {/* Right: Reservations */}
          <div className="lg:col-span-2">
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" />
                Réservations incluses
                <span className="text-xs font-normal text-muted-foreground ml-auto">
                  {stmt.period_start} → {stmt.period_end}
                </span>
              </h3>

              {reservations.length === 0 ? (
                <div className="text-center py-10">
                  <BookOpen className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Aucune réservation sur cette période</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    Les réservations confirmées entre {stmt.period_start} et {stmt.period_end} apparaîtront ici.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {reservations.map(r => (
                    <button
                      key={r.id}
                      onClick={() => navigate(`/reservations/${r.id}`)}
                      className="w-full flex items-center gap-3 p-3.5 bg-secondary/20 border border-border rounded-xl hover:border-primary/30 text-left transition-all"
                    >
                      <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {r.guest_first_name} {r.guest_last_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {r.property_name} · {r.unit_name} · {r.check_in} → {r.check_out}
                          {r.nights ? ` · ${r.nights} nuits` : ''}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold font-mono text-emerald-400">
                          {Number(r.total_amount).toFixed(2)} {r.currency}
                        </p>
                        <p className="text-xs text-muted-foreground">{r.channel}</p>
                      </div>
                    </button>
                  ))}

                  {/* Total row */}
                  <div className="pt-3 mt-3 border-t border-border flex items-center justify-between px-1">
                    <span className="text-xs text-muted-foreground">{reservations.length} réservation{reservations.length !== 1 ? 's' : ''}</span>
                    <span className="text-sm font-bold font-mono text-emerald-400">
                      = {reservations.reduce((s, r) => s + Number(r.total_amount), 0).toFixed(2)} {stmt.currency}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Status timeline */}
            <div className="bg-card border border-border rounded-xl p-5 mt-5">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" /> Cycle de vie
              </h3>
              <div className="flex items-center gap-2 flex-wrap">
                {['draft', 'approved', 'sent', 'paid'].map((s, idx, arr) => {
                  const statuses = ['draft', 'approved', 'sent', 'paid'];
                  const currentIdx = statuses.indexOf(stmt.status);
                  const stepIdx = statuses.indexOf(s);
                  const isPast = stepIdx <= currentIdx;
                  return (
                    <div key={s} className="flex items-center gap-2">
                      <div className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border',
                        isPast ? STATUS_COLOR[s] ?? 'bg-secondary text-muted-foreground border-border' : 'bg-secondary text-muted-foreground/40 border-border/40',
                      )}>
                        {isPast && <CheckCircle2 className="w-3 h-3" />}
                        {STATUS_LABELS[s]}
                      </div>
                      {idx < arr.length - 1 && (
                        <span className={cn('text-sm', stepIdx < currentIdx ? 'text-primary' : 'text-muted-foreground/30')}>→</span>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div>
                  <span className="font-medium">Créé :</span>{' '}
                  {new Date(stmt.created_at).toLocaleDateString('fr-CA')}
                </div>
                {stmt.sent_at && (
                  <div>
                    <span className="font-medium text-purple-400">Envoyé :</span>{' '}
                    {new Date(stmt.sent_at).toLocaleDateString('fr-CA')}
                  </div>
                )}
                {stmt.paid_at && (
                  <div>
                    <span className="font-medium text-emerald-400">Payé :</span>{' '}
                    {new Date(stmt.paid_at).toLocaleDateString('fr-CA')}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ADR note */}
        <div className="bg-secondary/20 border border-border/50 rounded-xl p-4 flex items-start gap-2">
          <Info className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground/70">
            <span className="text-orange-400 font-mono font-semibold">ADR-015 FROZEN</span> — Relevé immutable une fois envoyé ou payé.
            Correction = nouveau relevé révisé + écriture d'ajustement dans ledger_entries (jamais de DELETE).
            Grand livre NUMERIC(12,4) · append-only.
          </p>
        </div>
      </div>
    </AppLayout>
  );
};

export default OwnerStatementDetailPage;
