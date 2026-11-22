-- Verifikasi read-only setelah 02_apply.sql. Semua baris harus bernilai true.
with fns(sig) as (values
  ('consume_ddpe_rate_limit(text,integer)'), ('submit_ddpe_application(uuid,uuid,jsonb,text)'),
  ('submit_ddpe_partnership(uuid,jsonb,text)'), ('review_ddpe_application(uuid,text,text,uuid)'),
  ('review_ddpe_partnership(uuid,text,text,uuid)'), ('save_ddpe_cms_setting(text,jsonb,uuid,timestamp with time zone)'),
  ('save_ddpe_leadership(jsonb,uuid,timestamp with time zone)'), ('grant_ddpe_permission(text,text,text,text,text,uuid)'),
  ('revoke_ddpe_permission(uuid,uuid)'), ('list_ddpe_permissions(uuid)'), ('has_ddpe_permission(uuid,text)'))
select 'semua RPC ada' as cek, count(*) = 11 as ok
from fns join pg_proc p on p.oid::regprocedure::text = 'public.' || fns.sig or p.oid::regprocedure::text = fns.sig
union all
select 'anon/authenticated tidak bisa memanggil RPC', not exists (
  select 1 from fns join pg_proc p on p.oid::regprocedure::text in ('public.' || fns.sig, fns.sig)
  where has_function_privilege('anon', p.oid, 'EXECUTE') or has_function_privilege('authenticated', p.oid, 'EXECUTE'))
union all
select 'service_role bisa memanggil semua RPC', not exists (
  select 1 from fns join pg_proc p on p.oid::regprocedure::text in ('public.' || fns.sig, fns.sig)
  where not has_function_privilege('service_role', p.oid, 'EXECUTE'))
union all
select 'tabel ddpe_rate_limits ada dengan RLS', coalesce((select relrowsecurity from pg_class where oid = to_regclass('public.ddpe_rate_limits')), false)
union all
select 'article_comments.status ada', exists (select 1 from information_schema.columns
  where table_schema = 'public' and table_name = 'article_comments' and column_name = 'status')
union all
select 'publik hanya membaca komentar approved', (select count(*) = 1 and bool_and(qual = '(status = ''approved''::text)')
  from pg_policies where schemaname = 'public' and tablename = 'article_comments' and cmd = 'SELECT')
union all
select 'policy kirim komentar & like tetap ada', (select count(*) from pg_policies where schemaname = 'public'
  and tablename in ('article_comments', 'article_likes') and cmd = 'INSERT') =
  (select count(*) from ddpe_backup.rp_policies_20261123 where cmd = 'INSERT') + 2
union all
select 'hak akses pengurus tidak berubah', not exists (
  (select * from public.ddpe_permissions) except (select * from ddpe_backup.rp_ddpe_permissions_20261123))
  and (select count(*) from public.ddpe_permissions) = (select count(*) from ddpe_backup.rp_ddpe_permissions_20261123)
union all
select 'profil pengurus tidak berubah', not exists (
  (select * from public.ddpe_profiles) except (select * from ddpe_backup.rp_ddpe_profiles_20261123))
  and (select count(*) from public.ddpe_profiles) = (select count(*) from ddpe_backup.rp_ddpe_profiles_20261123)
union all
select 'jumlah baris data lain tidak berubah',
  (select count(*) from public.article_comments) = (select count(*) from ddpe_backup.rp_article_comments_20261123)
  and (select count(*) from public.applications) = (select count(*) from ddpe_backup.rp_applications_20261123)
  and (select count(*) from public.partnership_inquiries) = (select count(*) from ddpe_backup.rp_partnership_inquiries_20261123)
  and (select count(*) from public.site_settings) = (select count(*) from ddpe_backup.rp_site_settings_20261123)
  and (select count(*) from public.recruitments) = (select count(*) from ddpe_backup.rp_recruitments_20261123);
