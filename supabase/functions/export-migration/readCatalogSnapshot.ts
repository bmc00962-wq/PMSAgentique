import type { Query, Snapshot } from './types.ts';
import { readSnapshot } from './readSnapshot.ts';
import { TABLES_SQL, CONSTRAINTS_SQL, INDEXES_SQL, COMMENTS_SQL, UNSUPPORTED_SQL } from './tableCatalog.ts';
import { FUNCTIONS_SQL, POLICIES_SQL, GRANTS_SQL, DEFAULT_GRANTS_SQL, TRIGGERS_SQL } from './securityCatalog.ts';
import { EXTENSIONS_SQL, STORAGE_SQL, POLICY_COMMENTS_SQL } from './storageCatalog.ts';

// This map only adapts an already-read document. It never executes caller-supplied SQL.
const SECTIONS = new Map<string, string>([
  [UNSUPPORTED_SQL, 'unsupported'], ["select current_setting('server_version') as version", 'version'],
  [TABLES_SQL, 'tables'], [CONSTRAINTS_SQL, 'constraints'], [INDEXES_SQL, 'indexes'],
  [FUNCTIONS_SQL, 'functions'], [POLICIES_SQL, 'policies'], [GRANTS_SQL, 'grants'],
  [DEFAULT_GRANTS_SQL, 'defaultGrants'], [COMMENTS_SQL, 'comments'],
  [POLICY_COMMENTS_SQL, 'policyComments'], [TRIGGERS_SQL, 'triggers'],
  [EXTENSIONS_SQL, 'extensions'], [STORAGE_SQL, 'storage'],
]);
const STRING_FIELDS: Record<string, string[]> = {
  version: ['version'], unsupported: ['reason'], tables: ['name', 'ddl'],
  constraints: ['name', 'ddl', 'kind'], indexes: ['name', 'ddl'],
  functions: ['name', 'ddl', 'signature'], policies: ['name', 'ddl'],
  grants: ['name', 'ddl'], defaultGrants: ['name', 'ddl'], comments: ['name', 'ddl'],
  policyComments: ['name', 'ddl'], triggers: ['name', 'ddl', 'schema', 'table_name', 'enabled'],
  extensions: ['name', 'schema', 'version'], storage: ['name', 'ddl'],
};
function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function validRow(section: string, row: unknown): boolean {
  if (!isRecord(row) || !STRING_FIELDS[section].every(field => typeof row[field] === 'string')) return false;
  if (section === 'tables') return typeof row.rls === 'boolean' && typeof row.force_rls === 'boolean';
  if (section === 'functions') return typeof row.security_definer === 'boolean' &&
    (row.config === null || (Array.isArray(row.config) && row.config.every(item => typeof item === 'string')));
  if (section === 'triggers') return ['O', 'D', 'R', 'A'].includes(String(row.enabled));
  return true;
}

export async function readCatalogSnapshot(input: unknown): Promise<Snapshot> {
  if (!isRecord(input) || input.formatVersion !== 1) throw new Error('Invalid migration catalog format.');
  for (const section of SECTIONS.values()) {
    const rows = input[section];
    if (!Array.isArray(rows) || !rows.every(row => validRow(section, row))) {
      throw new Error('Incomplete or invalid migration catalog.');
    }
  }
  if ((input.version as unknown[]).length !== 1 || (input.tables as unknown[]).length === 0) {
    throw new Error('Incomplete migration catalog inventory.');
  }
  const query: Query = async <T extends object>(text: string) => {
    const section = SECTIONS.get(text);
    if (!section) throw new Error('Unknown migration catalog section.');
    return Array.from(input[section] as object[]) as T[];
  };
  return readSnapshot(query);
}
