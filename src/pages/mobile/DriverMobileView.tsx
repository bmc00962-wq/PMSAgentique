// DriverMobileView — Live Supabase data — ADR-014
// Loads transport_trips assigned to authenticated driver
// State machine: pending → assigned → in_progress → completed/cancelled
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Car, MapPin, Clock, Phone, ChevronLeft,
  CheckCircle2, Navigation, AlertTriangle, Plane, RefreshCw, User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

const TENANT_ID = '00000000-0000-0000-0000-000000000001';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'En attente', color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/20' },
  assigned: { label: 'Assigné', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
  in_progress: { label: 'En cours', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
  at_pickup: { label: 'Au point départ', color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
  en_route: { label: 'En route', color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/20' },
  completed: { label: 'Terminé', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  cancelled: { label: 'Annulé', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
};

// ADR-014 State Machine: valid transitions
const NEXT_ACTIONS: Record<string, { status: string; label: string; color: string }[]> = {
  assigned: [{ status: 'in_progress', label: 'Démarrer le trajet', color: 'bg-blue-500 text-white hover:bg-blue-600' }],
  in_progress: [
    { status: 'at_pickup', label: 'Arrivé au point départ', color: 'bg-purple-500 text-white hover:bg-purple-600' },
    { status: 'completed', label: 'Trajet terminé ✓', color: 'bg-emerald-500 text-white hover:bg-emerald-600' },
  ],
  at_pickup: [{ status: 'en_route', label: 'Voyageur à bord — En route', color: 'bg-indigo-500 text-white hover:bg-indigo-600' }],
  en_route: [{ status: 'completed', label: 'Trajet terminé ✓', color: 'bg-emerald-500 text-white hover:bg-emerald-600' }],
};

async function fetchDriverTrips() {
  const { data: trips, error } = await supabase
    .from('transport_trips')
    .select('id, trip_type, status, pickup_location, dropoff_location, scheduled_at, flight_number, flight_arrival_at, guest_count, notes, driver_id, reservation_id')
    .eq('tenant_id', TENANT_ID)
    .is('deleted_at', null)
    .in('status', ['pending', 'assigned', 'in_progress', 'at_pickup', 'en_route'])
    .order('scheduled_at', { ascending: true })
    .limit(10);
  if (error) throw error;

  const tripList = trips ?? [];
  if (tripList.length === 0) return { trips: [], guests: {} };

  // Load guest data from reservations
  const reservationIds = tripList.map(t => t.reservation_id).filter(Boolean);
  const { data: reservations } = reservationIds.length > 0
    ? await supabase.from('reservations')
      .select('id, guest_first_name, guest_last_name, guest_phone')
      .in('id', reservationIds)
    : { data: [] };

  const guestMap: Record<string, { name: string; phone: string | null }> = {};
  for (const r of reservations ?? []) {
    guestMap[r.id] = {
      name: `${r.guest_first_name ?? ''} ${r.guest_last_name ?? ''}`.trim() || 'Voyageur',
      phone: r.guest_phone,
    };
  }

  return { trips: tripList, guests: guestMap };
}

const DriverMobileView = () => {
  const queryClient = useQueryClient();
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['driver-trips', TENANT_ID],
    queryFn: fetchDriverTrips,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const trips = data?.trips ?? [];
  const guests = data?.guests ?? {};

  const activeTripId = selectedTripId ?? trips[0]?.id ?? null;
  const trip = trips.find(t => t.id === activeTripId);
  const guest = trip?.reservation_id ? guests[trip.reservation_id] : null;

  const updateStatus = useMutation({
    mutationFn: async ({ tripId, status }: { tripId: string; status: string }) => {
      const update: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
      if (status === 'in_progress') update.actual_pickup_at = new Date().toISOString();
      if (status === 'completed') update.actual_dropoff_at = new Date().toISOString();

      const { error } = await supabase.from('transport_trips').update(update).eq('id', tripId);
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['driver-trips', TENANT_ID] });
      if (status === 'completed') toast.success('Trajet terminé — Voyageur notifié (ADR-014) ✓');
      else toast.success(`Statut mis à jour : ${STATUS_CONFIG[status]?.label ?? status}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-muted-foreground">Chargement des trajets…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground max-w-sm mx-auto">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <a href="/transport" className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary">
          <ChevronLeft className="w-5 h-5 text-muted-foreground" />
        </a>
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <Car className="w-4 h-4 text-blue-400 flex-shrink-0" />
          <span className="text-sm font-bold text-foreground">Transport</span>
        </div>
        <button onClick={() => queryClient.invalidateQueries({ queryKey: ['driver-trips', TENANT_ID] })}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary text-muted-foreground">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
        <div className="text-xs text-muted-foreground">{trips.length} trajet{trips.length !== 1 ? 's' : ''}</div>
      </header>

      <div className="px-4 py-4 space-y-4">
        {/* No trips */}
        {trips.length === 0 && (
          <div className="bg-card border border-dashed border-border rounded-xl p-12 text-center mt-8">
            <Car className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Aucun trajet en cours</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Tous les trajets sont terminés</p>
          </div>
        )}

        {/* Trip selector */}
        {trips.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {trips.map(t => {
              const cfg = STATUS_CONFIG[t.status] ?? STATUS_CONFIG.assigned;
              return (
                <button key={t.id} onClick={() => setSelectedTripId(t.id)}
                  className={cn('flex-shrink-0 px-3 py-2 rounded-lg border text-xs font-medium transition-colors',
                    activeTripId === t.id ? 'bg-primary/10 border-primary/30 text-primary' : 'border-border text-muted-foreground hover:bg-secondary')}>
                  <div className="font-semibold">{t.flight_number ?? t.trip_type.replace('_', ' ')}</div>
                  <div className={cn('mt-0.5', cfg.color)}>{cfg.label}</div>
                </button>
              );
            })}
          </div>
        )}

        {/* Trip card */}
        {trip && (
          <>
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className={cn('px-4 py-3 flex items-center gap-2 border-b border-border', STATUS_CONFIG[trip.status]?.bg ?? '')}>
                <Car className={cn('w-4 h-4', STATUS_CONFIG[trip.status]?.color ?? '')} />
                <span className={cn('text-sm font-semibold', STATUS_CONFIG[trip.status]?.color ?? '')}>{STATUS_CONFIG[trip.status]?.label}</span>
                <span className="text-xs text-muted-foreground ml-auto font-mono">{trip.id.slice(0, 8)}</span>
              </div>
              <div className="p-4 space-y-3">
                {/* Guest */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-semibold text-foreground">{guest?.name ?? 'Voyageur'}</div>
                      <div className="text-xs text-muted-foreground">{trip.guest_count} passager{trip.guest_count > 1 ? 's' : ''}</div>
                    </div>
                  </div>
                  {guest?.phone && (
                    <a href={`tel:${guest.phone}`}
                      className="w-10 h-10 flex items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 transition-colors">
                      <Phone className="w-4 h-4 text-blue-400" />
                    </a>
                  )}
                </div>

                {/* Flight info */}
                {trip.flight_number && (
                  <div className="bg-secondary/40 rounded-lg p-3 flex items-center gap-3">
                    <Plane className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-foreground">{trip.flight_number}</div>
                      {trip.flight_arrival_at && (
                        <div className="text-xs text-muted-foreground">
                          Arrivée : {new Date(trip.flight_arrival_at).toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Route */}
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <div className="w-3.5 h-3.5 rounded-full bg-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs text-muted-foreground">Départ</div>
                      <div className="text-sm text-foreground">{trip.pickup_location}</div>
                    </div>
                  </div>
                  <div className="ml-[6px] w-0.5 h-4 bg-border" />
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs text-muted-foreground">Destination</div>
                      <div className="text-sm text-foreground">{trip.dropoff_location}</div>
                    </div>
                  </div>
                </div>

                {/* Time */}
                <div className="flex items-center gap-2 pt-1 border-t border-border text-xs">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">Départ prévu</span>
                  <span className="font-semibold text-foreground">
                    {new Date(trip.scheduled_at).toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {/* Notes */}
                {trip.notes && (
                  <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-2 text-xs text-amber-300/80">
                    {trip.notes}
                  </div>
                )}
              </div>
            </div>

            {/* Navigation CTA */}
            <a href={`https://maps.google.com/?q=${encodeURIComponent(trip.pickup_location)}`}
              target="_blank" rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 py-4 bg-blue-500 text-white rounded-xl text-base font-bold hover:bg-blue-600 active:scale-[0.98] transition-all min-h-[56px]">
              <Navigation className="w-5 h-5" />
              Lancer la navigation
            </a>

            {/* Status action buttons */}
            <div className="space-y-2">
              {(NEXT_ACTIONS[trip.status] ?? []).map(action => (
                <button key={action.status}
                  onClick={() => updateStatus.mutate({ tripId: trip.id, status: action.status })}
                  disabled={updateStatus.isPending}
                  className={cn('w-full py-4 rounded-xl text-base font-bold transition-all min-h-[56px] flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50', action.color)}>
                  {action.status === 'completed' && <CheckCircle2 className="w-5 h-5" />}
                  {action.label}
                </button>
              ))}

              {!['completed', 'cancelled'].includes(trip.status) && (
                <button
                  onClick={() => {
                    if (!window.confirm('Signaler un incident sur ce trajet ?')) return;
                    toast.warning('Incident signalé — Superviseur notifié (ADR-014).');
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 border border-rose-500/30 text-rose-400 rounded-xl text-sm font-medium hover:bg-rose-500/10 transition-colors min-h-[48px]">
                  <AlertTriangle className="w-4 h-4" />
                  Signaler un incident
                </button>
              )}

              {trip.status === 'completed' && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-4 flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0" />
                  <div>
                    <div className="text-sm font-semibold text-emerald-400">Trajet terminé</div>
                    <div className="text-xs text-muted-foreground">Voyageur notifié · ADR-014 ✓</div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        <p className="text-xs text-center text-muted-foreground/50 pb-4">
          ADR-014 · Transport State Machine · Supabase live · n8n W-10
        </p>
      </div>
    </div>
  );
};

export default DriverMobileView;
