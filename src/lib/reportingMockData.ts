// Reporting Mock Data — ADR-021
import type {
  PlatformMetrics, MrrByPlan, TenantGrowthPoint, IncidentLog,
  PlatformHealthService, TenantMetrics, OccupancyTrend, OwnerReport,
  FeatureFlag, SupportTicket, BillingRecord, ChannelBreakdown,
} from '@/types/reporting';

// ── Platform Metrics ─────────────────────────────────────────────────────────
export const PLATFORM_METRICS: PlatformMetrics = {
  mrr: 12480,
  mrr_growth_pct: 18.5,
  arr: 149760,
  total_tenants: 5,
  active_tenants: 3,
  trial_tenants: 1,
  suspended_tenants: 1,
  total_properties: 23,
  total_units: 61,
  total_users: 38,
  total_reservations_month: 147,
  ai_requests_month: 4320,
  storage_used_gb: 48.7,
  storage_quota_gb: 200,
  open_incidents: 2,
  avg_resolution_h: 3.4,
  churn_rate_pct: 2.1,
  nps_score: 72,
};

export const MRR_BY_PLAN: MrrByPlan[] = [
  { plan: 'Enterprise', tenants: 1, mrr: 6990, color: '#f59e0b' },
  { plan: 'Growth', tenants: 2, mrr: 3990, color: '#3b82f6' },
  { plan: 'Starter', tenants: 1, mrr: 1500, color: '#10b981' },
  { plan: 'Trial', tenants: 1, mrr: 0, color: '#64748b' },
];

export const TENANT_GROWTH: TenantGrowthPoint[] = [
  { month: 'Mar', active: 2, trial: 2, churned: 0 },
  { month: 'Avr', active: 3, trial: 1, churned: 0 },
  { month: 'Mai', active: 3, trial: 2, churned: 1 },
  { month: 'Jun', active: 4, trial: 1, churned: 0 },
  { month: 'Jul', active: 4, trial: 1, churned: 1 },
  { month: 'Aoû', active: 3, trial: 1, churned: 1 },
];

export const PLATFORM_INCIDENTS: IncidentLog[] = [
  { id: 'inc-001', tenant_slug: 'gestion-soleil', type: 'edge_fn', severity: 'high', title: 'Latence Edge Function /reservations/confirm > 3s', status: 'investigating', created_at: '2026-08-10T10:00:00Z' },
  { id: 'inc-002', tenant_slug: 'atlas-properties', type: 'auth', severity: 'medium', title: 'OTP non reçus (fournisseur SMTP)', status: 'open', created_at: '2026-08-10T08:30:00Z' },
  { id: 'inc-003', tenant_slug: 'all', type: 'database', severity: 'critical', title: 'Pic CPU PostgreSQL 94% (query N+1)', status: 'resolved', created_at: '2026-08-09T14:00:00Z', resolved_at: '2026-08-09T15:30:00Z' },
  { id: 'inc-004', tenant_slug: 'riviera-mgmt', type: 'storage', severity: 'low', title: 'Upload photos ménage > 10MB bloqués', status: 'resolved', created_at: '2026-08-08T09:00:00Z', resolved_at: '2026-08-08T09:45:00Z' },
];

export const PLATFORM_HEALTH: PlatformHealthService[] = [
  { name: 'PostgreSQL', status: 'operational', latency_ms: 12, uptime_pct: 99.97 },
  { name: 'Auth (Supabase)', status: 'degraded', latency_ms: 340, uptime_pct: 99.80 },
  { name: 'Edge Functions', status: 'operational', latency_ms: 87, uptime_pct: 99.91 },
  { name: 'Storage', status: 'operational', latency_ms: 45, uptime_pct: 99.99 },
  { name: 'n8n Orchestration', status: 'operational', latency_ms: 156, uptime_pct: 99.60 },
  { name: 'Agent Orchestrator', status: 'operational', latency_ms: 210, uptime_pct: 99.50 },
];

// ── Tenant Metrics (Gestion Soleil) ──────────────────────────────────────────
const CHANNEL_BREAKDOWN: ChannelBreakdown[] = [
  { channel: 'Airbnb', reservations: 38, revenue: 28400, pct: 51.8, color: '#ff5a5f' },
  { channel: 'Booking', reservations: 21, revenue: 14700, pct: 26.8, color: '#003580' },
  { channel: 'Direct', reservations: 14, revenue: 8200, pct: 14.9, color: '#10b981' },
  { channel: 'Vrbo', reservations: 5, revenue: 3600, pct: 6.5, color: '#1d5c63' },
];

export const TENANT_METRICS: TenantMetrics = {
  tenant_id: '00000000-0000-0000-0000-000000000001',
  tenant_name: 'Gestion Soleil Inc.',
  period: '2026-08',
  occupancy_pct: 74.2,
  total_revenue: 54900,
  net_revenue: 44978,
  total_reservations: 78,
  confirmed_reservations: 63,
  cancelled_reservations: 6,
  adr: 152.8,
  revpar: 113.4,
  cleaning_jobs_done: 58,
  cleaning_jobs_pending: 4,
  maintenance_tickets_open: 3,
  maintenance_tickets_closed: 12,
  guest_satisfaction_avg: 4.6,
  total_nights_available: 484,
  total_nights_booked: 359,
  channel_breakdown: CHANNEL_BREAKDOWN,
};

export const OCCUPANCY_TREND: OccupancyTrend[] = [
  { month: 'Mar', occupancy_pct: 58, adr: 128, revpar: 74 },
  { month: 'Avr', occupancy_pct: 63, adr: 135, revpar: 85 },
  { month: 'Mai', occupancy_pct: 71, adr: 142, revpar: 101 },
  { month: 'Jun', occupancy_pct: 81, adr: 158, revpar: 128 },
  { month: 'Jul', occupancy_pct: 88, adr: 175, revpar: 154 },
  { month: 'Aoû', occupancy_pct: 74, adr: 153, revpar: 113 },
];

// ── Owner Reports ─────────────────────────────────────────────────────────────
export const OWNER_REPORTS: OwnerReport[] = [
  {
    owner_id: 'owner-001',
    owner_name: 'Pierre Moreau',
    period: '2026-08',
    properties: 2,
    units: 5,
    total_revenue: 18200,
    total_expenses: 4860,
    management_commission: 3276,
    cleaning_cost: 980,
    maintenance_cost: 604,
    tax_amount: 2862,
    net_income: 10202,
    occupancy_pct: 78,
    total_nights_booked: 124,
    total_nights_available: 155,
    reservations_count: 21,
    currency: 'CAD',
    monthly_breakdown: [
      { month: 'Mar', revenue: 12400, expenses: 3100, net: 6800 },
      { month: 'Avr', revenue: 13800, expenses: 3400, net: 7600 },
      { month: 'Mai', revenue: 15200, expenses: 3800, net: 8400 },
      { month: 'Jun', revenue: 19800, expenses: 4600, net: 11200 },
      { month: 'Jul', revenue: 22100, expenses: 5200, net: 12500 },
      { month: 'Aoû', revenue: 18200, expenses: 4860, net: 10202 },
    ],
  },
  {
    owner_id: 'owner-002',
    owner_name: 'Sophie Larivière',
    period: '2026-08',
    properties: 1,
    units: 3,
    total_revenue: 11400,
    total_expenses: 2760,
    management_commission: 2052,
    cleaning_cost: 540,
    maintenance_cost: 168,
    tax_amount: 1796,
    net_income: 6784,
    occupancy_pct: 72,
    total_nights_booked: 67,
    total_nights_available: 93,
    reservations_count: 14,
    currency: 'CAD',
    monthly_breakdown: [
      { month: 'Mar', revenue: 8200, expenses: 1900, net: 4800 },
      { month: 'Avr', revenue: 9400, expenses: 2100, net: 5600 },
      { month: 'Mai', revenue: 10200, expenses: 2400, net: 6100 },
      { month: 'Jun', revenue: 12800, expenses: 2900, net: 7400 },
      { month: 'Jul', revenue: 13400, expenses: 3100, net: 7800 },
      { month: 'Aoû', revenue: 11400, expenses: 2760, net: 6784 },
    ],
  },
  {
    owner_id: 'owner-003',
    owner_name: 'Karim Mansouri',
    period: '2026-08',
    properties: 3,
    units: 6,
    total_revenue: 25300,
    total_expenses: 6840,
    management_commission: 4554,
    cleaning_cost: 1260,
    maintenance_cost: 1026,
    tax_amount: 2530,
    net_income: 14404,
    occupancy_pct: 69,
    total_nights_booked: 168,
    total_nights_available: 186,
    reservations_count: 28,
    currency: 'CAD',
    monthly_breakdown: [
      { month: 'Mar', revenue: 16800, expenses: 4200, net: 9200 },
      { month: 'Avr', revenue: 19200, expenses: 4800, net: 10600 },
      { month: 'Mai', revenue: 22400, expenses: 5600, net: 12400 },
      { month: 'Jun', revenue: 28600, expenses: 7200, net: 15800 },
      { month: 'Jul', revenue: 31200, expenses: 8100, net: 17600 },
      { month: 'Aoû', revenue: 25300, expenses: 6840, net: 14404 },
    ],
  },
];

// ── Feature Flags ─────────────────────────────────────────────────────────────
export const FEATURE_FLAGS: FeatureFlag[] = [
  { key: 'agent_orchestrator', name: 'Agent Orchestrator', description: 'Activer le moteur d\'orchestration IA complet', enabled_plans: ['growth', 'enterprise'], rollout_pct: 100, is_beta: false },
  { key: 'smart_pricing', name: 'Smart Pricing', description: 'Suggestions tarifaires par Revenue Agent', enabled_plans: ['growth', 'enterprise'], rollout_pct: 80, is_beta: true },
  { key: 'multi_currency', name: 'Multi-devise', description: 'Support CAD + EUR + MAD simultanément', enabled_plans: ['enterprise'], rollout_pct: 100, is_beta: false },
  { key: 'owner_portal', name: 'Portail Propriétaire', description: 'Accès self-service pour propriétaires externes', enabled_plans: ['starter', 'growth', 'enterprise'], rollout_pct: 100, is_beta: false },
  { key: 'whatsapp_integration', name: 'WhatsApp Business', description: 'Envoi messages voyageurs via WhatsApp', enabled_plans: ['enterprise'], rollout_pct: 50, is_beta: true },
  { key: 'bulk_import_csv', name: 'Import CSV', description: 'Import en masse propriétés et réservations', enabled_plans: ['growth', 'enterprise'], rollout_pct: 100, is_beta: false },
  { key: 'advanced_reports', name: 'Rapports Avancés', description: 'Export PDF/Excel des rapports propriétaires', enabled_plans: ['growth', 'enterprise'], rollout_pct: 100, is_beta: false },
  { key: 'two_factor_auth', name: 'MFA (TOTP)', description: 'Authentification à deux facteurs', enabled_plans: ['starter', 'growth', 'enterprise'], rollout_pct: 100, is_beta: false },
];

// ── Support Tickets ───────────────────────────────────────────────────────────
export const SUPPORT_TICKETS: SupportTicket[] = [
  { id: 'sup-001', tenant_slug: 'gestion-soleil', subject: 'Intégration Airbnb — erreur sync calendrier', status: 'in_progress', priority: 'high', created_at: '2026-08-10T09:00:00Z', assigned_to: 'support@pms.ai' },
  { id: 'sup-002', tenant_slug: 'atlas-properties', subject: 'OTP email non reçus depuis 2 jours', status: 'open', priority: 'critical', created_at: '2026-08-10T08:30:00Z' },
  { id: 'sup-003', tenant_slug: 'riviera-mgmt', subject: 'Question facturation — doublon charge août', status: 'resolved', priority: 'medium', created_at: '2026-08-09T14:00:00Z', assigned_to: 'billing@pms.ai' },
  { id: 'sup-004', tenant_slug: 'gestion-soleil', subject: 'Agent IA — délai réponse > 5 secondes', status: 'open', priority: 'medium', created_at: '2026-08-09T11:00:00Z' },
  { id: 'sup-005', tenant_slug: 'nordic-rentals', subject: 'Demande augmentation quota propriétés (20→30)', status: 'in_progress', priority: 'low', created_at: '2026-08-08T10:00:00Z', assigned_to: 'success@pms.ai' },
];

// ── Billing Records ───────────────────────────────────────────────────────────
export const BILLING_RECORDS: BillingRecord[] = [
  { id: 'bill-001', tenant_slug: 'gestion-soleil', plan: 'growth', amount: 1995, currency: 'CAD', status: 'paid', period: '2026-08', invoice_date: '2026-08-01' },
  { id: 'bill-002', tenant_slug: 'atlas-properties', plan: 'enterprise', amount: 6990, currency: 'CAD', status: 'paid', period: '2026-08', invoice_date: '2026-08-01' },
  { id: 'bill-003', tenant_slug: 'riviera-mgmt', plan: 'starter', amount: 1500, currency: 'CAD', status: 'pending', period: '2026-08', invoice_date: '2026-08-01' },
  { id: 'bill-004', tenant_slug: 'nordic-rentals', plan: 'growth', amount: 1995, currency: 'CAD', status: 'failed', period: '2026-08', invoice_date: '2026-08-01' },
  { id: 'bill-005', tenant_slug: 'gestion-soleil', plan: 'growth', amount: 1995, currency: 'CAD', status: 'paid', period: '2026-07', invoice_date: '2026-07-01' },
  { id: 'bill-006', tenant_slug: 'atlas-properties', plan: 'enterprise', amount: 6990, currency: 'CAD', status: 'paid', period: '2026-07', invoice_date: '2026-07-01' },
];
