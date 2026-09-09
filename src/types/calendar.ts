// Calendar display types — UI layer for Calendar Engine (PROMPT 09)

export type DayStatus = 'available' | 'reserved' | 'blocked' | 'pending' | 'checkout' | 'checkin';

export type BlockType = 'owner_block' | 'maintenance' | 'gap_block' | 'preparation';

export interface CalendarDay {
  date: string; // ISO YYYY-MM-DD
  status: DayStatus;
  label?: string;     // short label for cell (guest initials, block reason)
  details?: string;   // tooltip
  reservation_id?: string;
  block_id?: string;
  price_override?: number;
  currency?: string;
}

/** One unit row with its days map */
export interface UnitCalendarRow {
  unit_id: string;
  unit_name: string;
  property_id: string;
  property_name: string;
  base_price: number;
  currency: string;
  days: Record<string, CalendarDay>; // key = YYYY-MM-DD
}

/** Mock reservation for calendar */
export interface CalendarReservation {
  id: string;
  unit_id: string;
  tenant_id: string;
  guest_name: string;
  check_in: string;   // YYYY-MM-DD
  check_out: string;  // YYYY-MM-DD (exclusive — day of departure)
  nights: number;
  status: 'confirmed' | 'pending' | 'checked_in';
  channel: 'airbnb' | 'booking' | 'direct' | 'vrbo';
  total_price: number;
  currency: string;
}

/** Mock calendar block */
export interface CalendarBlock {
  id: string;
  unit_id: string;
  tenant_id: string;
  block_type: BlockType;
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD (inclusive)
  reason?: string;
  created_by: string;
}

/** Form values for block creation */
export interface BlockFormValues {
  unit_id: string;
  block_type: BlockType;
  start_date: string;
  end_date: string;
  reason: string;
}

/** Form values for price override */
export interface RateFormValues {
  unit_id: string;
  start_date: string;
  end_date: string;
  price: number;
  currency: string;
  reason: string;
}
