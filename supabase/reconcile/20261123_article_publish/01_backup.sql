-- Snapshot sebelum rekonsiliasi alur artikel. Jalankan sebelum 02_apply.sql.
-- Disimpan di schema privat (tidak diekspos Data API). Tidak mengubah tabel public.
begin;
create schema if not exists ddpe_backup;
revoke all on schema ddpe_backup from public, anon, authenticated;

create table ddpe_backup.site_articles_20261123 as table public.site_articles;
create table ddpe_backup.site_article_revisions_20261123 as table public.site_article_revisions;
create table ddpe_backup.ddpe_permissions_20261123 as table public.ddpe_permissions;
create table ddpe_backup.ddpe_audit_log_20261123 as table public.ddpe_audit_log;

-- Definisi fungsi publish yang ada saat ini (seharusnya kosong pada database live).
create table ddpe_backup.functions_20261123 as
select p.oid::regprocedure::text as signature, pg_get_functiondef(p.oid) as definition
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'publish_ddpe_article';
commit;

-- Cek jumlah baris snapshot = jumlah baris sumber.
select 'site_articles' as tbl, (select count(*) from public.site_articles) as live, (select count(*) from ddpe_backup.site_articles_20261123) as backup
union all select 'site_article_revisions', (select count(*) from public.site_article_revisions), (select count(*) from ddpe_backup.site_article_revisions_20261123)
union all select 'ddpe_permissions', (select count(*) from public.ddpe_permissions), (select count(*) from ddpe_backup.ddpe_permissions_20261123)
union all select 'ddpe_audit_log', (select count(*) from public.ddpe_audit_log), (select count(*) from ddpe_backup.ddpe_audit_log_20261123);
