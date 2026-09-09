// DEV ONLY — Reservation mock data for UI development (PROMPT 10)
// Replace with Supabase queries after backend activation
import type { ReservationDisplay, GuestDisplay, ReservationCharge, ReservationTimelineEvent } from '@/types/reservation';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ms(base: string, delta: number) {
  return new Date(new Date(base).getTime() + delta).toISOString();
}

function g(id: string, first: string, last: string, email: string, country: string, lang: string,
  stays: number, verified: boolean, rating?: number, phone?: string): GuestDisplay {
  return { id, tenant_id: 'tenant-demo', first_name: first, last_name: last, email, phone,
    country, language: lang, avatar_initials: `${first[0]}${last[0]}`, verified, total_stays: stays, rating };
}

// ─── Guests ───────────────────────────────────────────────────────────────────

const GUESTS = {
  marie:    g('g-001', 'Marie',    'Côté',     'marie.cote@email.ca',     'CA', 'fr', 8,  true,  4.9, '+1 514 555 0101'),
  lavoie:   g('g-002', 'Pierre',   'Lavoie',   'famille.lavoie@email.ca', 'CA', 'fr', 3,  true,  4.7, '+1 418 555 0202'),
  ahmed:    g('g-003', 'Ahmed',    'El Fassi', 'ahmed.elfassi@email.ma',  'MA', 'ar', 12, true,  4.8, '+212 655010101'),
  carlos:   g('g-004', 'Carlos',   'Gomez',    'carlos.gomez@email.mx',   'MX', 'es', 5,  true,  4.6),
  sophie:   g('g-005', 'Sophie',   'Martin',   'sophie.martin@email.fr',  'FR', 'fr', 2,  false, 4.5),
  tom:      g('g-006', 'Tom',      'Wilson',   'tom.wilson@email.us',     'US', 'en', 1,  false),
  amira:    g('g-007', 'Amira',    'Hassan',   'amira.hassan@email.dz',   'DZ', 'ar', 6,  true,  4.9, '+213 555010101'),
  lea:      g('g-008', 'Léa',      'Bouchard', 'lea.bouchard@email.ca',   'CA', 'fr', 4,  true,  4.8),
  nadia:    g('g-009', 'Nadia',    'Rousseau', 'nadia.rousseau@email.ca', 'CA', 'fr', 6,  true,  4.8, '+1 438 555 0404'),
  john:     g('g-010', 'John',     'Smith',    'john.smith@email.us',     'US', 'en', 0,  false),
  fatima:   g('g-011', 'Fatima',   'Alaoui',   'fatima.alaoui@email.ma',  'MA', 'ar', 7,  true,  5.0, '+212 666020202'),
  michel:   g('g-012', 'Michel',   'Dupont',   'michel.dupont@email.ca',  'CA', 'fr', 1,  false),
  lisa:     g('g-013', 'Lisa',     'Anderson', 'lisa.anderson@email.us',  'US', 'en', 9,  true,  4.7, '+1 212 555 0303'),
  yuki:     g('g-014', 'Yuki',     'Tanaka',   'yuki.tanaka@email.jp',    'JP', 'ja', 3,  true,  4.6),
  mohammed: g('g-015', 'Mohammed', 'Benali',   'm.benali@email.ma',       'MA', 'ar', 15, true,  4.9, '+212 677030303'),
};

// ─── Charge builder ───────────────────────────────────────────────────────────

function makeCharges(resId: string, nights: number, ppn: number, currency: string, channel: string, status: string): ReservationCharge[] {
  const base = nights * ppn;
  const cleaning = currency === 'MAD' ? 350 : 85;
  const tax = Math.round(base * (currency === 'MAD' ? 0.10 : 0.15));
  const hasOTA = !['direct', 'manual'].includes(channel);
  const serviceFee = hasOTA ? Math.round(base * 0.12) : 0;
  const cStatus: ReservationCharge['status'] =
    ['confirmed', 'checked_in', 'checked_out', 'no_show'].includes(status) ? 'paid' :
    status === 'cancelled' ? 'refunded' : 'pending';
  const list: ReservationCharge[] = [
    { id: `chg-${resId}-1`, reservation_id: resId, label: 'Location de base', amount: base, currency, type: 'base_rent', status: cStatus },
    { id: `chg-${resId}-2`, reservation_id: resId, label: 'Frais de ménage', amount: cleaning, currency, type: 'cleaning_fee', status: cStatus },
    { id: `chg-${resId}-3`, reservation_id: resId, label: currency === 'MAD' ? 'TVA (10%)' : 'Taxes combinées (15%)', amount: tax, currency, type: 'tax', status: cStatus },
  ];
  if (serviceFee > 0) {
    list.push({ id: `chg-${resId}-4`, reservation_id: resId, label: `Commission ${channel}`, amount: serviceFee, currency, type: 'service_fee', status: cStatus });
  }
  return list;
}

// ─── Timeline builder ─────────────────────────────────────────────────────────

function makeTimeline(resId: string, status: string, channel: string, createdAt: string): ReservationTimelineEvent[] {
  const isOTA = ['airbnb', 'booking', 'vrbo'].includes(channel);
  const events: ReservationTimelineEvent[] = [
    { id: `tl-${resId}-1`, reservation_id: resId, status: 'inquiry', timestamp: createdAt,
      actor: isOTA ? channel : 'Système', actor_type: isOTA ? 'channel' : 'system', note: 'Demande reçue' },
  ];
  if (status === 'inquiry') return events;
  events.push({ id: `tl-${resId}-2`, reservation_id: resId, status: 'pending', timestamp: ms(createdAt, 3600000), actor: 'Système', actor_type: 'system' });
  if (status === 'pending') return events;
  if (status === 'cancelled') {
    events.push({ id: `tl-${resId}-3`, reservation_id: resId, status: 'cancelled', timestamp: ms(createdAt, 7200000), actor: 'Voyageur', actor_type: 'user', note: 'Annulation à la demande du voyageur' });
    return events;
  }
  if (status === 'no_show') {
    events.push(
      { id: `tl-${resId}-3`, reservation_id: resId, status: 'confirmed', timestamp: ms(createdAt, 7200000), actor: 'Sophie Gagnon', actor_type: 'user' },
      { id: `tl-${resId}-4`, reservation_id: resId, status: 'no_show', timestamp: ms(createdAt, 86400000 * 5), actor: 'Agent IA', actor_type: 'agent', note: 'Non-présentation détectée (T+2h post check-in)' },
    );
    return events;
  }
  events.push({ id: `tl-${resId}-3`, reservation_id: resId, status: 'confirmed', timestamp: ms(createdAt, 7200000), actor: 'Sophie Gagnon', actor_type: 'user', note: 'Confirmée' });
  if (status === 'confirmed') return events;
  events.push({ id: `tl-${resId}-4`, reservation_id: resId, status: 'checked_in', timestamp: ms(createdAt, 86400000 * 7), actor: 'Système (serrure)', actor_type: 'system', note: 'Code accès envoyé au voyageur' });
  if (status === 'checked_in') return events;
  events.push({ id: `tl-${resId}-5`, reservation_id: resId, status: 'checked_out', timestamp: ms(createdAt, 86400000 * 14), actor: 'Système', actor_type: 'system', note: 'Check-out automatique' });
  return events;
}

// ─── Reservation builder ──────────────────────────────────────────────────────

function mr(
  id: string, unitId: string, unitName: string, propId: string, propName: string,
  ownerId: string, ownerName: string, guest: GuestDisplay,
  channel: ReservationDisplay['channel'], status: ReservationDisplay['status'],
  ci: string, co: string, nights: number, adults: number, children: number, infants: number,
  ppn: number, currency: string, policy: ReservationDisplay['cancellation_policy'],
  createdAt: string, special?: string, notes?: string, channelResId?: string,
): ReservationDisplay {
  const charges = makeCharges(id, nights, ppn, currency, channel, status);
  const total = charges.reduce((s, c) => s + c.amount, 0);
  const paid = status === 'cancelled' ? 0 : charges.filter(c => c.status === 'paid').reduce((s, c) => s + c.amount, 0);
  return {
    id, tenant_id: 'tenant-demo', unit_id: unitId, unit_name: unitName,
    property_id: propId, property_name: propName, owner_id: ownerId, owner_name: ownerName,
    guest, channel, channel_reservation_id: channelResId, status,
    check_in: ci, check_out: co, nights, adults, children, infants,
    charges, total_amount: total, currency, paid_amount: paid, balance_due: total - paid,
    cancellation_policy: policy, special_requests: special, internal_notes: notes,
    timeline: makeTimeline(id, status, channel, createdAt),
    created_at: createdAt, updated_at: createdAt,
  };
}

// ─── 15 Mock Reservations ─────────────────────────────────────────────────────

export const MOCK_RESERVATIONS_DISPLAY: ReservationDisplay[] = [
  mr('res-101', 'unit-001', 'Loft #1',              'prop-001', 'Le Loft Mile-End',          'owner-001', 'Jean-Pierre Gagnon', GUESTS.marie,    'airbnb',  'confirmed',   '2026-08-03', '2026-08-07', 4, 2, 0, 0, 125,  'CAD', 'moderate',      '2026-07-20T10:00:00Z', 'Arrivée tardive après 22h',                   undefined,                                   'HM123456789'),
  mr('res-102', 'unit-002', 'Maison Plateau - Rez', 'prop-002', 'Maison Plateau Familiale',  'owner-001', 'Jean-Pierre Gagnon', GUESTS.lavoie,   'direct',  'checked_in',  '2026-08-01', '2026-08-08', 7, 2, 2, 1, 350,  'CAD', 'strict',        '2026-07-15T09:00:00Z', 'Berceau pour bébé si possible',               'Famille fidèle — 3e séjour'),
  mr('res-103', 'unit-006', 'Suite Principale',     'prop-005', 'Dar Zitoun Marrakech',      'owner-003', 'Mohammed Alami',     GUESTS.ahmed,    'booking', 'pending',     '2026-08-10', '2026-08-15', 5, 2, 0, 0, 1800, 'MAD', 'flexible',      '2026-08-01T14:00:00Z', 'Vol arrive à 23h30',                          undefined,                                   'BK-MA-2026-08-103'),
  mr('res-104', 'unit-003', 'Chalet Principal',     'prop-003', 'Chalet Mont-Tremblant',     'owner-002', 'Sophie Martin',      GUESTS.carlos,   'vrbo',    'confirmed',   '2026-08-20', '2026-08-27', 7, 2, 2, 0, 275,  'CAD', 'strict',        '2026-07-30T11:00:00Z', undefined,                                     undefined,                                   'VR-QC-2026-0820'),
  mr('res-105', 'unit-007', 'Studio Rif #1',        'prop-006', 'Résidence Rif Tetouan',     'owner-004', 'Nadia Bensouda',     GUESTS.sophie,   'airbnb',  'confirmed',   '2026-08-10', '2026-08-14', 4, 1, 0, 0, 500,  'MAD', 'moderate',      '2026-07-25T16:00:00Z', undefined,                                     undefined,                                   'AB9876543'),
  mr('res-106', 'unit-001', 'Loft #1',              'prop-001', 'Le Loft Mile-End',          'owner-001', 'Jean-Pierre Gagnon', GUESTS.tom,      'direct',  'cancelled',   '2026-08-12', '2026-08-16', 4, 1, 0, 0, 125,  'CAD', 'flexible',      '2026-07-28T10:00:00Z', undefined,                                     'Annulé 5j avant — remboursement complet'),
  mr('res-107', 'unit-005', 'Studio A',             'prop-004', 'Studio Côte-des-Neiges',   'owner-002', 'Sophie Martin',      GUESTS.amira,    'airbnb',  'confirmed',   '2026-08-08', '2026-08-11', 3, 1, 0, 0, 85,   'CAD', 'moderate',      '2026-07-22T12:00:00Z', undefined,                                     undefined,                                   'AB1122334'),
  mr('res-108', 'unit-005', 'Studio A',             'prop-004', 'Studio Côte-des-Neiges',   'owner-002', 'Sophie Martin',      GUESTS.lea,      'booking', 'confirmed',   '2026-08-18', '2026-08-22', 4, 1, 0, 0, 85,   'CAD', 'flexible',      '2026-08-05T08:00:00Z', 'Végétarienne stricte',                        undefined,                                   'BK-QC-2026-0818'),
  mr('res-109', 'unit-002', 'Maison Plateau - Rez', 'prop-002', 'Maison Plateau Familiale',  'owner-001', 'Jean-Pierre Gagnon', GUESTS.nadia,    'direct',  'checked_out', '2026-07-20', '2026-07-25', 5, 1, 0, 0, 350,  'CAD', 'moderate',      '2026-07-05T10:00:00Z', undefined,                                     'Séjour parfait — avis 5 étoiles laissé'),
  mr('res-110', 'unit-003', 'Chalet Principal',     'prop-003', 'Chalet Mont-Tremblant',     'owner-002', 'Sophie Martin',      GUESTS.john,     'manual',  'inquiry',     '2026-09-01', '2026-09-07', 6, 2, 3, 0, 275,  'CAD', 'flexible',      '2026-08-08T15:00:00Z', "Fête de famille — jusqu'à 10 adultes au total", 'À valider avec le propriétaire'),
  mr('res-111', 'unit-006', 'Suite Principale',     'prop-005', 'Dar Zitoun Marrakech',      'owner-003', 'Mohammed Alami',     GUESTS.fatima,   'airbnb',  'confirmed',   '2026-08-20', '2026-08-25', 5, 2, 0, 0, 1800, 'MAD', 'strict',        '2026-08-02T10:00:00Z', undefined,                                     undefined,                                   'AB5566778'),
  mr('res-112', 'unit-001', 'Loft #1',              'prop-001', 'Le Loft Mile-End',          'owner-001', 'Jean-Pierre Gagnon', GUESTS.michel,   'direct',  'no_show',     '2026-07-15', '2026-07-18', 3, 1, 0, 0, 125,  'CAD', 'strict',        '2026-07-10T09:00:00Z', undefined,                                     'Non-présentation — charges retenues (politique stricte)'),
  mr('res-113', 'unit-004', 'Maison Plateau - Étage','prop-002','Maison Plateau Familiale',  'owner-001', 'Jean-Pierre Gagnon', GUESTS.lisa,     'booking', 'checked_in',  '2026-08-05', '2026-08-12', 7, 2, 0, 0, 300,  'CAD', 'moderate',      '2026-07-20T11:00:00Z', 'Allergie aux chats',                          'Cliente premium — concierge prioritaire',    'BK-QC-2026-0805'),
  mr('res-114', 'unit-005', 'Studio A',             'prop-004', 'Studio Côte-des-Neiges',   'owner-002', 'Sophie Martin',      GUESTS.yuki,     'airbnb',  'pending',     '2026-08-25', '2026-08-29', 4, 1, 0, 0, 85,   'CAD', 'flexible',      '2026-08-07T06:00:00Z', 'Première visite au Québec',                   undefined,                                   'AB8899001'),
  mr('res-115', 'unit-007', 'Studio Rif #1',        'prop-006', 'Résidence Rif Tetouan',     'owner-004', 'Nadia Bensouda',     GUESTS.mohammed, 'direct',  'confirmed',   '2026-09-03', '2026-09-08', 5, 2, 0, 0, 500,  'MAD', 'moderate',      '2026-08-01T09:00:00Z', undefined,                                     'Client habituel — 15e séjour'),
];

// ─── Lookup helpers ───────────────────────────────────────────────────────────

export const getReservationById = (id: string): ReservationDisplay | undefined =>
  MOCK_RESERVATIONS_DISPLAY.find(r => r.id === id);

// ─── Display constants ────────────────────────────────────────────────────────

export const STATUS_LABELS: Record<string, string> = {
  inquiry: 'Demande', pending: 'En attente', confirmed: 'Confirmée',
  checked_in: 'Arrivé', checked_out: 'Parti', cancelled: 'Annulée', no_show: 'Non présenté',
};

export const STATUS_COLORS: Record<string, string> = {
  inquiry:     'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  pending:     'bg-amber-500/10 text-amber-400 border-amber-500/20',
  confirmed:   'bg-blue-500/10 text-blue-400 border-blue-500/20',
  checked_in:  'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  checked_out: 'bg-slate-500/10 text-slate-300 border-slate-500/20',
  cancelled:   'bg-red-500/10 text-red-400 border-red-500/20',
  no_show:     'bg-orange-500/10 text-orange-400 border-orange-500/20',
};

export const CHANNEL_LABELS: Record<string, string> = {
  airbnb: 'Airbnb', booking: 'Booking.com', vrbo: 'Vrbo', direct: 'Direct', manual: 'Manuel',
};

export const CHANNEL_COLORS: Record<string, string> = {
  airbnb:  'bg-rose-500/10 text-rose-400 border-rose-500/20',
  booking: 'bg-blue-700/10 text-blue-400 border-blue-700/20',
  vrbo:    'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  direct:  'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  manual:  'bg-slate-500/10 text-slate-400 border-slate-500/20',
};

export const COUNTRY_FLAGS: Record<string, string> = {
  CA: '🇨🇦', MA: '🇲🇦', FR: '🇫🇷', US: '🇺🇸', MX: '🇲🇽',
  DZ: '🇩🇿', JP: '🇯🇵', DE: '🇩🇪', GB: '🇬🇧', BE: '🇧🇪',
  CH: '🇨🇭', ES: '🇪🇸', IT: '🇮🇹', BR: '🇧🇷', AU: '🇦🇺',
};

export const LANG_LABELS: Record<string, string> = {
  fr: 'Français', en: 'English', ar: 'العربية', es: 'Español', ja: '日本語',
};

export const CHARGE_TYPE_LABELS: Record<string, string> = {
  base_rent: 'Location de base', cleaning_fee: 'Frais de ménage', tax: 'Taxes',
  service_fee: 'Commission OTA', extras: 'Extras', discount: 'Remise', refund: 'Remboursement',
};
