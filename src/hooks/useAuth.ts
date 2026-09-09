// useAuth — Real Supabase Auth integration — ADR-005, ADR-008
// Pattern: getSession() [Safety #1] + onAuthStateChange() [Safety #2]
// Returns AuthState compatible with the entire PMS application

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import type { UserProfile, TenantMembership } from "@/types";

// ── Mapping (synchronous — NO async/await, NO DB queries) ────────────────────
// ADR-008: mapToUserProfile must be synchronous

function mapToUserProfile(user: User): UserProfile {
  return {
    id: user.id,
    email: user.email!,
    full_name:
      user.user_metadata?.full_name ||
      user.user_metadata?.username ||
      user.email!.split("@")[0],
    avatar_url: user.user_metadata?.avatar_url || null,
    phone: user.user_metadata?.phone || null,
    preferred_language:
      (user.user_metadata?.preferred_language as "fr" | "en" | "ar") || "fr",
    preferred_currency: user.user_metadata?.preferred_currency || "CAD",
    timezone: user.user_metadata?.timezone || "America/Toronto",
    is_active: true,
    mfa_enabled: false,
    last_login_at: user.last_sign_in_at || null,
    created_at: user.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

// ── Load tenant membership (async, after session established) ─────────────────
async function loadMembership(userId: string): Promise<TenantMembership | null> {
  const { data, error } = await supabase
    .from("tenant_memberships")
    .select("id, tenant_id, user_id, role, status, properties_scope, created_at")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[useAuth] loadMembership:", error.message);
    return null;
  }
  if (!data) return null;

  return {
    id: data.id,
    tenant_id: data.tenant_id,
    user_id: data.user_id,
    role: data.role,
    status: data.status,
    permissions_override: {},
    properties_scope: data.properties_scope || null,
    invited_at: null,
    joined_at: data.created_at,
  };
}

// ── AuthState ─────────────────────────────────────────────────────────────────

export interface AuthState {
  user: UserProfile | null;
  membership: TenantMembership | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

// ── useAuth hook ──────────────────────────────────────────────────────────────

export function useAuth(): AuthState & { signOut: () => Promise<void> } {
  const [state, setState] = useState<AuthState>({
    user: null,
    membership: null,
    isLoading: true,
    isAuthenticated: false,
    error: null,
  });

  useEffect(() => {
    let mounted = true;

    // Safety #1: restore existing session (page refresh, tab reopen)
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      if (session?.user) {
        const profile = mapToUserProfile(session.user);
        const membership = await loadMembership(session.user.id);
        if (mounted) {
          setState({
            user: profile,
            membership,
            isLoading: false,
            isAuthenticated: true,
            error: null,
          });
        }
      } else {
        if (mounted) setState(prev => ({ ...prev, isLoading: false }));
      }
    });

    // Safety #2: real-time auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === "SIGNED_IN" && session?.user) {
        const profile = mapToUserProfile(session.user);
        const membership = await loadMembership(session.user.id);
        if (mounted) {
          setState({
            user: profile,
            membership,
            isLoading: false,
            isAuthenticated: true,
            error: null,
          });
        }
      } else if (event === "SIGNED_OUT") {
        if (mounted) {
          setState({
            user: null,
            membership: null,
            isLoading: false,
            isAuthenticated: false,
            error: null,
          });
        }
      } else if (event === "TOKEN_REFRESHED" && session?.user) {
        const profile = mapToUserProfile(session.user);
        if (mounted) setState(prev => ({ ...prev, user: profile }));
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error("[useAuth] signOut error:", error.message);
    setState({
      user: null,
      membership: null,
      isLoading: false,
      isAuthenticated: false,
      error: null,
    });
  }, []);

  return { ...state, signOut };
}
