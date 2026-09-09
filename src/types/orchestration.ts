// Agent Orchestration types — ADR-019
// Architecture: Event → AgentOrchestrator → PolicyEngine → ToolRegistry → PMS API
// RÈGLE-ORC-001: No agent accesses PostgreSQL directly

export type AgentRunStatus =
  | 'queued' | 'running' | 'waiting_approval'
  | 'completed' | 'failed' | 'cancelled' | 'timed_out';

export type AgentStepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

export type ToolCallStatus =
  | 'pending' | 'executing' | 'success'
  | 'error' | 'blocked' | 'awaiting_approval';

export type PolicyDecision = 'allow' | 'deny' | 'require_approval';
export type ApprovalType = 'single' | 'double' | 'owner' | 'manager' | 'finance';
export type InjectionRisk = 'none' | 'low' | 'medium' | 'high' | 'critical';
export type ToolImpact = 'read' | 'low' | 'medium' | 'high' | 'critical';
export type ToolDomain =
  | 'reservation' | 'calendar' | 'guest' | 'communication'
  | 'housekeeping' | 'transport' | 'maintenance' | 'finance'
  | 'property' | 'notification' | 'report';

// ── Tool Registry ─────────────────────────────────────────────────────────────

export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'uuid' | 'object' | 'array';
  required: boolean;
  description: string;
  validation?: string;
}

export interface ToolDefinition {
  id: string;
  name: string;
  domain: ToolDomain;
  description: string;
  endpoint: string;
  required_permissions: string[];
  approval_required: boolean;
  approval_type?: ApprovalType;
  impact: ToolImpact;
  readonly cross_tenant: false;
  timeout_ms: number;
  parameters: ToolParameter[];
  forbidden_for_agents?: string[];
  rate_limit_per_hour?: number;
}

// ── Orchestration Run ─────────────────────────────────────────────────────────

export interface AuditTrailEntry {
  timestamp: string;
  event: string;
  actor: string;
  details: Record<string, unknown>;
}

export interface AgentToolCall {
  id: string;
  agent_run_id: string;
  step_id: string;
  tool_id: string;
  tool_name: string;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  status: ToolCallStatus;
  policy_decision: PolicyDecision;
  policy_reason: string;
  approval_request_id?: string;
  duration_ms?: number;
  executed_at?: string;
  error?: string;
  created_at: string;
}

export interface AgentStep {
  id: string;
  agent_run_id: string;
  step_number: number;
  description: string;
  status: AgentStepStatus;
  tool_calls: AgentToolCall[];
  reasoning?: string;
  started_at?: string;
  completed_at?: string;
  duration_ms?: number;
  error?: string;
}

export interface AgentRun {
  id: string;
  tenant_id: string;
  agent_id: string;
  agent_name: string;
  trigger_event: string;
  trigger_payload: Record<string, unknown>;
  status: AgentRunStatus;
  steps: AgentStep[];
  current_step: number;
  max_steps: number;
  timeout_seconds: number;
  approval_requests: string[];
  started_at: string;
  completed_at?: string;
  result?: Record<string, unknown>;
  error?: string;
  audit_trail: AuditTrailEntry[];
}

// ── Policy Engine ─────────────────────────────────────────────────────────────

export interface PolicyEngineRequest {
  agent_id: string;
  tenant_id: string;
  tool_id: string;
  input: Record<string, unknown>;
  context: {
    agent_run_id: string;
    step_number: number;
    previous_tool_calls: number;
  };
}

export interface PolicyEngineResponse {
  decision: PolicyDecision;
  reason: string;
  rule_id: string;
  conditions?: string[];
  approval_type?: ApprovalType;
  approval_timeout_hours?: number;
}

// ── Prompt Guard ──────────────────────────────────────────────────────────────

export interface InjectionFlag {
  pattern_id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  matched_text?: string;
}

export interface InjectionScanResult {
  risk: InjectionRisk;
  flags: InjectionFlag[];
  sanitized_input?: string;
  blocked: boolean;
  scan_duration_ms: number;
}

// ── Agent Full Definition ─────────────────────────────────────────────────────

export interface AgentApprovalRule {
  condition: string;
  approval_type: ApprovalType;
  timeout_hours: number;
  escalate_to?: string;
}

export interface AgentFullDefinition {
  id: string;
  name: string;
  name_fr: string;
  domain: string;
  model: string;
  ROLE: string;
  OBJECTIVE: string;
  INPUT: string[];
  OUTPUT: string[];
  TOOLS: string[];
  PERMISSIONS: string[];
  FORBIDDEN_ACTIONS: string[];
  APPROVAL_RULES: AgentApprovalRule[];
  TIMEOUT: number;
  MAX_STEPS: number;
  AUDIT: string[];
  status: 'active' | 'inactive' | 'suspended';
  autonomy_level: 'full' | 'supervised' | 'approval_only';
  icon: string;
  color: string;
}

// ── Cross-tenant Test ─────────────────────────────────────────────────────────

export interface CrossTenantTestResult {
  test_id: string;
  description: string;
  attack_vector: string;
  defense_mechanism: string;
  passed: boolean;
  details?: string;
}
