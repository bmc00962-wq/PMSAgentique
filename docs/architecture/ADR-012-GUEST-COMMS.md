# ADR-012 — Guest Data & Communication Architecture

**Status:** FROZEN  
**Date:** 2026-08-09  
**Phase:** PROMPT 12 — Voyageurs & Communications  
**Decision by:** PMS SaaS Architecture

---

## Context

The PMS needs a RGPD-compliant guest profile system and a multi-channel communication center supporting email, SMS, WhatsApp, and in-app messaging, with template management and conversation history linked to reservations.

---

## Decision

### 1. Guest Data Model

- One `guest` record per tenant (tenant_id UUID NOT NULL, RLS enforced)
- PII encrypted at rest: email, phone (AES-256, key in Vault)
- Soft delete only (deleted_at) — physical DELETE forbidden (ADR-006)
- RGPD: export endpoint returns all guest data; right to erasure = anonymization only
- `is_verified` = set by OTA import or admin review — never by guest self-declaration

### 2. Conversation Model (Channel-Agnostic)

```
conversation
  ├── id, tenant_id, guest_id, reservation_id? (nullable)
  ├── channel: email | sms | whatsapp | in_app
  ├── status: open | waiting_guest | waiting_agent | closed
  └── messages[] (append-only)
       ├── sender: guest | agent | system
       ├── content (plain text)
       └── sent_at, read_at?
```

- All channels share the same conversation model
- `system` sender = auto-generated (codes, confirmations via n8n W-05)
- Messages are **append-only** (no UPDATE/DELETE on content)

### 3. Channel Dispatch — INotificationAdapter

```typescript
interface INotificationAdapter {
  channel: ConversationChannel;
  send(to: string, content: string, subject?: string): Promise<{ message_id: string }>;
}
// EmailAdapter → SendGrid | SmsAdapter → Twilio
// WhatsAppAdapter → Meta Cloud API | InAppAdapter → Supabase Realtime
```

Edge Function `send_message` instantiates the correct adapter via `notificationFactory(channel)`.

### 4. Template System

- Variables use `{{snake_case}}` syntax — never Jinja, never LLM interpolation
- Resolved at send time from reservation/property/tenant context (server-side only)
- No HTML rendering on the client (XSS prevention)
- LLM may **draft** a message; agent must **review and send** — never auto-send

### 5. AI Draft Rule (Hard Constraint)

```
AI → draft suggestion → agent reviews → agent clicks SEND
AI cannot: auto-send, auto-close conversation, auto-confirm
```

n8n W-05 orchestrates the draft workflow with mandatory human approval step.

### 6. RGPD & Data Retention

| Data | Retention | Erasure |
|------|-----------|---------|
| Guest profile | Active + 3 years | Anonymize (hash name/email/phone) |
| Messages | 5 years (legal) | Keep structure, anonymize sender name |
| Access codes | 30 days post-checkout | Hard delete allowed (not PII) |

---

## Consequences

**Advantages:**
- Channel-agnostic model → easy to add Telegram, email-to-case
- Template system → consistent messaging, no ad-hoc HTML
- Append-only messages → immutable audit trail (ADR-006)
- Human-in-the-loop for AI → RGPD Article 22 compliant

**Constraints:**
- Each channel adapter must handle rate limits and delivery receipts
- Template variable injection requires strict sanitization
- PII encryption adds latency to guest lookup queries (~5ms)

**Rejected alternatives:**
- Email-only → loses WhatsApp-native users (MA market requires WhatsApp)
- LLM auto-send → non-compliant with RGPD automated decision rules (Art. 22)
- Storing rendered HTML in DB → XSS risk + storage bloat

---

## Cross-references

- ADR-005: `communication.send` permission required via canUserPerform()
- ADR-006: Soft delete, append-only messages
- ADR-007: RLS — guest reads own conversations only
- ADR-010: reservation_id links conversation to reservation state machine
- ADR-011: OTA channel ≠ communication channel (separate systems)
- PERMANENT_RULES: LLM forbidden for auto-send, financial messages
