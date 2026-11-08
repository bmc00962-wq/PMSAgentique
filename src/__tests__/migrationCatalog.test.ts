import { describe, expect, it } from 'vitest';
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
    expect(DEFAULT_GRANTS_SQL).toContain('d.defaclobjtype::text as name');
  });
  it('excludes source-only export tooling from function and grant comparisons', () => {
    expect(FUNCTIONS_SQL).toContain("p.proname <> 'export_migration_catalog'");
    expect(GRANTS_SQL).toContain("p.proname <> 'export_migration_catalog'");
  });
  it('reads a complete single-statement metadata snapshot', async () => {
    const snapshot = await readCatalogSnapshot(catalog());
    expect(snapshot.tables[0].rls).toBe(true);
    expect(snapshot.version).toBe('15.14');
  });
  it('rejects missing sections rather than building a partial export', async () => {
    await expect(readCatalogSnapshot({ ...catalog(), grants: undefined })).rejects.toThrow('Incomplete');
  });
  it('rejects malformed RLS metadata', async () => {
    await expect(readCatalogSnapshot({ ...catalog(), tables: [{ name: 'tenants', ddl: 'sql', rls: 'true' }] })).rejects.toThrow();
  });
  it('fails closed when a new unsupported schema feature is found', async () => {
    await expect(readCatalogSnapshot({ ...catalog(), unsupported: [{ reason: 'identity columns' }] })).rejects.toThrow('Unsupported schema');
  });
});

describe('Migration failure diagnostics', () => {
  it('classifies SQL errors without exposing sensitive driver messages', () => {
    const result = exportFailure({ code: '42725', message: 'postgres://secret@host:5432/db' }, 'catalog');
    expect(result.code).toBe('CATALOG_QUERY_FAILED');
    expect(result.diagnostic).toBe('42725');
    expect(JSON.stringify(result)).not.toContain('secret');
  });
  it('distinguishes authorization, deployment and timeout failures', () => {
    expect(exportFailure({ code: '42501' }, 'catalog').status).toBe(403);
    expect(exportFailure({ code: 'PGRST202' }, 'catalog').code).toBe('CATALOG_NOT_READY');
    expect(exportFailure({ code: '57014' }, 'catalog').code).toBe('EXPORT_TIMEOUT');
  });
  it('renders a French message and safe support reference', () => {
    const message = migrationErrorMessage({ code: 'CATALOG_QUERY_FAILED', requestId: '12345678-1234-1234-1234-123456789abc' }, 503, 'fr');
    expect(message).toContain('permissions');
    expect(message).toContain('Référence');
  });
  it('does not display raw server errors, HTML or invalid references', () => {
    const message = migrationErrorMessage({ error: '<html>secret</html>', requestId: 'secret' }, 503, 'fr');
    expect(message).not.toContain('secret');
    expect(message).not.toContain('html');
  });
});
