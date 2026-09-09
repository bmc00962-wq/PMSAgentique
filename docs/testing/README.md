# Testing

This directory contains all testing documentation and test plans.

## Contents (to be created per phase)

- `SECURITY_TEST_PLAN.md` — RLS and isolation tests (PROMPT 06)
- `CONCURRENCY_TEST_PLAN.md` — Double-booking prevention tests (PROMPT 09, 10)
- `CHANNEL_SYNC_TEST_PLAN.md` — OTA sync tests (PROMPT 11)
- `AGENT_TEST_PLAN.md` — AI agent behavior tests (PROMPT 19)
- `INTEGRATION_TEST_PLAN.md` — End-to-end integration tests

## Key Test Scenarios

### Security (PROMPT 06)
- Cross-tenant data isolation
- Cross-owner finance isolation
- Unassigned resource access

### Concurrency (PROMPT 09–10)
- Two simultaneous reservations on same unit
- Calendar version conflicts

### Idempotency
- Duplicate external reservation events
- Duplicate payment events

## Status

PENDING — Will be populated starting from PROMPT 06
