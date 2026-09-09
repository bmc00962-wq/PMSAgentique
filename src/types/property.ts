// Property display types — view models for UI layer (with joined/computed fields)
// Distinct from canonical Property/Unit in types/index.ts (DB schema)

export type PropertyTypeDisplay =
  | 'apartment' | 'house' | 'villa' | 'condo'
  | 'chalet' | 'loft' | 'studio' | 'riad';

export type PropertyStatusDisplay = 'active' | 'inactive' | 'maintenance' | 'draft';

export type UnitTypeDisplay =
  | 'studio' | 'one_bedroom' | 'two_bedroom'
  | 'three_bedroom' | 'penthouse' | 'suite';

export type UnitStatusDisplay = 'active' | 'inactive' | 'maintenance' | 'blocked';

export type AmenityCategory =
  | 'kitchen' | 'bathroom' | 'bedroom'
  | 'outdoor' | 'tech' | 'accessibility' | 'general';

/** PropertyDisplay — full display record with joined + computed fields */
export interface PropertyDisplay {
  id: string;
  tenant_id: string;
  owner_id: string;
  owner_name: string;
  owner_email: string;
  name: string;
  internal_code?: string;
  property_type: PropertyTypeDisplay;
  status: PropertyStatusDisplay;
  country: string;
  city: string;
  address: string;
  postal_code?: string;
  total_units: number;
  active_units: number;
  default_checkin_time: string;
  default_checkout_time: string;
  max_guests?: number;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface UnitDisplay {
  id: string;
  property_id: string;
  tenant_id: string;
  name: string;
  unit_type: UnitTypeDisplay;
  floor?: number;
  surface_sqm?: number;
  max_guests: number;
  bedrooms: number;
  bathrooms: number;
  base_price: number;
  currency: string;
  status: UnitStatusDisplay;
  sort_order: number;
}

export interface AmenityItem {
  id: string;
  property_id: string;
  category: AmenityCategory;
  name: string;
  is_available: boolean;
}

export interface PropertyFormValues {
  name: string;
  owner_id: string;
  property_type: PropertyTypeDisplay;
  country: string;
  city: string;
  address: string;
  postal_code: string;
  total_units: number;
  default_checkin_time: string;
  default_checkout_time: string;
  description: string;
}
