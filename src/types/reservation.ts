// Reservation Engine display types — UI layer (PROMPT 10)
// Replace with Supabase queries after backend activation

export type ReservationStatus =
  | 'inquiry'
  | 'pending'
  | 'confirmed'
  | 'checked_in'
  | 'checked_out'
  | 'cancelled'
  | 'no_show';

export type ReservationChannel = 'airbnb' | 'booking' | 'vrbo' | 'direct' | 'manual';

export type CancellationPolicy = 'flexible' | 'moderate' | 'strict' | 'non_refundable';

export type ChargeType = 'base_rent' | 'cleaning_fee' | 'tax' | 'service_fee' | 'extras' | 'discount' | 'refund';
export type ChargeStatus = 'pending' | 'paid' | 'refunded' | 'waived';

export interface GuestDisplay {
  id: string;
  tenant_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  country: string;
  language: string;
  avatar_initials: string;
  verified: boolean;
  total_stays: number;
  rating?: number;
}

export interface ReservationCharge {
  id: string;
  reservation_id: string;
  label: string;
  amount: number;
  currency: string;
  type: ChargeType;
  status: ChargeStatus;
}

export interface ReservationTimelineEvent {
  id: string;
  reservation_id: string;
  status: ReservationStatus;
  timestamp: string;
  actor: string;
  actor_type: 'user' | 'system' | 'channel' | 'agent';
  note?: string;
}

export interface ReservationDisplay {
  id: string;
  tenant_id: string;
  unit_id: string;
  unit_name: string;
  property_id: string;
  property_name: string;
  owner_id: string;
  owner_name: string;
  guest: GuestDisplay;
  channel: ReservationChannel;
  channel_reservation_id?: string;
  status: ReservationStatus;
  check_in: string;
  check_out: string;
  nights: number;
  adults: number;
  children: number;
  infants: number;
  charges: ReservationCharge[];
  total_amount: number;
  currency: string;
  paid_amount: number;
  balance_due: number;
  cancellation_policy: CancellationPolicy;
  special_requests?: string;
  internal_notes?: string;
  timeline: ReservationTimelineEvent[];
  created_at: string;
  updated_at: string;
}

export interface ReservationFormValues {
  unit_id: string;
  check_in: string;
  check_out: string;
  adults: number;
  children: number;
  guest_first_name: string;
  guest_last_name: string;
  guest_email: string;
  guest_phone: string;
  guest_country: string;
  channel: ReservationChannel;
  special_requests: string;
  internal_notes: string;
  cancellation_policy: CancellationPolicy;
}
