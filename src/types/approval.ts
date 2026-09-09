// Human Approval Engine types — ADR-020
// RÈGLE-APPR-001: All high-impact actions require human decision before execution

export type ApprovalScenario =
  | 'forced_cancellation'
  | 'large_refund'
  | 'damage_claim'
  | 'bank_account_change'
  | 'new_vendor_payment'
  | 'large_maintenance_expense'
  | 'initial_listing_publication'
  | 'serious_complaint'
  | 'property_suspension'
  | 'financial_configuration_change';

export type ApprovalType = 'single' | 'double' | 'owner' | 'manager' | 'finance';
export type ApprovalRequestStatus = 'pending' | 'approved' | 'rejected' | 'expired' | 'delegated' | 'cancelled';
export type ApprovalPriority = 'low' | 'medium' | 'high' | 'critical';
export type NotificationChannel = 'email' | 'sms' | 'in_app';
export type NotificationType = 'new_request' | 'reminder' | 'decision' | 'expiry_warning' | 'delegated';

export interface ApprovalPolicy {
  id: string;
  scenario: ApprovalScenario;
  name: string;
  name_fr: string;
  description: string;
  approval_type: ApprovalType;
  required_approvers: number;
  timeout_hours: number;
  escalate_after_hours?: number;
  delegate_to?: string;
  amount_threshold?: number;
  currency?: string;
  auto_reject_on_expiry: boolean;
  notification_channels: NotificationChannel[];
  notify_roles: string[];
  icon: string;
  color: string;
  priority: ApprovalPriority;
}

export interface ApprovalRequestContext {
  entity_type: string;
  entity_id: string;
  entity_name?: string;
  amount?: number;
  currency?: string;
  reservation_id?: string;
  property_id?: string;
  unit_id?: string;
  guest_name?: string;
  owner_name?: string;
  reason?: string;
  supporting_documents?: string[];
  metadata?: Record<string, unknown>;
}

export interface ApprovalDecision {
  id: string;
  request_id: string;
  approver_id: string;
  approver_name: string;
  approver_role: string;
  decision: 'approved' | 'rejected' | 'delegated' | 'expired';
  reason?: string;
  conditions?: string[];
  delegated_to?: string;
  decided_at: string;
}

export interface ApprovalNotification {
  id: string;
  request_id: string;
  recipient_id: string;
  recipient_name: string;
  recipient_role: string;
  channel: NotificationChannel;
  type: NotificationType;
  sent_at: string;
  read_at?: string;
}

export interface ApprovalRequest {
  id: string;
  tenant_id: string;
  scenario: ApprovalScenario;
  policy_id: string;
  title: string;
  description: string;
  priority: ApprovalPriority;
  status: ApprovalRequestStatus;
  requester_id: string;
  requester_name: string;
  requester_role: string;
  context: ApprovalRequestContext;
  approval_type: ApprovalType;
  required_approvers: number;
  current_approvals: number;
  approver_roles: string[];
  assigned_approver_id?: string;
  assigned_approver_name?: string;
  expires_at: string;
  delegated_to?: string;
  delegated_at?: string;
  agent_run_id?: string;
  agent_id?: string;
  decisions: ApprovalDecision[];
  notifications_sent: ApprovalNotification[];
  version: number;
  created_at: string;
  updated_at: string;
}

export interface ApprovalSummary {
  total_pending: number;
  total_approved_today: number;
  total_rejected_today: number;
  total_expired: number;
  critical_pending: number;
  high_pending: number;
  avg_resolution_hours: number;
}
