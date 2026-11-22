-- Rekonsiliasi minimal Ruang Pengurus: membuat RPC yang dipanggil API tetapi tidak ada di database live,
-- disesuaikan dengan skema live (bukan migrasi 001-004 yang tidak kompatibel).
-- Sifat: aditif. Tidak menghapus baris, tidak mengubah tipe kolom, tidak mengubah hak akses pengurus.
-- Satu-satunya perubahan pada objek lama: kolom status di article_comments (default 'approved',
-- komentar yang ada tetap tampil) dan policy baca publiknya, serta pencabutan EXECUTE anon/authenticated
-- pada dua fungsi lama yang hanya dipakai API server. Aman dijalankan ulang.
begin;

-- 1. Rate limit untuk form publik (pendaftaran, kemitraan).
create table if not exists public.ddpe_rate_limits (
  fingerprint text not null,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (fingerprint, window_start)
);
alter table public.ddpe_rate_limits enable row level security;
revoke all on public.ddpe_rate_limits from anon, authenticated;

create or replace function public.consume_ddpe_rate_limit(p_fingerprint text, p_limit integer default 5)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare current_window timestamptz := date_trunc('minute', now()); hit_count integer;
begin
  if p_fingerprint is null or char_length(p_fingerprint) < 32 or p_limit < 1 or p_limit > 20 then
    raise exception 'Invalid rate-limit request';
  end if;
  insert into public.ddpe_rate_limits (fingerprint, window_start, hits) values (p_fingerprint, current_window, 1)
  on conflict (fingerprint, window_start) do update set hits = public.ddpe_rate_limits.hits + 1
    where public.ddpe_rate_limits.hits < p_limit
  returning hits into hit_count;
  delete from public.ddpe_rate_limits where window_start < now() - interval '1 day';
  return hit_count is not null;
end $$;

-- 2. Form pendaftaran publik -> applications (status awal 'submitted', unik per submission_key).
create or replace function public.submit_ddpe_application(p_recruitment_id uuid, p_submission_key uuid, p_payload jsonb, p_fingerprint text)
returns text language plpgsql security definer set search_path = public, pg_temp as $$
declare recruitment_row public.recruitments%rowtype; existing_reference text; new_reference text;
begin
  if not public.consume_ddpe_rate_limit(p_fingerprint, 5) then raise exception 'rate_limited'; end if;
  select reference_code into existing_reference from public.applications where submission_key = p_submission_key;
  if existing_reference is not null then return existing_reference; end if;
  select * into recruitment_row from public.recruitments where id = p_recruitment_id for share;
  if not found or recruitment_row.status <> 'open'
    or (recruitment_row.opens_at is not null and recruitment_row.opens_at > now())
    or (recruitment_row.closes_at is not null and recruitment_row.closes_at <= now()) then
    raise exception 'recruitment_closed';
  end if;
  if recruitment_row.minimum_age is null then raise exception 'age_requirement_unconfirmed'; end if;
  if recruitment_row.minimum_age < 18 then raise exception 'guardian_flow_unavailable'; end if;
  if (p_payload->>'age')::integer < recruitment_row.minimum_age then raise exception 'age_requirement_not_met'; end if;
  if exists (select 1 from public.applications where recruitment_id = p_recruitment_id and lower(email) = lower(btrim(p_payload->>'email'))) then
    raise exception 'duplicate key: already_submitted';
  end if;
  -- reference_code has no default on the live table, so it is generated here.
  insert into public.applications (reference_code, recruitment_id, submission_key, full_name, email, whatsapp, regency, province,
    age, activity, interests, motivation, availability, skills, experience, data_consent, truthful_statement)
  values ('DDPE-' || upper(substr(md5(gen_random_uuid()::text), 1, 10)), p_recruitment_id, p_submission_key, btrim(p_payload->>'full_name'), lower(btrim(p_payload->>'email')),
    btrim(p_payload->>'whatsapp'), btrim(p_payload->>'regency'), btrim(p_payload->>'province'),
    (p_payload->>'age')::integer, p_payload->>'activity', btrim(p_payload->>'interests'),
    btrim(p_payload->>'motivation'), btrim(p_payload->>'availability'),
    coalesce(btrim(p_payload->>'skills'), ''), coalesce(btrim(p_payload->>'experience'), ''),
    (p_payload->>'data_consent')::boolean, (p_payload->>'truthful_statement')::boolean)
  on conflict (submission_key) do nothing
  returning reference_code into new_reference;
  if new_reference is null then
    select reference_code into new_reference from public.applications where submission_key = p_submission_key;
  end if;
  return new_reference;
end $$;

-- 3. Form kemitraan publik -> partnership_inquiries (status awal 'submitted').
create or replace function public.submit_ddpe_partnership(p_submission_key uuid, p_payload jsonb, p_fingerprint text)
returns text language plpgsql security definer set search_path = public, pg_temp as $$
declare existing_reference text; new_reference text;
begin
  if not public.consume_ddpe_rate_limit(p_fingerprint, 5) then raise exception 'rate_limited'; end if;
  select reference_code into existing_reference from public.partnership_inquiries where submission_key = p_submission_key;
  if existing_reference is not null then return existing_reference; end if;
  insert into public.partnership_inquiries (reference_code, submission_key, organization_name, contact_name, email, whatsapp,
    collaboration_type, message, data_consent)
  values ('MITRA-' || upper(substr(md5(gen_random_uuid()::text), 1, 10)), p_submission_key, btrim(p_payload->>'organization_name'), btrim(p_payload->>'contact_name'),
    lower(btrim(p_payload->>'email')), btrim(p_payload->>'whatsapp'), btrim(p_payload->>'collaboration_type'),
    btrim(p_payload->>'message'), (p_payload->>'data_consent')::boolean)
  on conflict (submission_key) do nothing
  returning reference_code into new_reference;
  if new_reference is null then
    select reference_code into new_reference from public.partnership_inquiries where submission_key = p_submission_key;
  end if;
  return new_reference;
end $$;

-- 4. Pendaftar: dashboard mengirim reviewing/accepted/rejected; database live memakai under_review.
create or replace function public.review_ddpe_application(p_application_id uuid, p_new_status text, p_note text, p_actor_id uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare application_row public.applications%rowtype; v_status text; quota integer; accepted_count integer;
begin
  v_status := case p_new_status when 'reviewing' then 'under_review' else p_new_status end;
  if v_status not in ('under_review', 'shortlisted', 'waitlisted', 'accepted', 'rejected') then raise exception 'invalid_status'; end if;
  select application.* into application_row
  from public.applications application
  join public.recruitments recruitment on recruitment.id = application.recruitment_id
  where application.id = p_application_id
    and exists (
      select 1 from public.ddpe_permissions permission_row
      where permission_row.user_id = p_actor_id and permission_row.permission = 'application_reviewer'
        and ((permission_row.scope_type = 'organization' and permission_row.scope_id is null)
          or (permission_row.scope_type = 'recruitment' and permission_row.scope_id = application.recruitment_id::text)
          or (permission_row.scope_type = 'program' and permission_row.scope_id = recruitment.program_id)
          or (permission_row.scope_type = 'pillar' and permission_row.scope_id = recruitment.pillar_id)))
  for update of application;
  if not found then raise exception 'not_found_or_forbidden'; end if;
  if application_row.status in ('accepted', 'rejected') then raise exception 'decision_final'; end if;
  if v_status = 'accepted' then
    perform pg_advisory_xact_lock(hashtextextended(application_row.recruitment_id::text, 0));
    select accepted_quota into quota from public.recruitments where id = application_row.recruitment_id;
    if quota is not null then
      select count(*) into accepted_count from public.applications
      where recruitment_id = application_row.recruitment_id and status = 'accepted' and id <> p_application_id;
      if accepted_count >= quota then raise exception 'quota_reached'; end if;
    end if;
  end if;
  update public.applications set status = v_status, internal_note = coalesce(p_note, ''),
    reviewed_by = p_actor_id, reviewed_at = now(), updated_at = now()
  where id = p_application_id;
  insert into public.ddpe_audit_log (actor_id, action, entity_type, entity_id, details)
  values (p_actor_id, 'application_status_changed', 'application', p_application_id::text,
    jsonb_build_object('from', application_row.status, 'to', v_status));
end $$;

-- 5. Kemitraan: dashboard mengirim reviewing/closed; database live memakai under_review/archived.
create or replace function public.review_ddpe_partnership(p_inquiry_id uuid, p_new_status text, p_note text, p_actor_id uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare inquiry_row public.partnership_inquiries%rowtype; v_status text;
begin
  v_status := case p_new_status when 'reviewing' then 'under_review' when 'closed' then 'archived' else p_new_status end;
  if v_status not in ('under_review', 'contacted', 'archived') then raise exception 'invalid_status'; end if;
  if not exists (
    select 1 from public.ddpe_permissions permission_row
    where permission_row.user_id = p_actor_id and permission_row.permission = 'partnership_reviewer'
      and permission_row.scope_type = 'organization' and permission_row.scope_id is null
  ) then raise exception 'partnership_reviewer_required'; end if;
  select * into inquiry_row from public.partnership_inquiries where id = p_inquiry_id for update;
  if not found then raise exception 'partnership_not_found'; end if;
  update public.partnership_inquiries set status = v_status, internal_note = coalesce(p_note, ''),
    reviewed_by = p_actor_id, reviewed_at = now(), updated_at = now()
  where id = p_inquiry_id;
  insert into public.ddpe_audit_log (actor_id, action, entity_type, entity_id, details)
  values (p_actor_id, 'partnership_status_changed', 'partnership', p_inquiry_id::text,
    jsonb_build_object('from', inquiry_row.status, 'to', v_status));
end $$;

-- 6. Konten Halaman dan Kegiatan & Agenda (site_settings cms_page:* / cms_event:*), dengan cek versi.
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

-- 7. Kelola Kepengurusan (site_settings 'leadership'), dengan cek versi.
create or replace function public.save_ddpe_leadership(p_value jsonb, p_actor uuid, p_version timestamptz)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare current_version timestamptz;
begin
  if not exists (select 1 from public.ddpe_permissions where user_id = p_actor and permission = 'content_editor'
    and scope_type = 'organization' and scope_id is null) then raise exception 'forbidden'; end if;
  if jsonb_typeof(p_value->'members') is distinct from 'array' then raise exception 'invalid_leadership'; end if;
  perform pg_advisory_xact_lock(hashtextextended('leadership', 0));
  select updated_at into current_version from public.site_settings where setting_key = 'leadership' for update;
  if current_version is distinct from p_version then raise exception 'cms_conflict'; end if;
  insert into public.site_settings (setting_key, value, is_public, updated_by, updated_at)
  values ('leadership', p_value, true, p_actor, clock_timestamp())
  on conflict (setting_key) do update set value = excluded.value, is_public = true,
    updated_by = excluded.updated_by, updated_at = excluded.updated_at;
  insert into public.ddpe_audit_log (actor_id, action, entity_type, entity_id, details)
  values (p_actor, 'leadership_saved', 'site_setting', 'leadership',
    jsonb_build_object('member_count', jsonb_array_length(p_value->'members')));
end $$;

-- 8. Akses: di database live user_id izin merujuk ddpe_profiles dan office_title disimpan di profil.
create or replace function public.grant_ddpe_permission(p_email text, p_office_title text, p_permission text, p_scope_type text, p_scope_id text, p_actor_id uuid)
returns table (id uuid, user_id uuid, email text, office_title text, permission text, scope_type text, scope_id text, created_at timestamptz)
language plpgsql security definer set search_path = public, auth, pg_temp as $$
#variable_conflict use_column
declare target_id uuid; target_email text; saved public.ddpe_permissions%rowtype; v_title text;
begin
  if p_permission not in ('access_manager', 'content_editor', 'publisher', 'application_reviewer', 'application_exporter', 'partnership_reviewer')
    or p_scope_type not in ('organization', 'pillar', 'program', 'recruitment')
    or (p_scope_type = 'organization' and p_scope_id is not null)
    or (p_scope_type <> 'organization' and p_scope_id is null)
    or (p_permission = 'partnership_reviewer' and p_scope_type <> 'organization') then
    raise exception 'invalid_permission_scope';
  end if;
  select users.id, users.email into target_id, target_email from auth.users users where lower(users.email) = lower(btrim(p_email)) limit 1;
  if target_id is null then raise exception 'auth_user_not_found'; end if;
  if target_id = p_actor_id then raise exception 'cannot_grant_self'; end if;
  if not exists (
    select 1 from public.ddpe_permissions manager
    where manager.user_id = p_actor_id and manager.permission = 'access_manager'
      and ((manager.scope_type = 'organization' and manager.scope_id is null)
        or (manager.scope_type = p_scope_type and manager.scope_id is not distinct from p_scope_id))
  ) then raise exception 'permission_scope_not_allowed'; end if;
  if p_permission = 'access_manager' and not exists (
    select 1 from public.ddpe_permissions manager
    where manager.user_id = p_actor_id and manager.permission = 'access_manager'
      and manager.scope_type = 'organization' and manager.scope_id is null
  ) then raise exception 'organization_manager_required'; end if;
  v_title := nullif(btrim(coalesce(p_office_title, '')), '');
  insert into public.ddpe_profiles as profile (user_id, email, full_name, office_title)
  values (target_id, lower(target_email), split_part(lower(target_email), '@', 1), coalesce(v_title, 'Pengurus DDPE'))
  on conflict (user_id) do update set office_title = coalesce(v_title, profile.office_title), updated_at = now();
  insert into public.ddpe_permissions as p (user_id, permission, scope_type, scope_id, granted_by)
  values (target_id, p_permission, p_scope_type, p_scope_id, p_actor_id)
  on conflict (user_id, permission, scope_type, (coalesce(scope_id, ''))) do nothing
  returning * into saved;
  if saved.id is null then
    select * into saved from public.ddpe_permissions existing
    where existing.user_id = target_id and existing.permission = p_permission
      and existing.scope_type = p_scope_type and existing.scope_id is not distinct from p_scope_id;
  else
    insert into public.ddpe_audit_log (actor_id, action, entity_type, entity_id, details)
    values (p_actor_id, 'permission_granted', 'permission', saved.id::text,
      jsonb_build_object('permission', p_permission, 'scope_type', p_scope_type, 'scope_id', p_scope_id));
  end if;
  return query select saved.id, saved.user_id, lower(target_email),
    (select pr.office_title from public.ddpe_profiles pr where pr.user_id = saved.user_id),
    saved.permission, saved.scope_type, saved.scope_id, saved.created_at;
end $$;

create or replace function public.revoke_ddpe_permission(p_permission_id uuid, p_actor_id uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare permission_row public.ddpe_permissions%rowtype; manager_count integer;
begin
  select * into permission_row from public.ddpe_permissions where id = p_permission_id for update;
  if not found or permission_row.user_id = p_actor_id then raise exception 'permission_scope_not_allowed'; end if;
  if not exists (
    select 1 from public.ddpe_permissions manager
    where manager.user_id = p_actor_id and manager.permission = 'access_manager'
      and ((manager.scope_type = 'organization' and manager.scope_id is null)
        or (manager.scope_type = permission_row.scope_type and manager.scope_id is not distinct from permission_row.scope_id))
  ) then raise exception 'permission_scope_not_allowed'; end if;
  perform pg_advisory_xact_lock(hashtextextended(permission_row.scope_type || ':' || coalesce(permission_row.scope_id, ''), 0));
  if permission_row.permission = 'access_manager' then
    select count(*) into manager_count from public.ddpe_permissions
    where permission = 'access_manager' and scope_type = permission_row.scope_type
      and scope_id is not distinct from permission_row.scope_id;
    if manager_count <= 1 then raise exception 'last_access_manager'; end if;
  end if;
  delete from public.ddpe_permissions where id = permission_row.id;
  insert into public.ddpe_audit_log (actor_id, action, entity_type, entity_id, details)
  values (p_actor_id, 'permission_revoked', 'permission', permission_row.id::text,
    jsonb_build_object('permission', permission_row.permission, 'scope_type', permission_row.scope_type, 'scope_id', permission_row.scope_id));
end $$;

-- 9. Moderasi Komentar: website menulis ke article_comments; tambahkan status agar komentar bisa disembunyikan.
alter table public.article_comments add column if not exists status text not null default 'approved';
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'article_comments_status_check') then
    alter table public.article_comments add constraint article_comments_status_check check (status in ('approved', 'rejected'));
  end if;
end $$;
drop policy if exists "Public can read article comments" on public.article_comments;
drop policy if exists "Publik dapat membaca komentar" on public.article_comments;
drop policy if exists article_comments_public_read_approved on public.article_comments;
create policy article_comments_public_read_approved on public.article_comments
  for select to anon, authenticated using (status = 'approved');

-- Semua RPC di atas hanya untuk API server (service_role).
do $$ declare f text; begin
  foreach f in array array[
    'public.consume_ddpe_rate_limit(text,integer)', 'public.submit_ddpe_application(uuid,uuid,jsonb,text)',
    'public.submit_ddpe_partnership(uuid,jsonb,text)', 'public.review_ddpe_application(uuid,text,text,uuid)',
    'public.review_ddpe_partnership(uuid,text,text,uuid)', 'public.save_ddpe_cms_setting(text,jsonb,uuid,timestamptz)',
    'public.save_ddpe_leadership(jsonb,uuid,timestamptz)', 'public.grant_ddpe_permission(text,text,text,text,text,uuid)',
    'public.revoke_ddpe_permission(uuid,uuid)',
    -- fungsi lama yang sebelumnya bisa dipanggil anon (temuan advisor); API memanggilnya sebagai service_role
    'public.list_ddpe_permissions(uuid)', 'public.has_ddpe_permission(uuid,text)']
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;
alter function public.list_ddpe_permissions(uuid) set search_path = public, auth, pg_temp;
alter function public.has_ddpe_permission(uuid, text) set search_path = public, pg_temp;

commit;

notify pgrst, 'reload schema';
