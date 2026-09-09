// DEV ONLY — Transport mock data (PROMPT 14)
import type { Driver, Trip } from '@/types/transport';

export const MOCK_DRIVERS: Driver[] = [
  { id: 'drv-01', tenant_id: 'tenant-demo', first_name: 'Claude', last_name: 'Beaulieu',
    phone: '+1 514-555-3001', email: 'claude@pms.local',
    avatar_initials: 'CB', avatar_color: 'bg-blue-500/20 text-blue-400',
    vehicle_type: 'sedan', vehicle_model: 'Toyota Camry 2024', vehicle_plate: 'ABC 1234',
    is_active: true, trips_completed: 187, rating: 4.9, languages: ['fr', 'en'] },
  { id: 'drv-02', tenant_id: 'tenant-demo', first_name: 'Rachid', last_name: 'Amrani',
    phone: '+212 661-555-3002', email: 'rachid@pms.local',
    avatar_initials: 'RA', avatar_color: 'bg-emerald-500/20 text-emerald-400',
    vehicle_type: 'suv', vehicle_model: 'Mercedes GLC 2023', vehicle_plate: '12345-A-1',
    is_active: true, trips_completed: 243, rating: 5.0, languages: ['ar', 'fr', 'en'] },
  { id: 'drv-03', tenant_id: 'tenant-demo', first_name: 'Patrick', last_name: 'Nguyen',
    phone: '+1 438-555-3003', email: 'patrick@pms.local',
    avatar_initials: 'PN', avatar_color: 'bg-orange-500/20 text-orange-400',
    vehicle_type: 'van', vehicle_model: 'Ford Transit 2022', vehicle_plate: 'XYZ 9988',
    is_active: true, trips_completed: 94, rating: 4.7, languages: ['fr', 'en', 'vi'] },
  { id: 'drv-04', tenant_id: 'tenant-demo', first_name: 'Omar', last_name: 'El Fassi',
    phone: '+212 522-555-3004', email: 'omar@pms.local',
    avatar_initials: 'OE', avatar_color: 'bg-purple-500/20 text-purple-400',
    vehicle_type: 'suv', vehicle_model: 'BMW X5 2024', vehicle_plate: '78901-B-2',
    is_active: false, trips_completed: 56, rating: 4.5, languages: ['ar', 'fr'] },
];

export const DRIVER_MAP: Record<string, Driver> = Object.fromEntries(
  MOCK_DRIVERS.map(d => [d.id, d])
);

const mkTrip = (
  id: string, resId: string | undefined, guest: string, guestPhone: string, count: number,
  propId: string, propName: string, type: Trip['type'], status: Trip['status'],
  scheduledAt: string, pickup: string, dropoff: string, drvId: string | null,
  opts: { flightNo?: string; price?: number; notes?: string; completedAt?: string } = {}
): Trip => {
  const drv = drvId ? DRIVER_MAP[drvId] : null;
  return {
    id, tenant_id: 'tenant-demo', reservation_id: resId,
    guest_name: guest, guest_phone: guestPhone, guest_count: count,
    property_id: propId, property_name: propName,
    type, status, scheduled_at: scheduledAt, pickup_address: pickup, dropoff_address: dropoff,
    driver_id: drvId ?? undefined,
    driver_name: drv ? `${drv.first_name} ${drv.last_name}` : undefined,
    driver_initials: drv?.avatar_initials, driver_color: drv?.avatar_color,
    vehicle_model: drv?.vehicle_model, vehicle_plate: drv?.vehicle_plate,
    flight_number: opts.flightNo, price_eur: opts.price, notes: opts.notes,
    completed_at: opts.completedAt, created_at: '2026-08-08T08:00:00Z',
  };
};

export const MOCK_TRIPS: Trip[] = [
  mkTrip('trp-01','res-101','Marie Cote','+1 514-555-0101',2,
    'prop-001','Le Loft Mile-End','airport_pickup','completed',
    '2026-08-07T14:30:00','Aeroport YUL T3','87 rue Bernard, Montreal',
    'drv-01',{flightNo:'AC 892',price:65,completedAt:'2026-08-07T15:15:00Z'}),
  mkTrip('trp-02','res-104','Jean Martin','+1 418-555-0202',4,
    'prop-004','Chalet Mont-Tremblant','airport_pickup','completed',
    '2026-08-06T18:00:00','Aeroport YMQ','1 chemin du Lac, Mont-Tremblant',
    'drv-03',{flightNo:'AC 344',price:120,completedAt:'2026-08-06T19:45:00Z'}),
  mkTrip('trp-03','res-104','Jean Martin','+1 418-555-0202',4,
    'prop-004','Chalet Mont-Tremblant','airport_dropoff','assigned',
    '2026-08-12T10:00:00','1 chemin du Lac, Mont-Tremblant','Aeroport YMQ',
    'drv-03',{price:120,notes:'Vol AC 347 a 12h30 — depart 10h max'}),
  mkTrip('trp-04','res-105','Carlos Gomez','+34 655-555-0303',2,
    'prop-005','Dar Zitoun Marrakech','airport_pickup','en_route',
    '2026-08-09T16:45:00','Aeroport RAK','12 rue Zitoun, Medina',
    'drv-02',{flightNo:'RAM 756',price:40,notes:'Vol en retard 20 min'}),
  mkTrip('trp-05','res-106','Amira Hassan','+33 677-555-0404',1,
    'prop-006','Villa Hassan II Marrakech','airport_pickup','pending',
    '2026-08-10T09:00:00','Aeroport RAK','Route de Fes km 4, Marrakech',
    null,{flightNo:'TU 4512',price:55}),
  mkTrip('trp-06','res-103','Lea Bouchard','+1 450-555-0505',3,
    'prop-002','Maison Plateau Familiale','activity','completed',
    '2026-08-08T09:00:00','4789 boul Saint-Laurent','Vieux-Port de Montreal',
    'drv-01',{price:35,completedAt:'2026-08-08T09:40:00Z',notes:'Visite guidee Vieux-Port'}),
  mkTrip('trp-07','res-105','Carlos Gomez','+34 655-555-0303',2,
    'prop-005','Dar Zitoun Marrakech','airport_dropoff','pending',
    '2026-08-15T07:30:00','12 rue Zitoun, Medina','Aeroport RAK',
    'drv-02',{price:40,notes:'Vol RAM 757 a 10h15'}),
  mkTrip('trp-08',undefined,'Groupe Corporatif','+1 514-555-0606',8,
    'prop-001','Le Loft Mile-End','transfer','cancelled',
    '2026-08-05T16:00:00','Centre Bell, Montreal','87 rue Bernard, Montreal',
    'drv-03',{price:80,notes:'Annule — evenement reporte'}),
];

export const getTripById = (id: string): Trip | undefined => MOCK_TRIPS.find(t => t.id === id);

export const TRIP_STATUS_LABELS: Record<string, string> = {
  pending: 'En attente', assigned: 'Assigne', en_route: 'En route',
  completed: 'Termine', cancelled: 'Annule', no_show: 'Absent',
};
export const TRIP_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  assigned: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  en_route: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  completed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  cancelled: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  no_show: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
};
export const TRIP_TYPE_LABELS: Record<string, string> = {
  airport_pickup: 'Transfert aeroport (arrivee)', airport_dropoff: 'Transfert aeroport (depart)',
  transfer: 'Transfert ville', activity: 'Activite / Excursion', custom: 'Personnalise',
};
export const VEHICLE_TYPE_LABELS: Record<string, string> = {
  sedan: 'Berline', suv: 'SUV', van: 'Van', minibus: 'Minibus',
};
