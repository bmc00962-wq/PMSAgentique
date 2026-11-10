import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { readCatalogSnapshot } from '@/../supabase/functions/export-migration/readCatalogSnapshot';
import { DEFAULT_GRANTS_SQL, FUNCTIONS_SQL, GRANTS_SQL } from '@/../supabase/functions/export-migration/securityCatalog';
import { exportFailure } from '@/../supabase/functions/export-migration/exportFailure';
import { migrationErrorMessage } from '@/lib/migrationError';

function catalog() {
  return { formatVersion: 1, version: [{ version: '15.14' }], unsupported: [],
    tables: [{ name: 'tenants', ddl: 'create table public.tenants (id uuid);', rls: true, force_rls: false }],
    constraints: [], indexes: [], functions: [], policies: [], grants: [], defaultGrants: [],
    comments: [], policyComments: [], triggers: [], extensions: [], storage: [] };
}

describe('Migration catalog regression', () => {
  it('casts the internal PostgreSQL char before concatenating default privilege names', () => {
    assert.ok(DEFAULT_GRANTS_SQL.includes('d.defaclobjtype::text as name'));
  });
  it('excludes source-only export tooling from function and grant comparisons', () => {
    assert.ok(FUNCTIONS_SQL.includes("p.proname <> 'export_migration_catalog'"));
    assert.ok(GRANTS_SQL.includes("p.proname <> 'export_migration_catalog'"));
  });
  it('reads a complete single-statement metadata snapshot', async () => {
    const snapshot = await readCatalogSnapshot(catalog());
    assert.equal(snapshot.tables[0].rls, true);
    assert.equal(snapshot.version, '15.14');
  });
  it('rejects missing sections rather than building a partial export', async () => {
    await assert.rejects(readCatalogSnapshot({ ...catalog(), grants: undefined }), /Incomplete/);
  });
  it('rejects malformed RLS metadata', async () => {
    await assert.rejects(readCatalogSnapshot({ ...catalog(), tables: [{ name: 'tenants', ddl: 'sql', rls: 'true' }] }));
  });
  it('fails closed when a new unsupported schema feature is found', async () => {
    await assert.rejects(readCatalogSnapshot({ ...catalog(), unsupported: [{ reason: 'identity columns' }] }), /Unsupported schema/);
  });
});

describe('Migration failure diagnostics', () => {
  it('classifies SQL errors without exposing sensitive driver messages', () => {
    const result = exportFailure({ code: '42725', message: 'postgres://secret@host:5432/db' }, 'catalog');
    assert.equal(result.code, 'CATALOG_QUERY_FAILED');
    assert.equal(result.diagnostic, '42725');
    assert.ok(!JSON.stringify(result).includes('secret'));
  });
  it('distinguishes authorization, deployment and timeout failures', () => {
    assert.equal(exportFailure({ code: '42501' }, 'catalog').status, 403);
    assert.equal(exportFailure({ code: 'PGRST202' }, 'catalog').code, 'CATALOG_NOT_READY');
    assert.equal(exportFailure({ code: '57014' }, 'catalog').code, 'EXPORT_TIMEOUT');
  });
  it('renders a French message and safe support reference', () => {
    const message = migrationErrorMessage({ code: 'CATALOG_QUERY_FAILED', requestId: '12345678-1234-1234-1234-123456789abc' }, 503, 'fr');
    assert.ok(message.includes('permissions'));
    assert.ok(message.includes('Référence'));
  });
  it('does not display raw server errors, HTML or invalid references', () => {
    const message = migrationErrorMessage({ error: '<html>secret</html>', requestId: 'secret' }, 503, 'fr');
    assert.ok(!message.includes('secret'));
    assert.ok(!message.includes('html'));
  });
});
