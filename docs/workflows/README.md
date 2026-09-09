# Workflows

This directory contains all n8n workflow documentation.

## Contents (to be created in PROMPT 18)

- `N8N.md` — n8n integration architecture
- `WORKFLOW_CATALOG.md` — Full workflow catalog

## Planned Workflows

| ID | Name |
|----|------|
| 00 | ERROR_HANDLER |
| 01 | CHANNEL_EVENT_GATEWAY |
| 02 | RESERVATION_UPSERT |
| 03 | RESERVATION_ORCHESTRATOR |
| 04 | GUEST_COMMUNICATIONS |
| 05 | HOUSEKEEPING_DISPATCH |
| 06 | DRIVER_DISPATCH |
| 07 | SMART_LOCK_ACCESS |
| 08 | MAINTENANCE_INCIDENT |
| 09 | HUMAN_APPROVAL |
| 10 | OWNER_NOTIFICATION |
| 11 | DAILY_RECONCILIATION |
| 12 | CHANNEL_OUTBOUND_SYNC |
| 13 | AI_MESSAGE_TRIAGE |

## Critical Rules

- n8n is an orchestration engine, NOT a source of truth
- n8n must never write directly to business tables
- All n8n requests require: `Authorization`, `X-Correlation-ID`, `Idempotency-Key`
- n8n must use internal secured PMS APIs only

## Status

PENDING — Will be populated in PROMPT 18
