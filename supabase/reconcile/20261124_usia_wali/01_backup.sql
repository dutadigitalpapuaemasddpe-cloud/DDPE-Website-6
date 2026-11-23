-- Snapshot sebelum aturan usia + persetujuan wali. Jalankan sebelum 02_apply.sql.
-- Disimpan di schema privat ddpe_backup (tidak diekspos Data API). Tidak mengubah tabel public.
begin;
create schema if not exists ddpe_backup;
revoke all on schema ddpe_backup from public, anon, authenticated;

create table ddpe_backup.ag_recruitments_20261124 as table public.recruitments;
create table ddpe_backup.ag_applications_20261124 as table public.applications;

-- Definisi fungsi lama; dipakai 04_rollback.sql untuk memulihkannya.
create table ddpe_backup.ag_functions_20261124 as
select p.oid::regprocedure::text as signature, pg_get_functiondef(p.oid) as definition
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname in ('submit_ddpe_application', 'review_ddpe_application');
commit;
