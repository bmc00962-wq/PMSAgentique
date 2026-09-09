// Policy Engine — ADR-019 RÈGLE-ORC-003
// Evaluates tool calls BEFORE execution. First deny wins.

import type { PolicyEngineRequest, PolicyEngineResponse, ToolDefinition } from '@/types/orchestration';
import { TOOL_REGISTRY_MAP } from './toolRegistry';

// Lazy import to avoid circular deps
let _agentDefs: Record<string, { TOOLS: string[]; MAX_STEPS: number; name: string }> | null = null;
function getAgentDefs() {
  if (!_agentDefs) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    _agentDefs = require('./agentDefinitions').AGENT_DEFINITIONS_MAP;
  }
  return _agentDefs!;
}

interface PolicyRule {
  id: string;
  evaluate: (req: PolicyEngineRequest, tool: ToolDefinition | undefined) => PolicyEngineResponse | null;
}

const RULES: PolicyRule[] = [
  {
    id: 'RULE-POL-001',
    evaluate: (req, tool) => {
      if (!tool) return { decision: 'deny', reason: `Tool '${req.tool_id}' not in Tool Registry`, rule_id: 'RULE-POL-001' };
      return null;
    },
  },
  {
    id: 'RULE-POL-002',
    evaluate: (req) => {
      const inputTenantId = (req.input as Record<string, unknown>)['tenant_id'];
      if (inputTenantId && inputTenantId !== req.tenant_id) {
        return { decision: 'deny', reason: 'Cross-tenant access forbidden (RÈGLE-ORC-005)', rule_id: 'RULE-POL-002' };
      }
      return null;
    },
  },
  {
    id: 'RULE-POL-003',
    evaluate: (req, tool) => {
      const agentDef = getAgentDefs()[req.agent_id];
      if (!agentDef) return { decision: 'deny', reason: `Agent '${req.agent_id}' not registered`, rule_id: 'RULE-POL-003' };
      if (!agentDef.TOOLS.includes(req.tool_id)) {
        return { decision: 'deny', reason: `Agent '${agentDef.name}' not authorized for tool '${tool?.name}'`, rule_id: 'RULE-POL-003' };
      }
      return null;
    },
  },
  {
    id: 'RULE-POL-004',
    evaluate: (req, tool) => {
      if (tool?.forbidden_for_agents?.includes(req.agent_id)) {
        return { decision: 'deny', reason: `Tool '${tool.name}' explicitly forbidden for agent '${req.agent_id}'`, rule_id: 'RULE-POL-004' };
      }
      return null;
    },
  },
  {
    id: 'RULE-POL-005',
    evaluate: (_req, tool) => {
      if (tool?.impact === 'critical') {
        return { decision: 'require_approval', reason: `Critical impact — double approval required`, rule_id: 'RULE-POL-005', approval_type: 'double', approval_timeout_hours: 2 };
      }
      return null;
    },
  },
  {
    id: 'RULE-POL-006',
    evaluate: (_req, tool) => {
      if (tool?.domain === 'finance' && (tool.impact === 'high' || tool.impact === 'critical')) {
        return { decision: 'require_approval', reason: `Finance tool '${tool.name}' requires finance approval`, rule_id: 'RULE-POL-006', approval_type: 'finance', approval_timeout_hours: 8 };
      }
      return null;
    },
  },
  {
    id: 'RULE-POL-007',
    evaluate: (_req, tool) => {
      if (tool?.approval_required && tool.impact !== 'critical') {
        return { decision: 'require_approval', reason: `Tool '${tool.name}' requires human approval`, rule_id: 'RULE-POL-007', approval_type: tool.approval_type || 'single', approval_timeout_hours: 24 };
      }
      return null;
    },
  },
  {
    id: 'RULE-POL-008',
    evaluate: (req) => {
      const agentDef = getAgentDefs()[req.agent_id];
      if (agentDef && req.context.previous_tool_calls >= agentDef.MAX_STEPS) {
        return { decision: 'deny', reason: `MAX_STEPS (${agentDef.MAX_STEPS}) reached for agent '${agentDef.name}'`, rule_id: 'RULE-POL-008' };
      }
      return null;
    },
  },
];

export const PolicyEngine = {
  evaluate(req: PolicyEngineRequest): PolicyEngineResponse {
    const tool = TOOL_REGISTRY_MAP[req.tool_id];
    for (const rule of RULES) {
      const result = rule.evaluate(req, tool);
      if (result) {
        console.log(`[PolicyEngine] ${rule.id} → ${result.decision}: ${result.reason}`);
        return result;
      }
    }
    return { decision: 'allow', reason: `Tool '${tool?.name}' authorized for agent '${req.agent_id}'`, rule_id: 'ALLOW' };
  },

  agentHasPermission(agentId: string, permission: string): boolean {
    const defs = getAgentDefs();
    const agent = defs[agentId] as { TOOLS: string[]; MAX_STEPS: number; name: string; PERMISSIONS?: string[] } | undefined;
    return (agent as { PERMISSIONS?: string[] } | undefined)?.PERMISSIONS?.includes(permission) ?? false;
  },
};
