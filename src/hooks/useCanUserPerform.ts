// useCanUserPerform — Frontend hook calling canUserPerform() Edge Function
// ADR-005: NEVER makes the authorization decision in React — always delegates to server
// ADR-002: calls Edge Function via supabase.functions.invoke()

import { supabase } from '@/lib/supabase';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { useCallback } from 'react';

export interface CanUserPerformRequest {
  action: string;
  resource: string;
  tenantId?: string;
  entityId?: string;
}

export interface CanUserPerformResult {
  allowed: boolean;
  reason: string;
  role?: string;
  userId?: string;
  tenantId?: string;
}

/**
 * useCanUserPerform — React hook wrapping the canUserPerform Edge Function (ADR-005)
 *
 * Usage:
 *   const canDo = useCanUserPerform();
 *   const result = await canDo({ action: 'approve', resource: 'approval', tenantId });
 *   if (!result.allowed) { toast.error('Accès refusé'); return; }
 */
export function useCanUserPerform() {
  const check = useCallback(async (req: CanUserPerformRequest): Promise<CanUserPerformResult> => {
    const { data, error } = await supabase.functions.invoke<CanUserPerformResult>('can-user-perform', {
      body: req,
    });

    if (error) {
      let errorMsg = error.message;
      if (error instanceof FunctionsHttpError) {
        try {
          const statusCode = error.context?.status ?? 500;
          const textContent = await error.context?.text();
          errorMsg = `[Code: ${statusCode}] ${textContent || error.message}`;
        } catch {
          errorMsg = error.message;
        }
      }
      console.error('[useCanUserPerform] Edge Function error:', errorMsg);
      // Fail-safe: deny on error
      return { allowed: false, reason: `Edge Function error: ${errorMsg}` };
    }

    return data ?? { allowed: false, reason: 'No response from Edge Function' };
  }, []);

  return check;
}

/**
 * canUserPerformServer — Direct async call (outside React components)
 * Used in Edge Functions and service-layer code (ADR-005)
 */
export async function canUserPerformServer(req: CanUserPerformRequest): Promise<CanUserPerformResult> {
  const { data, error } = await supabase.functions.invoke<CanUserPerformResult>('can-user-perform', {
    body: req,
  });

  if (error) {
    console.error('[canUserPerformServer] Error:', error.message);
    return { allowed: false, reason: `Error: ${error.message}` };
  }

  return data ?? { allowed: false, reason: 'No response' };
}
