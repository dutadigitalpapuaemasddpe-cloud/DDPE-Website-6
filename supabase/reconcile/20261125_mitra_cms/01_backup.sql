-- Backup sebelum Kelola Mitra. Aman dijalankan ulang (drop lalu buat).
create schema if not exists ddpe_backup;
drop table if exists ddpe_backup.mc_site_settings_20261125;
create table ddpe_backup.mc_site_settings_20261125 as table public.site_settings;
drop table if exists ddpe_backup.mc_cms_fn_20261125;
create table ddpe_backup.mc_cms_fn_20261125 as
  select pg_get_functiondef('public.save_ddpe_cms_setting(text,jsonb,uuid,timestamptz)'::regprocedure) as definition;
select (select count(*) from public.site_settings) as live_rows,
       (select count(*) from ddpe_backup.mc_site_settings_20261125) as backup_rows;
