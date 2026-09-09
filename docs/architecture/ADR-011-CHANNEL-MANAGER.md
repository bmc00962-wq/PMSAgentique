# ADR-011 — Channel Manager — Adapter Pattern & Sync Strategy

**Status:** FROZEN  
**Date:** 2026-08-09  
**Phase:** PROMPT 11 — Channel Manager  
**Decision by:** PMS SaaS Architecture

---

## Context

The PMS must connect to multiple OTAs (Airbnb, Booking.com, Vrbo, iCal) with heterogeneous APIs.
A uniform architecture is needed that isolates each platform's specifics and guarantees the PMS
remains the single source of truth for availability and pricing.

---

## Decision

### 1. Adapter Pattern — IChannelAdapter per OTA

```typescript
interface IChannelAdapter {
  channel: ChannelType;
  connect(apiKey: string): Promise<{ success: boolean; error?: string }>;
  pushAvailability(unitId: string, dates: string[]): Promise<void>;
  pushRates(unitId: string, rates: Record<string, number>): Promise<void>;
  pullReservations(since: string): Promise<void>;
  mapReservationStatus(externalStatus: string): string;
}
```

One concrete implementation per channel:
- `AirbnbAdapter` → Airbnb REST API
- `BookingAdapter` → BookingSuite API
- `VrboAdapter` → Vrbo Partner API
- `ICalAdapter` → iCal RFC5545 (read-only)

Edge Function `channel_sync` instantiates the correct adapter via `adapterFactory(channel)`.

---

### 2. PMS = Absolute Source of Truth

- Availability → PMS pushes to OTA (never the reverse)
- Rates → PMS pushes to OTA
- OTA can ONLY read availability and create reservations
- `confirmed` PMS reservations can only be modified by the PMS

---

### 3. Idempotent Import via external_reservation_id

```sql
INSERT INTO reservation (...)
ON CONFLICT (channel, external_reservation_id) DO UPDATE
SET updated_at = NOW()
RETURNING id, (xmax = 0) AS inserted;
```

- `xmax = 0` → new reservation → trigger notifications (n8n W-04)
- `xmax > 0` → duplicate → log only, ignore

---

### 4. Sync Strategy

| Event | Mechanism | Fallback |
|-------|-----------|----------|
| New OTA reservation | Real-time webhook | 15min polling |
| OTA reservation update | Webhook | 1h polling |
| Push availability | Scheduled (hourly) | n8n trigger |
| Push rates | On-change + 24h scheduled | Manual |

---

### 5. iCal — Read-Only

- iCal RFC5545 = import only (no write-back to OTA)
- 1h minimum polling (acceptable latency)
- Used for HomeAway, Holidu, and manual calendars
- No OTA `idempotency_key` → SHA256 hash of content as dedup key

---

### 6. Error Handling

- Exponential retry: 1min → 5min → 30min → 1h → abandon
- After 3 consecutive failures → `error` status, `tenant_admin` notification
- n8n W-04 orchestrates retries (ADR-003)
- OTA rate limits → 429 → backoff + log

---

## Consequences

**Advantages:**
- Full OTA API isolation — API change = only adapter changes
- Idempotency guaranteed — no duplicate reservations
- PMS = source of truth → guaranteed consistency

**Constraints:**
- Each OTA requires an adapter implementation
- OTA webhooks require a public URL (Edge Function)
- OTA rate limits vary → adapter must handle throttling

**Rejected alternatives:**
- Direct integration without abstraction → tight coupling
- OTA as source of truth → cross-channel inconsistencies
- LLM for status mapping → non-deterministic, FORBIDDEN by PERMANENT_RULES

---

## Cross-references

- ADR-003: n8n orchestrates sync workflows (W-04)
- ADR-007: RLS isolates channel_connection by tenant_id
- ADR-009: calendar_availability SELECT FOR UPDATE before OTA reservation import
- ADR-010: idempotency_key already defined for OTA imports
- PERMANENT_RULES: LLM forbidden for financial mapping
