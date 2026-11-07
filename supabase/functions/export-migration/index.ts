// Read-only schema/security exporter. Authorization is checked against the database,
// never user-editable metadata or a role/tenant supplied in the request body.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import postgres from 'npm:postgres@3.4.5';
import { corsHeaders } from '../_shared/cors.ts';
import { readSnapshot } from './readSnapshot.ts';
import { buildBundle } from './buildBundle.ts';
import type { Query } from './types.ts';

const headers = { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
const reply = (status: number, body: object) => new Response(JSON.stringify(body), { status, headers });

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return reply(405, { error: 'Use POST to request a migration package.' });
  const token = req.headers.get('Authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return reply(401, { error: 'Sign in with your platform administrator account.' });

  const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: authError } = await admin.auth.getUser(token);
  if (authError || !user) return reply(401, { error: 'Your session expired. Sign in again.' });
  const { data: membership, error: permissionError } = await admin.from('tenant_memberships')
    .select('id').eq('user_id', user.id).eq('role', 'platform_super_admin').eq('status', 'active').limit(1).maybeSingle();
  if (permissionError) return reply(503, { error: 'Administrator authorization could not be verified. Try again.' });
  if (!membership) return reply(403, { error: 'Only a database-assigned platform super administrator can export the schema.' });

  const databaseUrl = Deno.env.get('SUPABASE_DB_URL');
  if (!databaseUrl) return reply(503, { error: 'Server-side database access is not configured. Contact OnSpace support.' });
  // Inherit connection transport from the platform-supplied URL. Never expose or log it.
  let db: ReturnType<typeof postgres> | null = null;
  try {
    db = postgres(databaseUrl, { max: 1, prepare: false, connect_timeout: 10, idle_timeout: 5 });
    const snapshot = await db.begin('isolation level repeatable read read only', async tx => {
      await tx.unsafe("set local statement_timeout = '15s'");
      await tx.unsafe('set local search_path = pg_catalog, public');
      const query: Query = async <T extends object>(text: string) => Array.from(await tx.unsafe(text)) as T[];
      return readSnapshot(query);
    });
    const bundle = await buildBundle(snapshot);
    console.log('[export-migration] Metadata package generated', { tables: snapshot.tables.length, policies: snapshot.policies.length });
    return reply(200, bundle);
  } catch (error: unknown) {
    // Raw driver errors may include infrastructure details; do not return or log them.
    const unsupported = error instanceof Error && error.message.startsWith('Unsupported schema');
    console.error('[export-migration]', unsupported ? 'unsupported_schema' : 'metadata_export_failed');
    return reply(unsupported ? 422 : 503, { error: unsupported
      ? 'New schema features require a reviewed PostgreSQL dump. Contact support; no partial package was generated.'
      : 'The metadata export could not complete. Check the export-migration function logs or contact OnSpace support.' });
  } finally {
    await db?.end({ timeout: 5 }).catch(() => console.error('[export-migration] connection_cleanup_failed'));
  }
});
