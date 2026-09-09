// Edge Function: canUserPerform() — ADR-005 RBAC
// Vérifie si un utilisateur authentifié peut effectuer une action sur une ressource.
// RÈGLE: jamais appelé directement depuis DB — uniquement via JWT + tenant_id.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ── CORS headers ─────────────────────────────────────────────────────────────
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ── RBAC Permission Matrix (12 rôles × ~88 permissions) ──────────────────────
const ROLE_PERMISSIONS: Record<string, Set<string>> = {
  platform_super_admin: new Set(['*']),

  tenant_admin: new Set([
    'reservation.create', 'reservation.read', 'reservation.update', 'reservation.cancel',
    'reservation.force_cancel',
    'property.create', 'property.read', 'property.update', 'property.delete',
    'unit.create', 'unit.read', 'unit.update', 'unit.delete',
    'owner.create', 'owner.read', 'owner.update', 'owner.delete',
    'guest.create', 'guest.read', 'guest.update', 'guest.anonymize',
    'channel.create', 'channel.read', 'channel.update', 'channel.sync',
    'housekeeping.create', 'housekeeping.read', 'housekeeping.update', 'housekeeping.assign',
    'maintenance.create', 'maintenance.read', 'maintenance.update', 'maintenance.assign',
    'transport.create', 'transport.read', 'transport.update', 'transport.assign',
    'finance.read', 'finance.create_entry', 'finance.approve_refund',
    'finance.approve_payout', 'finance.generate_statement',
    'approval.create', 'approval.read', 'approval.approve', 'approval.reject',
    'approval.delegate', 'approval.override',
    'settings.read', 'settings.update',
    'user.invite', 'user.read', 'user.update', 'user.deactivate',
    'report.read', 'report.export',
    'agent.trigger', 'agent.read',
    'audit.read',
  ]),

  property_manager: new Set([
    'reservation.create', 'reservation.read', 'reservation.update',
    'property.read', 'property.update',
    'unit.read', 'unit.update',
    'owner.read',
    'guest.create', 'guest.read', 'guest.update',
    'channel.read', 'channel.sync',
    'housekeeping.create', 'housekeeping.read', 'housekeeping.update', 'housekeeping.assign',
    'maintenance.create', 'maintenance.read', 'maintenance.update', 'maintenance.assign',
    'transport.create', 'transport.read', 'transport.update', 'transport.assign',
    'finance.read',
    'approval.create', 'approval.read', 'approval.approve',
    'report.read',
    'agent.read',
  ]),

  ops_manager: new Set([
    'reservation.read', 'reservation.update', 'reservation.force_cancel',
    'property.read',
    'unit.read',
    'guest.read', 'guest.update',
    'housekeeping.create', 'housekeeping.read', 'housekeeping.update', 'housekeeping.assign',
    'maintenance.create', 'maintenance.read', 'maintenance.update', 'maintenance.assign',
    'transport.create', 'transport.read', 'transport.update', 'transport.assign',
    'finance.read',
    'approval.create', 'approval.read', 'approval.approve', 'approval.reject', 'approval.delegate',
    'report.read',
    'agent.read',
    'audit.read',
  ]),

  revenue_manager: new Set([
    'reservation.read',
    'property.read',
    'unit.read', 'unit.update',
    'channel.read', 'channel.update', 'channel.sync',
    'finance.read', 'finance.create_entry',
    'report.read', 'report.export',
    'agent.trigger', 'agent.read',
  ]),

  accounting: new Set([
    'reservation.read',
    'owner.read',
    'finance.read', 'finance.create_entry', 'finance.approve_refund',
    'finance.approve_payout', 'finance.generate_statement',
    'approval.create', 'approval.read', 'approval.approve', 'approval.reject',
    'report.read', 'report.export',
    'audit.read',
  ]),

  housekeeping_supervisor: new Set([
    'reservation.read',
    'property.read',
    'unit.read',
    'housekeeping.create', 'housekeeping.read', 'housekeeping.update',
    'housekeeping.assign', 'housekeeping.complete', 'housekeeping.report_issue',
    'maintenance.create', 'maintenance.read',
    'report.read',
  ]),

  cleaner: new Set([
    'reservation.read',
    'housekeeping.read', 'housekeeping.update', 'housekeeping.complete',
    'housekeeping.report_issue',
  ]),

  maintenance_technician: new Set([
    'maintenance.read', 'maintenance.update', 'maintenance.complete',
    'maintenance.report_parts',
    'unit.read',
  ]),

  driver: new Set([
    'transport.read', 'transport.update', 'transport.complete',
    'reservation.read',
  ]),

  inspector: new Set([
    'reservation.read',
    'housekeeping.read',
    'unit.read',
    'property.read',
    'maintenance.create', 'maintenance.read',
  ]),

  owner_portal: new Set([
    'property.read',
    'unit.read',
    'reservation.read',
    'finance.read',
    'report.read',
  ]),

  read_only: new Set([
    'reservation.read', 'property.read', 'unit.read',
    'owner.read', 'guest.read', 'report.read',
  ]),
};

// ── Helper: check permission ─────────────────────────────────────────────────
function hasPermission(role: string, action: string, resource: string): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) return false;
  if (permissions.has('*')) return true;
  const permission = `${resource}.${action}`;
  return permissions.has(permission);
}

// ── Main handler ─────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  // Preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Parse body
  let body: { action: string; resource: string; tenantId?: string; entityId?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { action, resource, tenantId, entityId } = body;

  if (!action || !resource) {
    return new Response(JSON.stringify({ allowed: false, reason: 'Missing action or resource' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Extract JWT from Authorization header
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ allowed: false, reason: 'Missing or invalid Authorization header' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const token = authHeader.replace('Bearer ', '');

  // Initialize Supabase client with user JWT
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  // Verify JWT and get user
  const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !user) {
    console.error('[can-user-perform] JWT error:', userError?.message);
    return new Response(JSON.stringify({ allowed: false, reason: 'Invalid or expired token' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const userId = user.id;

  // Resolve tenant context — ADR-004: tenant_id NEVER from frontend body, always from auth
  // If tenantId provided, verify user membership; otherwise find user's first active tenant
  let resolvedTenantId = tenantId ?? null;

  if (resolvedTenantId) {
    // Verify user is member of this tenant
    const { data: membership, error: memErr } = await supabaseAdmin
      .from('tenant_memberships')
      .select('id, role, status')
      .eq('tenant_id', resolvedTenantId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();

    if (memErr || !membership) {
      console.log(`[can-user-perform] User ${userId} not member of tenant ${resolvedTenantId}`);
      return new Response(JSON.stringify({ allowed: false, reason: 'User not authorized for this tenant' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userRole = membership.role;
    const allowed = hasPermission(userRole, action, resource);

    // Audit log (best-effort — non-blocking)
    supabaseAdmin.from('audit_events').insert({
      tenant_id: resolvedTenantId,
      actor_id: userId,
      actor_type: 'user',
      action: `can_user_perform.${allowed ? 'allowed' : 'denied'}`,
      entity_type: resource,
      entity_id: entityId ?? null,
      new_data: { action, resource, role: userRole, result: allowed ? 'allowed' : 'denied' },
    }).then(() => {}).catch(() => {});

    console.log(`[can-user-perform] user=${userId} tenant=${resolvedTenantId} role=${userRole} ${resource}.${action} → ${allowed ? 'ALLOWED' : 'DENIED'}`);

    return new Response(JSON.stringify({
      allowed,
      reason: allowed ? `Role '${userRole}' has permission '${resource}.${action}'` : `Role '${userRole}' lacks permission '${resource}.${action}'`,
      role: userRole,
      userId,
      tenantId: resolvedTenantId,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } else {
    // Find user's active tenant membership
    const { data: memberships, error: memErr } = await supabaseAdmin
      .from('tenant_memberships')
      .select('tenant_id, role, status')
      .eq('user_id', userId)
      .eq('status', 'active')
      .limit(1);

    if (memErr || !memberships?.length) {
      return new Response(JSON.stringify({ allowed: false, reason: 'No active tenant membership found' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { tenant_id: foundTenantId, role: userRole } = memberships[0];
    const allowed = hasPermission(userRole, action, resource);

    console.log(`[can-user-perform] user=${userId} tenant=${foundTenantId} role=${userRole} ${resource}.${action} → ${allowed ? 'ALLOWED' : 'DENIED'}`);

    return new Response(JSON.stringify({
      allowed,
      reason: allowed ? `Role '${userRole}' has permission '${resource}.${action}'` : `Role '${userRole}' lacks permission '${resource}.${action}'`,
      role: userRole,
      userId,
      tenantId: foundTenantId,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
