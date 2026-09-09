# ADR-021 — Reporting & SaaS Admin
**Status**: FROZEN — 2026-08-10
**Extends**: ADR-018 (Production & Deployment) · ADR-015 (Finance Engine)

## Context
PROMPT 21 formalizes the three-tier reporting system (Platform / Tenant / Owner)
and expands the SaaS Admin panel with full tenant lifecycle, feature flags,
billing oversight, support queue, and platform health monitoring.

## Core Rules (RÈGLES GELÉES)

### RÈGLE-RPT-001: Read-Only Reports
All reporting dashboards are read-only views. No mutation is permitted from
report pages. Mutations go through their respective domain pages.

### RÈGLE-RPT-002: Deterministic Calculations
All KPIs (ADR, RevPAR, occupancy, MRR, net income) are calculated from
append-only ledger entries (ADR-015). No LLM may generate or modify figures.

### RÈGLE-RPT-003: Tenant Data Isolation
Tenant-level reports enforce the same RLS policies as domain tables.
A tenant_admin sees only their own tenant's data.
platform_super_admin may see cross-tenant aggregates.

### RÈGLE-RPT-004: Owner Report Access
Owner reports are accessible to: owner (own data) · accountant (any owner) ·
tenant_admin (any owner in their tenant). Never cross-tenant.

### RÈGLE-RPT-005: SaaS Admin Access
SaaS Admin panels are exclusively accessible to platform_super_admin.
canUserPerform('tenant:manage_all') is checked server-side before any
admin action (suspend, plan change, feature flag override).

### RÈGLE-RPT-006: Feature Flags — Plan Inheritance
Feature flags define which plans include a feature.
Individual tenant overrides are possible but logged via AuditEvent.
No flag may disable a security or compliance feature.

### RÈGLE-RPT-007: Billing Read-Only Frontend
Billing records are displayed but never modified from the frontend.
Payment processing goes through Stripe Edge Functions only.

### RÈGLE-RPT-008: Platform Health — Polling
Health status uses polling (30s interval) since Realtime is not supported (ADR-002).
Latency thresholds: operational <200ms · degraded 200-1000ms · outage >1000ms.

## KPI Definitions

| KPI | Formula | Scope |
|-----|---------|-------|
| MRR | SUM(active_tenant.plan_price) | Platform |
| ARR | MRR × 12 | Platform |
| Occupancy | booked_nights / available_nights × 100 | Tenant / Owner |
| ADR | total_revenue / booked_nights | Tenant / Owner |
| RevPAR | total_revenue / available_nights | Tenant / Owner |
| Net Income | revenue − expenses − commission − tax | Owner |
| Churn Rate | churned_tenants / start_tenants × 100 | Platform |

## Dashboard Hierarchy

```
Platform Dashboard (platform_super_admin)
  ├── MRR · ARR · Churn
  ├── Tenant Growth Chart
  ├── MRR by Plan
  ├── AI Usage & Storage
  ├── Open Incidents
  └── Platform Health Services

Tenant Dashboard (tenant_admin · ops_manager)
  ├── Occupancy % · ADR · RevPAR
  ├── Revenue by Channel (recharts BarChart)
  ├── Occupancy Trend (recharts LineChart)
  ├── Reservations Status Distribution
  ├── Housekeeping & Maintenance KPIs
  └── Guest Satisfaction

Owner Dashboard (owner · accountant · tenant_admin)
  ├── Revenue · Expenses · Commission · Net Income
  ├── Monthly Breakdown (recharts AreaChart)
  └── Occupancy by Property
```

## SaaS Admin Panels

| Panel | Access | Actions |
|-------|--------|---------|
| Tenant Management | super_admin | View · Suspend · Activate · Delete |
| Plan Management | super_admin | View plan config · Quotas |
| Feature Flags | super_admin | Enable · Disable · Set rollout % |
| Usage | super_admin | Storage · AI · Requests per tenant |
| Subscription | super_admin | View Stripe subscriptions |
| Billing | super_admin | Invoices · Payment status |
| Support | super_admin | Tickets · Assignment |
| Platform Health | super_admin | Service status · Latency |

## Consequences
- ✅ Full visibility across all three scopes (platform / tenant / owner)
- ✅ ADR/RevPAR/occupancy calculated deterministically (ADR-015)
- ✅ Feature flags enable safe progressive rollout
- ✅ Platform health monitoring with 30s polling
- ⚠️ Cross-tenant aggregates require service_role + AuditEvent (ADR-007)
- ⚠️ Real-time charts require polling (no Supabase Realtime per ADR-002)

## Date
FROZEN — 2026-08-10
