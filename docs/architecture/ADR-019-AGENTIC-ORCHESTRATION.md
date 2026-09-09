# ADR-019 — Agent Orchestration Architecture
**Status**: FROZEN — 2026-08-10
**Extends**: ADR-017 (Agentic Architecture)

## Context
PROMPT 17 introduced 6 AI agents. PROMPT 19 formalizes the complete orchestration
architecture with 9 agents, a central Tool Registry, Policy Engine, Prompt Guard,
and structural cross-tenant isolation guarantees.

## Architecture Flow
```
Event
  → AgentOrchestrator (dispatch + lifecycle)
      → PromptGuard (injection scan)
      → PolicyEngine (permission + approval check)
      → ToolRegistry (tool lookup + validation)
      → Edge Function (canUserPerform() + RLS)
      → PostgreSQL
```

## Core Rules (RÈGLES GELÉES)

### RÈGLE-ORC-001: Zero Direct Database Access
No agent may query PostgreSQL directly. All data access routes through registered
Edge Functions with canUserPerform() authorization and RLS row filtering.

### RÈGLE-ORC-002: Tool Registry as Single Entry Point
All agent actions must be registered tools. Unregistered actions are structurally
impossible — the orchestrator has no generic "run SQL" capability.

### RÈGLE-ORC-003: Policy Engine First
Every tool call is evaluated by PolicyEngine before execution. Decision='deny'
terminates the step immediately. Decision='require_approval' pauses the AgentRun.

### RÈGLE-ORC-004: Prompt Injection Protection at Ingress
All agent inputs (trigger payload + intermediate LLM outputs) are scanned by
PromptGuard. InjectionRisk >= 'high' blocks execution and logs a security event.

### RÈGLE-ORC-005: Tenant Isolation Structural
AgentRun.tenant_id is always injected from the authenticated JWT, never derived
from agent output or tool results. Cross-tenant tool parameters are rejected by
PolicyEngine RULE-POL-002.

### RÈGLE-ORC-006: Human Approval Gate
Tools with approval_required=true pause the AgentRun (status='waiting_approval')
and create an ApprovalRequest. The run only resumes after explicit human decision.
Approvals expire per tool.approval_timeout_hours.

### RÈGLE-ORC-007: Audit Trail Mandatory
Every AgentRun, AgentStep, and AgentToolCall is persisted in the audit log.
Logs are immutable (append-only). Policy decisions are always recorded.

### RÈGLE-ORC-008: LLM Forbidden for Financial Calculations
Finance tools invoke deterministic PostgreSQL functions (ADR-015, NUMERIC(12,4)).
LLMs may only trigger tool calls; they never compute amounts, taxes, or commissions.

## Agent Catalog (9 Agents)

| ID                   | Name            | Domain        | Autonomy       | Model        |
|----------------------|-----------------|---------------|----------------|--------------|
| agent-guest          | Guest Agent     | communication | approval_only  | gpt-4o       |
| agent-housekeeping   | Ménage Agent    | housekeeping  | supervised     | gpt-4o-mini  |
| agent-transport      | Transport Agent | transport     | supervised     | gpt-4o-mini  |
| agent-maintenance    | Maintenance     | maintenance   | supervised     | gpt-4o       |
| agent-owner          | Owner Agent     | finance       | approval_only  | gpt-4o       |
| agent-revenue        | Revenue Agent   | finance       | approval_only  | gpt-4o       |
| agent-finance        | Finance Agent   | finance       | approval_only  | gpt-4o       |
| agent-compliance     | Compliance      | governance    | supervised     | gpt-4o       |
| agent-incident       | Incident Agent  | operations    | supervised     | gpt-4o       |

## Tool Registry — 11 Domains, 49 Tools
reservation(6) | calendar(4) | guest(5) | communication(4) | housekeeping(5) |
transport(4) | maintenance(5) | finance(6) | property(3) | notification(3) | report(4)

## Policy Engine Rules
- RULE-POL-001: Tool not in registry → deny
- RULE-POL-002: Cross-tenant input detected → deny
- RULE-POL-003: Agent not authorized for tool → deny
- RULE-POL-004: Tool explicitly forbidden for agent → deny
- RULE-POL-005: impact=critical → require double approval
- RULE-POL-006: domain=finance + impact=high → require finance approval
- RULE-POL-007: approval_required=true → require_approval (per tool type)
- RULE-POL-008: MAX_STEPS reached → deny

## Cross-Tenant Tests (12 test cases)
All 12 structural isolation tests pass by design (tenant_id from JWT only).

## Consequences
- ✅ Complete auditability of all agent actions
- ✅ Cross-tenant isolation enforced at orchestrator level
- ✅ Prompt injection resistance at ingress
- ✅ Human approval mandatory for high-impact actions
- ⚠️ ~200ms latency overhead vs direct DB access
- ⚠️ Tool Registry maintenance required as PMS evolves

## Alternatives Rejected
- Direct DB access from agents: violates RLS isolation and ADR-007
- Agent-to-agent direct calls: creates audit gaps and circular dependency risk
- Auto-approve all actions: violates ADR-017 RÈGLE-AGENT-003

## Date
FROZEN — 2026-08-10
