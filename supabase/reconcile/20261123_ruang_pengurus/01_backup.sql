-- Snapshot sebelum rekonsiliasi Ruang Pengurus. Jalankan sebelum 02_apply.sql.
-- Disimpan di schema privat ddpe_backup (tidak diekspos Data API). Tidak mengubah tabel public.
begin;
create schema if not exists ddpe_backup;
revoke all on schema ddpe_backup from public, anon, authenticated;

create table ddpe_backup.rp_article_comments_20261123 as table public.article_comments;
create table ddpe_backup.rp_applications_20261123 as table public.applications;
create table ddpe_backup.rp_partnership_inquiries_20261123 as table public.partnership_inquiries;
create table ddpe_backup.rp_site_settings_20261123 as table public.site_settings;
create table ddpe_backup.rp_recruitments_20261123 as table public.recruitments;
create table ddpe_backup.rp_ddpe_permissions_20261123 as table public.ddpe_permissions;
create table ddpe_backup.rp_ddpe_profiles_20261123 as table public.ddpe_profiles;

create table ddpe_backup.rp_functions_20261123 as
select p.oid::regprocedure::text as signature, pg_get_functiondef(p.oid) as definition,
  array(select r.rolname from pg_roles r where has_function_privilege(r.oid, p.oid, 'EXECUTE') and r.rolname in ('anon','authenticated','service_role')) as executors
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname in ('list_ddpe_permissions', 'has_ddpe_permission');

create table ddpe_backup.rp_policies_20261123 as
select * from pg_policies where schemaname = 'public' and tablename = 'article_comments';
commit;

select tbl, live, backup, live = backup as ok from (
  select 'article_comments' tbl, (select count(*) from public.article_comments) live, (select count(*) from ddpe_backup.rp_article_comments_20261123) backup
  union all select 'applications', (select count(*) from public.applications), (select count(*) from ddpe_backup.rp_applications_20261123)
  union all select 'partnership_inquiries', (select count(*) from public.partnership_inquiries), (select count(*) from ddpe_backup.rp_partnership_inquiries_20261123)
  union all select 'site_settings', (select count(*) from public.site_settings), (select count(*) from ddpe_backup.rp_site_settings_20261123)
  union all select 'recruitments', (select count(*) from public.recruitments), (select count(*) from ddpe_backup.rp_recruitments_20261123)
  union all select 'ddpe_permissions', (select count(*) from public.ddpe_permissions), (select count(*) from ddpe_backup.rp_ddpe_permissions_20261123)
  union all select 'ddpe_profiles', (select count(*) from public.ddpe_profiles), (select count(*) from ddpe_backup.rp_ddpe_profiles_20261123)
  union all select 'functions', 2, (select count(*) from ddpe_backup.rp_functions_20261123)
  union all select 'article_comments policies', (select count(*) from pg_policies where schemaname='public' and tablename='article_comments'), (select count(*) from ddpe_backup.rp_policies_20261123)
) s;
