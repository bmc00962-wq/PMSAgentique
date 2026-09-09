// Tenant Settings & SaaS Admin types — PROMPT 18
// ADR-018: Production configuration, tenant lifecycle management

export type PlanId = 'trial' | 'starter' | 'growth' | 'enterprise';
export type TenantStatus = 'trial' | 'active' | 'suspended' | 'pending_deletion' | 'deleted' | 'migrating';
export type OtaChannelKey = 'airbnb' | 'booking' | 'vrbo' | 'ical' | 'direct';
export type CurrencyCode = 'CAD' | 'EUR' | 'USD' | 'MAD';
export type LanguageCode = 'fr' | 'en' | 'ar';
export type TimezoneId = string;

export interface TenantPlan {
  id: PlanId;
  name: string;
  max_properties: number;
  max_units: number;
  max_members: number;
  max_storage_gb: number;
  features: string[];
  price_monthly_cad: number;
  price_yearly_cad: number;
}

export interface QuotaUsage {
  properties_used: number;
  properties_max: number;
  units_used: number;
  units_max: number;
  members_used: number;
  members_max: number;
  storage_used_gb: number;
  storage_max_gb: number;
}

export interface OtaIntegrationConfig {
  channel: OtaChannelKey;
  enabled: boolean;
  connected: boolean;
  account_name?: string;
  last_sync?: string;
}

export interface TenantSettings {
  tenant_id: string;
  slug: string;
  company_name: string;
  contact_email: string;
  contact_phone?: string;
  website?: string;
  // Localization
  default_language: LanguageCode;
  supported_languages: LanguageCode[];
  default_currency: CurrencyCode;
  timezone: TimezoneId;
  // Operations
  default_check_in_time: string;   // "15:00"
  default_check_out_time: string;  // "11:00"
  minimum_stay_nights: number;
  // Finance
  management_fee_pct: number;      // e.g. 18.0
  tax_id?: string;
  bank_iban?: string;
  // OTA Integrations
  ota_integrations: OtaIntegrationConfig[];
  // Plan
  plan_id: PlanId;
  plan_expires_at?: string;
  quota: QuotaUsage;
  // Meta
  status: TenantStatus;
  data_region: 'ca-central-1' | 'eu-west-1' | 'us-east-1';
  created_at: string;
  updated_at: string;
}

export interface SaasTenantRow {
  id: string;
  slug: string;
  company_name: string;
  status: TenantStatus;
  plan_id: PlanId;
  data_region: string;
  properties_count: number;
  members_count: number;
  mrr_cad: number;
  last_active_at: string;
  created_at: string;
  health: 'healthy' | 'degraded' | 'critical';
  support_notes?: string;
}

export interface TenantSettingsFormValues {
  company_name: string;
  contact_email: string;
  contact_phone: string;
  website: string;
  default_language: LanguageCode;
  default_currency: CurrencyCode;
  timezone: string;
  default_check_in_time: string;
  default_check_out_time: string;
  minimum_stay_nights: number;
  management_fee_pct: number;
  tax_id: string;
}
