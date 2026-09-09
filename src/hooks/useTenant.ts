// Tenant hook — access current tenant context
import { useState, useEffect } from "react";
import { resolveTenantContext, type TenantContext } from "@/lib/tenant";

export interface TenantState {
  context: TenantContext | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook to access the current tenant context.
 * Source: resolveTenantContext() — JWT > TenantMembership > Domain > ServiceAccount
 */
export function useTenant(): TenantState {
  const [state, setState] = useState<TenantState>({
    context: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    resolveTenantContext().then(({ context }) => {
      if (!cancelled) {
        setState({ context, isLoading: false, error: null });
      }
    }).catch((err: unknown) => {
      if (!cancelled) {
        setState({ context: null, isLoading: false, error: String(err) });
      }
    });

    return () => { cancelled = true; };
  }, []);

  return state;
}
