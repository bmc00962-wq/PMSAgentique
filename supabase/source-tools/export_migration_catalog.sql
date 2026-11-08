-- SOURCE TOOLING ONLY: fixed, read-only catalog RPC for the OnSpace export service.
-- This file is NOT a destination migration and is intentionally excluded from the ZIP.
-- No application records or existing RLS policies are modified.
begin;
create or replace function public.export_migration_catalog()
returns jsonb language plpgsql stable security definer
set search_path = pg_catalog, public
set statement_timeout = '15s'
as $catalog$
begin
  if auth.uid() is null or not exists (select 1 from public.tenant_memberships where user_id = auth.uid() and role = 'platform_super_admin' and status = 'active') then
    raise exception using errcode = '42501', message = 'Platform administrator membership required';
  end if;
  return (
    with table_definitions as (
      select c.relname as name, c.relrowsecurity as rls, c.relforcerowsecurity as force_rls,
        format(E'create %stable public.%I (\n%s\n)%s;', case when c.relpersistence = 'u' then 'unlogged ' else '' end, c.relname,
          string_agg(format('  %I %s%s%s%s', a.attname, format_type(a.atttypid, a.atttypmod),
            case when a.attcollation <> ty.typcollation and a.attcollation <> 0 then format(' collate %I.%I', cn.nspname, co.collname) else '' end,
            case when a.attgenerated = 's' then ' generated always as (' || pg_get_expr(d.adbin, d.adrelid) || ') stored' when d.adbin is not null then ' default ' || pg_get_expr(d.adbin, d.adrelid) else '' end,
            case when a.attnotnull then ' not null' else '' end), E',\n' order by a.attnum), case when c.reloptions is not null then ' with (' || array_to_string(c.reloptions, ', ') || ')' else '' end) as ddl
      from pg_class c join pg_namespace n on n.oid = c.relnamespace join pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped join pg_type ty on ty.oid = a.atttypid
      left join pg_attrdef d on d.adrelid = c.oid and d.adnum = a.attnum left join pg_collation co on co.oid = a.attcollation left join pg_namespace cn on cn.oid = co.collnamespace
      where n.nspname = 'public' and c.relkind = 'r' and not exists (select 1 from pg_depend dep where dep.classid = 'pg_class'::regclass and dep.objid = c.oid and dep.deptype = 'e')
      group by c.oid, c.relname, c.relrowsecurity, c.relforcerowsecurity, c.relpersistence, c.reloptions
    ), constraints as (
      select c.relname || '.' || con.conname as name, con.contype as kind, format('alter table public.%I add constraint %I %s;', c.relname, con.conname, pg_get_constraintdef(con.oid, false)) as ddl
      from pg_constraint con join pg_class c on c.oid = con.conrelid join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r'
    ), indexes as (
      select idx.relname as name, pg_get_indexdef(i.indexrelid) || ';' as ddl from pg_index i join pg_class idx on idx.oid = i.indexrelid join pg_class c on c.oid = i.indrelid join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r' and not exists (select 1 from pg_constraint con where con.conindid = i.indexrelid)
    ), functions as (
      select p.proname as name, format('public.%I(%s)', p.proname, oidvectortypes(p.proargtypes)) as signature, pg_get_functiondef(p.oid) as ddl, p.prosecdef as security_definer, p.proconfig as config
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.prokind = 'f' and p.oid <> 'public.export_migration_catalog()'::regprocedure
        and not exists (select 1 from pg_depend d where d.classid = 'pg_proc'::regclass and d.objid = p.oid and d.deptype = 'e')
    ), policies as (
      select n.nspname || '.' || c.relname || '.' || p.polname as name,
        format('create policy %I on %I.%I as %s for %s to %s%s%s;', p.polname, n.nspname, c.relname, case when p.polpermissive then 'permissive' else 'restrictive' end,
          case p.polcmd when 'r' then 'select' when 'a' then 'insert' when 'w' then 'update' when 'd' then 'delete' else 'all' end,
          (select string_agg(case when r = 0 then 'public' else quote_ident(pg_get_userbyid(r)) end, ', ' order by r) from unnest(p.polroles) r),
          case when p.polqual is not null then ' using (' || pg_get_expr(p.polqual, p.polrelid) || ')' else '' end, case when p.polwithcheck is not null then ' with check (' || pg_get_expr(p.polwithcheck, p.polrelid) || ')' else '' end) as ddl
      from pg_policy p join pg_class c on c.oid = p.polrelid join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' or (n.nspname = 'storage' and c.relname = 'objects')
    ), objects as (
      select c.relname as name, 'table public.' || quote_ident(c.relname) as target, c.relowner as owner, coalesce(c.relacl, acldefault('r', c.relowner)) as acl from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r'
      union all select p.proname, format('function public.%I(%s)', p.proname, oidvectortypes(p.proargtypes)), p.proowner, coalesce(p.proacl, acldefault('f', p.proowner)) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.prokind = 'f' and p.oid <> 'public.export_migration_catalog()'::regprocedure and not exists (select 1 from pg_depend d where d.classid = 'pg_proc'::regclass and d.objid = p.oid and d.deptype = 'e')
      union all select 'public', 'schema public', n.nspowner, coalesce(n.nspacl, acldefault('n', n.nspowner)) from pg_namespace n where n.nspname = 'public'
    ), grants as (
      select o.name, o.target, a.grantee, a.privilege_type, format('grant %s on %s to %s%s;', a.privilege_type, o.target, case when a.grantee = 0 then 'public' else quote_ident(pg_get_userbyid(a.grantee)) end, case when a.is_grantable then ' with grant option' else '' end) as ddl
      from objects o cross join lateral aclexplode(o.acl) a where a.grantee <> o.owner
    ), default_grants as (
      -- Explicit cast prevents PostgreSQL 15's ambiguous text || internal "char" operator.
      select pg_get_userbyid(d.defaclrole) || ':' || d.defaclobjtype::text as name, d.defaclobjtype, a.grantee, a.privilege_type,
        format('alter default privileges for role postgres in schema public grant %s on %s to %s%s;', a.privilege_type, case d.defaclobjtype when 'r' then 'tables' when 'f' then 'functions' when 'S' then 'sequences' when 'T' then 'types' end, case when a.grantee = 0 then 'public' else quote_ident(pg_get_userbyid(a.grantee)) end, case when a.is_grantable then ' with grant option' else '' end) as ddl
      from pg_default_acl d join pg_namespace n on n.oid = d.defaclnamespace cross join lateral aclexplode(d.defaclacl) a where n.nspname = 'public' and a.grantee <> d.defaclrole and d.defaclobjtype in ('r','f','S','T')
    ), comments as (
      select c.relname as name, format('comment on table public.%I is %L;', c.relname, obj_description(c.oid, 'pg_class')) as ddl from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' and obj_description(c.oid, 'pg_class') is not null
      union all select c.relname || '.' || a.attname, format('comment on column public.%I.%I is %L;', c.relname, a.attname, col_description(c.oid, a.attnum)) from pg_class c join pg_namespace n on n.oid = c.relnamespace join pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped where n.nspname = 'public' and c.relkind = 'r' and col_description(c.oid, a.attnum) is not null
    ), policy_comments as (
      select n.nspname || '.' || c.relname || '.' || p.polname as name, format('comment on policy %I on %I.%I is %L;', p.polname, n.nspname, c.relname, obj_description(p.oid, 'pg_policy')) as ddl
      from pg_policy p join pg_class c on c.oid = p.polrelid join pg_namespace n on n.oid = c.relnamespace where (n.nspname = 'public' or (n.nspname = 'storage' and c.relname = 'objects')) and obj_description(p.oid, 'pg_policy') is not null
    ), triggers as (
      select t.tgname as name, n.nspname as schema, c.relname as table_name, t.tgenabled as enabled, pg_get_triggerdef(t.oid, false) || ';' as ddl
      from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace join pg_proc p on p.oid = t.tgfoid join pg_namespace pn on pn.oid = p.pronamespace
      where not t.tgisinternal and n.nspname in ('public','auth','storage') and pn.nspname = 'public' and not exists (select 1 from pg_depend d where d.classid = 'pg_proc'::regclass and d.objid = p.oid and d.deptype = 'e')
    ), unsupported as (
      select 'advanced public relations, types, or identity columns' as reason where exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind in ('p','v','m','S','f'))
        or exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace where n.nspname = 'public' and t.typtype in ('e','d'))
        or exists (select 1 from pg_attribute a join pg_class c on c.oid = a.attrelid join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and a.attnum > 0 and not a.attisdropped and a.attidentity <> '')
      union all select 'public routines other than functions' where exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.prokind <> 'f' and not exists (select 1 from pg_depend d where d.classid = 'pg_proc'::regclass and d.objid = p.oid and d.deptype = 'e'))
    )
    select jsonb_build_object('formatVersion', 1, 'version', jsonb_build_array(jsonb_build_object('version', current_setting('server_version'))),
      'unsupported', coalesce((select jsonb_agg(to_jsonb(x)) from unsupported x), '[]'::jsonb),
      'tables', coalesce((select jsonb_agg(to_jsonb(x) order by name) from table_definitions x), '[]'::jsonb),
      'constraints', coalesce((select jsonb_agg(to_jsonb(x) order by case kind when 'p' then 0 when 'u' then 1 when 'f' then 3 else 2 end, name) from constraints x), '[]'::jsonb),
      'indexes', coalesce((select jsonb_agg(to_jsonb(x) order by name) from indexes x), '[]'::jsonb),
      'functions', coalesce((select jsonb_agg(to_jsonb(x) order by name, signature) from functions x), '[]'::jsonb),
      'policies', coalesce((select jsonb_agg(to_jsonb(x) order by name) from policies x), '[]'::jsonb),
      'grants', coalesce((select jsonb_agg(jsonb_build_object('name', name, 'ddl', ddl) order by target, grantee, privilege_type) from grants), '[]'::jsonb),
      'defaultGrants', coalesce((select jsonb_agg(jsonb_build_object('name', name, 'ddl', ddl) order by defaclobjtype, grantee, privilege_type) from default_grants), '[]'::jsonb),
      'comments', coalesce((select jsonb_agg(to_jsonb(x) order by name) from comments x), '[]'::jsonb),
      'policyComments', coalesce((select jsonb_agg(to_jsonb(x) order by name) from policy_comments x), '[]'::jsonb),
      'triggers', coalesce((select jsonb_agg(to_jsonb(x) order by schema, table_name, name) from triggers x), '[]'::jsonb),
      'extensions', coalesce((select jsonb_agg(jsonb_build_object('name', e.extname, 'schema', n.nspname, 'version', e.extversion) order by e.extname) from pg_extension e join pg_namespace n on n.oid = e.extnamespace where e.extname <> 'plpgsql'), '[]'::jsonb),
      'storage', coalesce((select jsonb_agg(jsonb_build_object('name', id, 'ddl', format('insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values (%L, %L, %L, %L, %L);', id, name, public, file_size_limit, allowed_mime_types)) order by id) from storage.buckets), '[]'::jsonb)
    )
  );
end;
$catalog$;
-- Authentication is necessary but insufficient: active DB-assigned platform membership is checked inside.
revoke all on function public.export_migration_catalog() from public, anon, authenticated, service_role;
grant execute on function public.export_migration_catalog() to authenticated;
comment on function public.export_migration_catalog() is 'Read-only fixed catalog snapshot for verified platform administrators; source-only export tooling, excluded from migration bundles.';
notify pgrst, 'reload schema';
commit;
