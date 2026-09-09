# AI Agents

This directory contains all agentic architecture documentation.

## Contents (to be created in PROMPT 19)

- `AGENT_ARCHITECTURE.md` — Agent orchestrator design
- `AGENT_POLICIES.md` — Policy engine rules
- `TOOL_REGISTRY.md` — Available tools per agent
- `AGENTS/GUEST_AGENT.md`
- `AGENTS/HOUSEKEEPING_AGENT.md`
- `AGENTS/TRANSPORT_AGENT.md`
- `AGENTS/MAINTENANCE_AGENT.md`
- `AGENTS/OWNER_AGENT.md`
- `AGENTS/REVENUE_AGENT.md`
- `AGENTS/FINANCE_AGENT.md`
- `AGENTS/COMPLIANCE_AGENT.md`
- `AGENTS/INCIDENT_AGENT.md`

## Architecture (target)

```
Event
  → Agent Orchestrator
    → Policy Engine
      → Tool Registry
        → PMS API
```

## Critical Rules

- No agent may access PostgreSQL directly
- No LLM may produce financial calculations
- No LLM may generate or retrieve access codes
- All factual data must come from PMS API (address, price, dates, access codes)

## Status

PENDING — Will be populated in PROMPT 19
