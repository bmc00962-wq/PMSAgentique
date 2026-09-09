// PropertyDetailPage — Live Supabase data — ADR-004 / ADR-009
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Edit, MapPin, Clock, Users, Building2, CheckCircle2,
  Wrench, BookOpen, Home, DollarSign, Calendar, AlertTriangle, Info, Plus,
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import LoadingSpinner from '@/components/features/LoadingSpinner';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

const TENANT_ID = '00000000-0000-0000-0000-000000000001';

const TYPE_LABEL: Record<string, string> = {
  apartment: 'Appartement', house: 'Maison', villa: 'Villa', condo: 'Condo',
  chalet: 'Chalet', loft: 'Loft', studio: 'Studio', riad: 'Riad', other: 'Autre',
};

const STATUS_STYLE: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  inactive: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  maintenance: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
};

const STATUS_LABEL: Record<string, string> = {
  active: 'Actif', inactive: 'Inactif', maintenance: 'Maintenance',
};

const UNIT_STATUS_COLOR: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  inactive: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  maintenance: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
};

const TICKET_PRIORITY_COLOR: Record<string, string> = {
  emergency: 'text-red-400', urgent: 'text-orange-400',
  high: 'text-amber-400', normal: 'text-blue-400', low: 'text-slate-400',
};

type TabId = 'units' | 'reservations' | 'maintenance' | 'channels';

async function fetchPropertyDetail(id: string) {
  const [propRes, channelListingsRes] = await Promise.all([
    supabase.from('properties')
      .select('id, name, property_type, address, city, country, status, description, amenities, owner_id, created_at, updated_at')
      .eq('id', id).eq('tenant_id', TENANT_ID).single(),
    supabase.from('channel_listings')
      .select('id, channel_id, unit_id, status, title, listing_url, external_listing_id')
      .eq('tenant_id', TENANT_ID)
      .is('deleted_at', null),
  ]);

  if (propRes.error) throw propRes.error;
  const prop = propRes.data;

  const [ownerRes, unitsRes] = await Promise.all([
    supabase.from('owners').select('id, first_name, last_name, email, phone').eq('id', prop.owner_id).single(),
    supabase.from('units')
      .select('id, name, unit_type, bedrooms, bathrooms, max_guests, base_rate, cleaning_fee, status, floor, area_sqm')
      .eq('property_id', id).eq('tenant_id', TENANT_ID).is('deleted_at', null)
      .order('name'),
  ]);

  const units = unitsRes.data ?? [];
  const unitIds = units.map(u => u.id);

  // Fetch reservations + maintenance tickets for these units
  const [resRes, ticketsRes, channelsRes] = await Promise.all([
    unitIds.length > 0
      ? supabase.from('reservations')
          .select('id, unit_id, status, channel, check_in, check_out, guest_first_name, guest_last_name, total_amount, currency')
          .in('unit_id', unitIds).eq('tenant_id', TENANT_ID).is('deleted_at', null)
          .not('check_in', 'is', null).order('check_in', { ascending: false }).limit(20)
      : { data: [] },
    unitIds.length > 0
      ? supabase.from('maintenance_tickets')
          .select('id, unit_id, title, category, priority, status, created_at')
          .in('unit_id', unitIds).eq('tenant_id', TENANT_ID).is('deleted_at', null)
          .order('created_at', { ascending: false }).limit(15)
      : { data: [] },
    supabase.from('channels').select('id, name, channel_type, status').eq('tenant_id', TENANT_ID).is('deleted_at', null),
  ]);

  const reservations = resRes.data ?? [];
  const tickets = ticketsRes.data ?? [];
  const channels = channelsRes.data ?? [];
  const listings = channelListingsRes.data ?? [];

  // Build channel map + listings by unit
  const channelMap: Record<string, string> = {};
  for (const c of channels) channelMap[c.id] = c.name;

  // KPIs
  const activeUnits = units.filter(u => u.status === 'active').length;
  const confirmedRes = reservations.filter(r => ['confirmed', 'checked_in'].includes(r.status));
  const totalRevenue = confirmedRes.reduce((s, r) => s + Number(r.total_amount), 0);
  const openTickets = tickets.filter(t => ['open', 'assigned', 'in_progress'].includes(t.status)).length;

  return {
    property: prop,
    owner: ownerRes.data,
    units,
    reservations,
    tickets,
    channels,
    listings,
    channelMap,
    kpi: { activeUnits, totalUnits: units.length, totalRevenue, openTickets, totalReservations: reservations.length },
  };
}

const PropertyDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>('units');

  const { data, isLoading } = useQuery({
    queryKey: ['property-detail', id],
    queryFn: () => fetchPropertyDetail(id!),
    enabled: !!id,
    staleTime: 60_000,
  });

  if (isLoading) return <AppLayout><div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div></AppLayout>;

  if (!data?.property) {
    return (
      <AppLayout>
        <div className="text-center py-20">
          <p className="text-sm text-muted-foreground mb-3">Propriété introuvable</p>
          <button onClick={() => navigate('/properties')} className="text-primary text-sm hover:underline">← Retour</button>
        </div>
      </AppLayout>
    );
  }

  const { property: p, owner, units, reservations, tickets, channels, listings, channelMap, kpi } = data;

  const TABS: { id: TabId; label: string; count?: number }[] = [
    { id: 'units', label: 'Unités', count: units.length },
    { id: 'reservations', label: 'Réservations', count: reservations.length },
    { id: 'maintenance', label: 'Maintenance', count: kpi.openTickets > 0 ? kpi.openTickets : undefined },
    { id: 'channels', label: 'Canaux OTA', count: channels.length },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <button onClick={() => navigate('/properties')}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Propriétés
        </button>

        {/* Hero */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-start gap-4 flex-wrap">
            <div className="w-12 h-12 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <Building2 className="w-6 h-6 text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap mb-1">
                <h1 className="text-xl font-bold text-foreground">{p.name}</h1>
                <span className={cn('text-xs px-2.5 py-1 rounded-full border', STATUS_STYLE[p.status] ?? 'bg-secondary text-muted-foreground border-border')}>
                  {STATUS_LABEL[p.status] ?? p.status}
                </span>
                <span className="text-xs bg-secondary border border-border text-muted-foreground px-2.5 py-1 rounded-full">
                  {TYPE_LABEL[p.property_type] ?? p.property_type}
                </span>
              </div>
              {owner && (
                <p className="text-sm text-muted-foreground">
                  Propriétaire : <button onClick={() => navigate(`/owners/${owner.id}`)}
                    className="text-primary hover:underline">{owner.first_name} {owner.last_name}</button>
                </p>
              )}
              {p.description && <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{p.description}</p>}
            </div>
            <button
              onClick={() => navigate(`/properties/${id}/edit`)}
              className="flex items-center gap-2 px-4 py-2.5 bg-secondary border border-border rounded-xl text-sm font-medium text-foreground hover:bg-secondary/80 transition-colors min-h-[44px]">
              <Edit className="w-3.5 h-3.5" /> Modifier
            </button>
            <button
              onClick={() => navigate(`/units/new?property_id=${id}`)}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors min-h-[44px]">
              <Plus className="w-3.5 h-3.5" /> Nouvelle unité
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: 'Unités actives', value: `${kpi.activeUnits}/${kpi.totalUnits}`, color: 'text-blue-400', icon: Home },
            { label: 'Réservations', value: kpi.totalReservations, color: 'text-purple-400', icon: BookOpen },
            { label: 'Revenus (confirmées)', value: `${kpi.totalRevenue.toFixed(0)} CAD`, color: 'text-emerald-400', icon: DollarSign },
            { label: 'Tickets ouverts', value: kpi.openTickets, color: kpi.openTickets > 0 ? 'text-orange-400' : 'text-slate-400', icon: Wrench },
            { label: 'Canaux actifs', value: channels.filter(c => c.status === 'active').length, color: 'text-cyan-400', icon: Building2 },
          ].map(({ label, value, color, icon: Icon }) => (
            <div key={label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
              <Icon className={cn('w-4 h-4 flex-shrink-0', color)} />
              <div className="min-w-0">
                <p className={cn('text-lg font-bold truncate', color)}>{value}</p>
                <p className="text-xs text-muted-foreground truncate">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Info row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
            <MapPin className="w-4 h-4 text-blue-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">{p.city}, {p.country}</p>
              {p.address && <p className="text-xs text-muted-foreground truncate">{p.address}</p>}
            </div>
          </div>
          {owner && (
            <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
              <Users className="w-4 h-4 text-purple-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">{owner.first_name} {owner.last_name}</p>
                {owner.email && <p className="text-xs text-muted-foreground truncate">{owner.email}</p>}
              </div>
            </div>
          )}
          <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
            <Calendar className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">Créée le</p>
              <p className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString('fr-CA')}</p>
            </div>
          </div>
        </div>

        {/* Amenities */}
        {p.amenities && p.amenities.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5" /> Équipements ({p.amenities.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {p.amenities.map((a: string) => (
                <span key={a} className="text-xs bg-emerald-500/5 border border-emerald-500/15 text-emerald-400 px-2.5 py-1 rounded-lg">
                  {a}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center border-b border-border px-1 pt-1 gap-1 overflow-x-auto">
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={cn('flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors border-b-2 -mb-px whitespace-nowrap',
                  activeTab === tab.id
                    ? 'text-primary border-primary bg-primary/5'
                    : 'text-muted-foreground border-transparent hover:text-foreground'
                )}>
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={cn('text-xs px-1.5 py-0.5 rounded-full',
                    activeTab === tab.id ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground'
                  )}>{tab.count}</span>
                )}
              </button>
            ))}
          </div>

          <div className="p-5">
            {/* Units tab */}
            {activeTab === 'units' && (
              units.length === 0 ? (
                <div className="text-center py-10">
                  <Building2 className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Aucune unité configurée</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {units.map(unit => (
                    <div key={unit.id} className="bg-secondary/20 border border-border rounded-xl p-4 cursor-pointer hover:border-primary/30 transition-colors" onClick={() => navigate(`/units/${unit.id}`)}>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <h4 className="text-sm font-semibold text-foreground">{unit.name}</h4>
                          <p className="text-xs text-muted-foreground capitalize">{unit.unit_type}</p>
                        </div>
                        <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium flex-shrink-0',
                          UNIT_STATUS_COLOR[unit.status] ?? 'bg-secondary text-muted-foreground border-border')}>
                          {unit.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="text-center bg-card border border-border rounded-lg p-2">
                          <p className="font-bold text-foreground">{unit.bedrooms}</p>
                          <p className="text-muted-foreground">chambres</p>
                        </div>
                        <div className="text-center bg-card border border-border rounded-lg p-2">
                          <p className="font-bold text-foreground">{unit.bathrooms}</p>
                          <p className="text-muted-foreground">s. de bain</p>
                        </div>
                        <div className="text-center bg-card border border-border rounded-lg p-2">
                          <p className="font-bold text-foreground">{unit.max_guests}</p>
                          <p className="text-muted-foreground">max</p>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Tarif / nuit</span>
                        <span className="font-bold font-mono text-emerald-400">{Number(unit.base_rate).toFixed(0)} CAD</span>
                      </div>
                      {unit.area_sqm && (
                        <p className="text-xs text-muted-foreground mt-1">{unit.area_sqm} m²{unit.floor ? ` · Étage ${unit.floor}` : ''}</p>
                      )}
                      <button
                        onClick={() => navigate(`/calendar`)}
                        className="mt-3 w-full text-xs text-center text-primary border border-primary/25 bg-primary/5 rounded-lg py-1.5 hover:bg-primary/10 transition-colors flex items-center justify-center gap-1.5">
                        <Calendar className="w-3 h-3" /> Voir calendrier
                      </button>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* Reservations tab */}
            {activeTab === 'reservations' && (
              reservations.length === 0 ? (
                <div className="text-center py-10">
                  <BookOpen className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Aucune réservation</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {reservations.map(r => {
                    const unit = units.find(u => u.id === r.unit_id);
                    return (
                      <button key={r.id} onClick={() => navigate(`/reservations/${r.id}`)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl bg-secondary/20 border border-border hover:border-primary/30 text-left transition-all text-xs">
                        <span className={cn('w-2 h-2 rounded-full flex-shrink-0 mt-0.5', {
                          confirmed: 'bg-emerald-400', checked_in: 'bg-blue-400',
                          pending: 'bg-yellow-400', cancelled: 'bg-red-400',
                        }[r.status] ?? 'bg-slate-400')} />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground">{r.guest_first_name} {r.guest_last_name}</p>
                          <p className="text-muted-foreground">{unit?.name ?? '—'} · {r.check_in} → {r.check_out}</p>
                        </div>
                        <span className="font-mono font-semibold text-emerald-400 flex-shrink-0">
                          {Number(r.total_amount).toFixed(0)} {r.currency}
                        </span>
                      </button>
                    );
                  })}
                  <button onClick={() => navigate('/reservations')}
                    className="text-xs text-primary mt-1 hover:underline">Voir toutes →</button>
                </div>
              )
            )}

            {/* Maintenance tab */}
            {activeTab === 'maintenance' && (
              tickets.length === 0 ? (
                <div className="text-center py-10">
                  <Wrench className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Aucun ticket de maintenance</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {tickets.map(t => {
                    const unit = units.find(u => u.id === t.unit_id);
                    return (
                      <button key={t.id} onClick={() => navigate(`/maintenance/${t.id}`)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl bg-secondary/20 border border-border hover:border-primary/30 text-left transition-all">
                        <AlertTriangle className={cn('w-4 h-4 flex-shrink-0', TICKET_PRIORITY_COLOR[t.priority] ?? 'text-muted-foreground')} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{t.title}</p>
                          <p className="text-xs text-muted-foreground">{unit?.name ?? '—'} · {t.category} · {t.status}</p>
                        </div>
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          {new Date(t.created_at).toLocaleDateString('fr-CA')}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )
            )}

            {/* Channels tab */}
            {activeTab === 'channels' && (
              channels.length === 0 ? (
                <div className="text-center py-10">
                  <Info className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Aucun canal configuré</p>
                  <button onClick={() => navigate('/channels')} className="text-xs text-primary mt-2 hover:underline">
                    Configurer les canaux →
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {channels.map(ch => {
                    const chListings = listings.filter(l => l.channel_id === ch.id && units.some(u => u.id === l.unit_id));
                    return (
                      <div key={ch.id} className={cn('border rounded-xl p-4', ch.status === 'active' ? 'border-emerald-500/25 bg-emerald-500/5' : 'border-border bg-card')}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-foreground">{ch.name}</span>
                          <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium',
                            ch.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-secondary text-muted-foreground border-border'
                          )}>{ch.status}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{ch.channel_type} · {chListings.length} listing{chListings.length !== 1 ? 's' : ''}</p>
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

export default PropertyDetailPage;
