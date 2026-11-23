-- Kembalikan RPC ke definisi sebelum perubahan dan hapus data mitra CMS.
-- Peringatan: menghapus SEMUA kunci cms_partner:* (termasuk mitra yang dibuat pengurus). Backup: ddpe_backup.mc_site_settings_20261125.
begin;
create or replace function public.save_ddpe_cms_setting(p_key text, p_value jsonb, p_actor uuid, p_version timestamptz)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare old_version timestamptz;
begin
  if not exists (select 1 from public.ddpe_permissions where user_id = p_actor and permission = 'content_editor'
    and scope_type = 'organization' and scope_id is null) then raise exception 'forbidden'; end if;
  if p_key !~ '^cms_(page|event):[a-zA-Z0-9_.-]+$' then raise exception 'invalid_key'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_key, 0));
  select updated_at into old_version from public.site_settings where setting_key = p_key for update;
  if old_version is distinct from p_version then raise exception 'cms_conflict'; end if;
  insert into public.site_settings (setting_key, value, is_public, updated_by, updated_at)
  values (p_key, p_value, true, p_actor, clock_timestamp())
  on conflict (setting_key) do update set value = excluded.value, is_public = true,
    updated_by = excluded.updated_by, updated_at = excluded.updated_at;
end $$;
revoke all on function public.save_ddpe_cms_setting(text,jsonb,uuid,timestamptz) from public, anon, authenticated;
grant execute on function public.save_ddpe_cms_setting(text,jsonb,uuid,timestamptz) to service_role;
delete from public.site_settings where setting_key like 'cms_partner:%';
commit;
notify pgrst, 'reload schema';
