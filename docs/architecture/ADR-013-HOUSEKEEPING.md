# ADR-013 — Housekeeping Engine Architecture

**Status:** FROZEN
**Date:** 2026-08-09
**Phase:** PROMPT 13 — Moteur Operations & Menage
**Decision by:** PMS SaaS Architecture

---

## Context

The PMS requires a housekeeping management module to schedule, assign, track, and report on cleaning and inspection jobs across all properties. The module must integrate with the reservation engine (checkout triggers) and the maintenance module (issue escalation), within the multitenant, RBAC-secured architecture.

---

## Decision

### 1. Job State Machine

```
pending -> assigned -> in_progress -> done
                    -> cancelled
in_progress -> issue_reported -> (maintenance module, PROMPT 15)
```

- Transitions validated by Edge Function `housekeeping.transition_job`
- `canUserPerform('housekeeping.update_status')` checked server-side before any write
- Full state history stored in append-only `housekeeping_status_history` (ADR-006)

### 2. Checklist Model

```
housekeeping_job (1) -> housekeeping_checklist_item (N)
  category: chambre | salle_de_bain | cuisine | salon | general
  is_completed: boolean  -- once true, NEVER reset (audit trail)
  photo_url: nullable    -- Supabase Storage bucket housekeeping-photos
  completed_at: timestamptz
```

**Critical rule:** Checklist items can only be marked done, never unchecked.
Corrections go via supervisor note — preserves audit trail (ADR-006).

### 3. Automated Job Creation (n8n W-09)

n8n W-09 listens for `reservation.checkout_confirmed` events:
1. Creates `checkout_clean` job for each unit in the reservation
2. Priority logic: `urgent` if next check-in < 2h, `high` if < 4h, else `normal`
3. Notifies active housekeepers via INotificationAdapter (SMS/WhatsApp/in-app)
4. PMS validates final assignment — n8n NEVER writes directly to `housekeeping_job` (ADR-003)

### 4. Photo Evidence

- Uploaded via housekeeper mobile (future PWA) to Supabase Storage
- Bucket: `housekeeping-photos` (tenant-prefixed: `{tenant_id}/jobs/{job_id}/`)
- RLS: read restricted to tenant members; write restricted to assigned housekeeper
- Linked via `checklist_item.photo_url` and `job.issue_photos[]`

### 5. Issue Escalation Chain

```
housekeeper flags issue_reported
  -> auto-creates maintenance_request (PROMPT 15)
  -> n8n W-09 notifies supervisor + maintenance team
  -> maintenance resolved -> supervisor closes job
```

### 6. Assignment Rules

- One primary housekeeper per job (`housekeeper_id` FK)
- Helper can be added via `housekeeping_job_assignment` junction table (V1)
- RLS: housekeeper sees only `housekeeper_id = auth.get_membership_id()` rows
- Supervisor sees all jobs for their tenant (standard `tenant_id` RLS)

---

## Consequences

**Advantages:**
- Append-only checklist preserves full audit trail
- Automated job creation on checkout reduces manual scheduling
- Issue -> Maintenance chain creates traceable escalation
- Photo evidence supports guest dispute resolution

**Constraints:**
- Mobile photo upload requires PWA or native app (future scope)
- n8n W-09 requires backend activation before automation is live
- Multi-housekeeper jobs need junction table (V1 feature)

**Rejected alternatives:**
- Free-form notes instead of checklist: not auditable, no SLA tracking possible
- LLM to validate checklist completion: violates PERMANENT_RULES (safety decisions)
- Per-unit status flags instead of state machine: no audit trail, race condition risk

---

## Cross-references

- ADR-003: n8n orchestration only (W-09 Housekeeping Auto-Assign)
- ADR-005: `housekeeping.create` + `housekeeping.update_status` permissions required
- ADR-006: Append-only checklist items + status history
- ADR-007: RLS housekeeper context (own jobs only)
- ADR-010: `reservation.checkout_confirmed` event triggers job creation
- PROMPT 15: Maintenance module receives issue escalation from housekeeping
- PERMANENT_RULES: LLM forbidden for safety/quality decisions
