// Owner display types — view models for UI layer (with joined/computed fields)
// Distinct from canonical Owner in types/index.ts (DB schema)

export type OwnerStatus = 'active' | 'inactive' | 'pending';
export type ContractStatus = 'active' | 'expired' | 'pending' | 'terminated';
export type FeeType = 'percentage' | 'flat_fee';
export type PaymentFrequency = 'monthly' | 'quarterly' | 'annual';

/** OwnerDisplay — full display record with joined + computed fields */
export interface OwnerDisplay {
  id: string;
  tenant_id: string;
  first_name: string;
  last_name: string;
  company_name?: string;
  email: string;
  phone?: string;
  language: 'fr' | 'en' | 'ar';
  country: string;
  city: string;
  address?: string;
  postal_code?: string;
  tax_number?: string;
  notes?: string;
  status: OwnerStatus;
  created_at: string;
  updated_at: string;
  properties_count: number;
  active_contracts_count: number;
}

/** ContractDisplay — includes property_name (joined) for display */
export interface ContractDisplay {
  id: string;
  tenant_id: string;
  owner_id: string;
  property_id: string;
  property_name: string;
  management_fee_type: FeeType;
  management_fee_value: number;
  payment_frequency: PaymentFrequency;
  payment_day: number;
  currency: string;
  start_date: string;
  end_date?: string;
  status: ContractStatus;
  created_at: string;
}

export interface OwnerFormValues {
  first_name: string;
  last_name: string;
  company_name: string;
  email: string;
  phone: string;
  language: 'fr' | 'en' | 'ar';
  country: string;
  city: string;
  address: string;
  postal_code: string;
  tax_number: string;
  notes: string;
}
