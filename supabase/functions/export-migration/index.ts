// Read-only schema/security exporter; both this handler and the fixed catalog RPC verify membership.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { readCatalogSnapshot } from './readCatalogSnapshot.ts';
import { buildBundle } from './buildBundle.ts';
import { exportFailure } from './exportFailure.ts';

const headers = { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
const reply = (status: number, body: object) => new Response(JSON.stringify(body), { status, headers });

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return reply(405, { code: 'INVALID_METHOD', error: 'Use POST to request a migration package.' });
  const requestId = crypto.randomUUID();
  const token = req.headers.get('Authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return reply(401, { code: 'SESSION_REQUIRED', error: 'Sign in with your platform administrator account.', requestId });
  let stage = 'authorization';
  try {
    // Caller-scoped API access: no raw database connection or service-role client is needed.
    const client = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user }, error: authError } = await client.auth.getUser(token);
    if (authError || !user) return reply(401, { code: 'SESSION_REQUIRED', error: 'Your session expired. Sign in again.', requestId });
    const { data: membership, error: permissionError } = await client.from('tenant_memberships')
      .select('id').eq('user_id', user.id).eq('role', 'platform_super_admin').eq('status', 'active').limit(1).maybeSingle();
    if (permissionError) throw permissionError;
    if (!membership) return reply(403, { code: 'EXPORT_FORBIDDEN', error: 'Only a database-assigned platform administrator can export.', requestId });
    stage = 'catalog';
    const { data: metadata, error: catalogError } = await client.rpc('export_migration_catalog');
    if (catalogError) throw catalogError;
    stage = 'bundle';
    const snapshot = await readCatalogSnapshot(metadata as unknown);
    const bundle = await buildBundle(snapshot);
    console.log('[export-migration] completed', { requestId, tables: snapshot.tables.length, policies: snapshot.policies.length });
    return reply(200, bundle);
  } catch (error: unknown) {
    const failure = exportFailure(error, stage);
    console.error(`[export-migration] ${stage} ${failure.diagnostic} ${requestId}`);
    return reply(failure.status, { code: failure.code, error: failure.error, requestId });
  }
});
