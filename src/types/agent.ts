// Agentic Architecture types — PROMPT 17
// ADR-017: Human-in-the-loop mandatory for all high-impact actions
// PERMANENT RULE: Agents NEVER execute financial/access/reservation actions without human approval

export type AgentStatus = 'active' | 'idle' | 'running' | 'paused' | 'error';
export type AgentCapability = 'read_data' | 'draft_content' | 'suggest_action' | 'execute_with_approval';
export type ActionImpact = 'low' | 'medium' | 'high' | 'critical';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired' | 'executed';
export type AgentLogStatus = 'success' | 'error' | 'warning' | 'info' | 'blocked';

export interface AgentAction {
  id: string;
  name: string;
  description: string;
  capability: AgentCapability;
  impact: ActionImpact;
  requires_approval: boolean;
  domain: string;
  forbidden: boolean; // true = blocked even with approval (e.g. financial calculations)
}

export interface AgentDefinition {
  id: string;
  name: string;
  description: string;
  status: AgentStatus;
  domain: string;
  model: string;
  capabilities: AgentCapability[];
  available_actions: AgentAction[];
  actions_today: number;
  approvals_pending: number;
  total_executions: number;
  success_rate: number; // 0–100
  last_active_at?: string;
  constraints: string[];
  created_at: string;
}

export interface ApprovalRequest {
  id: string;
  agent_id: string;
  agent_name: string;
  action_id: string;
  action_name: string;
  action_description: string;
  impact: ActionImpact;
  domain: string;
  context_summary: string;
  suggested_value?: string;
  expires_at: string;
  requested_at: string;
  status: ApprovalStatus;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  n8n_workflow_ref?: string; // W-13 triggered after approval
}

export interface AgentLog {
  id: string;
  agent_id: string;
  agent_name: string;
  action_name: string;
  status: AgentLogStatus;
  approval_id?: string;
  duration_ms: number;
  result_summary?: string;
  error_message?: string;
  executed_at: string;
}
