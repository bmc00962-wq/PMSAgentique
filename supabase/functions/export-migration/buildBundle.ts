import { identifier, literal, transaction, type Snapshot, type MigrationBundle } from './types.ts';
import { migrationGuide } from './migrationGuide.ts';
import { buildValidation } from './buildValidation.ts';

export async function buildBundle(snapshot: Snapshot): Promise<MigrationBundle> {
  const generatedAt = new Date().toISOString();
  const names = snapshot.tables.map(t => t.name);
  const preflight = `do $migration$\nbegin
    if current_user <> 'postgres' then raise exception 'Run as the target postgres migration administrator.'; end if;
    if to_regclass('auth.users') is null then raise exception 'Target must be an initialized Supabase project.'; end if;
    if exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = any(array[${names.map(literal).join(', ')}]::text[]))
    then raise exception 'Application objects already exist. Stop: use a fresh target, never the source.'; end if;
    if not exists (select 1 from pg_roles where rolname = 'anon')
      or not exists (select 1 from pg_roles where rolname = 'authenticated')
      or not exists (select 1 from pg_roles where rolname = 'service_role')
    then raise exception 'Supabase API roles are missing.'; end if;
  end\n$migration$;`;
  const extensionSetup = snapshot.extensions.map(e => `do $extension_check$\nbegin
    if exists (select 1 from pg_extension e join pg_namespace n on n.oid = e.extnamespace
      where e.extname = ${literal(e.name)} and n.nspname <> ${literal(e.schema)})
    then raise exception 'Extension schema mismatch: %. Source schema %. Review dependencies before proceeding.', ${literal(e.name)}, ${literal(e.schema)}; end if;
    end\n$extension_check$;\ncreate extension if not exists ${identifier(e.name)} with schema ${identifier(e.schema)};`);
  const tableDdl = snapshot.tables.flatMap(t => [t.ddl,
    `alter table public.${identifier(t.name)} ${t.rls ? 'enable' : 'disable'} row level security;`,
    ...(t.force_rls ? [`alter table public.${identifier(t.name)} force row level security;`] : []),
  ]);
  const roles = 'public, anon, authenticated, service_role';
  const resets = [`revoke all on schema public from ${roles};`,
    ...names.map(n => `revoke all on table public.${identifier(n)} from ${roles};`),
    ...snapshot.functions.map(f => `revoke all on function ${f.signature} from ${roles};`),
    'alter default privileges for role postgres in schema public revoke all on tables from public, anon, authenticated, service_role;',
  ];
  const triggers = snapshot.triggers.flatMap(t => [t.ddl,
    `alter table ${identifier(t.schema)}.${identifier(t.table_name)} ${t.enabled === 'D' ? 'disable' : t.enabled === 'R' ? 'enable replica' : t.enabled === 'A' ? 'enable always' : 'enable'} trigger ${identifier(t.name)};`,
  ]);
  const files: Record<string, string> = {
    '00_preflight.sql': transaction('Preflight and required extensions; aborts on an occupied target', [preflight, ...extensionSetup]),
    '01_tables.sql': transaction('Application tables, columns, defaults, primary/unique/check constraints, indexes and RLS flags', [...tableDdl, ...snapshot.constraints.map(x => x.ddl), ...snapshot.indexes.map(x => x.ddl)]),
    '02_functions.sql': transaction('Application function bodies and SECURITY DEFINER/search_path settings', snapshot.functions.map(x => x.ddl)),
    '03_relationships.sql': transaction('Foreign keys, including user_profiles -> existing Supabase auth.users', snapshot.foreignKeys.map(x => x.ddl)),
    '04_security.sql': transaction('Original public schema/object/default grants, RLS policies and comments', [...resets, ...snapshot.policies.map(x => x.ddl), ...snapshot.grants.map(x => x.ddl), ...snapshot.defaultGrants.map(x => x.ddl), ...snapshot.comments.filter(x => !x.name.startsWith('storage.')).map(x => x.ddl)]),
    '05_storage.sql': transaction('Storage bucket definitions and storage.objects RLS policies; no files', [...snapshot.storage.map(x => x.ddl), ...snapshot.storagePolicies.map(x => x.ddl), ...snapshot.comments.filter(x => x.name.startsWith('storage.')).map(x => x.ddl)]),
    '06_validate_schema.sql': buildValidation(snapshot),
    '07_install_triggers_AFTER_DATA.sql': transaction('Install original application/Auth triggers ONLY AFTER identity and record imports', triggers),
    'README.md': migrationGuide(snapshot, generatedAt),
  };
  const checksums: Record<string, string> = {};
  for (const [name, content] of Object.entries(files)) {
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(content));
    checksums[name] = Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join('');
  }
  files['manifest.json'] = JSON.stringify({
    formatVersion: 1, generatedAt, sourcePostgresVersion: snapshot.version,
    scope: 'schema-and-security-only', completeDatabaseBackup: false,
    counts: { tables: names.length, policies: snapshot.policies.length, functions: snapshot.functions.length,
      triggers: snapshot.triggers.length, foreignKeys: snapshot.foreignKeys.length, storageBuckets: snapshot.storage.length, storagePolicies: snapshot.storagePolicies.length },
    tables: names, functions: snapshot.functions.map(({ name, signature, security_definer, config }) => ({ name, signature, security_definer, config })),
    triggers: snapshot.triggers.map(({ name, schema, table_name, enabled }) => ({ name, schema, table_name, enabled })),
    extensions: snapshot.extensions, warnings: snapshot.warnings, checksums,
    excluded: ['application records', 'Auth users/passwords/sessions', 'Storage object contents', 'secrets', 'managed schema internals', 'project settings'],
  }, null, 2);
  return { formatVersion: 1, generatedAt, files };
}
