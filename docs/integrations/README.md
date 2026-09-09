# Integrations

This directory contains all external integration documentation.

## Contents (to be created per phase)

- `CHANNEL_MANAGER.md` — OTA channel manager architecture (PROMPT 11)
- `AIRBNB.md` — Airbnb integration specification (PROMPT 11)
- `BOOKING.md` — Booking.com integration specification (PROMPT 11)
- `VRBO.md` — VRBO integration specification (PROMPT 11)
- `N8N.md` — n8n workflow integration (PROMPT 18)
- `STRIPE.md` — Stripe payment provider (PROMPT 17)
- `SMART_LOCKS.md` — Smart lock providers (PROMPT 16)

## Integration Levels (OTA)

- **LEVEL 1** — iCalendar
- **LEVEL 2** — Certified Channel Manager
- **LEVEL 3** — Official Direct API

## Critical Rules

- Never invent an external API
- If credentials/specs unavailable → return `PROVIDER_NOT_CONFIGURED`
- All external events must use canonical internal models
- Idempotency: `SHA256(provider + accountId + eventId)`

## Status

PENDING — Will be populated in PROMPT 11 and beyond
