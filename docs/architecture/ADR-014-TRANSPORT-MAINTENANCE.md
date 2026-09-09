# ADR-014 — Transport & Maintenance Architecture

**Status:** FROZEN
**Date:** 2026-08-09
**Phase:** PROMPT 14 — Transport & Maintenance
**Decision by:** PMS SaaS Architecture

---

## Context

The PMS requires two domain modules: (1) Transport for coordinating guest transfers to/from airports and activities, and (2) Maintenance for tracking repair tickets escalated from housekeeping or submitted directly by staff. Both modules must integrate with the multitenant RBAC architecture and the reservation engine.

---

## Decision

### 1. Transport State Machine

```
pending -> assigned -> en_route -> completed
        -> cancelled
pending -> no_show   (guest absent at scheduled time)
```

- Transitions validated by Edge Function `transport.transition_trip`
- `canUserPerform('transport.assign')` required for driver assignment
- Driver notified via INotificationAdapter on assignment (n8n W-10)

### 2. Trip–Reservation Link

- `trip.reservation_id` optional FK — direct bookings always have it; walk-in transfers may not
- Guest name/phone are denormalized on the trip row for offline-capable mobile display
- Flight number stored for airport pickups; n8n W-10 monitors flight delay APIs and adjusts
  `scheduled_at` automatically (non-destructive: stores `adjusted_at` alongside original)

### 3. Maintenance State Machine

```
open -> assigned -> in_progress -> resolved -> closed
     -> pending_parts -> in_progress (when parts arrive)
```

- Transitions validated by Edge Function `maintenance.transition_ticket`
- `canUserPerform('maintenance.create')` required
- Full status history in append-only `maintenance_status_history`

### 4. Housekeeping → Maintenance Escalation

When a housekeeper sets `job.status = issue_reported`:

1. Edge Function `housekeeping.transition_job` auto-creates `maintenance_ticket` with:
   - `priority = high`, `category` inferred from issue description keywords
   - `housekeeping_job_id` FK linking back to source job
   - `status = open`, assigned to property supervisor by default
2. n8n W-09 fires notification to maintenance team
3. Ticket resolved → supervisor can close housekeeping job

**Critical rule:** The maintenance ticket is created by the PMS Edge Function,
never directly by n8n (ADR-003).

### 5. ISmartLockProvider Stub

```typescript
interface ISmartLockProvider {
  generateCode(unitId: string, reservationId: string, validFrom: Date, validTo: Date): Promise<string>;
  revokeCode(unitId: string, code: string): Promise<void>;
  getAuditLog(unitId: string, from: Date, to: Date): Promise<SmartLockEvent[]>;
}
```

Implementations: `TtlockAdapter` | `NukiAdapter` | `IgloohomeAdapter`
Selected at runtime from `unit.smart_lock_provider` field.
Maintenance module uses `generateCode` to issue one-time technician codes
valid only during the scheduled intervention window.

### 6. Photo Evidence

- Ticket photos uploaded to Supabase Storage bucket `maintenance-photos`
- Path: `{tenant_id}/tickets/{ticket_id}/`
- RLS: read for tenant members; write for reporter and assigned technician
- Referenced via `ticket.photo_urls[]`

---

## Consequences

**Advantages:**
- Automatic housekeeping → maintenance escalation ensures no issue is lost
- Smart lock code generation scoped to intervention window prevents unauthorized access
- Append-only status history gives full audit trail for property damage disputes

**Constraints:**
- Smart lock integration requires vendor API key per property (Secrets store)
- Flight monitoring in W-10 requires external API (AviationStack or Flightradar24)
- Photo uploads need mobile PWA (future scope)

**Rejected alternatives:**
- Manual escalation from housekeeping: relies on human memory, issues drop through cracks
- Shared technician code valid for all units: violates principle of least privilege
- LLM category inference for ticket creation: violates PERMANENT_RULES (safety decisions)

---

## Cross-references

- ADR-003: n8n W-10 (Transport), W-09 (Housekeeping→Maintenance)
- ADR-005: `transport.assign`, `maintenance.create`, `maintenance.update_status` permissions
- ADR-006: Append-only status history tables
- ADR-007: RLS — drivers see own trips; technicians see assigned tickets
- ADR-013: Housekeeping issue escalation triggers maintenance ticket creation
- PROMPT 15: Smart lock full integration (PIN management dashboard)
