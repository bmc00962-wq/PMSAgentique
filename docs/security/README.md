# Security

This directory contains all security documentation.

## Contents (to be created per phase)

- `RBAC.md` — Role-Based Access Control matrix (PROMPT 04)
- `RLS_POLICIES.md` — Row Level Security policies (PROMPT 06)
- `SECURITY_TEST_REPORT.md` — Security isolation test results (PROMPT 06)
- `AUTH_FLOWS.md` — Authentication flows (PROMPT 04)

## Key Security Principles

- Supabase Auth for all authentication
- RLS active on all tenant-scoped tables
- Server-side authorization validation
- Frontend is never the sole permission authority
- All sensitive actions validated via `canUserPerform(user, tenant, permission, resource)`

## Planned Test Scenarios (PROMPT 06)

- Tenant A reads Tenant B data → MUST FAIL
- Tenant A modifies Tenant B data → MUST FAIL
- Tenant A downloads Tenant B file → MUST FAIL
- Owner A views Owner B finances → MUST FAIL
- Cleaner A views unassigned property → MUST FAIL

## Status

PENDING — Will be populated in PROMPT 04 and PROMPT 06
