import type { Query, Snapshot, SqlObject, TableObject, FunctionObject, TriggerObject, ExtensionObject } from './types.ts';
import { TABLES_SQL, CONSTRAINTS_SQL, INDEXES_SQL, COMMENTS_SQL, UNSUPPORTED_SQL } from './tableCatalog.ts';
import { FUNCTIONS_SQL, POLICIES_SQL, GRANTS_SQL, DEFAULT_GRANTS_SQL, TRIGGERS_SQL } from './securityCatalog.ts';
import { EXTENSIONS_SQL, STORAGE_SQL, POLICY_COMMENTS_SQL } from './storageCatalog.ts';

export async function readSnapshot(query: Query): Promise<Snapshot> {
  // All sections come from one STABLE, read-only catalog RPC and share its statement snapshot.
  const unsupported = await query<{ reason: string }>(UNSUPPORTED_SQL);
  if (unsupported.length) {
    throw new Error('Unsupported schema objects require a reviewed pg_dump export.');
  }
  const [version] = await query<{ version: string }>("select current_setting('server_version') as version");
  const tables = await query<TableObject>(TABLES_SQL);
  const constraints = await query<SqlObject & { kind: string }>(CONSTRAINTS_SQL);
  const indexes = await query<SqlObject>(INDEXES_SQL);
  const functions = await query<FunctionObject>(FUNCTIONS_SQL);
  const allPolicies = await query<SqlObject>(POLICIES_SQL);
  const grants = await query<SqlObject>(GRANTS_SQL);
  const defaultGrants = await query<SqlObject>(DEFAULT_GRANTS_SQL);
  const comments = [...await query<SqlObject>(COMMENTS_SQL), ...await query<SqlObject>(POLICY_COMMENTS_SQL)];
  const triggers = await query<TriggerObject>(TRIGGERS_SQL);
  const extensions = await query<ExtensionObject>(EXTENSIONS_SQL);
  const storage = await query<SqlObject>(STORAGE_SQL);
  const warnings = [
    'SCHEMA ONLY: no application records, Auth accounts/passwords, sessions, Storage files, or secret values.',
    'Original RLS and grants are preserved, not hardened. A separate security review is required before cutover.',
    'Source object owners and public-schema default-grant owners map to the target migration role postgres.',
    'Platform-owned auth/storage schemas, grants, extensions internals, and service configuration are not cloned.',
    'Triggers must be installed only after Auth identities and application records are imported.',
    'Only public application tables/functions and custom auth/storage triggers plus storage.objects policies are supported.',
    'Future schema features outside this supported scope require pg_dump; this export is not a full database backup.',
    'The source-only export_migration_catalog helper and its execution grants are intentionally excluded.',
  ];
  for (const f of functions.filter(f => f.security_definer)) {
    warnings.push(`Review SECURITY DEFINER function ${f.signature}: execution grants and search_path are preserved from the source.`);
  }
  if (grants.some(g => /grant (TRUNCATE|REFERENCES|TRIGGER) .* to (anon|authenticated);/i.test(g.ddl))) {
    warnings.push('Existing API-role grants include TRUNCATE/REFERENCES/TRIGGER; RLS does not govern every granted operation. Review before production.');
  }
  if (grants.some(g => /grant EXECUTE on function .* to public;/i.test(g.ddl))) {
    warnings.push('Some application functions are executable by PUBLIC, including possible SECURITY DEFINER routines. Preserve for fidelity; assess privilege-escalation risks separately.');
  }
  return {
    version: version.version, tables,
    constraints: constraints.filter(c => c.kind !== 'f'), foreignKeys: constraints.filter(c => c.kind === 'f'),
    indexes, functions, policies: allPolicies.filter(p => p.name.startsWith('public.')),
    storagePolicies: allPolicies.filter(p => p.name.startsWith('storage.')),
    grants, defaultGrants, comments, triggers, extensions, storage, warnings,
  };
}
