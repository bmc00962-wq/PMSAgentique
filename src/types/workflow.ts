// Workflow / n8n integration types — PROMPT 16
// Rule: n8n = orchestration only, NEVER source of truth, NEVER direct DB access (ADR-003)

export type WorkflowStatus = 'active' | 'paused' | 'error' | 'disabled';
export type TriggerType = 'event' | 'schedule' | 'webhook' | 'manual';
export type ExecutionStatus = 'success' | 'error' | 'running' | 'warning';
export type WebhookMethod = 'POST' | 'GET';

export interface WorkflowDefinition {
  id: string;               // 'W-00' … 'W-13'
  name: string;
  description: string;
  status: WorkflowStatus;
  trigger_type: TriggerType;
  trigger_label: string;    // human-readable trigger description
  domain: string;           // 'tenant' | 'calendar' | 'reservation' | 'guest' | 'housekeeping' | …
  last_execution_at?: string;
  last_execution_status?: ExecutionStatus;
  avg_duration_ms?: number;
  executions_today: number;
  executions_total: number;
  error_message?: string;
  created_at: string;
  // ADR-003: n8n calls PMS Edge Functions, NEVER DB directly
  calls_edge_functions: string[];
  n8n_workflow_id?: string; // ID in the n8n instance (production only)
}

export interface ExecutionLog {
  id: string;
  workflow_id: string;
  workflow_name: string;
  status: ExecutionStatus;
  trigger_data?: string;    // JSON snippet of what triggered it
  duration_ms: number;
  edge_fn_called?: string;
  error_message?: string;
  executed_at: string;
}

export interface WebhookConfig {
  id: string;
  workflow_id: string;
  endpoint_path: string;    // e.g. '/webhook/reservation-confirmed'
  method: WebhookMethod;
  secret_header: string;    // header name carrying HMAC secret
  is_active: boolean;
  last_called_at?: string;
  calls_count: number;
}
