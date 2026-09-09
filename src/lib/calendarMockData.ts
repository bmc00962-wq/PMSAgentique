// DEV ONLY — Calendar mock data for UI development (PROMPT 09)
// Replace with Supabase queries after backend activation
import type { CalendarReservation, CalendarBlock, UnitCalendarRow, CalendarDay, DayStatus } from '@/types/calendar';
import { MOCK_UNITS, MOCK_PROPERTIES } from '@/lib/mockData';

export const MOCK_RESERVATIONS: CalendarReservation[] = [
  { id: 'res-001', unit_id: 'unit-001', tenant_id: 'tenant-demo', guest_name: 'Marie Côté', check_in: '2026-08-03', check_out: '2026-08-07', nights: 4, status: 'confirmed', channel: 'airbnb', total_price: 500, currency: 'CAD' },
  { id: 'res-002', unit_id: 'unit-001', tenant_id: 'tenant-demo', guest_name: 'Tom Wilson', check_in: '2026-08-12', check_out: '2026-08-16', nights: 4, status: 'confirmed', channel: 'direct', total_price: 520, currency: 'CAD' },
  { id: 'res-003', unit_id: 'unit-001', tenant_id: 'tenant-demo', guest_name: 'Léa Bouchard', check_in: '2026-08-22', check_out: '2026-08-25', nights: 3, status: 'pending', channel: 'booking', total_price: 375, currency: 'CAD' },
  { id: 'res-004', unit_id: 'unit-002', tenant_id: 'tenant-demo', guest_name: 'Famille Lavoie', check_in: '2026-08-01', check_out: '2026-08-08', nights: 7, status: 'checked_in', channel: 'airbnb', total_price: 2450, currency: 'CAD' },
  { id: 'res-005', unit_id: 'unit-002', tenant_id: 'tenant-demo', guest_name: 'Carlos & Ana', check_in: '2026-08-15', check_out: '2026-08-22', nights: 7, status: 'confirmed', channel: 'vrbo', total_price: 2400, currency: 'CAD' },
  { id: 'res-006', unit_id: 'unit-003', tenant_id: 'tenant-demo', guest_name: 'Sarah Nguyen', check_in: '2026-08-05', check_out: '2026-08-10', nights: 5, status: 'confirmed', channel: 'direct', total_price: 1375, currency: 'CAD' },
  { id: 'res-007', unit_id: 'unit-005', tenant_id: 'tenant-demo', guest_name: 'Pierre & Julie', check_in: '2026-08-08', check_out: '2026-08-11', nights: 3, status: 'confirmed', channel: 'airbnb', total_price: 255, currency: 'CAD' },
  { id: 'res-008', unit_id: 'unit-005', tenant_id: 'tenant-demo', guest_name: 'Amira Hassan', check_in: '2026-08-18', check_out: '2026-08-22', nights: 4, status: 'confirmed', channel: 'booking', total_price: 340, currency: 'CAD' },
  { id: 'res-009', unit_id: 'unit-006', tenant_id: 'tenant-demo', guest_name: 'Ahmed El Fassi', check_in: '2026-08-02', check_out: '2026-08-06', nights: 4, status: 'confirmed', channel: 'direct', total_price: 7200, currency: 'MAD' },
  { id: 'res-010', unit_id: 'unit-007', tenant_id: 'tenant-demo', guest_name: 'Sophie Martin', check_in: '2026-08-10', check_out: '2026-08-14', nights: 4, status: 'confirmed', channel: 'airbnb', total_price: 5200, currency: 'MAD' },
];

export const MOCK_BLOCKS: CalendarBlock[] = [
  { id: 'blk-001', unit_id: 'unit-001', tenant_id: 'tenant-demo', block_type: 'owner_block', start_date: '2026-08-28', end_date: '2026-08-31', reason: 'Usage propriétaire', created_by: 'owner-001' },
  { id: 'blk-002', unit_id: 'unit-002', tenant_id: 'tenant-demo', block_type: 'maintenance', start_date: '2026-08-10', end_date: '2026-08-12', reason: 'Réparation plomberie', created_by: 'user-mgr-001' },
  { id: 'blk-003', unit_id: 'unit-003', tenant_id: 'tenant-demo', block_type: 'owner_block', start_date: '2026-08-20', end_date: '2026-08-22', reason: 'Visite propriétaire', created_by: 'owner-001' },
  { id: 'blk-004', unit_id: 'unit-004', tenant_id: 'tenant-demo', block_type: 'maintenance', start_date: '2026-08-01', end_date: '2026-08-31', reason: 'Rénovation complète', created_by: 'user-mgr-001' },
];

const CHANNEL_COLORS: Record<string, string> = {
  airbnb: '#FF5A5F', booking: '#003580', direct: '#10B981', vrbo: '#1E40AF',
};
const BLOCK_COLORS: Record<string, string> = {
  owner_block: '#8B5CF6', maintenance: '#F59E0B', gap_block: '#6B7280', preparation: '#06B6D4',
};

/** Build a UnitCalendarRow from mock data for a given year+month (1-indexed) */
function buildUnitRow(unit: typeof MOCK_UNITS[0], year: number, month: number): UnitCalendarRow {
  const property = MOCK_PROPERTIES.find(p => p.id === unit.property_id);
  const daysInMonth = new Date(year, month, 0).getDate();
  const days: Record<string, CalendarDay> = {};

  // Initialize all days as available
  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    days[date] = { date, status: 'available' };
  }

  // Apply blocks
  MOCK_BLOCKS.filter(b => b.unit_id === unit.id).forEach(block => {
    const start = new Date(block.start_date);
    const end = new Date(block.end_date);
    const cur = new Date(start);
    while (cur <= end) {
      const key = cur.toISOString().slice(0, 10);
      if (days[key]) {
        days[key] = {
          date: key,
          status: 'blocked',
          label: block.block_type === 'owner_block' ? 'Own' : 'Maint',
          details: block.reason ?? block.block_type,
          block_id: block.id,
        };
      }
      cur.setDate(cur.getDate() + 1);
    }
  });

  // Apply reservations
  MOCK_RESERVATIONS.filter(r => r.unit_id === unit.id).forEach(res => {
    const checkIn = new Date(res.check_in);
    const checkOut = new Date(res.check_out);
    const guestInitials = res.guest_name.split(' ').map(n => n[0]).join('').slice(0, 2);
    const status: DayStatus = res.status === 'pending' ? 'pending' : res.status === 'checked_in' ? 'reserved' : 'reserved';

    // Check-in day
    const checkInKey = res.check_in;
    if (days[checkInKey]) {
      days[checkInKey] = { date: checkInKey, status: 'checkin', label: guestInitials, details: `↓ ${res.guest_name} (${res.channel})`, reservation_id: res.id };
    }

    // Middle nights
    const cur = new Date(checkIn);
    cur.setDate(cur.getDate() + 1);
    while (cur < checkOut) {
      const key = cur.toISOString().slice(0, 10);
      if (days[key]) {
        days[key] = { date: key, status, label: guestInitials, details: `${res.guest_name} · ${res.nights}n · ${res.channel}`, reservation_id: res.id };
      }
      cur.setDate(cur.getDate() + 1);
    }

    // Check-out day
    const checkOutKey = checkOut.toISOString().slice(0, 10);
    if (days[checkOutKey]) {
      // Only mark as checkout if still available (could be checkin for next)
      if (days[checkOutKey].status === 'available') {
        days[checkOutKey] = { date: checkOutKey, status: 'checkout', label: guestInitials, details: `↑ ${res.guest_name}`, reservation_id: res.id };
      }
    }
  });

  return {
    unit_id: unit.id,
    unit_name: unit.name,
    property_id: unit.property_id,
    property_name: property?.name ?? '',
    base_price: unit.base_price,
    currency: unit.currency,
    days,
  };
}

export function buildCalendarRows(year: number, month: number, propertyId?: string): UnitCalendarRow[] {
  const units = propertyId
    ? MOCK_UNITS.filter(u => u.property_id === propertyId && u.status !== 'inactive')
    : MOCK_UNITS.filter(u => u.status === 'active' || u.status === 'maintenance').slice(0, 8);
  return units.map(u => buildUnitRow(u, year, month));
}

export { CHANNEL_COLORS, BLOCK_COLORS };
