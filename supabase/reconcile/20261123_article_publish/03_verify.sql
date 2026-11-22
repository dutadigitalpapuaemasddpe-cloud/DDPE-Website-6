-- Verifikasi read-only setelah 02_apply.sql. Semua baris harus bernilai true.
select 'kolom site_articles lengkap' as cek, count(*) = 4 as ok
from information_schema.columns
where table_schema = 'public' and table_name = 'site_articles'
  and column_name in ('cover_caption', 'author_bio', 'tags', 'meta_description')
union all
select 'kolom site_article_revisions lengkap', count(*) = 5
from information_schema.columns
where table_schema = 'public' and table_name = 'site_article_revisions'
  and column_name in ('slug', 'cover_caption', 'author_bio', 'tags', 'meta_description')
union all
select 'rpc publish_ddpe_article ada', exists (
  select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.oid::regprocedure::text = 'publish_ddpe_article(text,uuid,uuid)')
union all
select 'anon tidak bisa memanggil publish', not has_function_privilege('anon', 'public.publish_ddpe_article(text,uuid,uuid)', 'EXECUTE')
union all
select 'authenticated tidak bisa memanggil publish', not has_function_privilege('authenticated', 'public.publish_ddpe_article(text,uuid,uuid)', 'EXECUTE')
union all
select 'service_role bisa memanggil publish', has_function_privilege('service_role', 'public.publish_ddpe_article(text,uuid,uuid)', 'EXECUTE')
union all
select 'jumlah artikel tidak berubah', (select count(*) from public.site_articles) = (select count(*) from ddpe_backup.site_articles_20261123)
union all
select 'hak akses pengurus tidak berubah', (select count(*) from public.ddpe_permissions) = (select count(*) from ddpe_backup.ddpe_permissions_20261123);
