# ADR-020 — Human Approval Engine
**Status**: FROZEN — 2026-08-10
**Extends**: ADR-017 (Agentic Architecture) · ADR-019 (Agent Orchestration)

## Context
PROMPT 20 formalizes the Human-in-the-Loop approval system. Any action classified
as high-impact must pause execution and require an explicit human decision before
the system proceeds. This applies to both AI agent actions and direct user operations.

## Core Rules (RÈGLES GELÉES)

### RÈGLE-APPR-001: Human Decision Required
All 10 mandatory scenarios require human approval before execution.
No AI agent, no automated process, no n8n workflow may bypass this gate.

### RÈGLE-APPR-002: Append-Only Decisions
ApprovalDecision records are immutable once written. No retroactive modification.
Corrections require a new ApprovalRequest.

### RÈGLE-APPR-003: Expiration Policy
Each ApprovalPolicy defines timeout_hours. On expiry:
- auto_reject_on_expiry=true → decision='expired' with auto-reject effect
- auto_reject_on_expiry=false → status='expired', action blocked, re-submission required

### RÈGLE-APPR-004: Delegation Traceable
Delegation creates an ApprovalDecision with decision='delegated' before assigning
to new approver. Delegation chain is fully auditable.

### RÈGLE-APPR-005: Multi-Channel Notifications
Each policy defines notification_channels (email/SMS/in_app).
Reminders are sent at escalate_after_hours if no decision received.

### RÈGLE-APPR-006: AgentRun Integration
When PolicyEngine returns require_approval, AgentOrchestrator:
1. Creates ApprovalRequest linked to agent_run_id
2. Sets AgentRun.status = 'waiting_approval'
3. Resumes execution only after decision='approved'
4. On rejection: AgentRun.status = 'cancelled', action never executes

### RÈGLE-APPR-007: Financial Calculations — PostgreSQL Only
Even after approval, financial amounts are calculated by deterministic PostgreSQL
functions (ADR-015). The ApprovalRequest stores amounts for context only,
never as calculation inputs.

### RÈGLE-APPR-008: Double Approval for Critical Scenarios
Scenarios with priority='critical' require required_approvers=2.
Both approvers must act independently (no co-approval).

## 10 Mandatory Approval Scenarios

| Scenario | Type | Timeout | Priority |
|----------|------|---------|----------|
| forced_cancellation | double | 4h | critical |
| large_refund (>500 CAD) | finance | 8h | high |
| damage_claim | double | 24h | high |
| bank_account_change | double | 48h | critical |
| new_vendor_payment | finance | 24h | medium |
| large_maintenance_expense (>1000 CAD) | manager | 24h | high |
| initial_listing_publication | manager | 4h | medium |
| serious_complaint | single | 2h | high |
| property_suspension | double | 1h | critical |
| financial_configuration_change | finance | 48h | critical |

## Approval Types

| Type | Description | Roles |
|------|-------------|-------|
| single | 1 approver required | ops_manager or tenant_admin |
| double | 2 independent approvers | tenant_admin + ops_manager |
| owner | Property owner must approve | owner role |
| manager | Operations manager | operations_manager |
| finance | Finance team | accountant + tenant_admin |

## Data Model

```
ApprovalPolicy (1) → (N) ApprovalRequest
ApprovalRequest (1) → (N) ApprovalDecision   [append-only]
ApprovalRequest (1) → (N) ApprovalNotification
ApprovalRequest (0..1) ← AgentRun            [if agent-triggered]
```

## Consequences
- ✅ No high-impact action executes without human sign-off
- ✅ Full audit trail for compliance (RGPD, financial regulations)
- ✅ AI agents structurally blocked from autonomous critical actions
- ✅ Delegation chain fully traceable
- ⚠️ Adds latency for time-sensitive operations (mitigation: clear timeout SLAs)
- ⚠️ Requires approver availability (mitigation: escalation + delegation)

## Alternatives Rejected
- Auto-approve low-priority requests: introduces creep toward bypassing critical ones
- Approval by email link only: no audit trail, phishing risk
- LLM-decided approvals: violates RÈGLE-AGENT-003 (ADR-017)

## Date
FROZEN — 2026-08-10
