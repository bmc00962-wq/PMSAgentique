// Authentication & Authorization utilities — ADR-005, ADR-008
// RULE: canUserPerform() must be called server-side (Edge Functions) — NEVER in React components
// The frontend may read the result but NEVER makes the authorization decision

import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

// ── AuthUser — lightweight UI auth state ─────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  avatar?: string;
}

/** Map Supabase User → AuthUser (synchronous — NO async/await, NO DB queries) */
export function mapSupabaseUser(user: User): AuthUser {
  return {
    id: user.id,
    email: user.email!,
    username:
      user.user_metadata?.username ||
      user.user_metadata?.full_name ||
      user.email!.split('@')[0],
    avatar: user.user_metadata?.avatar_url || user.user_metadata?.picture,
  };
}

// ── Auth Service — real Supabase Auth operations ──────────────────────────────

export const authService = {
  /** Send OTP to email (registration) — OTP length: 4 digits (auth settings) */
  async sendOtp(email: string): Promise<void> {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    if (error) throw error;
  },

  /** Verify OTP + set password (registration step 2) */
  async verifyOtpAndSetPassword(
    email: string,
    token: string,
    password: string,
    username?: string,
  ): Promise<User> {
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    });
    if (verifyError) throw verifyError;

    const { data: updateData, error: updateError } = await supabase.auth.updateUser({
      password,
      data: { username: username || email.split('@')[0] },
    });
    if (updateError) throw updateError;
    return updateData.user!;
  },

  /** Sign in with email + password */
  async signInWithPassword(email: string, password: string): Promise<User> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data.user;
  },

  /** Sign out */
  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },
};

// ── RBAC types ────────────────────────────────────────────────────────────────

export type SystemRole =
  | "platform_super_admin"
  | "tenant_admin"
  | "operations_manager"
  | "property_manager"
  | "owner"
  | "accountant"
  | "cleaner"
  | "driver"
  | "maintenance_tech"
  | "guest"
  | "ai_agent"
  | "service_account";

export type Permission =
  // Property
  | "property.read" | "property.create" | "property.update" | "property.delete" | "property.list"
  // Owner
  | "owner.read" | "owner.create" | "owner.update" | "owner.delete" | "owner.finance.read"
  // Reservation
  | "reservation.read" | "reservation.create" | "reservation.modify" | "reservation.cancel"
  | "reservation.check_in" | "reservation.check_out" | "reservation.refund"
  // Calendar
  | "calendar.read" | "calendar.update" | "calendar.block"
  // Guest
  | "guest.read" | "guest.create" | "guest.update" | "guest.message"
  // Housekeeping
  | "housekeeping.read" | "housekeeping.assign" | "housekeeping.complete" | "housekeeping.approve"
  // Finance
  | "finance.read" | "finance.export" | "finance.payout.read" | "finance.payout.approve"
  | "finance.expense.create" | "finance.expense.approve" | "finance.statement.read"
  // Agent
  | "agent.execute" | "agent.approve" | "agent.configure"
  // Tenant
  | "tenant.admin" | "tenant.settings.update" | "tenant.members.manage" | "tenant.billing.read"
  // Audit
  | "audit.read" | "audit.export";

export interface AuthorizationRequest {
  user_id: string;
  tenant_id: string;
  permission: Permission;
  resource?: {
    type: string;
    id: string;
    property_id?: string;
    owner_id?: string;
  };
}

export type AuthorizationReason =
  | "ALLOWED"
  | "SUPER_ADMIN_BYPASS"
  | "NO_ACTIVE_MEMBERSHIP"
  | "TENANT_SUSPENDED"
  | "PERMISSION_DENIED"
  | "PROPERTY_SCOPE_DENIED"
  | "OWNER_SCOPE_DENIED"
  | "ASSIGNED_ONLY_DENIED"
  | "STUB_DEVELOPMENT";

export interface AuthorizationResult {
  allowed: boolean;
  reason: AuthorizationReason;
}

/**
 * STUB — Full implementation in Supabase Edge Functions
 * In production: every Edge Function calls canUserPerform() before any mutation.
 */
export async function canUserPerform(req: AuthorizationRequest): Promise<AuthorizationResult> {
  console.warn("[canUserPerform] STUB — Real authorization requires Edge Function. Request:", req);
  return { allowed: true, reason: "STUB_DEVELOPMENT" };
}

export const ROLE_LABELS: Record<SystemRole, string> = {
  platform_super_admin: "Super Admin Plateforme",
  tenant_admin: "Admin Tenant",
  operations_manager: "Responsable Opérations",
  property_manager: "Gestionnaire Propriété",
  owner: "Propriétaire",
  accountant: "Comptable",
  cleaner: "Agent Ménage",
  driver: "Chauffeur",
  maintenance_tech: "Technicien",
  guest: "Voyageur",
  ai_agent: "Agent IA",
  service_account: "Compte Service",
};

export const ROLE_LEVELS: Record<SystemRole, "platform" | "tenant" | "external" | "ops" | "system"> = {
  platform_super_admin: "platform",
  tenant_admin: "tenant",
  operations_manager: "tenant",
  property_manager: "tenant",
  accountant: "tenant",
  owner: "external",
  guest: "external",
  cleaner: "ops",
  driver: "ops",
  maintenance_tech: "ops",
  ai_agent: "system",
  service_account: "system",
};
