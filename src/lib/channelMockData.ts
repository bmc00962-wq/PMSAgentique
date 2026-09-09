// DEV ONLY — Channel Manager mock data (PROMPT 11)
// Replace with Supabase queries after backend activation
import type { ChannelConnection, ChannelListing, SyncEvent } from '@/types/channel';

export const MOCK_CONNECTIONS: ChannelConnection[] = [
  { id: 'conn-001', tenant_id: 'tenant-demo', channel: 'airbnb', display_name: 'Airbnb — Portefeuille QC', status: 'active', api_key_last4: '7x3k', listings_count: 2, last_sync_at: '2026-08-09T08:30:00Z', next_sync_at: '2026-08-09T09:30:00Z', auto_confirm: true, sync_availability: true, sync_rates: true, created_at: '2026-01-15T10:00:00Z' },
  { id: 'conn-002', tenant_id: 'tenant-demo', channel: 'booking', display_name: 'Booking.com — Multi-pays', status: 'active', api_key_last4: 'p9mq', listings_count: 2, last_sync_at: '2026-08-09T07:45:00Z', next_sync_at: '2026-08-09T08:45:00Z', auto_confirm: false, sync_availability: true, sync_rates: false, created_at: '2026-02-01T09:00:00Z' },
  { id: 'conn-003', tenant_id: 'tenant-demo', channel: 'vrbo', display_name: 'Vrbo — Residences vacances', status: 'paused', api_key_last4: 'r4tz', listings_count: 1, last_sync_at: '2026-08-07T12:00:00Z', auto_confirm: true, sync_availability: true, sync_rates: true, created_at: '2026-03-10T11:00:00Z' },
  { id: 'conn-004', tenant_id: 'tenant-demo', channel: 'ical', display_name: 'iCal — Holidu & HomeAway', status: 'error', listings_count: 1, last_sync_at: '2026-08-08T03:00:00Z', error_message: 'Token expire — renouveler la cle API dans les parametres', auto_confirm: false, sync_availability: true, sync_rates: false, created_at: '2026-04-05T14:00:00Z' },
];

export const MOCK_LISTINGS: ChannelListing[] = [
  { id: 'lst-001', tenant_id: 'tenant-demo', connection_id: 'conn-001', channel: 'airbnb', property_id: 'prop-001', property_name: 'Le Loft Mile-End', unit_id: 'unit-001', unit_name: 'Loft #1', external_listing_id: 'AB-12345678', title: 'Loft industriel chic au coeur du Mile-End', status: 'active', base_price: 125, currency: 'CAD', min_nights: 2, max_nights: 30, last_sync_at: '2026-08-09T08:30:00Z' },
  { id: 'lst-002', tenant_id: 'tenant-demo', connection_id: 'conn-001', channel: 'airbnb', property_id: 'prop-002', property_name: 'Maison Plateau Familiale', unit_id: 'unit-002', unit_name: 'Maison Plateau - Rez', external_listing_id: 'AB-87654321', title: 'Grande maison familiale Plateau-Mont-Royal', status: 'active', base_price: 350, currency: 'CAD', min_nights: 3, max_nights: 14, last_sync_at: '2026-08-09T08:30:00Z' },
  { id: 'lst-003', tenant_id: 'tenant-demo', connection_id: 'conn-002', channel: 'booking', property_id: 'prop-003', property_name: 'Chalet Mont-Tremblant', unit_id: 'unit-003', unit_name: 'Chalet Principal', external_listing_id: 'BK-QC-98765', title: 'Chalet ski Mont-Tremblant - vue panoramique', status: 'active', base_price: 275, currency: 'CAD', min_nights: 2, max_nights: 21, last_sync_at: '2026-08-09T07:45:00Z' },
  { id: 'lst-004', tenant_id: 'tenant-demo', connection_id: 'conn-002', channel: 'booking', property_id: 'prop-004', property_name: 'Studio Cote-des-Neiges', unit_id: 'unit-005', unit_name: 'Studio A', external_listing_id: 'BK-QC-54321', title: 'Studio moderne pres UdM et HMR', status: 'active', base_price: 85, currency: 'CAD', min_nights: 1, max_nights: 30, last_sync_at: '2026-08-09T07:45:00Z' },
  { id: 'lst-005', tenant_id: 'tenant-demo', connection_id: 'conn-003', channel: 'vrbo', property_id: 'prop-005', property_name: 'Dar Zitoun Marrakech', unit_id: 'unit-006', unit_name: 'Suite Principale', external_listing_id: 'VR-MA-77890', title: 'Riad authentique medina de Marrakech', status: 'inactive', base_price: 1800, currency: 'MAD', min_nights: 3, max_nights: 30, last_sync_at: '2026-08-07T12:00:00Z' },
  { id: 'lst-006', tenant_id: 'tenant-demo', connection_id: 'conn-004', channel: 'ical', property_id: 'prop-006', property_name: 'Residence Rif Tetouan', unit_id: 'unit-007', unit_name: 'Studio Rif #1', external_listing_id: 'ICAL-TET-001', title: 'Studio Rif vue mer - Tetouan', status: 'pending_review', base_price: 500, currency: 'MAD', min_nights: 2, max_nights: 14, last_sync_at: '2026-08-08T03:00:00Z' },
];

export const MOCK_SYNC_EVENTS: SyncEvent[] = [
  { id: 'evt-001', tenant_id: 'tenant-demo', connection_id: 'conn-001', channel: 'airbnb', event_type: 'reservation_imported', status: 'success', message: 'Reservation res-101 importee', details: 'Marie Cote - Loft #1 - 4 nuits', reservation_id: 'res-101', listing_id: 'lst-001', duration_ms: 245, timestamp: '2026-07-20T10:02:00Z' },
  { id: 'evt-002', tenant_id: 'tenant-demo', connection_id: 'conn-001', channel: 'airbnb', event_type: 'availability_pushed', status: 'success', message: 'Disponibilite aout mise a jour (2 listings)', listing_id: 'lst-001', duration_ms: 512, timestamp: '2026-08-09T08:30:00Z' },
  { id: 'evt-003', tenant_id: 'tenant-demo', connection_id: 'conn-001', channel: 'airbnb', event_type: 'rate_pushed', status: 'success', message: 'Tarifs haute-saison ete mis a jour', listing_id: 'lst-002', duration_ms: 388, timestamp: '2026-08-08T14:00:00Z' },
  { id: 'evt-004', tenant_id: 'tenant-demo', connection_id: 'conn-002', channel: 'booking', event_type: 'reservation_imported', status: 'success', message: 'Reservation res-108 importee', details: 'Lea Bouchard - Studio A - 4 nuits', reservation_id: 'res-108', listing_id: 'lst-004', duration_ms: 301, timestamp: '2026-08-05T08:05:00Z' },
  { id: 'evt-005', tenant_id: 'tenant-demo', connection_id: 'conn-002', channel: 'booking', event_type: 'availability_pushed', status: 'success', message: 'Disponibilite synchronisee (2 listings)', duration_ms: 634, timestamp: '2026-08-09T07:45:00Z' },
  { id: 'evt-006', tenant_id: 'tenant-demo', connection_id: 'conn-002', channel: 'booking', event_type: 'reservation_cancelled', status: 'warning', message: 'Annulation OTA detectee', details: 'BK-QC-2026-0820 - Politique moderee appliquee', duration_ms: 189, timestamp: '2026-08-07T09:10:00Z' },
  { id: 'evt-007', tenant_id: 'tenant-demo', connection_id: 'conn-003', channel: 'vrbo', event_type: 'reservation_imported', status: 'success', message: 'Reservation res-104 importee', details: 'Carlos Gomez - Chalet Principal - 7 nuits', reservation_id: 'res-104', listing_id: 'lst-005', duration_ms: 278, timestamp: '2026-07-30T11:05:00Z' },
  { id: 'evt-008', tenant_id: 'tenant-demo', connection_id: 'conn-003', channel: 'vrbo', event_type: 'error', status: 'error', message: 'Echec push disponibilite Vrbo', details: 'HTTP 429 - Rate limit depasse. Retry dans 60min.', listing_id: 'lst-005', duration_ms: 5000, timestamp: '2026-08-07T12:00:00Z' },
  { id: 'evt-009', tenant_id: 'tenant-demo', connection_id: 'conn-004', channel: 'ical', event_type: 'auth_refresh', status: 'error', message: 'Renouvellement token iCal echoue', details: 'Invalid API credentials - Holidu. Verifier les parametres.', duration_ms: 2100, timestamp: '2026-08-08T03:00:00Z' },
  { id: 'evt-010', tenant_id: 'tenant-demo', connection_id: 'conn-004', channel: 'ical', event_type: 'availability_pushed', status: 'error', message: 'Push disponibilite echoue (auth invalide)', details: 'Synchronisation bloquee - token expire', duration_ms: 1250, timestamp: '2026-08-08T03:01:00Z' },
  { id: 'evt-011', tenant_id: 'tenant-demo', connection_id: 'conn-001', channel: 'airbnb', event_type: 'reservation_imported', status: 'success', message: 'Reservation res-107 importee', details: 'Amira Hassan - Maison Plateau - 3 nuits', reservation_id: 'res-107', listing_id: 'lst-002', duration_ms: 212, timestamp: '2026-07-22T12:04:00Z' },
  { id: 'evt-012', tenant_id: 'tenant-demo', connection_id: 'conn-002', channel: 'booking', event_type: 'reservation_imported', status: 'success', message: 'Reservation res-113 importee', details: 'Lisa Anderson - Maison Plateau Etage - 7 nuits', reservation_id: 'res-113', listing_id: 'lst-003', duration_ms: 335, timestamp: '2026-07-20T11:03:00Z' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
export const getConnectionById = (id: string): ChannelConnection | undefined =>
  MOCK_CONNECTIONS.find(c => c.id === id);

export const getListingsByConnection = (cid: string): ChannelListing[] =>
  MOCK_LISTINGS.filter(l => l.connection_id === cid);

export const getSyncEventsByConnection = (cid: string): SyncEvent[] =>
  MOCK_SYNC_EVENTS
    .filter(e => e.connection_id === cid)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

// ─── Display constants ────────────────────────────────────────────────────────
export const CONNECTION_STATUS_LABELS: Record<string, string> = {
  active: 'Actif', paused: 'En pause', error: 'Erreur', disconnected: 'Deconnecte',
};

export const CONNECTION_STATUS_COLORS: Record<string, string> = {
  active:       'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  paused:       'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  error:        'bg-red-500/10 text-red-400 border-red-500/20',
  disconnected: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
};

export const LISTING_STATUS_LABELS: Record<string, string> = {
  active: 'Actif', inactive: 'Inactif', pending_review: 'En revision', suspended: 'Suspendu',
};

export const LISTING_STATUS_COLORS: Record<string, string> = {
  active:         'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  inactive:       'bg-slate-500/10 text-slate-400 border-slate-500/20',
  pending_review: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  suspended:      'bg-red-500/10 text-red-400 border-red-500/20',
};

export const SYNC_EVENT_LABELS: Record<string, string> = {
  reservation_imported:  'Import reservation',
  availability_pushed:   'Disponibilite envoyee',
  rate_pushed:           'Tarifs envoyes',
  reservation_updated:   'Reservation mise a jour',
  reservation_cancelled: 'Annulation detectee',
  error:                 'Erreur',
  auth_refresh:          'Renouvellement auth',
};

export const SYNC_STATUS_COLORS: Record<string, string> = {
  success: 'text-emerald-400',
  error:   'text-red-400',
  warning: 'text-yellow-400',
};

export const CHANNEL_DISPLAY: Record<string, { name: string; color: string; bg: string }> = {
  airbnb:  { name: 'Airbnb',      color: 'text-rose-400',    bg: 'bg-rose-500/10' },
  booking: { name: 'Booking.com', color: 'text-blue-400',    bg: 'bg-blue-500/10' },
  vrbo:    { name: 'Vrbo',        color: 'text-indigo-400',  bg: 'bg-indigo-500/10' },
  ical:    { name: 'iCal',        color: 'text-slate-400',   bg: 'bg-slate-500/10' },
  direct:  { name: 'Direct',      color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
};
