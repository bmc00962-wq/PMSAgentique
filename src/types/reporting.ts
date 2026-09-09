// Reporting types — ADR-021
// Platform · Tenant · Owner dashboards

export interface PlatformMetrics {
  mrr: number;
  mrr_growth_pct: number;
  arr: number;
  total_tenants: number;
  active_tenants: number;
  trial_tenants: number;
  suspended_tenants: number;
  total_properties: number;
  total_units: number;
  total_users: number;
  total_reservations_month: number;
  ai_requests_month: number;
  storage_used_gb: number;
  storage_quota_gb: number;
  open_incidents: number;
  avg_resolution_h: number;
  churn_rate_pct: number;
  nps_score: number;
}

export interface MrrByPlan {
  plan: string;
  tenants: number;
  mrr: number;
  color: string;
}

export interface TenantGrowthPoint {
  month: string;
  active: number;
  trial: number;
  churned: number;
}

export interface IncidentLog {
  id: string;
  tenant_slug: string;
  type: 'auth' | 'database' | 'edge_fn' | 'storage' | 'billing' | 'agent';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  status: 'open' | 'investigating' | 'resolved';
  created_at: string;
  resolved_at?: string;
}

export interface PlatformHealthService {
  name: string;
  status: 'operational' | 'degraded' | 'outage';
  latency_ms: number;
  uptime_pct: number;
}

// Tenant-level metrics
export interface TenantOccupancyPoint {
  month: string;
  occupancy_pct: number;
  adr: number;
  revpar: number;
}

export interface TenantMetrics {
  tenant_id: string;
  tenant_name: string;
  period: string; // e.g. "2026-08"
  occupancy_pct: number;
  total_revenue: number;
  net_revenue: number;
  total_reservations: number;
  confirmed_reservations: number;
  cancelled_reservations: number;
  adr: number;       // Average Daily Rate
  revpar: number;    // Revenue Per Available Room
  cleaning_jobs_done: number;
  cleaning_jobs_pending: number;
  maintenance_tickets_open: number;
  maintenance_tickets_closed: number;
  guest_satisfaction_avg: number; // 1-5
  total_nights_available: number;
  total_nights_booked: number;
  channel_breakdown: ChannelBreakdown[];
}

export interface ChannelBreakdown {
  channel: string;
  reservations: number;
  revenue: number;
  pct: number;
  color: string;
}

export interface OccupancyTrend {
  month: string;
  occupancy_pct: number;
  adr: number;
  revpar: number;
}

// Owner-level report
export interface OwnerReport {
  owner_id: string;
  owner_name: string;
  period: string;
  properties: number;
  units: number;
  total_revenue: number;
  total_expenses: number;
  management_commission: number;
  cleaning_cost: number;
  maintenance_cost: number;
  tax_amount: number;
  net_income: number;
  occupancy_pct: number;
  total_nights_booked: number;
  total_nights_available: number;
  reservations_count: number;
  currency: string;
  monthly_breakdown: OwnerMonthlyPoint[];
}

export interface OwnerMonthlyPoint {
  month: string;
  revenue: number;
  expenses: number;
  net: number;
}

// SaaS Admin types
export interface FeatureFlag {
  key: string;
  name: string;
  description: string;
  enabled_plans: string[];
  rollout_pct: number;
  is_beta: boolean;
}

export interface SupportTicket {
  id: string;
  tenant_slug: string;
  subject: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'critical' | 'high' | 'medium' | 'low';
  created_at: string;
  assigned_to?: string;
}

export interface BillingRecord {
  id: string;
  tenant_slug: string;
  plan: string;
  amount: number;
  currency: string;
  status: 'paid' | 'pending' | 'failed' | 'refunded';
  period: string;
  invoice_date: string;
}
