-- Additive DDPE foundation. Review the live schema and take a backup before applying.
create extension if not exists pgcrypto;

create table if not exists public.site_settings (
  setting_key text primary key,
  value jsonb not null,
  is_public boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create table if not exists public.pillars (
  id text primary key,
  name text not null,
  description text not null default '',
  is_published boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create table if not exists public.programs (
  id text primary key,
  pillar_id text references public.pillars(id),
  name text not null,
  summary text not null default '',
  details text not null default '',
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create table if not exists public.recruitments (
  id uuid primary key default gen_random_uuid(),
  program_id text references public.programs(id),
  pillar_id text references public.pillars(id),
  kind text not null check (kind in ('ambassador', 'volunteer')),
  title text not null,
  scope text not null default '',
  requirements text not null default '',
  opens_at timestamptz,
  closes_at timestamptz,
  status text not null default 'closed' check (status in ('draft', 'open', 'closed', 'archived')),
  accepted_quota integer check (accepted_quota is null or accepted_quota >= 0),
  minimum_age smallint check (minimum_age is null or minimum_age between 1 and 120),
  guardian_review_required boolean not null default true,
  result_instructions text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  constraint recruitment_scope_check check (
    (kind = 'ambassador' and pillar_id is not null) or
    (kind = 'volunteer' and (program_id is not null or pillar_id is not null))
  ),
  constraint recruitment_window_check check (
    opens_at is null or closes_at is null or closes_at > opens_at
  )
);
create index if not exists recruitments_public_window_idx on public.recruitments (status, opens_at, closes_at);
alter table public.recruitments add column if not exists minimum_age smallint check (minimum_age is null or minimum_age between 1 and 120);

create table if not exists public.activities (
  id text primary key,
  program_id text references public.programs(id),
  title text not null,
  summary text not null default '',
  body text not null default '',
  starts_at timestamptz,
  ends_at timestamptz,
  location text not null default '',
  cover_url text,
  cover_alt text not null default '',
  status text not null default 'draft' check (status in ('draft', 'submitted', 'published', 'archived')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  published_by uuid references auth.users(id)
);
create index if not exists activities_public_start_idx on public.activities (starts_at) where status = 'published';

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null unique,
  public_url text not null unique,
  mime_type text not null check (mime_type in ('image/webp', 'image/png', 'image/jpeg')),
  byte_size integer not null check (byte_size between 1 and 3145728),
  alt_text text not null check (char_length(alt_text) between 4 and 220),
  uploaded_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists media_assets_uploaded_idx on public.media_assets (uploaded_by, created_at desc);

create table if not exists public.site_articles (
  id text primary key default gen_random_uuid()::text,
  legacy_id text unique,
  slug text not null unique,
  title text not null,
  excerpt text not null default '',
  body text not null default '',
  category text not null default 'berita',
  cover_url text,
  cover_alt text not null default '',
  status text not null default 'draft' check (status in ('draft', 'submitted', 'published', 'archived')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  published_by uuid references auth.users(id)
);
alter table public.site_articles add column if not exists cover_media_id uuid references public.media_assets(id);
create index if not exists site_articles_public_idx on public.site_articles (published_at desc) where status = 'published';

create table if not exists public.site_article_revisions (
  id uuid primary key default gen_random_uuid(),
  article_id text not null references public.site_articles(id),
  title text not null,
  excerpt text not null default '',
  body text not null default '',
  category text not null default 'berita',
  cover_url text,
  cover_alt text not null default '',
  status text not null default 'draft' check (status in ('draft', 'submitted', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id)
);
alter table public.site_article_revisions add column if not exists cover_media_id uuid references public.media_assets(id);
create index if not exists site_article_revisions_article_idx on public.site_article_revisions (article_id, created_at desc);

create table if not exists public.public_people (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  public_title text not null,
  pillar_id text references public.pillars(id),
  biography text not null default '',
  photo_url text,
  photo_alt text not null default '',
  sort_order integer not null default 0,
  is_published boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create table if not exists public.ddpe_permissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  office_title text,
  permission text not null check (permission in ('access_manager', 'content_editor', 'publisher', 'application_reviewer', 'application_exporter', 'partnership_reviewer')),
  scope_type text not null check (scope_type in ('organization', 'pillar', 'program', 'recruitment')),
  scope_id text,
  granted_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  constraint permission_scope_check check ((scope_type = 'organization' and scope_id is null) or (scope_type <> 'organization' and scope_id is not null))
);
alter table public.ddpe_permissions drop constraint if exists ddpe_permissions_permission_check;
alter table public.ddpe_permissions add constraint ddpe_permissions_permission_check
  check (permission in ('access_manager', 'content_editor', 'publisher', 'application_reviewer', 'application_exporter', 'partnership_reviewer'));
create unique index if not exists ddpe_permissions_unique_idx on public.ddpe_permissions (user_id, permission, scope_type, coalesce(scope_id, ''));
create index if not exists ddpe_permissions_user_idx on public.ddpe_permissions (user_id, permission);

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  reference_code text not null unique default ('DDPE-' || upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 10))),
  recruitment_id uuid not null references public.recruitments(id),
  submission_key uuid not null,
  full_name text not null check (char_length(full_name) between 2 and 120),
  email text not null check (char_length(email) between 5 and 254),
  whatsapp text not null check (char_length(whatsapp) between 8 and 32),
  regency text not null check (char_length(regency) between 2 and 100),
  province text not null check (char_length(province) between 2 and 100),
  age smallint not null check (age between 1 and 120),
  activity text not null check (activity in ('pelajar', 'mahasiswa', 'bekerja', 'lainnya')),
  interests text not null check (char_length(interests) between 2 and 1000),
  motivation text not null check (char_length(motivation) between 20 and 4000),
  availability text not null check (char_length(availability) between 2 and 1500),
  skills text not null default '' check (char_length(skills) <= 2000),
  experience text not null default '' check (char_length(experience) <= 3000),
  data_consent boolean not null check (data_consent),
  truthful_statement boolean not null check (truthful_statement),
  status text not null default 'new' check (status in ('new', 'reviewing', 'accepted', 'rejected')),
  internal_note text not null default '',
  notification_status text not null default 'not_sent' check (notification_status in ('not_sent', 'prepared', 'sent')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  unique (recruitment_id, submission_key)
);
create unique index if not exists applications_recruitment_email_idx on public.applications (recruitment_id, lower(email));
create index if not exists applications_review_idx on public.applications (recruitment_id, status, created_at desc);

create table if not exists public.partnership_inquiries (
  id uuid primary key default gen_random_uuid(),
  reference_code text not null unique default ('MITRA-' || upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 10))),
  submission_key uuid not null unique,
  organization_name text not null check (char_length(organization_name) between 2 and 180),
  contact_name text not null check (char_length(contact_name) between 2 and 120),
  email text not null check (char_length(email) between 5 and 254),
  whatsapp text not null check (char_length(whatsapp) between 8 and 32),
  collaboration_type text not null check (char_length(collaboration_type) between 2 and 120),
  message text not null check (char_length(message) between 20 and 4000),
  data_consent boolean not null check (data_consent),
  status text not null default 'new' check (status in ('new', 'reviewing', 'closed')),
  internal_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_by uuid references auth.users(id)
);
create index if not exists partnership_inquiries_review_idx on public.partnership_inquiries (status, created_at desc);

create table if not exists public.ddpe_audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id),
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists ddpe_audit_log_created_idx on public.ddpe_audit_log (created_at desc);

create table if not exists public.ddpe_rate_limits (
  fingerprint text not null,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (fingerprint, window_start)
);

create or replace function public.has_ddpe_permission(p_permission text, p_scope_type text, p_scope_id text default null)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.ddpe_permissions permission_row
    where permission_row.user_id = auth.uid()
      and permission_row.permission = p_permission
      and (
        (permission_row.scope_type = 'organization' and permission_row.scope_id is null)
        or (permission_row.scope_type = p_scope_type and permission_row.scope_id is not distinct from p_scope_id)
      )
  );
$$;
revoke all on function public.has_ddpe_permission(text, text, text) from public, anon;
grant execute on function public.has_ddpe_permission(text, text, text) to authenticated;

create or replace function public.consume_ddpe_rate_limit(p_fingerprint text, p_limit integer default 5)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_window timestamptz := date_trunc('minute', now());
  hit_count integer;
begin
  if p_fingerprint is null or char_length(p_fingerprint) < 32 or p_limit < 1 or p_limit > 20 then
    raise exception 'Invalid rate-limit request';
  end if;
  insert into public.ddpe_rate_limits (fingerprint, window_start, hits)
  values (p_fingerprint, current_window, 1)
  on conflict (fingerprint, window_start) do update
    set hits = public.ddpe_rate_limits.hits + 1
    where public.ddpe_rate_limits.hits < p_limit
  returning hits into hit_count;
  return hit_count is not null;
end;
$$;

create or replace function public.submit_ddpe_application(p_recruitment_id uuid, p_submission_key uuid, p_payload jsonb, p_fingerprint text)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  recruitment_row public.recruitments%rowtype;
  existing_reference text;
  new_reference text;
begin
  if not public.consume_ddpe_rate_limit(p_fingerprint, 5) then
    raise exception 'rate_limited';
  end if;
  select * into recruitment_row
  from public.recruitments
  where id = p_recruitment_id and kind in ('ambassador', 'volunteer')
  for share;
  if not found or recruitment_row.status <> 'open'
    or (recruitment_row.opens_at is not null and recruitment_row.opens_at > now())
    or (recruitment_row.closes_at is not null and recruitment_row.closes_at <= now()) then
    raise exception 'recruitment_closed';
  end if;
  if recruitment_row.minimum_age is null then raise exception 'age_requirement_unconfirmed'; end if;
  if recruitment_row.minimum_age < 18 then raise exception 'guardian_flow_unavailable'; end if;
  if (p_payload->>'age')::smallint < recruitment_row.minimum_age then raise exception 'age_requirement_not_met'; end if;
  select reference_code into existing_reference
  from public.applications
  where recruitment_id = p_recruitment_id and submission_key = p_submission_key;
  if existing_reference is not null then return existing_reference; end if;
  insert into public.applications (
    recruitment_id, submission_key, full_name, email, whatsapp, regency, province,
    age, activity, interests, motivation, availability, skills, experience,
    data_consent, truthful_statement
  ) values (
    p_recruitment_id, p_submission_key,
    btrim(p_payload->>'full_name'), lower(btrim(p_payload->>'email')),
    btrim(p_payload->>'whatsapp'), btrim(p_payload->>'regency'), btrim(p_payload->>'province'),
    (p_payload->>'age')::smallint, p_payload->>'activity', btrim(p_payload->>'interests'),
    btrim(p_payload->>'motivation'), btrim(p_payload->>'availability'),
    coalesce(btrim(p_payload->>'skills'), ''), coalesce(btrim(p_payload->>'experience'), ''),
    (p_payload->>'data_consent')::boolean, (p_payload->>'truthful_statement')::boolean
  ) on conflict (recruitment_id, submission_key) do nothing
    returning reference_code into new_reference;
  if new_reference is null then
    select reference_code into new_reference from public.applications
    where recruitment_id = p_recruitment_id and submission_key = p_submission_key;
  end if;
  return new_reference;
end;
$$;

create or replace function public.submit_ddpe_partnership(p_submission_key uuid, p_payload jsonb, p_fingerprint text)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  existing_reference text;
  new_reference text;
begin
  if not public.consume_ddpe_rate_limit(p_fingerprint, 5) then
    raise exception 'rate_limited';
  end if;
  select reference_code into existing_reference
  from public.partnership_inquiries where submission_key = p_submission_key;
  if existing_reference is not null then return existing_reference; end if;
  insert into public.partnership_inquiries (
    submission_key, organization_name, contact_name, email, whatsapp,
    collaboration_type, message, data_consent
  ) values (
    p_submission_key, btrim(p_payload->>'organization_name'), btrim(p_payload->>'contact_name'),
    lower(btrim(p_payload->>'email')), btrim(p_payload->>'whatsapp'),
    btrim(p_payload->>'collaboration_type'), btrim(p_payload->>'message'),
    (p_payload->>'data_consent')::boolean
  ) returning reference_code into new_reference;
  return new_reference;
end;
$$;

create or replace function public.review_ddpe_application(p_application_id uuid, p_new_status text, p_note text, p_actor_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  application_row public.applications%rowtype;
  quota integer;
  accepted_count integer;
begin
  if p_new_status not in ('reviewing', 'accepted', 'rejected') then raise exception 'invalid_status'; end if;
  select application.* into application_row
  from public.applications application
  join public.recruitments recruitment on recruitment.id = application.recruitment_id
  where application.id = p_application_id
    and exists (
      select 1 from public.ddpe_permissions permission_row
      where permission_row.user_id = p_actor_id
        and permission_row.permission = 'application_reviewer'
        and ((permission_row.scope_type = 'organization' and permission_row.scope_id is null)
          or (permission_row.scope_type = 'recruitment' and permission_row.scope_id = application.recruitment_id::text)
          or (permission_row.scope_type = 'program' and permission_row.scope_id = recruitment.program_id)
          or (permission_row.scope_type = 'pillar' and permission_row.scope_id = recruitment.pillar_id))
    )
  for update of application;
  if not found then raise exception 'not_found_or_forbidden'; end if;
  if application_row.status in ('accepted', 'rejected') then raise exception 'decision_final'; end if;
  if p_new_status = 'accepted' then
    perform pg_advisory_xact_lock(hashtextextended(application_row.recruitment_id::text, 0));
    select accepted_quota into quota from public.recruitments where id = application_row.recruitment_id;
    if quota is not null then
      select count(*) into accepted_count from public.applications
      where recruitment_id = application_row.recruitment_id and status = 'accepted' and id <> p_application_id;
      if accepted_count >= quota then raise exception 'quota_reached'; end if;
    end if;
  end if;
  update public.applications set status = p_new_status, internal_note = coalesce(p_note, ''),
    reviewed_by = p_actor_id, reviewed_at = now(), updated_at = now()
  where id = p_application_id;
  insert into public.ddpe_audit_log (actor_id, action, entity_type, entity_id, details)
  values (p_actor_id, 'application_status_changed', 'application', p_application_id::text,
    jsonb_build_object('from', application_row.status, 'to', p_new_status));
end;
$$;

create or replace function public.review_ddpe_partnership(p_inquiry_id uuid, p_new_status text, p_note text, p_actor_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  inquiry_row public.partnership_inquiries%rowtype;
begin
  if p_new_status not in ('reviewing', 'closed') then raise exception 'invalid_status'; end if;
  if not exists (
    select 1 from public.ddpe_permissions permission_row
    where permission_row.user_id = p_actor_id and permission_row.permission = 'partnership_reviewer'
      and permission_row.scope_type = 'organization' and permission_row.scope_id is null
  ) then raise exception 'partnership_reviewer_required'; end if;
  select * into inquiry_row from public.partnership_inquiries where id = p_inquiry_id for update;
  if not found then raise exception 'partnership_not_found'; end if;
  update public.partnership_inquiries set status = p_new_status, internal_note = coalesce(p_note, ''),
    reviewed_by = p_actor_id, updated_at = now()
  where id = p_inquiry_id;
  insert into public.ddpe_audit_log (actor_id, action, entity_type, entity_id, details)
  values (p_actor_id, 'partnership_status_changed', 'partnership', p_inquiry_id::text,
    jsonb_build_object('from', inquiry_row.status, 'to', p_new_status));
end;
$$;

create or replace function public.publish_ddpe_article(p_article_id text, p_revision_id uuid, p_actor_id uuid)
returns setof public.site_articles
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  article_row public.site_articles%rowtype;
  revision_row public.site_article_revisions%rowtype;
begin
  if not exists (
    select 1 from public.ddpe_permissions permission_row
    where permission_row.user_id = p_actor_id and permission_row.permission = 'publisher'
      and permission_row.scope_type = 'organization' and permission_row.scope_id is null
  ) then raise exception 'publisher_required'; end if;
  select * into article_row from public.site_articles where id = p_article_id for update;
  if not found then raise exception 'article_not_found'; end if;

  if p_revision_id is not null then
    select * into revision_row from public.site_article_revisions
    where id = p_revision_id and article_id = p_article_id for update;
    if not found or revision_row.status <> 'submitted' then raise exception 'revision_not_submitted'; end if;
    update public.site_articles set title = revision_row.title, excerpt = revision_row.excerpt,
      body = revision_row.body, category = revision_row.category, cover_url = revision_row.cover_url,
      cover_media_id = revision_row.cover_media_id, cover_alt = revision_row.cover_alt,
      status = 'published', published_at = now(), published_by = p_actor_id,
      updated_by = p_actor_id, updated_at = now()
    where id = p_article_id returning * into article_row;
    update public.site_article_revisions set status = 'approved', reviewed_at = now(), reviewed_by = p_actor_id
    where id = p_revision_id;
  else
    if article_row.status <> 'submitted' then raise exception 'article_not_submitted'; end if;
    update public.site_articles set status = 'published', published_at = now(), published_by = p_actor_id,
      updated_by = p_actor_id, updated_at = now()
    where id = p_article_id returning * into article_row;
  end if;

  insert into public.ddpe_audit_log (actor_id, action, entity_type, entity_id, details)
  values (p_actor_id, 'article_published', 'article', p_article_id,
    jsonb_build_object('revision_id', p_revision_id));
  return next article_row;
end;
$$;

create or replace function public.revoke_ddpe_permission(p_permission_id uuid, p_actor_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  permission_row public.ddpe_permissions%rowtype;
  manager_count integer;
begin
  select * into permission_row from public.ddpe_permissions
  where id = p_permission_id for update;
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
end;
$$;

create or replace function public.grant_ddpe_permission(p_email text, p_office_title text, p_permission text, p_scope_type text, p_scope_id text, p_actor_id uuid)
returns table (id uuid, user_id uuid, email text, office_title text, permission text, scope_type text, scope_id text, created_at timestamptz)
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  target_id uuid;
  saved public.ddpe_permissions%rowtype;
begin
  if p_permission not in ('access_manager', 'content_editor', 'publisher', 'application_reviewer', 'application_exporter', 'partnership_reviewer')
    or p_scope_type not in ('organization', 'pillar', 'program', 'recruitment')
    or (p_scope_type = 'organization' and p_scope_id is not null)
    or (p_scope_type <> 'organization' and p_scope_id is null) then
    raise exception 'invalid_permission_scope';
  end if;
  if p_permission = 'partnership_reviewer' and p_scope_type <> 'organization' then
    raise exception 'invalid_permission_scope';
  end if;
  select users.id into target_id from auth.users users where lower(users.email) = lower(btrim(p_email)) limit 1;
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
  insert into public.ddpe_permissions (user_id, office_title, permission, scope_type, scope_id, granted_by)
  values (target_id, nullif(btrim(p_office_title), ''), p_permission, p_scope_type, p_scope_id, p_actor_id)
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
  return query select saved.id, saved.user_id, lower(btrim(p_email)), saved.office_title, saved.permission, saved.scope_type, saved.scope_id, saved.created_at;
end;
$$;

create or replace function public.list_ddpe_permissions(p_actor_id uuid)
returns table (id uuid, user_id uuid, email text, office_title text, permission text, scope_type text, scope_id text, created_at timestamptz)
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if not exists (select 1 from public.ddpe_permissions manager where manager.user_id = p_actor_id and manager.permission = 'access_manager') then
    raise exception 'permission_scope_not_allowed';
  end if;
  return query
  select permission_row.id, permission_row.user_id, users.email::text, permission_row.office_title,
    permission_row.permission, permission_row.scope_type, permission_row.scope_id, permission_row.created_at
  from public.ddpe_permissions permission_row
  join auth.users users on users.id = permission_row.user_id
  where exists (
    select 1 from public.ddpe_permissions manager
    where manager.user_id = p_actor_id and manager.permission = 'access_manager'
      and ((manager.scope_type = 'organization' and manager.scope_id is null)
        or (manager.scope_type = permission_row.scope_type and manager.scope_id is not distinct from permission_row.scope_id))
  );
end;
$$;

revoke all on function public.consume_ddpe_rate_limit(text, integer) from public, anon, authenticated;
revoke all on function public.submit_ddpe_application(uuid, uuid, jsonb, text) from public, anon, authenticated;
revoke all on function public.submit_ddpe_partnership(uuid, jsonb, text) from public, anon, authenticated;
revoke all on function public.review_ddpe_application(uuid, text, text, uuid) from public, anon, authenticated;
revoke all on function public.review_ddpe_partnership(uuid, text, text, uuid) from public, anon, authenticated;
revoke all on function public.publish_ddpe_article(text, uuid, uuid) from public, anon, authenticated;
revoke all on function public.revoke_ddpe_permission(uuid, uuid) from public, anon, authenticated;
revoke all on function public.grant_ddpe_permission(text, text, text, text, text, uuid) from public, anon, authenticated;
revoke all on function public.list_ddpe_permissions(uuid) from public, anon, authenticated;
grant execute on function public.consume_ddpe_rate_limit(text, integer) to service_role;
grant execute on function public.submit_ddpe_application(uuid, uuid, jsonb, text) to service_role;
grant execute on function public.submit_ddpe_partnership(uuid, jsonb, text) to service_role;
grant execute on function public.review_ddpe_application(uuid, text, text, uuid) to service_role;
grant execute on function public.review_ddpe_partnership(uuid, text, text, uuid) to service_role;
grant execute on function public.publish_ddpe_article(text, uuid, uuid) to service_role;
grant execute on function public.revoke_ddpe_permission(uuid, uuid) to service_role;
grant execute on function public.grant_ddpe_permission(text, text, text, text, text, uuid) to service_role;
grant execute on function public.list_ddpe_permissions(uuid) to service_role;

alter table public.site_settings enable row level security;
alter table public.pillars enable row level security;
alter table public.programs enable row level security;
alter table public.recruitments enable row level security;
alter table public.activities enable row level security;
alter table public.site_articles enable row level security;
alter table public.site_article_revisions enable row level security;
alter table public.public_people enable row level security;
alter table public.ddpe_permissions enable row level security;
alter table public.applications enable row level security;
alter table public.partnership_inquiries enable row level security;
alter table public.ddpe_audit_log enable row level security;
alter table public.ddpe_rate_limits enable row level security;
alter table public.media_assets enable row level security;

grant select on public.site_settings, public.pillars, public.programs, public.recruitments,
  public.activities, public.site_articles, public.public_people to anon, authenticated;
grant select on public.media_assets to authenticated;
grant select on public.site_article_revisions, public.ddpe_permissions to authenticated;
grant insert, update on public.site_articles, public.activities, public.programs, public.pillars,
  public.recruitments, public.public_people, public.site_settings, public.site_article_revisions to authenticated;

drop policy if exists site_settings_public_read on public.site_settings;
create policy site_settings_public_read on public.site_settings for select to anon, authenticated using (is_public);
drop policy if exists site_settings_editor_write on public.site_settings;
create policy site_settings_editor_write on public.site_settings for all to authenticated
using (public.has_ddpe_permission('content_editor', 'organization', null))
with check (public.has_ddpe_permission('content_editor', 'organization', null));

drop policy if exists pillars_public_read on public.pillars;
create policy pillars_public_read on public.pillars for select to anon, authenticated using (is_published);
drop policy if exists pillars_editor_read on public.pillars;
create policy pillars_editor_read on public.pillars for select to authenticated using (public.has_ddpe_permission('content_editor', 'organization', null));
drop policy if exists pillars_editor_write on public.pillars;
create policy pillars_editor_write on public.pillars for all to authenticated
using (public.has_ddpe_permission('content_editor', 'organization', null))
with check (public.has_ddpe_permission('content_editor', 'organization', null) and not is_published);

drop policy if exists programs_public_read on public.programs;
create policy programs_public_read on public.programs for select to anon, authenticated using (is_published);
drop policy if exists programs_editor_read on public.programs;
create policy programs_editor_read on public.programs for select to authenticated using (
  public.has_ddpe_permission('content_editor', 'organization', null)
  or public.has_ddpe_permission('content_editor', 'pillar', pillar_id)
);
drop policy if exists programs_editor_write on public.programs;
create policy programs_editor_write on public.programs for all to authenticated
using (public.has_ddpe_permission('content_editor', 'pillar', pillar_id) or public.has_ddpe_permission('content_editor', 'organization', null))
with check ((public.has_ddpe_permission('content_editor', 'pillar', pillar_id) or public.has_ddpe_permission('content_editor', 'organization', null)) and not is_published);

drop policy if exists recruitments_public_read on public.recruitments;
create policy recruitments_public_read on public.recruitments for select to anon, authenticated
using (status = 'open' and minimum_age is not null and minimum_age >= 18
  and (opens_at is null or opens_at <= now()) and (closes_at is null or closes_at > now()));
drop policy if exists recruitments_staff_read on public.recruitments;
create policy recruitments_staff_read on public.recruitments for select to authenticated
using (public.has_ddpe_permission('content_editor', 'organization', null) or public.has_ddpe_permission('application_reviewer', 'recruitment', id::text));
drop policy if exists recruitments_editor_write on public.recruitments;
create policy recruitments_editor_write on public.recruitments for all to authenticated
using (public.has_ddpe_permission('content_editor', 'organization', null))
with check (public.has_ddpe_permission('content_editor', 'organization', null) and status in ('draft', 'closed', 'archived'));

drop policy if exists activities_public_read on public.activities;
create policy activities_public_read on public.activities for select to anon, authenticated using (status = 'published' and published_at <= now());
drop policy if exists activities_editor_read on public.activities;
create policy activities_editor_read on public.activities for select to authenticated using (public.has_ddpe_permission('content_editor', 'organization', null));
drop policy if exists activities_editor_write on public.activities;
create policy activities_editor_write on public.activities for all to authenticated
using (public.has_ddpe_permission('content_editor', 'organization', null))
with check (public.has_ddpe_permission('content_editor', 'organization', null) and status in ('draft', 'submitted'));

drop policy if exists site_articles_public_read on public.site_articles;
create policy site_articles_public_read on public.site_articles for select to anon, authenticated using (status = 'published' and published_at <= now());
drop policy if exists site_articles_editor_read on public.site_articles;
create policy site_articles_editor_read on public.site_articles for select to authenticated using (public.has_ddpe_permission('content_editor', 'organization', null));
drop policy if exists site_articles_editor_write on public.site_articles;
create policy site_articles_editor_write on public.site_articles for all to authenticated
using (public.has_ddpe_permission('content_editor', 'organization', null) and status = 'draft')
with check (public.has_ddpe_permission('content_editor', 'organization', null) and status = 'draft');

drop policy if exists article_revisions_staff_read on public.site_article_revisions;
create policy article_revisions_staff_read on public.site_article_revisions for select to authenticated using (public.has_ddpe_permission('content_editor', 'organization', null));
drop policy if exists article_revisions_editor_insert on public.site_article_revisions;
create policy article_revisions_editor_insert on public.site_article_revisions for insert to authenticated
with check (public.has_ddpe_permission('content_editor', 'organization', null) and created_by = auth.uid() and status = 'draft');

drop policy if exists public_people_public_read on public.public_people;
create policy public_people_public_read on public.public_people for select to anon, authenticated using (is_published);
drop policy if exists public_people_editor_read on public.public_people;
create policy public_people_editor_read on public.public_people for select to authenticated using (public.has_ddpe_permission('content_editor', 'organization', null));
drop policy if exists public_people_editor_write on public.public_people;
create policy public_people_editor_write on public.public_people for all to authenticated
using (public.has_ddpe_permission('content_editor', 'organization', null))
with check (public.has_ddpe_permission('content_editor', 'organization', null) and not is_published);

drop policy if exists permissions_self_or_manager_read on public.ddpe_permissions;
create policy permissions_self_or_manager_read on public.ddpe_permissions for select to authenticated
using (user_id = auth.uid() or public.has_ddpe_permission('access_manager', scope_type, scope_id));
drop policy if exists permissions_scoped_manager_insert on public.ddpe_permissions;
create policy permissions_scoped_manager_insert on public.ddpe_permissions for insert to authenticated
with check (
  permission <> 'access_manager'
  and public.has_ddpe_permission('access_manager', scope_type, scope_id)
  and granted_by = auth.uid()
);

-- Private tables intentionally have no anon/authenticated policies or grants.
revoke all on public.applications, public.partnership_inquiries, public.ddpe_audit_log, public.ddpe_rate_limits from anon, authenticated;
revoke all on public.media_assets from anon, authenticated;
grant select, insert, update on public.applications, public.partnership_inquiries, public.ddpe_audit_log, public.ddpe_rate_limits to service_role;
grant select, insert on public.media_assets to service_role;
grant usage, select on sequence public.ddpe_audit_log_id_seq to service_role;

-- Existing legacy tables (including articles and media_albums) are deliberately untouched.