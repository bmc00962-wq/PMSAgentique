// TransportPage — Live Supabase data — ADR-014
// Tabs: Trajets (trips list) + Chauffeurs (drivers list)
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Plus, Search, Car, CheckCircle2, Clock, AlertTriangle,
  MapPin, Plane, User, Phone, Mail, Edit, UserPlus,
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import LoadingSpinner from '@/components/features/LoadingSpinner';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

const TENANT_ID = '00000000-0000-0000-0000-000000000001';

// ── Labels & colors ───────────────────────────────────────────────────────────

const TRIP_STATUS_LABELS: Record<string, string> = {
  pending: 'En attente', assigned: 'Assigné', en_route: 'En route',
  arrived: 'Arrivé', completed: 'Terminé', cancelled: 'Annulé', no_show: 'Absent',
};

const TRIP_TYPE_LABELS: Record<string, string> = {
  pickup: '↑ Prise en charge', dropoff: '↓ Dépose', custom: '⇄ Personnalisé',
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

const DRIVER_STATUS_COLOR: Record<string, string> = {
  active:   'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  inactive: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  on_leave: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
};

const DRIVER_STATUS_LABELS: Record<string, string> = {
  active: 'Actif', inactive: 'Inactif', on_leave: 'En congé',
};

const STATUSES = ['pending','assigned','en_route','arrived','completed','cancelled','no_show'];
const TYPES = ['pickup','dropoff','custom'];

// ── Data fetchers ─────────────────────────────────────────────────────────────

async function fetchTrips() {
  const { data, error } = await supabase
    .from('transport_trips')
    .select('id, reservation_id, driver_id, trip_type, status, pickup_location, dropoff_location, scheduled_at, flight_number, flight_arrival_at, guest_count, notes, version, created_at')
    .eq('tenant_id', TENANT_ID)
    .is('deleted_at', null)
    .order('scheduled_at', { ascending: true });
  if (error) throw error;

  // Reservation guest names
  const resIds = [...new Set((data ?? []).map(t => t.reservation_id).filter(Boolean))];
  const { data: reservations } = resIds.length > 0
    ? await supabase.from('reservations').select('id, guest_first_name, guest_last_name, check_in, check_out').in('id', resIds)
    : { data: [] };
  const resMap: Record<string, { name: string; check_in: string; check_out: string }> = {};
  for (const r of reservations ?? []) {
    resMap[r.id] = {
      name: `${r.guest_first_name ?? ''} ${r.guest_last_name ?? ''}`.trim(),
      check_in: r.check_in,
      check_out: r.check_out,
    };
  }

  // Driver names
  const driverIds = [...new Set((data ?? []).map(t => t.driver_id).filter(Boolean))];
  const { data: drivers } = driverIds.length > 0
    ? await supabase.from('drivers').select('id, first_name, last_name, vehicle_type, vehicle_plate').in('id', driverIds)
    : { data: [] };
  const driverMap: Record<string, string> = {};
  for (const d of drivers ?? []) {
    driverMap[d.id] = `${d.first_name} ${d.last_name}${d.vehicle_type ? ` · ${d.vehicle_type}` : ''}`;
  }

  return (data ?? []).map(t => ({
    ...t,
    guest_name: t.reservation_id ? (resMap[t.reservation_id]?.name ?? '—') : '—',
    reservation_dates: t.reservation_id
      ? `${resMap[t.reservation_id]?.check_in ?? ''} → ${resMap[t.reservation_id]?.check_out ?? ''}`
      : null,
    driver_name: t.driver_id ? (driverMap[t.driver_id] ?? 'Non assigné') : 'Non assigné',
  }));
}

async function fetchDrivers() {
  const { data, error } = await supabase
    .from('drivers')
    .select('id, first_name, last_name, phone, email, vehicle_type, vehicle_plate, license_number, status, notes, version, created_at')
    .eq('tenant_id', TENANT_ID)
    .is('deleted_at', null)
    .order('last_name');
  if (error) throw error;
  return data ?? [];
}

// ── Component ─────────────────────────────────────────────────────────────────

type TabId = 'trips' | 'drivers';

const TransportPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>('trips');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const { data: trips = [], isLoading: tripsLoading } = useQuery({
    queryKey: ['transport-trips', TENANT_ID],
    queryFn: fetchTrips,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  const { data: drivers = [], isLoading: driversLoading } = useQuery({
    queryKey: ['drivers', TENANT_ID],
    queryFn: fetchDrivers,
    staleTime: 60_000,
  });

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = {
    pending:   trips.filter(t => t.status === 'pending').length,
    active:    trips.filter(t => ['en_route','assigned','arrived'].includes(t.status)).length,
    done:      trips.filter(t => t.status === 'completed').length,
    issues:    trips.filter(t => ['no_show','cancelled'].includes(t.status)).length,
    drivers:   drivers.length,
    available: drivers.filter(d => d.status === 'active').length,
  };

  // ── Trips filter ──────────────────────────────────────────────────────────
  const filteredTrips = trips.filter(t => {
    const q = search.toLowerCase();
    if (q && !t.guest_name.toLowerCase().includes(q)
          && !t.pickup_location.toLowerCase().includes(q)
          && !t.dropoff_location.toLowerCase().includes(q)) return false;
    if (statusFilter && t.status !== statusFilter) return false;
    if (typeFilter && t.trip_type !== typeFilter) return false;
    return true;
  });

  // ── Drivers filter ────────────────────────────────────────────────────────
  const filteredDrivers = drivers.filter(d => {
    const q = search.toLowerCase();
    if (!q) return true;
    return `${d.first_name} ${d.last_name} ${d.vehicle_type ?? ''} ${d.vehicle_plate ?? ''}`.toLowerCase().includes(q);
  });

  const isLoading = activeTab === 'trips' ? tripsLoading : driversLoading;

  return (
    <AppLayout>
      <div className="space-y-6">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Car className="w-5 h-5 text-primary" />
              Transport
              <span className="text-sm font-normal bg-secondary px-2 py-0.5 rounded-full text-muted-foreground">
                {trips.length} trajet{trips.length !== 1 ? 's' : ''} · {drivers.length} chauffeur{drivers.length !== 1 ? 's' : ''}
              </span>
            </h1>
            <p className="text-xs text-muted-foreground mt-1">Transferts aéroport, prises en charge et gestion des chauffeurs — ADR-014</p>
          </div>
          <div className="flex gap-2">
            {activeTab === 'drivers' ? (
              <button
                onClick={() => navigate('/drivers/new')}
                className="flex items-center gap-2 bg-primary text-primary-foreground text-xs font-semibold px-4 py-2.5 rounded-xl hover:bg-primary/90 transition-colors min-h-[44px]">
                <UserPlus className="w-3.5 h-3.5" /> Nouveau chauffeur
              </button>
            ) : (
              <>
                <button
                  onClick={() => navigate('/drivers/new')}
                  className="flex items-center gap-2 border border-border bg-secondary text-muted-foreground hover:text-foreground text-xs font-medium px-4 py-2.5 rounded-xl hover:bg-secondary/80 transition-colors min-h-[44px]">
                  <UserPlus className="w-3.5 h-3.5" /> Chauffeur
                </button>
                <button
                  onClick={() => navigate('/transport/new')}
                  className="flex items-center gap-2 bg-primary text-primary-foreground text-xs font-semibold px-4 py-2.5 rounded-xl hover:bg-primary/90 transition-colors min-h-[44px]">
                  <Plus className="w-3.5 h-3.5" /> Nouveau trajet
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── Stats ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          {[
            { label: 'En attente', value: stats.pending,   Icon: Clock,         color: 'text-yellow-400',  bg: 'bg-yellow-500/10',  onClick: () => { setActiveTab('trips'); setStatusFilter('pending'); } },
            { label: 'En cours',   value: stats.active,    Icon: Car,           color: 'text-blue-400',    bg: 'bg-blue-500/10',    onClick: () => { setActiveTab('trips'); setStatusFilter('assigned'); } },
            { label: 'Terminés',   value: stats.done,      Icon: CheckCircle2,  color: 'text-emerald-400', bg: 'bg-emerald-500/10', onClick: () => { setActiveTab('trips'); setStatusFilter('completed'); } },
            { label: 'Incidents',  value: stats.issues,    Icon: AlertTriangle, color: 'text-rose-400',    bg: 'bg-rose-500/10',    onClick: () => { setActiveTab('trips'); setStatusFilter('cancelled'); } },
            { label: 'Chauffeurs', value: stats.drivers,   Icon: User,          color: 'text-purple-400',  bg: 'bg-purple-500/10',  onClick: () => setActiveTab('drivers') },
            { label: 'Disponibles',value: stats.available, Icon: CheckCircle2,  color: 'text-emerald-400', bg: 'bg-emerald-500/10', onClick: () => setActiveTab('drivers') },
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

        {/* ── Tabs ────────────────────────────────────────────────────── */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center border-b border-border px-1 pt-1 gap-1">
            {([
              { id: 'trips' as TabId,   label: 'Trajets',     count: trips.length },
              { id: 'drivers' as TabId, label: 'Chauffeurs',  count: drivers.length },
            ] as { id: TabId; label: string; count: number }[]).map(tab => (
              <button key={tab.id} onClick={() => { setActiveTab(tab.id); setSearch(''); setStatusFilter(''); setTypeFilter(''); }}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors border-b-2 -mb-px',
                  activeTab === tab.id ? 'text-primary border-primary bg-primary/5' : 'text-muted-foreground border-transparent hover:text-foreground',
                )}>
                {tab.label}
                <span className={cn('text-xs px-1.5 py-0.5 rounded-full',
                  activeTab === tab.id ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground')}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <div className="p-5 space-y-4">

            {/* Search + filters */}
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder={activeTab === 'trips' ? 'Voyageur, lieu de prise en charge…' : 'Nom, véhicule, plaque…'}
                  className="w-full pl-9 pr-3 py-2.5 bg-secondary border border-border rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              {activeTab === 'trips' && (
                <>
                  <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                    className="bg-secondary border border-border rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary min-h-[40px]">
                    <option value="">Tous statuts</option>
                    {STATUSES.map(s => <option key={s} value={s}>{TRIP_STATUS_LABELS[s]}</option>)}
                  </select>
                  <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
                    className="bg-secondary border border-border rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary min-h-[40px]">
                    <option value="">Tous types</option>
                    {TYPES.map(t => <option key={t} value={t}>{TRIP_TYPE_LABELS[t]}</option>)}
                  </select>
                </>
              )}
              {(search || statusFilter || typeFilter) && (
                <button onClick={() => { setSearch(''); setStatusFilter(''); setTypeFilter(''); }}
                  className="text-xs text-muted-foreground hover:text-foreground border border-border rounded-xl px-3 py-2.5 bg-secondary transition-colors">
                  Réinitialiser
                </button>
              )}
            </div>

            {/* ── TRIPS TAB ────────────────────────────────────────────── */}
            {activeTab === 'trips' && (
              isLoading ? (
                <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
              ) : filteredTrips.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-border rounded-xl">
                  <Car className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Aucun trajet trouvé</p>
                  <button onClick={() => navigate('/transport/new')} className="text-xs text-primary mt-2 hover:underline">
                    Créer un trajet →
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    {filteredTrips.length} trajet{filteredTrips.length !== 1 ? 's' : ''}
                  </p>
                  {filteredTrips.map(trip => {
                    const dt = new Date(trip.scheduled_at);
                    const isToday = dt.toDateString() === new Date().toDateString();
                    const isPast = dt < new Date() && !['completed','cancelled','no_show'].includes(trip.status);
                    return (
                      <button
                        key={trip.id}
                        onClick={() => navigate(`/transport/${trip.id}`)}
                        className={cn(
                          'w-full bg-card border rounded-xl p-4 flex items-center gap-4 hover:border-primary/30 hover:bg-secondary/20 transition-colors text-left',
                          isPast ? 'border-orange-500/30' : 'border-border',
                        )}
                      >
                        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border', STATUS_COLOR[trip.status] ?? 'bg-secondary border-border')}>
                          <Car className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-sm font-semibold text-foreground">{trip.guest_name}</span>
                            <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', STATUS_COLOR[trip.status] ?? 'bg-secondary text-muted-foreground border-border')}>
                              {TRIP_STATUS_LABELS[trip.status] ?? trip.status}
                            </span>
                            <span className="text-xs text-muted-foreground bg-secondary border border-border px-2 py-0.5 rounded-full">
                              {TRIP_TYPE_LABELS[trip.trip_type]?.replace('↑ ','').replace('↓ ','').replace('⇄ ','')}
                            </span>
                            {trip.flight_number && (
                              <span className="text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <Plane className="w-2.5 h-2.5" /> {trip.flight_number}
                              </span>
                            )}
                            {isToday && (
                              <span className="text-xs text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full font-medium">
                                Aujourd'hui
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                            <MapPin className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{trip.pickup_location} → {trip.dropoff_location}</span>
                          </div>
                          <p className="text-xs text-muted-foreground/60 mt-0.5">
                            {trip.driver_name} · {trip.guest_count} passager{trip.guest_count > 1 ? 's' : ''}
                            {trip.reservation_dates && ` · Rés: ${trip.reservation_dates}`}
                          </p>
                        </div>
                        <div className="text-xs text-right flex-shrink-0">
                          <p className={cn('font-semibold', isToday ? 'text-primary' : 'text-muted-foreground')}>
                            {dt.toLocaleDateString('fr-CA', { month: 'short', day: 'numeric' })}
                          </p>
                          <p className="text-muted-foreground/60">{dt.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )
            )}

            {/* ── DRIVERS TAB ──────────────────────────────────────────── */}
            {activeTab === 'drivers' && (
              isLoading ? (
                <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
              ) : filteredDrivers.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-border rounded-xl">
                  <User className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Aucun chauffeur trouvé</p>
                  <button onClick={() => navigate('/drivers/new')} className="text-xs text-primary mt-2 hover:underline">
                    Ajouter un chauffeur →
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredDrivers.map(d => {
                    const initials = `${d.first_name?.[0] ?? ''}${d.last_name?.[0] ?? ''}`;
                    const activeTrips = trips.filter(t => t.driver_id === d.id && ['pending','assigned','en_route','arrived'].includes(t.status)).length;
                    return (
                      <div key={d.id} className="bg-card border border-border rounded-xl p-5 flex flex-col gap-4 hover:border-primary/30 transition-colors">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex items-center justify-center text-base font-bold text-yellow-400 flex-shrink-0">
                              {initials}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-foreground">{d.first_name} {d.last_name}</p>
                              <p className="text-xs text-muted-foreground">{d.vehicle_type ?? 'Véhicule non renseigné'}</p>
                            </div>
                          </div>
                          <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium flex-shrink-0', DRIVER_STATUS_COLOR[d.status] ?? 'bg-secondary text-muted-foreground border-border')}>
                            {DRIVER_STATUS_LABELS[d.status] ?? d.status}
                          </span>
                        </div>

                        {/* Vehicle plate */}
                        {d.vehicle_plate && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Car className="w-3.5 h-3.5" />
                            <span className="font-mono font-semibold text-foreground">{d.vehicle_plate}</span>
                          </div>
                        )}

                        {/* Contact */}
                        <div className="space-y-1.5 text-xs">
                          {d.phone && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Phone className="w-3 h-3" /> {d.phone}
                            </div>
                          )}
                          {d.email && (
                            <div className="flex items-center gap-2 text-muted-foreground truncate">
                              <Mail className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">{d.email}</span>
                            </div>
                          )}
                        </div>

                        {/* Active trips badge */}
                        {activeTrips > 0 && (
                          <div className="flex items-center gap-1.5 text-xs bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-1.5 text-blue-400">
                            <Car className="w-3 h-3" />
                            {activeTrips} trajet{activeTrips > 1 ? 's' : ''} actif{activeTrips > 1 ? 's' : ''}
                          </div>
                        )}

                        {/* Notes */}
                        {d.notes && (
                          <p className="text-xs text-muted-foreground/60 line-clamp-2 border-t border-border/50 pt-2">{d.notes}</p>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2 mt-auto">
                          <button
                            onClick={() => navigate(`/drivers/${d.id}/edit`)}
                            className="flex-1 flex items-center justify-center gap-1.5 text-xs border border-border bg-secondary px-3 py-2 rounded-lg hover:bg-secondary/80 transition-colors min-h-[36px]">
                            <Edit className="w-3.5 h-3.5" /> Modifier
                          </button>
                          <button
                            onClick={() => navigate('/transport/new')}
                            className="flex-1 flex items-center justify-center gap-1.5 text-xs border border-primary/20 bg-primary/10 text-primary px-3 py-2 rounded-lg hover:bg-primary/20 transition-colors min-h-[36px]">
                            <Plus className="w-3.5 h-3.5" /> Trajet
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default TransportPage;
