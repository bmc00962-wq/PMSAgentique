import { literal, type Snapshot, type SqlObject } from './types.ts';
import { TABLES_SQL, CONSTRAINTS_SQL, INDEXES_SQL } from './tableCatalog.ts';
import { FUNCTIONS_SQL, POLICIES_SQL, GRANTS_SQL } from './securityCatalog.ts';

function comparison(label: string, expected: SqlObject[], query: string): string {
  const metadata = JSON.stringify(expected.map(({ name, ddl }) => ({ name, ddl })));
  return `-- ${label}: no rows means definitions match. Any returned row requires review.
with expected as (
  select * from jsonb_to_recordset(${literal(metadata)}::jsonb) as e(name text, ddl text)
), actual as (${query.trim().replace(/;$/, '')})
select ${literal(label)} as section, coalesce(e.name, a.name) as object_name,
  case when e.name is null then 'unexpected' when a.name is null then 'missing' else 'definition differs' end as issue,
  e.ddl as source_definition, a.ddl as target_definition
from expected e full join actual a on a.name = e.name and a.ddl = e.ddl
where e.name is null or a.name is null;`;
}

export function buildValidation(snapshot: Snapshot): string {
  const rls = JSON.stringify(snapshot.tables.map(({ name, rls, force_rls }) => ({ name, rls, force_rls })));
  return `-- TARGET VALIDATION: run AFTER data import and 07_install_triggers_AFTER_DATA.sql.
-- Read-only. Any differences below block cutover until reviewed.
-- Owner/grantor and PostgreSQL-version rendering differences need explicit assessment.
-- This checks metadata, NOT row counts, Auth login, tenant isolation, or functional RBAC.
begin read only;
set local search_path = pg_catalog, public;

-- Verify the exact RLS enabled/forced flags.
with expected as (
 select * from jsonb_to_recordset(${literal(rls)}::jsonb) as e(name text, rls boolean, force_rls boolean)
)
select e.name, 'RLS flags missing or different' as issue
from expected e left join pg_class c on c.relname = e.name
 and c.relnamespace = 'public'::regnamespace and c.relkind = 'r'
where c.oid is null or c.relrowsecurity is distinct from e.rls or c.relforcerowsecurity is distinct from e.force_rls;

${comparison('tables and columns', snapshot.tables, TABLES_SQL)}
${comparison('constraints and foreign keys', [...snapshot.constraints, ...snapshot.foreignKeys], CONSTRAINTS_SQL)}
${comparison('indexes', snapshot.indexes, INDEXES_SQL)}
${comparison('functions', snapshot.functions, FUNCTIONS_SQL)}
${comparison('policies', [...snapshot.policies, ...snapshot.storagePolicies], POLICIES_SQL)}
${comparison('object permissions', snapshot.grants, GRANTS_SQL)}

-- Verify each imported custom trigger exists and has its original enabled state.
with expected as (
 select * from jsonb_to_recordset(${literal(JSON.stringify(snapshot.triggers.map(({ name, schema, table_name, enabled, ddl }) => ({ name, schema, table_name, enabled, ddl }))))}::jsonb)
 as e(name text, schema text, table_name text, enabled text, ddl text)
)
select e.name, 'Trigger missing, definition differs, or enabled state differs' as issue
from expected e left join pg_namespace n on n.nspname = e.schema
left join pg_class c on c.relnamespace = n.oid and c.relname = e.table_name
left join pg_trigger t on t.tgrelid = c.oid and t.tgname = e.name and not t.tgisinternal
where t.oid is null or t.tgenabled::text is distinct from e.enabled
 or (pg_get_triggerdef(t.oid, false) || ';') is distinct from e.ddl;

-- Auth/profile ID linkage must stay intact. Zero is required.
select count(*) as profiles_without_auth_identity from public.user_profiles p
left join auth.users u on u.id = p.id where u.id is null;
commit;
`;
}
