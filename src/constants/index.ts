// Application-wide constants — PMS SaaS Agentique

export const APP_NAME = "PMS SaaS Agentique";
export const APP_VERSION = "0.7.0"; // PROMPT 07 — Application Foundation

// ─── Localization ─────────────────────────────────────────────────────────────
export const LANGUAGES = ["fr", "en", "ar"] as const;
export const DEFAULT_LANGUAGE = "fr" as const;
export const RTL_LANGUAGES = ["ar"] as const;

export const CURRENCIES = ["CAD", "MAD", "EUR", "USD"] as const;
export const DEFAULT_CURRENCY = "CAD" as const;

export const TIMEZONES = [
  "America/Montreal",
  "America/Toronto",
  "Africa/Casablanca",
  "Europe/Paris",
] as const;

// ─── Domain Enums ─────────────────────────────────────────────────────────────
export const TENANT_STATUSES = [
  "trial", "active", "suspended", "pending_deletion", "deleted", "migrating",
] as const;

export const RESERVATION_STATUSES = [
  "pending", "confirmed", "modified", "checked_in", "checked_out", "cancelled", "no_show",
] as const;

export const PROPERTY_TYPES = [
  "house", "condo", "apartment", "chalet", "riad", "villa",
] as const;

export const PROPERTY_STATUSES = ["inactive", "active", "maintenance", "unlisted"] as const;
export const TASK_STATUSES = ["pending", "assigned", "in_progress", "completed", "failed", "cancelled"] as const;
export const TASK_PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export const PAYMENT_STATUSES = ["pending", "partial", "paid", "refunded", "failed"] as const;

// ─── Navigation structure (grouped by architecture layer) ─────────────────────
export const NAV_GROUPS = [
  {
    id: "foundation",
    label: "Fondation",
    color: "text-purple-400",
    dot: "bg-purple-500",
    items: [
      { id: "dashboard", path: "/dashboard", labelKey: "dashboard" },
      { id: "settings", path: "/settings", labelKey: "settings" },
    ],
  },
  {
    id: "core",
    label: "Core",
    color: "text-blue-400",
    dot: "bg-blue-500",
    items: [
      { id: "owner", path: "/owners", labelKey: "owners" },
      { id: "property", path: "/properties", labelKey: "properties" },
      { id: "calendar", path: "/calendar", labelKey: "calendar" },
      { id: "reservation", path: "/reservations", labelKey: "reservations" },
      { id: "channel", path: "/channels", labelKey: "channels" },
      { id: "guest", path: "/guests", labelKey: "guests" },
    ],
  },
  {
    id: "domain",
    label: "Domaine",
    color: "text-emerald-400",
    dot: "bg-emerald-500",
    items: [
      { id: "housekeeping", path: "/housekeeping", labelKey: "housekeeping" },
      { id: "maintenance", path: "/maintenance", labelKey: "maintenance" },
      { id: "transport", path: "/transport", labelKey: "transport" },
      { id: "finance", path: "/finance", labelKey: "finance" },
      { id: "reports", path: "/reports", labelKey: "reports" },
    ],
  },
  {
    id: "governance",
    label: "Gouvernance",
    color: "text-orange-400",
    dot: "bg-orange-500",
    items: [
      { id: "agents", path: "/agents", labelKey: "agents" },
    ],
  },
] as const;

// Phases with backend readiness (updated per PROMPT)
export const MODULE_READINESS: Record<string, { ready: boolean; phase: string }> = {
  auth:         { ready: true, phase: "04" },
  tenant:       { ready: true, phase: "04" },
  "data-model": { ready: true, phase: "05" },
  rls:          { ready: true, phase: "06" },
  foundation:   { ready: true, phase: "07" },
  owner:        { ready: false, phase: "08" },
  property:     { ready: false, phase: "08" },
  calendar:     { ready: false, phase: "09" },
  reservation:  { ready: false, phase: "10" },
  channel:      { ready: false, phase: "11" },
  guest:        { ready: false, phase: "12" },
  housekeeping: { ready: false, phase: "14" },
  finance:      { ready: false, phase: "17" },
  agents:       { ready: false, phase: "19" },
};
