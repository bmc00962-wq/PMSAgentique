// ReservationDetailPage — Live Supabase data — ADR-010
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, User, Calendar, Moon, MapPin, CreditCard, Info, AlertTriangle, Users, CheckCircle2, BookOpen, Edit } from 'lucide-react';
import { toast } from 'sonner';
import AppLayout from '@/components/layout/AppLayout';
import LoadingSpinner from '@/components/features/LoadingSpinner';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';


const STATUS_LABELS: Record<string, string> = {
  inquiry: 'Demande', pending: 'En attente', confirmed: 'Confirmée',
  checked_in: 'Arrivé', checked_out: 'Parti', cancelled: 'Annulée', no_show: 'Absent',
};

const STATUS_COLORS: Record<string, string> = {
  confirmed: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  checked_in: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
  checked_out: 'bg-slate-500/15 text-slate-400 border-slate-500/25',
  pending: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/25',
  inquiry: 'bg-purple-500/15 text-purple-400 border-purple-500/25',
  cancelled: 'bg-red-500/15 text-red-400 border-red-500/25',
  no_show: 'bg-red-500/15 text-red-400 border-red-500/25',
};

const CHANNEL_LABELS: Record<string, string> = {
  airbnb: 'Airbnb', booking: 'Booking.com', vrbo: 'Vrbo', direct: 'Direct', manual: 'Manuel',
};

async function fetchReservationDetail(tenantId: string, id: string) {
  const { data: r, error } = await supabase
    .from('reservations')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single();
  if (error) throw error;

  // Fetch unit + property
  const { data: unit } = r.unit_id
    ? await supabase.from('units').select('id, name, property_id, bedrooms, bathrooms, max_guests').eq('id', r.unit_id).single()
    : { data: null };

  const { data: property } = unit?.property_id
    ? await supabase.from('properties').select('id, name, city, country, owner_id').eq('id', unit.property_id).single()
    : { data: null };

  const { data: owner } = property?.owner_id
    ? await supabase.from('owners').select('first_name, last_name').eq('id', property.owner_id).single()
    : { data: null };

  // Fetch ledger entries for this reservation
  const { data: ledger } = await supabase
    .from('ledger_entries')
    .select('id, entry_type, direction, amount, currency, description, created_at')
    .eq('reservation_id', id)
    .order('created_at', { ascending: true });

  // Status history
  const { data: history } = await supabase
    .from('reservation_status_history')
    .select('id, from_status, to_status, reason, created_at')
    .eq('reservation_id', id)
    .order('created_at', { ascending: true });

  return { reservation: r, unit, property, owner, ledger: ledger ?? [], history: history ?? [] };
}

const ENTRY_LABELS: Record<string, string> = {
  base_rent: 'Loyer base', cleaning_fee: 'Frais ménage', tax: 'Taxes',
  channel_commission: 'Commission OTA', management_fee: 'Frais gestion',
  refund: 'Remboursement', adjustment: 'Ajustement', reversal: 'Annulation',
};

const STATUS_TRANSITIONS: Record<string, string[]> = {
  inquiry: ['pending', 'cancelled'],
  pending: ['confirmed', 'cancelled'],
  confirmed: ['checked_in', 'cancelled'],
  checked_in: ['checked_out'],
  checked_out: [],
  cancelled: [],
  no_show: [],
};

const ReservationDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { membership } = useAuth();
  const tenantId = membership?.tenant_id ?? '';

  const { data, isPending } = useQuery({
    queryKey: ['reservation-detail', id],
    queryFn: () => fetchReservationDetail(tenantId, id!),
    enabled: !!id && !!tenantId,
    staleTime: 30_000,
  });

  const updateStatus = useMutation({
    mutationFn: async (newStatus: string) => {
      const old = data!.reservation.status;
      // Update reservation
      const { error } = await supabase
        .from('reservations')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', id!);
      if (error) throw error;
      // Append status history
      await supabase.from('reservation_status_history').insert({
        tenant_id: tenantId,
        reservation_id: id!,
        from_status: old,
        to_status: newStatus,
        reason: 'Manual update',
      });
    },
    onSuccess: (_, newStatus) => {
      queryClient.invalidateQueries({ queryKey: ['reservation-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['reservations', tenantId] });
      toast.success(`Statut mis à jour → ${STATUS_LABELS[newStatus] ?? newStatus}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isPending) return <AppLayout><div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div></AppLayout>;

  if (!data?.reservation) {
    return (
      <AppLayout>
        <div className="text-center py-20">
          <p className="text-sm text-muted-foreground">Réservation introuvable</p>
          <button onClick={() => navigate('/reservations')} className="text-primary text-sm mt-3 hover:underline">← Retour</button>
        </div>
      </AppLayout>
    );
  }

  const r = data.reservation;
  const nextStatuses = STATUS_TRANSITIONS[r.status] ?? [];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <div>
          <button onClick={() => navigate('/reservations')}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Réservations
          </button>
          <div className="flex items-start gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl font-bold text-foreground">
                  {r.guest_first_name} {r.guest_last_name}
                </h1>
                <span className={cn('text-sm px-3 py-1 rounded-full border font-medium flex-shrink-0', STATUS_COLORS[r.status] ?? 'bg-secondary text-muted-foreground border-border')}>
                  {STATUS_LABELS[r.status] ?? r.status}
                </span>
                {r.channel && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full border bg-secondary border-border text-muted-foreground flex-shrink-0">
                    {CHANNEL_LABELS[r.channel] ?? r.channel}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground/60 mt-1 font-mono">{r.id}</p>
            </div>

            {/* Edit button */}
            <button
              onClick={() => navigate(`/reservations/${id}/edit`)}
              className="flex items-center gap-2 px-4 py-2.5 bg-secondary border border-border rounded-xl text-sm font-medium text-foreground hover:bg-secondary/80 transition-colors min-h-[44px] flex-shrink-0">
              <Edit className="w-3.5 h-3.5" /> Modifier statut
            </button>

            {/* Status transitions */}
            {nextStatuses.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {nextStatuses.map(ns => (
                  <button
                    key={ns}
                    onClick={() => updateStatus.mutate(ns)}
                    disabled={updateStatus.isPending}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-colors min-h-[40px] disabled:opacity-50',
                      ns === 'cancelled' || ns === 'no_show'
                        ? 'bg-red-500/10 border-red-500/25 text-red-400 hover:bg-red-500/20'
                        : 'bg-primary/10 border-primary/25 text-primary hover:bg-primary/20'
                    )}
                  >
                    {ns === 'cancelled' ? <AlertTriangle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                    → {STATUS_LABELS[ns] ?? ns}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left */}
          <div className="lg:col-span-2 space-y-5">
            {/* Guest */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                <User className="w-3.5 h-3.5" /> Voyageur
              </h3>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold text-primary">
                  {r.guest_first_name?.[0]}{r.guest_last_name?.[0]}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{r.guest_first_name} {r.guest_last_name}</p>
                  {r.guest_email && <p className="text-xs text-muted-foreground">{r.guest_email}</p>}
                  {r.guest_phone && <p className="text-xs text-muted-foreground">{r.guest_phone}</p>}
                </div>
              </div>
            </div>

            {/* Stay */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5" /> Séjour
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                {[
                  { label: 'Arrivée', value: r.check_in ?? '—', icon: Calendar },
                  { label: 'Départ', value: r.check_out ?? '—', icon: Calendar },
                  { label: 'Nuits', value: r.nights ?? '—', icon: Moon },
                  { label: 'Voyageurs', value: r.guests_count, icon: Users },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="bg-secondary/30 border border-border rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1">{label}</p>
                    <p className="text-sm font-semibold text-foreground">{value}</p>
                  </div>
                ))}
              </div>
              {data.property && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>
                    {data.property.name} · {data.unit?.name ?? '—'}
                    {data.property.city ? ` · ${data.property.city}` : ''}
                    {data.owner ? ` · Propriétaire : ${data.owner.first_name} ${data.owner.last_name}` : ''}
                  </span>
                </div>
              )}
              {r.internal_notes && (
                <div className="mt-3 p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                  <p className="text-xs text-blue-400 font-medium mb-1">Notes internes</p>
                  <p className="text-xs text-muted-foreground">{r.internal_notes}</p>
                </div>
              )}
            </div>

            {/* Ledger entries */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                <CreditCard className="w-3.5 h-3.5" /> Grand Livre
              </h3>
              {data.ledger.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Aucune écriture comptable</p>
              ) : (
                <div className="space-y-1.5">
                  {data.ledger.map(e => (
                    <div key={e.id} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0 text-xs">
                      <span className="text-foreground">{e.description}</span>
                      <span className={cn('font-mono font-semibold', e.direction === 'credit' ? 'text-emerald-400' : 'text-red-400')}>
                        {e.direction === 'credit' ? '+' : '-'}{Number(e.amount).toFixed(2)} {e.currency}
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between pt-3 border-t border-border text-sm font-semibold">
                    <span className="text-muted-foreground">Total facturé</span>
                    <span className="text-foreground font-mono">
                      {Number(r.total_amount).toLocaleString('fr-CA', { minimumFractionDigits: 2 })} {r.currency}
                    </span>
                  </div>
                </div>
              )}

              {/* Financial summary */}
              <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                {[
                  { l: 'Loyer base', v: r.base_rent, c: 'text-foreground' },
                  { l: 'Ménage', v: r.cleaning_fee, c: 'text-blue-400' },
                  { l: 'Taxes', v: r.tax_amount, c: 'text-yellow-400' },
                  { l: 'Total', v: r.total_amount, c: 'text-emerald-400' },
                ].map(({ l, v, c }) => (
                  <div key={l} className="text-center bg-secondary/20 rounded-lg p-2">
                    <p className={cn('text-sm font-bold font-mono', c)}>{Number(v).toFixed(2)}</p>
                    <p className="text-muted-foreground">{l}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right sidebar */}
          <div className="space-y-5">
            {/* Status history */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                <BookOpen className="w-3.5 h-3.5" /> Historique statuts
              </h3>
              {data.history.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-3">Aucun changement</p>
              ) : (
                <div className="space-y-3">
                  {data.history.map(h => (
                    <div key={h.id} className="flex items-start gap-2.5">
                      <div className="w-5 h-5 bg-secondary rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-foreground font-medium">
                          {h.from_status ? `${STATUS_LABELS[h.from_status] ?? h.from_status} → ` : ''}
                          <span className="text-primary">{STATUS_LABELS[h.to_status] ?? h.to_status}</span>
                        </p>
                        {h.reason && <p className="text-xs text-muted-foreground">{h.reason}</p>}
                        <p className="text-xs text-muted-foreground/60">
                          {new Date(h.created_at).toLocaleDateString('fr-CA', { dateStyle: 'short' })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ADR note */}
            <div className="flex items-start gap-2 bg-blue-500/5 border border-blue-500/20 rounded-xl p-3">
              <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-400/80 leading-relaxed">
                <span className="font-semibold text-blue-400">ADR-010 :</span>{' '}
                Transitions via <code className="font-mono">reservation_status_history</code> append-only. Grand livre NUMERIC(12,4) immuable.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default ReservationDetailPage;
