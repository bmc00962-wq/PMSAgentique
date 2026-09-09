// Core TypeScript types — PMS SaaS Agentique
// Based on DATA_MODEL.md V1 (80 tables, 15 domains)
// All monetary values use number (JavaScript representation of NUMERIC(12,4))

// ─── Base ─────────────────────────────────────────────────────────────────────

export interface BaseEntity {
  id: string;
  tenant_id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  version: number;
}

export interface SoftDeleteEntity extends BaseEntity {
  deleted_at: string | null;
}

// ─── Auth / Identity ──────────────────────────────────────────────────────────

export interface UserProfile {
  id: string; // = auth.users.id
  email: string;
  full_name: string;
  avatar_url: string | null;
  phone: string | null;
  preferred_language: "fr" | "en" | "ar";
  preferred_currency: string;
  timezone: string;
  is_active: boolean;
  mfa_enabled: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TenantMembership {
  id: string;
  tenant_id: string;
  user_id: string;
  role: string;
  status: "invited" | "active" | "inactive" | "suspended";
  permissions_override: { grant?: string[]; deny?: string[] };
  properties_scope: string[] | null;
  invited_at: string | null;
  joined_at: string | null;
}

// ─── Tenant ───────────────────────────────────────────────────────────────────

export type TenantStatus = "trial" | "active" | "suspended" | "pending_deletion" | "deleted" | "migrating";
export type TenantPlan = "trial" | "starter" | "growth" | "enterprise";

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  status: TenantStatus;
  plan_id: string;
  data_region: string;
  trial_ends_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TenantSettings {
  tenant_id: string;
  default_language: "fr" | "en" | "ar";
  default_currency: string;
  timezone: string;
  check_in_time: string;
  check_out_time: string;
  cleaning_buffer_hours: number;
  commission_default: number;
  allow_owner_portal: boolean;
  allow_guest_portal: boolean;
  require_inspection: boolean;
  auto_send_access_codes: boolean;
}

// ─── Owner ────────────────────────────────────────────────────────────────────

export interface Owner extends SoftDeleteEntity {
  user_id: string | null;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  company_name: string | null;
  preferred_currency: string;
  preferred_language: "fr" | "en" | "ar";
  is_active: boolean;
}

export interface OwnerContract extends BaseEntity {
  owner_id: string;
  contract_type: "full_management" | "co_host" | "guaranteed_revenue";
  commission_rate: number;
  payment_frequency: "monthly" | "quarterly";
  payment_day: number;
  start_date: string;
  end_date: string | null;
  status: "draft" | "active" | "expired" | "terminated";
}

// ─── Property ─────────────────────────────────────────────────────────────────

export type PropertyType = "house" | "condo" | "apartment" | "chalet" | "riad" | "villa";
export type PropertyStatus = "inactive" | "active" | "maintenance" | "unlisted";

export interface Property extends SoftDeleteEntity {
  owner_id: string;
  name: string;
  property_type: PropertyType;
  status: PropertyStatus;
  description: string | null;
  max_guests: number | null;
  parking_spaces: number;
  primary_photo_url: string | null;
  notes: string | null;
}

export interface Unit extends SoftDeleteEntity {
  property_id: string;
  name: string;
  unit_number: string | null;
  bedrooms: number;
  bathrooms: number;
  max_total_guests: number;
  base_rate_per_night: number | null;
  cleaning_fee: number;
  status: "inactive" | "active" | "maintenance";
  sort_order: number;
}

// ─── Calendar ─────────────────────────────────────────────────────────────────

export type AvailabilityStatus =
  | "available" | "reserved" | "owner_block" | "maintenance"
  | "manual_block" | "housekeeping" | "check_in" | "check_out";

export interface Availability {
  id: string;
  tenant_id: string;
  unit_id: string;
  date: string; // YYYY-MM-DD
  status: AvailabilityStatus;
  reservation_id: string | null;
  rate: number | null;
  min_nights: number | null;
}

// ─── Guest & Reservation ──────────────────────────────────────────────────────

export interface Guest extends SoftDeleteEntity {
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  nationality: string | null;
  preferred_language: string;
  vip_status: boolean;
  blacklisted: boolean;
}

export type ReservationStatus =
  | "pending" | "confirmed" | "modified" | "checked_in" | "checked_out" | "cancelled" | "no_show";

export type PaymentStatus = "pending" | "partial" | "paid" | "refunded" | "failed";

export interface Reservation extends SoftDeleteEntity {
  unit_id: string;
  guest_id: string;
  channel_id: string | null;
  external_reservation_id: string | null;
  idempotency_key: string;
  status: ReservationStatus;
  check_in_date: string;
  check_out_date: string;
  nights: number;
  adults: number;
  children: number;
  total_guests: number;
  base_amount: number;
  fees_amount: number;
  taxes_amount: number;
  total_amount: number;
  currency: string;
  payment_status: PaymentStatus;
  booking_source: string | null;
}

// ─── Operations ───────────────────────────────────────────────────────────────

export type TaskType = "housekeeping" | "inspection" | "maintenance" | "transport" | "generic";
export type TaskStatus = "pending" | "assigned" | "in_progress" | "completed" | "failed" | "cancelled";
export type TaskPriority = "low" | "normal" | "high" | "urgent";

export interface Task extends BaseEntity {
  task_type: TaskType;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  property_id: string | null;
  unit_id: string | null;
  reservation_id: string | null;
  due_date: string | null;
  completed_at: string | null;
}

// ─── Finance ─────────────────────────────────────────────────────────────────

export interface Payment extends BaseEntity {
  reservation_id: string;
  amount: number;
  currency: string;
  payment_method: string | null;
  status: "pending" | "paid" | "failed" | "refunded";
  paid_at: string | null;
}

export interface OwnerStatement extends BaseEntity {
  owner_id: string;
  period_start: string;
  period_end: string;
  total_revenue: number;
  total_commissions: number;
  total_expenses: number;
  net_payout: number;
  currency: string;
  status: "draft" | "review" | "approved" | "sent" | "paid";
}

// ─── Governance ───────────────────────────────────────────────────────────────

export interface AuditEvent {
  id: string;
  tenant_id: string;
  event_type: string;
  resource_type: string;
  resource_id: string | null;
  actor_id: string | null;
  actor_type: "user" | "agent" | "system" | "service_account";
  correlation_id: string | null;
  changes: Record<string, unknown> | null;
  occurred_at: string;
  created_at: string;
}

export interface ApprovalRequest extends BaseEntity {
  request_type: "payout" | "expense" | "work_order" | "cancellation_refund" | "agent_action";
  title: string;
  description: string | null;
  requestor_id: string;
  reference_type: string | null;
  reference_id: string | null;
  amount: number | null;
  currency: string | null;
  status: "pending" | "approved" | "rejected" | "expired" | "cancelled";
  expires_at: string | null;
}

// ─── UI Utilities ─────────────────────────────────────────────────────────────

export interface SelectOption<T = string> {
  value: T;
  label: string;
  description?: string;
  disabled?: boolean;
}

export interface TableColumn<T> {
  key: keyof T | string;
  header: string;
  width?: string;
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
}

export interface FilterState {
  search: string;
  status: string;
  page: number;
  per_page: number;
  sort_by: string;
  sort_order: "asc" | "desc";
}
