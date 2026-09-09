// TransportDetailPage — Live Supabase data — ADR-014
// Détail trajet: infos voyageur/chauffeur, machine d'état, vol en temps réel, notes
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, MapPin, Clock, Users, Plane, Car,
  Phone, Mail, CheckCircle2, AlertTriangle, Edit,
  Hash, Calendar, Navigation, User,
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import LoadingSpinner from '@/components/features/LoadingSpinner';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const TENANT_ID = '00000000-0000-0000-0000-000000000001';

const TRIP_STATUS_LABELS: Record<string, string> = {
  pending: 'En attente', assigned: 'Assigné', en_route: 'En route',
  arrived: 'Arrivé', completed: 'Terminé', cancelled: 'Annulé', no_show: 'Absent',
};

const TRIP_TYPE_LABELS: Record<string, string> = {
  pickup: 'Prise en charge', dropoff: 'Dépose', custom: 'Personnalisé',
};

const STATUS_COLOR: Record<string, string> = {
  pending:   'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  assigned:  'bg-blue-500/10 text-blue-400 border-blue-500/20',
  en_route:  'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  arrived:   'bg-purple-500/10 text-purple-400 border-purple-500/20',
  completed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  cancelled: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  no_show:   'bg-red-500/10 text-red-400 border-red-500/20',
};

// State machine transitions — ADR-014
const STATUS_TRANSITIONS: Record<string, string[]> = {
  pending:   ['assigned', 'cancelled'],
  assigned:  ['en_route', 'cancelled'],
  en_route:  ['arrived', 'no_show'],
  arrived:   ['completed'],
  completed: [],
  cancelled: [],
  no_show:   [],
};

async function fetchTripDetail(id: string) {
  const { data: trip, error } = await supabase
    .from('transport_trips')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', TENANT_ID)
    .single();
  if (error) throw error;

  // Fetch reservation context
  const { data: reservation } = trip.reservation_id
    ? await supabase.from('reservations')
        .select('id, guest_first_name, guest_last_name, guest_email, guest_phone, check_in, check_out, unit_id')
        .eq('id', trip.reservation_id)
        .single()
    : { data: null };

  // Fetch driver
  const { data: driver } = trip.driver_id
    ? await supabase.from('drivers')
        .select('id, first_name, last_name, phone, email, vehicle_type, vehicle_plate, status')
        .eq('id', trip.driver_id)
        .single()
    : { data: null };

  // Fetch unit + property name
  const { data: unit } = reservation?.unit_id
    ? await supabase.from('units').select('id, name, property_id').eq('id', reservation.unit_id).single()
    : { data: null };
  const { data: property } = unit?.property_id
    ? await supabase.from('properties').select('id, name, city').eq('id', unit.property_id).single()
    : { data: null };

  // Fetch available drivers for assignment
  const { data: drivers } = await supabase
    .from('drivers')
    .select('id, first_name, last_name, vehicle_type, status')
    .eq('tenant_id', TENANT_ID)
    .eq('status', 'active')
    .is('deleted_at', null)
    .order('last_name');

  return { trip, reservation, driver, unit, property, drivers: drivers ?? [] };
}

const TransportDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['transport-detail', id],
    queryFn: () => fetchTripDetail(id!),
    enabled: !!id,
    staleTime: 30_000,
  });

  const updateStatus = useMutation({
    mutationFn: async (newStatus: string) => {
      const updates: Record<string, unknown> = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };
      if (newStatus === 'en_route')   updates.actual_pickup_at = new Date().toISOString();
      if (newStatus === 'completed')  updates.actual_dropoff_at = new Date().toISOString();
      const { error } = await supabase
        .from('transport_trips').update(updates).eq('id', id!);
      if (error) throw error;
    },
    onSuccess: (_, newStatus) => {
      queryClient.invalidateQueries({ queryKey: ['transport-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['transport-trips', TENANT_ID] });
      toast.success(`Statut → ${TRIP_STATUS_LABELS[newStatus] ?? newStatus}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const assignDriver = useMutation({
    mutationFn: async (driverId: string) => {
      const { error } = await supabase
        .from('transport_trips')
        .update({ driver_id: driverId, status: 'assigned', updated_at: new Date().toISOString() })
        .eq('id', id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transport-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['transport-trips', TENANT_ID] });
      toast.success('Chauffeur assigné ✓');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <AppLayout><div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div></AppLayout>;

  if (!data?.trip) {
    return (
      <AppLayout>
        <div className="text-center py-20">
          <Car className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Trajet introuvable</p>
          <button onClick={() => navigate('/transport')} className="mt-3 text-xs text-primary hover:underline">
            ← Retour aux trajets
          </button>
        </div>
      </AppLayout>
    );
  }

  const { trip, reservation, driver, property, unit, drivers } = data;
  const nextStatuses = STATUS_TRANSITIONS[trip.status] ?? [];
  const dt = new Date(trip.scheduled_at);
  const guestName = reservation
    ? `${reservation.guest_first_name ?? ''} ${reservation.guest_last_name ?? ''}`.trim()
    : '—';

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <button onClick={() => navigate('/transport')}
            className="hover:text-foreground transition-colors flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Transport
          </button>
          <span>/</span>
          <span className="text-foreground truncate max-w-48">{guestName}</span>
        </div>

        {/* Header card */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
            <div className="flex items-start gap-4">
              <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 border',
                STATUS_COLOR[trip.status] ?? 'bg-secondary border-border')}>
                <Car className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">{TRIP_TYPE_LABELS[trip.trip_type] ?? trip.trip_type}</p>
                <h1 className="text-xl font-bold text-foreground">{guestName}</h1>
                {property && (
                  <p className="text-sm text-muted-foreground">{property.name}{unit ? ` · ${unit.name}` : ''}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn('text-sm font-semibold px-3 py-1.5 rounded-full border', STATUS_COLOR[trip.status] ?? 'bg-secondary text-muted-foreground border-border')}>
                {TRIP_STATUS_LABELS[trip.status] ?? trip.status}
              </span>
            </div>
          </div>

          {/* Trip details grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Date et heure prévues</p>
                  <p className="text-sm font-semibold text-foreground">
                    {dt.toLocaleDateString('fr-CA', { weekday: 'short', month: 'long', day: 'numeric' })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {dt.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-secondary rounded-lg flex items-center justify-center flex-shrink-0">
                  <Users className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Passagers</p>
                  <p className="text-sm font-semibold text-foreground">{trip.guest_count} personne{trip.guest_count > 1 ? 's' : ''}</p>
                </div>
              </div>
              {trip.flight_number && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Plane className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Numéro de vol</p>
                    <p className="text-sm font-bold text-blue-400 font-mono">{trip.flight_number}</p>
                    {trip.flight_arrival_at && (
                      <p className="text-xs text-muted-foreground">
                        Arrivée prévue : {new Date(trip.flight_arrival_at).toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                    {trip.adjusted_at && (
                      <p className="text-xs text-orange-400">
                        Ajusté le {new Date(trip.adjusted_at).toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Navigation className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Prise en charge</p>
                  <p className="text-sm font-medium text-foreground">{trip.pickup_location}</p>
                  {trip.actual_pickup_at && (
                    <p className="text-xs text-emerald-400">
                      Effectif : {new Date(trip.actual_pickup_at).toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-rose-500/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <MapPin className="w-4 h-4 text-rose-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Dépose</p>
                  <p className="text-sm font-medium text-foreground">{trip.dropoff_location}</p>
                  {trip.actual_dropoff_at && (
                    <p className="text-xs text-emerald-400">
                      Effectif : {new Date(trip.actual_dropoff_at).toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Reservation context */}
          {reservation && (
            <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-3 mb-4 flex items-center gap-3">
              <Hash className="w-4 h-4 text-blue-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-blue-400">Réservation liée</p>
                <p className="text-xs text-muted-foreground truncate">
                  {reservation.check_in} → {reservation.check_out}
                  {reservation.guest_email ? ` · ${reservation.guest_email}` : ''}
                  {reservation.guest_phone ? ` · ${reservation.guest_phone}` : ''}
                </p>
              </div>
              <button
                onClick={() => navigate(`/reservations/${trip.reservation_id}`)}
                className="text-xs text-blue-400 hover:underline flex-shrink-0">
                Voir →
              </button>
            </div>
          )}

          {/* Notes */}
          {trip.notes && (
            <div className="bg-secondary/40 border border-border rounded-xl p-3">
              <p className="text-xs text-muted-foreground mb-1">Notes internes</p>
              <p className="text-sm text-foreground">{trip.notes}</p>
            </div>
          )}
        </div>

        {/* State machine actions */}
        {nextStatuses.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-primary" /> Avancer le statut
            </h2>
            <div className="flex flex-wrap gap-3">
              {nextStatuses.map(ns => (
                <button
                  key={ns}
                  onClick={() => updateStatus.mutate(ns)}
                  disabled={updateStatus.isPending}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors min-h-[44px] disabled:opacity-50',
                    ns === 'cancelled' || ns === 'no_show'
                      ? 'bg-red-500/10 border-red-500/25 text-red-400 hover:bg-red-500/20'
                      : 'bg-primary/10 border-primary/25 text-primary hover:bg-primary/20'
                  )}
                >
                  {ns === 'cancelled' || ns === 'no_show'
                    ? <AlertTriangle className="w-4 h-4" />
                    : <CheckCircle2 className="w-4 h-4" />
                  }
                  → {TRIP_STATUS_LABELS[ns] ?? ns}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Driver card + assignment */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
            <Car className="w-3.5 h-3.5 text-yellow-400" /> Chauffeur assigné
          </h2>

          {driver ? (
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex items-center justify-center flex-shrink-0 text-base font-bold text-yellow-400">
                {driver.first_name[0]}{driver.last_name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{driver.first_name} {driver.last_name}</p>
                <p className="text-xs text-muted-foreground">{driver.vehicle_type ?? '—'} · {driver.vehicle_plate ?? '—'}</p>
                <div className="flex items-center gap-3 mt-1">
                  {driver.phone && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Phone className="w-3 h-3" />{driver.phone}
                    </span>
                  )}
                  {driver.email && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                      <Mail className="w-3 h-3" />{driver.email}
                    </span>
                  )}
                </div>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full border bg-emerald-500/10 text-emerald-400 border-emerald-500/20 flex-shrink-0">
                {driver.status}
              </span>
            </div>
          ) : (
            <div className="bg-secondary/20 border border-dashed border-border rounded-xl p-6 text-center mb-4">
              <User className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Aucun chauffeur assigné</p>
            </div>
          )}

          {/* Assign driver dropdown */}
          {drivers.length > 0 && trip.status !== 'completed' && trip.status !== 'cancelled' && (
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                {driver ? 'Réassigner un chauffeur' : 'Assigner un chauffeur'}
              </p>
              <div className="flex gap-2">
                <select
                  id="driver-select"
                  className="flex-1 bg-secondary/40 border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  defaultValue=""
                >
                  <option value="" disabled>— Sélectionner un chauffeur —</option>
                  {drivers.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.first_name} {d.last_name} · {d.vehicle_type ?? 'Véhicule inconnu'}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => {
                    const sel = (document.getElementById('driver-select') as HTMLSelectElement).value;
                    if (sel) assignDriver.mutate(sel);
                    else toast.error('Sélectionnez un chauffeur');
                  }}
                  disabled={assignDriver.isPending}
                  className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors min-h-[44px] disabled:opacity-50 flex-shrink-0"
                >
                  <Edit className="w-3.5 h-3.5" />
                  {assignDriver.isPending ? 'Assignation…' : 'Assigner'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Timestamps */}
        {(trip.actual_pickup_at || trip.actual_dropoff_at) && (
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Horodatages réels</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Prise en charge effective</p>
                <p className="font-medium text-foreground mt-0.5">
                  {trip.actual_pickup_at
                    ? new Date(trip.actual_pickup_at).toLocaleString('fr-CA', { dateStyle: 'short', timeStyle: 'short' })
                    : '—'
                  }
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Dépose effective</p>
                <p className="font-medium text-foreground mt-0.5">
                  {trip.actual_dropoff_at
                    ? new Date(trip.actual_dropoff_at).toLocaleString('fr-CA', { dateStyle: 'short', timeStyle: 'short' })
                    : '—'
                  }
                </p>
              </div>
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground/40 font-mono pb-4">
          id: {id} · version: {trip.version} · créé: {new Date(trip.created_at).toLocaleDateString('fr-CA')}
        </p>
      </div>
    </AppLayout>
  );
};

export default TransportDetailPage;
