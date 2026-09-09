# ADR-022 — UX/UI Finalization
**Status**: FROZEN — 2026-08-10
**Extends**: ADR-008 (Application Foundation)

## Context
PROMPT 22 finalizes the design system and UX. Business rules from all previous ADRs
remain unchanged. Design adapts to business constraints, never the reverse.

## Core Rules (RÈGLES GELÉES)

### RÈGLE-UX-001: Business Rules Unchanged
No UI change may bypass, weaken, or shortcut any business rule.
Design exists to serve workflow, not the other way around.

### RÈGLE-UX-002: Mobile-First Responsive
All pages are designed mobile-first (<640px) then enhanced for ≥1024px.
No critical action may rely on hover-only interactions.

### RÈGLE-UX-003: RTL Arabic Support
All layout components use `dir` attribute detection.
RTL-specific utilities (mr↔ml swap, text-right, flex-row-reverse) are applied
via the `rtl:` Tailwind prefix or dynamic className.

### RÈGLE-UX-004: Accessibility WCAG 2.1 AA
- Text contrast ≥ 4.5:1
- Touch targets ≥ 44×44px
- Semantic HTML: `<button>` for actions, `<a>` for links, proper `<label>` on forms
- Each form field has a visible label
- Errors combine color + icon + message

### RÈGLE-UX-005: Specialized Mobile Interfaces
Four field-worker views (Cleaner, Driver, Inspector, Technician) are
mobile-optimized, task-centric, and stripped of desktop complexity.
Each view shows only the data relevant to that role's active job.

### RÈGLE-UX-006: Design System as Single Source of Truth
All color, typography, spacing, and component patterns are documented in
DesignSystemPage. No ad-hoc styling outside the token system.

### RÈGLE-UX-007: No Infinite Animations
Only `transform` and `opacity` are animated.
Transitions ≤ 300ms. No distracting infinite loops.

### RÈGLE-UX-008: One Primary Action Per Viewport
Each screen has exactly one primary CTA. Secondary actions are visually subordinate.

## Navigation Structure (17 modules)

| Section | Modules |
|---------|---------|
| Foundation | Dashboard · Settings |
| Core | Owners · Properties · Calendar · Reservations · Channels · Guests · Communications |
| Domain | Housekeeping · Maintenance · Transport · Finance · Reports |
| Governance | Integrations · Agents · Approvals |

## Design System Tokens

### Colors
- `--primary`: Brand blue (interactions, CTAs, active states)
- `--secondary`: Subtle backgrounds, hover states
- `--muted-foreground`: Labels, captions, secondary text
- `--border`: Dividers, card outlines
- `--card`: Surface backgrounds
- `--background`: Page backgrounds

### Typography Scale (16px base)
- Page title: 20-24px / 700
- Section heading: 16-18px / 600
- Body: 14-16px / 400 / line-height 1.6
- Label/caption: 12-13px / 500
- Mono code: 12-13px / font-mono

### Spacing Grid (8px)
Steps: 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64

### Physical Metaphor: Glass + Architecture
- Matte dark surfaces (`bg-card`, `bg-secondary/40`)
- Subtle borders (`border-border`)
- Depth via layered cards (not heavy shadows)
- Consistent border-radius: 8px (sm), 12px (md), 16px (lg)

## Mobile Specialized Interfaces

| Interface | Role | Primary Task |
|-----------|------|-------------|
| CleanerMobileView | cleaner | View assigned job, update checklist, mark done |
| DriverMobileView | driver | View trip, navigate, update status |
| InspectorMobileView | inspector | Run inspection checklist, flag issues |
| TechnicianMobileView | maintenance_tech | View ticket, log work, close ticket |

## Consequences
- ✅ Consistent visual language across all 17 modules
- ✅ Field workers get purpose-built mobile interfaces
- ✅ RTL Arabic supported via Tailwind `rtl:` prefix
- ✅ WCAG 2.1 AA contrast and target sizes enforced
- ⚠️ Mobile views are stubs — real push notifications require native app (APP project)
- ⚠️ Full RTL layout for Arabic requires dedicated testing session

## Date
FROZEN — 2026-08-10
