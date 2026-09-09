// Settings & SaaS Admin mock data — PROMPT 18
// DEV ONLY — replaces Supabase tables: tenant_settings, tenant_quota, tenant_plan

import type {
  TenantSettings, TenantPlan, SaasTenantRow, PlanId,
} from '@/types/settings';

// ── Plans catalogue ──────────────────────────────────────────────────────────

export const PLANS: Record<PlanId, TenantPlan> = {
  trial: {
    id: 'trial', name: 'Essai gratuit',
    max_properties: 2, max_units: 5, max_members: 2, max_storage_gb: 1,
    features: ['calendar', 'reservations', 'basic_reports'],
    price_monthly_cad: 0, price_yearly_cad: 0,
  },
  starter: {
    id: 'starter', name: 'Starter',
    max_properties: 10, max_units: 25, max_members: 5, max_storage_gb: 10,
    features: ['calendar', 'reservations', 'channel_manager', 'housekeeping', 'basic_reports', 'email_support'],
    price_monthly_cad: 149, price_yearly_cad: 1490,
  },
  growth: {
    id: 'growth', name: 'Growth',
    max_properties: 50, max_units: 150, max_members: 20, max_storage_gb: 100,
    features: ['calendar', 'reservations', 'channel_manager', 'housekeeping', 'transport', 'maintenance', 'finance', 'ai_agents', 'n8n_workflows', 'advanced_reports', 'priority_support'],
    price_monthly_cad: 399, price_yearly_cad: 3990,
  },
  enterprise: {
    id: 'enterprise', name: 'Enterprise',
    max_properties: 999, max_units: 9999, max_members: 999, max_storage_gb: 1000,
    features: ['all_features', 'dedicated_infra', 'custom_domain', 'sso_saml', 'sla_99_9', 'dedicated_cse', 'custom_contracts'],
    price_monthly_cad: 0, price_yearly_cad: 0, // custom pricing
  },
};

// ── Current tenant settings (Gestion Soleil Inc.) ────────────────────────────

export const CURRENT_TENANT_SETTINGS: TenantSettings = {
  tenant_id: 'tenant-001',
  slug: 'gestion-soleil',
  company_name: 'Gestion Soleil Inc.',
  contact_email: 'admin@gestionsoleill.ca',
  contact_phone: '+1 514 555 0100',
  website: 'https://gestionsoleill.ca',
  default_language: 'fr',
  supported_languages: ['fr', 'en', 'ar'],
  default_currency: 'CAD',
  timezone: 'America/Toronto',
  default_check_in_time: '15:00',
  default_check_out_time: '11:00',
  minimum_stay_nights: 2,
  management_fee_pct: 18.0,
  tax_id: 'QC-1234567890',
  bank_iban: 'CA00 0000 0000 0000 0000',
  ota_integrations: [
    { channel: 'airbnb', enabled: true, connected: true, account_name: 'Gestion Soleil Montréal', last_sync: '2026-08-10T11:50:00Z' },
    { channel: 'booking', enabled: true, connected: true, account_name: 'gestionsoleill-montreal', last_sync: '2026-08-10T11:30:00Z' },
    { channel: 'vrbo', enabled: true, connected: false },
    { channel: 'ical', enabled: true, connected: true, last_sync: '2026-08-10T10:00:00Z' },
    { channel: 'direct', enabled: true, connected: true, account_name: 'Site direct' },
  ],
  plan_id: 'growth',
  plan_expires_at: '2027-08-09T00:00:00Z',
  quota: {
    properties_used: 6, properties_max: 50,
    units_used: 11, units_max: 150,
    members_used: 7, members_max: 20,
    storage_used_gb: 12.4, storage_max_gb: 100,
  },
  status: 'active',
  data_region: 'ca-central-1',
  created_at: '2025-08-15T00:00:00Z',
  updated_at: '2026-08-10T09:00:00Z',
};

// ── SaaS Admin — 4 example tenants ───────────────────────────────────────────

export const MOCK_SAAS_TENANTS: SaasTenantRow[] = [
  {
    id: 'tenant-001', slug: 'gestion-soleil', company_name: 'Gestion Soleil Inc.',
    status: 'active', plan_id: 'growth', data_region: 'ca-central-1',
    properties_count: 6, members_count: 7, mrr_cad: 399,
    last_active_at: '2026-08-10T11:55:00Z', created_at: '2025-08-15T00:00:00Z', health: 'healthy',
  },
  {
    id: 'tenant-002', slug: 'maroc-premium-stays', company_name: 'Maroc Premium Stays',
    status: 'active', plan_id: 'enterprise', data_region: 'eu-west-1',
    properties_count: 42, members_count: 18, mrr_cad: 1800,
    last_active_at: '2026-08-10T10:30:00Z', created_at: '2024-11-01T00:00:00Z', health: 'healthy',
    support_notes: 'Contrat Enterprise — migration vers infra dédiée en cours',
  },
  {
    id: 'tenant-003', slug: 'quebecois-rentals', company_name: 'Québécois Rentals SENC',
    status: 'trial', plan_id: 'trial', data_region: 'ca-central-1',
    properties_count: 1, members_count: 1, mrr_cad: 0,
    last_active_at: '2026-08-09T14:00:00Z', created_at: '2026-08-01T00:00:00Z', health: 'healthy',
    support_notes: 'Essai gratuit — expire le 2026-08-31',
  },
  {
    id: 'tenant-004', slug: 'alpine-chalets', company_name: 'Alpine Chalets Management',
    status: 'active', plan_id: 'starter', data_region: 'eu-west-1',
    properties_count: 7, members_count: 3, mrr_cad: 149,
    last_active_at: '2026-08-08T09:00:00Z', created_at: '2026-01-20T00:00:00Z', health: 'degraded',
    support_notes: 'Sync Airbnb en erreur depuis W-03 — ticket #SUP-0241 ouvert',
  },
  {
    id: 'tenant-005', slug: 'atlantic-coast-vr', company_name: 'Atlantic Coast Vacation Rentals',
    status: 'suspended', plan_id: 'starter', data_region: 'ca-central-1',
    properties_count: 4, members_count: 2, mrr_cad: 0,
    last_active_at: '2026-07-15T11:00:00Z', created_at: '2025-05-10T00:00:00Z', health: 'critical',
    support_notes: 'Facture impayée depuis 45 jours — compte suspendu automatiquement',
  },
];

// ── Display constants ─────────────────────────────────────────────────────────

export const PLAN_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  trial: { label: 'Essai', color: 'text-slate-300', bg: 'bg-slate-500/10', border: 'border-slate-500/30' },
  starter: { label: 'Starter', color: 'text-blue-300', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
  growth: { label: 'Growth', color: 'text-emerald-300', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
  enterprise: { label: 'Enterprise', color: 'text-purple-300', bg: 'bg-purple-500/10', border: 'border-purple-500/30' },
};

export const TENANT_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  trial: { label: 'Essai', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  active: { label: 'Actif', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  suspended: { label: 'Suspendu', color: 'text-rose-400', bg: 'bg-rose-500/10' },
  pending_deletion: { label: 'Suppression', color: 'text-orange-400', bg: 'bg-orange-500/10' },
  deleted: { label: 'Supprimé', color: 'text-slate-400', bg: 'bg-slate-500/10' },
  migrating: { label: 'Migration', color: 'text-purple-400', bg: 'bg-purple-500/10' },
};

export const HEALTH_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  healthy: { label: 'OK', color: 'text-emerald-400', dot: 'bg-emerald-400' },
  degraded: { label: 'Dégradé', color: 'text-yellow-400', dot: 'bg-yellow-400' },
  critical: { label: 'Critique', color: 'text-rose-400', dot: 'bg-rose-400' },
};

export const OTA_LABELS: Record<string, string> = {
  airbnb: 'Airbnb', booking: 'Booking.com', vrbo: 'Vrbo', ical: 'iCalendar', direct: 'Direct',
};

export const TIMEZONE_OPTIONS = [
  'America/Toronto', 'America/Montreal', 'America/Vancouver', 'America/New_York',
  'Europe/Paris', 'Africa/Casablanca', 'UTC',
];

export const LANGUAGE_LABELS: Record<string, string> = { fr: 'Français', en: 'English', ar: 'العربية' };
export const CURRENCY_LABELS: Record<string, string> = { CAD: 'CAD — Dollar canadien', EUR: 'EUR — Euro', USD: 'USD — Dollar américain', MAD: 'MAD — Dirham marocain' };
