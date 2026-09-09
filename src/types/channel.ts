// Channel Manager display types — UI layer (PROMPT 11)
// Replace with Supabase queries after backend activation

export type ChannelType = 'airbnb' | 'booking' | 'vrbo' | 'ical' | 'direct';
export type ConnectionStatus = 'active' | 'paused' | 'error' | 'disconnected';
export type SyncEventType =
  | 'reservation_imported' | 'availability_pushed' | 'rate_pushed'
  | 'reservation_updated' | 'reservation_cancelled' | 'error' | 'auth_refresh';
export type ListingStatus = 'active' | 'inactive' | 'pending_review' | 'suspended';

export interface ChannelConnection {
  id: string;
  tenant_id: string;
  channel: ChannelType;
  display_name: string;
  status: ConnectionStatus;
  api_key_last4?: string;
  listings_count: number;
  last_sync_at?: string;
  next_sync_at?: string;
  error_message?: string;
  auto_confirm: boolean;
  sync_availability: boolean;
  sync_rates: boolean;
  created_at: string;
}

export interface ChannelListing {
  id: string;
  tenant_id: string;
  connection_id: string;
  channel: ChannelType;
  property_id: string;
  property_name: string;
  unit_id: string;
  unit_name: string;
  external_listing_id: string;
  title: string;
  status: ListingStatus;
  base_price: number;
  currency: string;
  min_nights: number;
  max_nights: number;
  last_sync_at?: string;
}

export interface SyncEvent {
  id: string;
  tenant_id: string;
  connection_id: string;
  channel: ChannelType;
  event_type: SyncEventType;
  status: 'success' | 'error' | 'warning';
  message: string;
  details?: string;
  reservation_id?: string;
  listing_id?: string;
  duration_ms?: number;
  timestamp: string;
}

export interface ChannelFormValues {
  channel: ChannelType;
  display_name: string;
  api_key: string;
  auto_confirm: boolean;
  sync_availability: boolean;
  sync_rates: boolean;
}

// IChannelAdapter — one concrete class per OTA (activated post-backend)
export interface IChannelAdapter {
  channel: ChannelType;
  connect(apiKey: string): Promise<{ success: boolean; error?: string }>;
  pushAvailability(unitId: string, dates: string[]): Promise<void>;
  pushRates(unitId: string, rates: Record<string, number>): Promise<void>;
  pullReservations(since: string): Promise<void>;
  mapReservationStatus(externalStatus: string): string;
}
