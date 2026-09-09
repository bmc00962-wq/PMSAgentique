# PERMANENT RULES

These rules MUST be applied before every new development phase, without exception.

---

## Pre-Phase Checklist

Before starting any new phase:

1. **Read** `docs/PROJECT_STATE.md`
   - Check current phase
   - Check completed items
   - Check frozen decisions

2. **Read** `docs/DECISIONS.md`
   - Review all frozen decisions
   - Never override a frozen decision without explicit justification

3. **Examine existing architecture**
   - Read `docs/architecture/` before adding new components
   - Never duplicate an existing architectural pattern

4. **Examine existing code**
   - Check `src/` for existing components before creating new ones
   - Reuse existing abstractions

5. **Examine existing migrations**
   - Check `docs/database/` for existing schema
   - Never drop or recreate tables — use migrations only

---

## Development Rules

### Multitenancy
- Every tenant-specific table MUST have `tenant_id UUID NOT NULL`
- `tenant_id` must NEVER come directly from a frontend form
- Always resolve tenant context server-side via `resolveTenantContext()`

### Security
- All sensitive authorization MUST be validated server-side
- The frontend MUST NEVER be the sole authority on permissions
- RLS must be active on all tenant-scoped tables

### Data Integrity
- Never delete or recreate a table — use migrations
- All schema changes go through versioned migration files
- Soft delete preferred over hard delete for business entities

### AI Agents
- No agent may access PostgreSQL directly
- No LLM may produce financial calculations
- No LLM may generate or retrieve access codes
- Factual data (address, price, dates, access codes) must come from PMS API

### External Integrations
- Never invent an external API
- If provider credentials or specs are unavailable, return `PROVIDER_NOT_CONFIGURED`
- Use canonical internal models — never couple domain to provider models

### n8n
- n8n must never write directly to business tables
- n8n must use internal secured APIs only
- All n8n requests require: `Authorization`, `X-Correlation-ID`, `Idempotency-Key`

### Idempotency
- All external events must be deduplicated: `SHA256(provider + accountId + eventId)`
- All reservation operations must use `idempotency_key`

---

## Non-Negotiable Architecture Constraints

| Constraint | Rule |
|------------|------|
| Backend | Supabase / PostgreSQL only |
| Auth | Supabase Auth only |
| Frontend | React + TypeScript (OnSpace stack) |
| Automation | n8n (orchestration only, not source of truth) |
| Architecture | Modular Monolith (no microservices before V2) |
| Migrations | Forward-only, versioned |
| Tenancy | tenant_id on all business data |
| RLS | Active on all tenant-scoped tables |
