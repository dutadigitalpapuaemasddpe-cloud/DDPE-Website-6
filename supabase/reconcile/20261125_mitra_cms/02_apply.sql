-- Kelola Mitra: tanpa tabel baru. Mitra disimpan di site_settings (kunci cms_partner:<id>), seperti Agenda.
-- 1) Izinkan kunci cms_partner:* pada RPC simpan konten (perubahan satu baris: regex kunci).
-- 2) Isi tiga mitra lama (Terbit) agar tetap tampil. Idempotent: tidak menimpa/menggandakan.
begin;

create or replace function public.save_ddpe_cms_setting(p_key text, p_value jsonb, p_actor uuid, p_version timestamptz)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare old_version timestamptz;
begin
  if not exists (select 1 from public.ddpe_permissions where user_id = p_actor and permission = 'content_editor'
    and scope_type = 'organization' and scope_id is null) then raise exception 'forbidden'; end if;
  if p_key !~ '^cms_(page|event|partner):[a-zA-Z0-9_.-]+$' then raise exception 'invalid_key'; end if;
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

insert into public.site_settings (setting_key, value, is_public, updated_at)
select v.k, v.val::jsonb, true, clock_timestamp() from (values
  ('cms_partner:ruangnmp-id', '{"id":"ruangnmp-id","name":"Ruangnmp.id","category":"Komunitas","summary":"Komunitas ruang belajar dan kolaborasi yang mendorong ekosistem digital terarah di Papua.","summary_en":"A learning and collaboration community that supports a more purposeful digital ecosystem in Papua.","logo":"assets/logo.ruangnmp.jpg","logo_alt":"Logo Ruangnmp.id","website":"","order":1,"featured":true,"status":"published"}'),
  ('cms_partner:kwaran-kuala-kencana', '{"id":"kwaran-kuala-kencana","name":"Kwaran Kuala Kencana","category":"Komunitas","summary":"Jaringan komunitas yang memperkuat semangat kolaborasi dan penguatan kepemudaan di wilayah Kuala Kencana.","summary_en":"A community network strengthening youth collaboration and civic engagement in the Kuala Kencana area.","logo":"assets/logo_mitra_Kwaran_KualaKencana.png","logo_alt":"Logo Kwaran Kuala Kencana","website":"","order":2,"featured":true,"status":"published"}'),
  ('cms_partner:smks-pk-yapis-tik-timika', '{"id":"smks-pk-yapis-tik-timika","name":"SMKS PK YAPIS TIK TIMIKA","category":"Pendidikan","summary":"Satuan pendidikan mitra yang membuka ruang sinergi literasi, teknologi, dan pengembangan generasi muda.","summary_en":"A partner school supporting opportunities for literacy, technology, and youth development through practical collaboration.","logo":"assets/Logo_Mitra_Yapis.jpeg","logo_alt":"Logo SMKS PK YAPIS TIK TIMIKA","website":"","order":3,"featured":true,"status":"published"}')
) as v(k, val)
on conflict (setting_key) do nothing;

commit;
notify pgrst, 'reload schema';
