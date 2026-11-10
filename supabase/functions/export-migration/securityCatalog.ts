// Preserve existing RLS expressions and effective non-owner grants verbatim.
export const FUNCTIONS_SQL = `
select p.proname as name, format('public.%I(%s)', p.proname, oidvectortypes(p.proargtypes)) as signature,
  pg_get_functiondef(p.oid) as ddl, p.prosecdef as security_definer, p.proconfig as config
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.prokind = 'f'
  and (p.proname <> 'export_migration_catalog' or p.pronargs <> 0)
  and not exists (select 1 from pg_depend d where d.classid = 'pg_proc'::regclass and d.objid = p.oid and d.deptype = 'e')
order by p.proname, p.oid;`;

export const POLICIES_SQL = `
select n.nspname || '.' || c.relname || '.' || p.polname as name,
  format('create policy %I on %I.%I as %s for %s to %s%s%s;', p.polname, n.nspname, c.relname,
    case when p.polpermissive then 'permissive' else 'restrictive' end,
    case p.polcmd when 'r' then 'select' when 'a' then 'insert' when 'w' then 'update' when 'd' then 'delete' else 'all' end,
    (select string_agg(case when r = 0 then 'public' else quote_ident(pg_get_userbyid(r)) end, ', ' order by r) from unnest(p.polroles) r),
    case when p.polqual is not null then ' using (' || pg_get_expr(p.polqual, p.polrelid) || ')' else '' end,
    case when p.polwithcheck is not null then ' with check (' || pg_get_expr(p.polwithcheck, p.polrelid) || ')' else '' end) as ddl
from pg_policy p join pg_class c on c.oid = p.polrelid join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' or (n.nspname = 'storage' and c.relname = 'objects')
order by n.nspname, c.relname, p.polname;`;

export const GRANTS_SQL = `
with objects as (
  select c.relname as name, 'table public.' || quote_ident(c.relname) as target, c.relowner as owner, coalesce(c.relacl, acldefault('r', c.relowner)) as acl
  from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r'
  union all
  select p.proname, format('function public.%I(%s)', p.proname, oidvectortypes(p.proargtypes)), p.proowner, coalesce(p.proacl, acldefault('f', p.proowner))
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.prokind = 'f'
    and (p.proname <> 'export_migration_catalog' or p.pronargs <> 0)
    and not exists (select 1 from pg_depend d where d.classid = 'pg_proc'::regclass and d.objid = p.oid and d.deptype = 'e')
  union all
  select 'public', 'schema public', n.nspowner, coalesce(n.nspacl, acldefault('n', n.nspowner)) from pg_namespace n where n.nspname = 'public'
)
select o.name, format('grant %s on %s to %s%s;', a.privilege_type, o.target,
  case when a.grantee = 0 then 'public' else quote_ident(pg_get_userbyid(a.grantee)) end,
  case when a.is_grantable then ' with grant option' else '' end) as ddl
from objects o cross join lateral aclexplode(o.acl) a
where a.grantee <> o.owner
order by o.target, a.grantee, a.privilege_type;`;

export const DEFAULT_GRANTS_SQL = `
-- pg_default_acl.defaclobjtype is PostgreSQL's internal "char", not text.
select pg_get_userbyid(d.defaclrole) || ':' || d.defaclobjtype::text as name,
 format('alter default privileges for role postgres in schema public grant %s on %s to %s%s;', a.privilege_type,
 case d.defaclobjtype when 'r' then 'tables' when 'f' then 'functions' when 'S' then 'sequences' when 'T' then 'types' end,
 case when a.grantee = 0 then 'public' else quote_ident(pg_get_userbyid(a.grantee)) end,
 case when a.is_grantable then ' with grant option' else '' end) as ddl
from pg_default_acl d join pg_namespace n on n.oid = d.defaclnamespace cross join lateral aclexplode(d.defaclacl) a
where n.nspname = 'public' and a.grantee <> d.defaclrole and d.defaclobjtype in ('r','f','S','T')
order by d.defaclobjtype, a.grantee, a.privilege_type;`;

export const TRIGGERS_SQL = `
select t.tgname as name, n.nspname as schema, c.relname as table_name, t.tgenabled as enabled,
  pg_get_triggerdef(t.oid, false) || ';' as ddl
from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace
join pg_proc p on p.oid = t.tgfoid join pg_namespace pn on pn.oid = p.pronamespace
where not t.tgisinternal and n.nspname in ('public','auth','storage') and pn.nspname = 'public'
  and not exists (select 1 from pg_depend d where d.classid = 'pg_proc'::regclass and d.objid = p.oid and d.deptype = 'e')
order by n.nspname, c.relname, t.tgname;`;
