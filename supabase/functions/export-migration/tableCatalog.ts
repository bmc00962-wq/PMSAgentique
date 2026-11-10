// Catalog SELECTs only. Never execute exported DDL on the source database.
export const TABLES_SQL = `
select c.relname as name, c.relrowsecurity as rls, c.relforcerowsecurity as force_rls,
  format(E'create %stable public.%I (\n%s\n)%s;',
    case when c.relpersistence = 'u' then 'unlogged ' else '' end, c.relname,
    string_agg(format('  %I %s%s%s%s', a.attname,
      format_type(a.atttypid, a.atttypmod),
      case when a.attcollation <> ty.typcollation and a.attcollation <> 0
        then format(' collate %I.%I', cn.nspname, co.collname) else '' end,
      case when a.attgenerated = 's' then ' generated always as (' || pg_get_expr(d.adbin, d.adrelid) || ') stored'
        when d.adbin is not null then ' default ' || pg_get_expr(d.adbin, d.adrelid) else '' end,
      case when a.attnotnull then ' not null' else '' end), E',\n' order by a.attnum),
    case when c.reloptions is not null then ' with (' || array_to_string(c.reloptions, ', ') || ')' else '' end) as ddl
from pg_class c join pg_namespace n on n.oid = c.relnamespace
join pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
join pg_type ty on ty.oid = a.atttypid
left join pg_attrdef d on d.adrelid = c.oid and d.adnum = a.attnum
left join pg_collation co on co.oid = a.attcollation
left join pg_namespace cn on cn.oid = co.collnamespace
where n.nspname = 'public' and c.relkind = 'r'
  and not exists (select 1 from pg_depend dep where dep.classid = 'pg_class'::regclass and dep.objid = c.oid and dep.deptype = 'e')
group by c.oid, c.relname, c.relrowsecurity, c.relforcerowsecurity, c.relpersistence, c.reloptions
order by c.relname;`;

export const CONSTRAINTS_SQL = `
select c.relname || '.' || con.conname as name, con.contype as kind,
  format('alter table public.%I add constraint %I %s;', c.relname, con.conname, pg_get_constraintdef(con.oid, false)) as ddl
from pg_constraint con join pg_class c on c.oid = con.conrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
order by case con.contype when 'p' then 0 when 'u' then 1 when 'f' then 3 else 2 end, c.relname, con.conname;`;

export const INDEXES_SQL = `
select idx.relname as name, pg_get_indexdef(i.indexrelid) || ';' as ddl
from pg_index i join pg_class idx on idx.oid = i.indexrelid
join pg_class c on c.oid = i.indrelid join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
  and not exists (select 1 from pg_constraint con where con.conindid = i.indexrelid)
order by idx.relname;`;

export const COMMENTS_SQL = `
select c.relname as name, format('comment on table public.%I is %L;', c.relname, obj_description(c.oid, 'pg_class')) as ddl
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and obj_description(c.oid, 'pg_class') is not null
union all
select c.relname || '.' || a.attname, format('comment on column public.%I.%I is %L;', c.relname, a.attname, col_description(c.oid, a.attnum))
from pg_class c join pg_namespace n on n.oid = c.relnamespace
join pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
where n.nspname = 'public' and c.relkind = 'r' and col_description(c.oid, a.attnum) is not null
order by name;`;

export const UNSUPPORTED_SQL = `
select 'advanced public relations, types, or identity columns' as reason
where exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind in ('p','v','m','S','f'))
   or exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace where n.nspname = 'public' and t.typtype in ('e','d'))
   or exists (select 1 from pg_attribute a join pg_class c on c.oid = a.attrelid join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and a.attnum > 0 and not a.attisdropped and a.attidentity <> '')
union all
select 'public routines other than functions'
where exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.prokind <> 'f' and not exists (select 1 from pg_depend d where d.classid = 'pg_proc'::regclass and d.objid = p.oid and d.deptype = 'e'));`;
