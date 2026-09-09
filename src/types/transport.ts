// Transport module types — PROMPT 14
export type TripStatus = 'pending' | 'assigned' | 'en_route' | 'completed' | 'cancelled' | 'no_show';
export type TripType = 'airport_pickup' | 'airport_dropoff' | 'transfer' | 'activity' | 'custom';
export type VehicleType = 'sedan' | 'suv' | 'van' | 'minibus';

export interface Driver {
  id: string;
  tenant_id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  avatar_initials: string;
  avatar_color: string;
  vehicle_type: VehicleType;
  vehicle_model: string;
  vehicle_plate: string;
  is_active: boolean;
  trips_completed: number;
  rating: number;
  languages: string[];
}

export interface Trip {
  id: string;
  tenant_id: string;
  reservation_id?: string;
  guest_name: string;
  guest_phone?: string;
  guest_count: number;
  property_id: string;
  property_name: string;
  type: TripType;
  status: TripStatus;
  scheduled_at: string;            // ISO datetime
  pickup_address: string;
  dropoff_address: string;
  driver_id?: string;
  driver_name?: string;
  driver_initials?: string;
  driver_color?: string;
  vehicle_model?: string;
  vehicle_plate?: string;
  price_eur?: number;
  flight_number?: string;
  notes?: string;
  completed_at?: string;
  created_at: string;
}

export interface TripFormValues {
  reservation_id: string;
  guest_name: string;
  guest_phone: string;
  guest_count: number;
  property_id: string;
  type: TripType;
  scheduled_date: string;
  scheduled_time: string;
  pickup_address: string;
  dropoff_address: string;
  driver_id: string;
  flight_number: string;
  price_eur: number;
  notes: string;
}
