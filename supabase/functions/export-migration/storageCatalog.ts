// Bucket definitions and policies only. Storage object contents are intentionally excluded.
export const STORAGE_SQL = `
select id as name, format(
  'insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values (%L, %L, %L, %L, %L);',
  id, name, public, file_size_limit, allowed_mime_types) as ddl
from storage.buckets order by id;`;

export const EXTENSIONS_SQL = `
select e.extname as name, n.nspname as schema, e.extversion as version
from pg_extension e join pg_namespace n on n.oid = e.extnamespace
where e.extname <> 'plpgsql' order by e.extname;`;

export const POLICY_COMMENTS_SQL = `
select n.nspname || '.' || c.relname || '.' || p.polname as name,
  format('comment on policy %I on %I.%I is %L;', p.polname, n.nspname, c.relname, obj_description(p.oid, 'pg_policy')) as ddl
from pg_policy p join pg_class c on c.oid = p.polrelid join pg_namespace n on n.oid = c.relnamespace
where (n.nspname = 'public' or (n.nspname = 'storage' and c.relname = 'objects'))
  and obj_description(p.oid, 'pg_policy') is not null order by name;`;
