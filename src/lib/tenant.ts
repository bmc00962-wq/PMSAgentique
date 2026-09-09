// Tenant context resolution
// RULE: tenant_id ALWAYS from auth context — NEVER from form input / query param / body

export interface TenantContext {
  tenant_id: string;
  tenant_slug: string;
  tenant_name: string;
  user_id: string;
  role: string;
  membership_id: string;
  properties_scope: string[] | null; // null = access to all properties
  plan: "trial" | "starter" | "growth" | "enterprise";
  language: "fr" | "en" | "ar";
  currency: string;
  timezone: string;
}

export type TenantContextSource = "jwt" | "membership" | "domain" | "service_account";

/**
 * Resolve tenant context from authenticated sources only.
 * Priority: JWT (app_metadata) > TenantMembership > Domain > X-Tenant-ID (Edge Functions only)
 *
 * STUB — Requires Supabase Auth session (PROMPT backend setup)
 */
export async function resolveTenantContext(): Promise<{ context: TenantContext | null; source: TenantContextSource | null }> {
  // TODO: Implement with Supabase session
  // Source 1: JWT app_metadata.tenant_id (primary — most trusted)
  // Source 2: TenantMembership lookup by user_id
  // Source 3: Domain-based routing (tenant subdomain)
  // Source 4: X-Tenant-ID service account header (Edge Functions ONLY)
  console.log("[resolveTenantContext] Backend required — returning null");
  return { context: null, source: null };
}

/**
 * Extract tenant_id from JWT app_metadata.
 * The JWT is signed by Supabase Auth — the tenant_id is immutable from the client.
 */
export function getTenantIdFromJWT(jwt: Record<string, unknown>): string | null {
  try {
    const appMetadata = jwt?.app_metadata as Record<string, unknown> | undefined;
    return (appMetadata?.tenant_id as string) ?? null;
  } catch {
    return null;
  }
}

export const PLAN_FEATURES = {
  trial:      { max_properties: 3, max_units: 5, max_members: 2, max_channels: 1, max_ai_agents: 0, storage_gb: 5 },
  starter:    { max_properties: 10, max_units: 30, max_members: 5, max_channels: 2, max_ai_agents: 1, storage_gb: 20 },
  growth:     { max_properties: 50, max_units: 200, max_members: 20, max_channels: 5, max_ai_agents: 3, storage_gb: 100 },
  enterprise: { max_properties: -1, max_units: -1, max_members: -1, max_channels: -1, max_ai_agents: -1, storage_gb: -1 },
} as const; // -1 = unlimited
