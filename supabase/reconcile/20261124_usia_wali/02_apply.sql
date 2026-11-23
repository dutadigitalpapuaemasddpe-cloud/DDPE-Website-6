-- Aturan usia per program + persetujuan orang tua/wali.
--   DLDPE 14 tahun, DIDPE 14 tahun, Relawan AMEX 16 tahun; peserta < 18 tahun wajib data + persetujuan wali.
-- Usia SELALU dihitung dari tanggal lahir terhadap tanggal acuan = tanggal pendaftaran di zona Asia/Jayapura (WIT).
-- Sifat: aditif. Kolom baru nullable/berdefault, tidak ada baris yang dihapus atau diubah. Aman dijalankan ulang.
-- Urutan rilis: jalankan SQL ini LEBIH DULU, baru deploy kode API/formulir yang memakai kolom baru.
begin;

-- 1. Kolom baru pada pendaftar. Pendaftar lama: birth_date NULL, is_minor false (usia lama tetap di kolom age).
alter table public.applications add column if not exists birth_date date;
alter table public.applications add column if not exists age_reference_date date;
alter table public.applications add column if not exists is_minor boolean not null default false;
alter table public.applications add column if not exists guardian_name text;
alter table public.applications add column if not exists guardian_relationship text;
alter table public.applications add column if not exists guardian_whatsapp text;
alter table public.applications add column if not exists guardian_email text;
alter table public.applications add column if not exists guardian_consent boolean not null default false;
alter table public.applications add column if not exists guardian_consent_at timestamptz;
alter table public.applications add column if not exists guardian_consent_version text;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'applications_minor_guardian_check' and conrelid = 'public.applications'::regclass) then
    alter table public.applications add constraint applications_minor_guardian_check check (
      not is_minor or (guardian_consent and guardian_consent_at is not null and char_length(btrim(coalesce(guardian_name, ''))) >= 2
        and char_length(btrim(coalesce(guardian_whatsapp, ''))) >= 8)
    );
  end if;
end $$;

comment on column public.applications.birth_date is 'Data pribadi. Hanya untuk verifikasi usia oleh peninjau; jangan diekspor atau dikirim lewat email.';
comment on column public.applications.guardian_name is 'Data pribadi wali peserta di bawah 18 tahun. Jangan diekspor atau dikirim lewat email.';

-- 2. Batas usia terendah per program (lantai). Nilai minimum_age per angkatan tidak boleh di bawah ini.
create or replace function public.ddpe_program_min_age(p_kind text, p_pillar_id text, p_program_id text)
returns integer language sql immutable set search_path = public, pg_temp as $$
  select case
    when lower(coalesce(p_program_id, '')) like 'amex%' or lower(coalesce(p_pillar_id, '')) like 'amex%' then 16
    else 14
  end
$$;

-- 3. Usia penuh pada tanggal acuan (sama dengan aturan JavaScript: ulang tahun yang belum tiba tidak dihitung).
create or replace function public.ddpe_age_on(p_birth_date date, p_reference_date date)
returns integer language sql immutable set search_path = public, pg_temp as $$
  select date_part('year', age(p_reference_date, p_birth_date))::integer
$$;

-- 4. Pendaftaran publik. Backend menghitung usia sendiri dari birth_date; nilai usia dari klien diabaikan.
create or replace function public.submit_ddpe_application(p_recruitment_id uuid, p_submission_key uuid, p_payload jsonb, p_fingerprint text)
returns text language plpgsql security definer set search_path = public, pg_temp as $$
declare
  recruitment_row public.recruitments%rowtype; existing_reference text; new_reference text;
  v_birth date; v_ref date; v_age integer; v_min integer; v_minor boolean;
  v_g_name text; v_g_rel text; v_g_wa text; v_g_email text;
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

  -- Tanggal acuan = hari pendaftaran di WIT; tanggal lahir wajib valid dan tidak di masa depan.
  v_ref := (now() at time zone 'Asia/Jayapura')::date;
  begin
    v_birth := (p_payload->>'birth_date')::date;
  exception when others then
    raise exception 'invalid_birth_date';
  end;
  if v_birth is null or v_birth > v_ref or v_birth < date '1900-01-01' then raise exception 'invalid_birth_date'; end if;
  v_age := public.ddpe_age_on(v_birth, v_ref);
  if v_age > 120 then raise exception 'invalid_birth_date'; end if;

  if recruitment_row.minimum_age is null then raise exception 'age_requirement_unconfirmed'; end if;
  v_min := greatest(recruitment_row.minimum_age::integer,
    public.ddpe_program_min_age(recruitment_row.kind, recruitment_row.pillar_id, recruitment_row.program_id));
  if v_age < v_min then raise exception 'age_requirement_not_met'; end if;

  v_minor := v_age < 18;
  if v_minor then
    v_g_name := btrim(p_payload->>'guardian_name');
    v_g_rel := btrim(p_payload->>'guardian_relationship');
    v_g_wa := btrim(p_payload->>'guardian_whatsapp');
    v_g_email := nullif(lower(btrim(coalesce(p_payload->>'guardian_email', ''))), '');
    if coalesce((p_payload->>'guardian_consent')::boolean, false) is not true
      or v_g_name is null or char_length(v_g_name) < 2 or char_length(v_g_name) > 120
      or coalesce(v_g_rel, '') not in ('ayah', 'ibu', 'wali')
      or v_g_wa is null or char_length(v_g_wa) < 8 or char_length(v_g_wa) > 32
      or (v_g_email is not null and (char_length(v_g_email) > 254 or v_g_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$')) then
      raise exception 'guardian_consent_required';
    end if;
  end if;

  if exists (select 1 from public.applications where recruitment_id = p_recruitment_id and lower(email) = lower(btrim(p_payload->>'email'))) then
    raise exception 'duplicate key: already_submitted';
  end if;
  -- reference_code has no default on the live table, so it is generated here.
  insert into public.applications (reference_code, recruitment_id, submission_key, full_name, email, whatsapp, regency, province,
    age, birth_date, age_reference_date, is_minor, guardian_name, guardian_relationship, guardian_whatsapp, guardian_email,
    guardian_consent, guardian_consent_at, guardian_consent_version,
    activity, interests, motivation, availability, skills, experience, data_consent, truthful_statement)
  values ('DDPE-' || upper(substr(md5(gen_random_uuid()::text), 1, 10)), p_recruitment_id, p_submission_key, btrim(p_payload->>'full_name'), lower(btrim(p_payload->>'email')),
    btrim(p_payload->>'whatsapp'), btrim(p_payload->>'regency'), btrim(p_payload->>'province'),
    v_age, v_birth, v_ref, v_minor, case when v_minor then v_g_name end, case when v_minor then v_g_rel end,
    case when v_minor then v_g_wa end, case when v_minor then v_g_email end,
    v_minor, case when v_minor then now() end, case when v_minor then '2026-11-24' end,
    p_payload->>'activity', btrim(p_payload->>'interests'),
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

-- 5. Peninjauan: peserta di bawah 18 tahun tidak dapat diterima tanpa catatan persetujuan wali.
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
  if v_status = 'accepted' and application_row.is_minor and not application_row.guardian_consent then
    raise exception 'guardian_consent_required';
  end if;
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

-- 6. Hak eksekusi: hanya service_role (dipanggil API server), seperti fungsi lain.
revoke all on function public.submit_ddpe_application(uuid, uuid, jsonb, text) from public, anon, authenticated;
revoke all on function public.review_ddpe_application(uuid, text, text, uuid) from public, anon, authenticated;
revoke all on function public.ddpe_program_min_age(text, text, text) from public, anon, authenticated;
revoke all on function public.ddpe_age_on(date, date) from public, anon, authenticated;
grant execute on function public.submit_ddpe_application(uuid, uuid, jsonb, text) to service_role;
grant execute on function public.review_ddpe_application(uuid, text, text, uuid) to service_role;
grant execute on function public.ddpe_program_min_age(text, text, text) to service_role;
grant execute on function public.ddpe_age_on(date, date) to service_role;
commit;
