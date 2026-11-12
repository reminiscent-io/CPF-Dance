-- One hash per kind of object in the public schema (plus storage policies,
-- buckets and the auth.users trigger). Run it in the Supabase SQL editor and
-- through scripts/schema-check/run.sh: matching rows mean supabase-schema.sql
-- matches production. Where a row differs, swap the last SELECT for
--   select k, o, h from objs order by k, o
-- on both sides to find the object.
set search_path = "$user", public, extensions;

with objs(k, o, h) as (
  select 'table', c.relname::text, md5(string_agg(a.attname||' '||format_type(a.atttypid,a.atttypmod)||' '||coalesce(pg_get_expr(d.adbin,d.adrelid),'')||' '||a.attnotnull::text, ',' order by a.attnum))
    from pg_class c join pg_namespace n on n.oid=c.relnamespace join pg_attribute a on a.attrelid=c.oid and a.attnum>0 and not a.attisdropped left join pg_attrdef d on d.adrelid=c.oid and d.adnum=a.attnum
    where n.nspname='public' and c.relkind='r' group by c.relname
  union all select 'constraint', c.relname||'.'||con.conname, md5(pg_get_constraintdef(con.oid))
    from pg_constraint con join pg_class c on c.oid=con.conrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public'
  union all select 'index', ic.relname::text, md5(pg_get_indexdef(i.indexrelid))
    from pg_index i join pg_class ic on ic.oid=i.indexrelid join pg_class c on c.oid=i.indrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public'
  union all select 'function', p.oid::regprocedure::text, md5(replace(pg_get_functiondef(p.oid), chr(13), ''))
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and not exists (select 1 from pg_depend d where d.objid=p.oid and d.deptype='e')
  union all select 'view', c.relname::text, md5(pg_get_viewdef(c.oid)||coalesce(array_to_string(array(select x from unnest(c.reloptions) x order by x), ','),''))
    from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='v'
  union all select 'trigger', n.nspname||'.'||c.relname||'.'||t.tgname, md5(pg_get_triggerdef(t.oid))
    from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where not t.tgisinternal and n.nspname in ('public','auth')
  union all select 'policy', schemaname||'.'||tablename||'.'||policyname, md5(permissive||cmd||array_to_string(array(select r from unnest(roles) r order by r),',')||coalesce(qual,'~')||coalesce(with_check,'~'))
    from pg_policies where schemaname in ('public','storage')
  union all select 'rls', c.relname::text, md5(c.relrowsecurity::text||c.relforcerowsecurity::text)
    from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r'
  union all select 'enum', t.typname::text, md5(string_agg(e.enumlabel, ',' order by e.enumsortorder))
    from pg_type t join pg_namespace n on n.oid=t.typnamespace join pg_enum e on e.enumtypid=t.oid where n.nspname='public' group by t.typname
  union all select 'acl', c.relname::text, md5(string_agg(g, ',' order by g))
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    cross join lateral (select case when x.grantee=0 then 'PUBLIC' else pg_get_userbyid(x.grantee) end||':'||x.privilege_type as g from aclexplode(coalesce(c.relacl, acldefault('r', c.relowner))) x where x.privilege_type <> 'MAINTAIN') y
    where n.nspname='public' and c.relkind in ('r','v') group by c.relname
  union all select 'fn_acl', p.oid::regprocedure::text, md5(string_agg(g, ',' order by g))
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    cross join lateral (select case when x.grantee=0 then 'PUBLIC' else pg_get_userbyid(x.grantee) end||':'||x.privilege_type as g from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) x) y
    where n.nspname='public' and not exists (select 1 from pg_depend d where d.objid=p.oid and d.deptype='e') group by p.oid
  union all select 'publication', tablename::text, md5(pubname::text)
    from pg_publication_tables where schemaname='public'
  union all select 'bucket', id, md5(name||public::text||coalesce(file_size_limit::text,'')||coalesce(allowed_mime_types::text,''))
    from storage.buckets
  union all select 'comment', c.relname||'.'||coalesce(a.attname::text,''), md5(regexp_replace(d.description, '\s+', ' ', 'g'))
    from pg_description d join pg_class c on c.oid=d.objoid and d.classoid='pg_class'::regclass join pg_namespace n on n.oid=c.relnamespace
    left join pg_attribute a on a.attrelid=c.oid and a.attnum=d.objsubid where n.nspname='public'
  union all select 'comment', p.oid::regprocedure::text, md5(regexp_replace(d.description, '\s+', ' ', 'g'))
    from pg_description d join pg_proc p on p.oid=d.objoid and d.classoid='pg_proc'::regclass join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'
)
select k, count(*) as n, md5(string_agg(o||'='||h, ';' order by o)) as h from objs group by k order by k
;
