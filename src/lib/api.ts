// API client — all mutations route through Edge Functions
// Pattern: UI → Application Service → Edge Function → canUserPerform() → DB → AuditEvent

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  status: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

/**
 * Standard headers for all API calls.
 * X-Tenant-ID is set from the validated JWT — never from user input.
 */
export function getApiHeaders(tenantId?: string, correlationId?: string): HeadersInit {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (tenantId) headers["X-Tenant-ID"] = tenantId;
  if (correlationId) headers["X-Correlation-ID"] = correlationId;
  return headers;
}

/**
 * Generate a correlation ID for request tracing in audit logs.
 */
export function generateCorrelationId(): string {
  return crypto.randomUUID();
}

/**
 * STUB API client — Replace with Supabase client calls when backend is enabled.
 *
 * Usage pattern (once backend is ready):
 * import { supabase } from "@/lib/supabase";
 * const { data, error } = await supabase.from("property").select("*").eq("tenant_id", tenantId);
 */
export const api = {
  get: async <T>(path: string): Promise<ApiResponse<T>> => {
    console.warn(`[API] GET ${path} — Backend not configured`);
    return { data: null, error: "Backend not configured — enable OnSpace Cloud", status: 503 };
  },
  post: async <T>(path: string, body: unknown): Promise<ApiResponse<T>> => {
    console.warn(`[API] POST ${path}`, body, "— Backend not configured");
    return { data: null, error: "Backend not configured — enable OnSpace Cloud", status: 503 };
  },
  patch: async <T>(path: string, body: unknown): Promise<ApiResponse<T>> => {
    console.warn(`[API] PATCH ${path}`, body, "— Backend not configured");
    return { data: null, error: "Backend not configured — enable OnSpace Cloud", status: 503 };
  },
};
