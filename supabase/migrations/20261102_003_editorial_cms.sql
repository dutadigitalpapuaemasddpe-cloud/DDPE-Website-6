-- Apply after 20261020_001_foundation.sql and existing media setup.
begin;
alter table public.site_articles add column if not exists author text not null default 'Tim Redaksi DDPE';
alter table public.site_articles add column if not exists author_bio text not null default '';
alter table public.site_articles add column if not exists cover_caption text not null default '';
alter table public.site_articles add column if not exists tags jsonb not null default '[]'::jsonb;
alter table public.site_articles add column if not exists meta_description text not null default '';
alter table public.site_article_revisions add column if not exists author text not null default 'Tim Redaksi DDPE';
alter table public.site_article_revisions add column if not exists author_bio text not null default '';
alter table public.site_article_revisions add column if not exists cover_caption text not null default '';
alter table public.site_article_revisions add column if not exists tags jsonb not null default '[]'::jsonb;
alter table public.site_article_revisions add column if not exists meta_description text not null default '';
alter table public.site_article_revisions add column if not exists slug text;
update public.site_article_revisions r set slug=a.slug from public.site_articles a where a.id=r.article_id and r.slug is null;
alter table public.site_article_revisions alter column slug set not null;
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
    update public.site_articles set slug = revision_row.slug, author = revision_row.author, author_bio = revision_row.author_bio, cover_caption = revision_row.cover_caption, tags = revision_row.tags, meta_description = revision_row.meta_description, title = revision_row.title, excerpt = revision_row.excerpt,
      body = revision_row.body, category = revision_row.category, cover_url = revision_row.cover_url,
      cover_media_id = revision_row.cover_media_id, cover_alt = revision_row.cover_alt,
      status = 'published', published_at = coalesce(article_row.published_at, now()), published_by = p_actor_id,
      updated_by = p_actor_id, updated_at = now()
    where id = p_article_id returning * into article_row;
    update public.site_article_revisions set status = 'approved', reviewed_at = now(), reviewed_by = p_actor_id
    where id = p_revision_id;
  else
    if article_row.status <> 'submitted' then raise exception 'article_not_submitted'; end if;
    update public.site_articles set status = 'published', published_at = coalesce(article_row.published_at, now()), published_by = p_actor_id,
      updated_by = p_actor_id, updated_at = now()
    where id = p_article_id returning * into article_row;
  end if;

  insert into public.ddpe_audit_log (actor_id, action, entity_type, entity_id, details)
  values (p_actor_id, 'article_published', 'article', p_article_id,
    jsonb_build_object('revision_id', p_revision_id));
  return next article_row;
end;
$$;


create or replace function public.save_ddpe_cms_setting(p_key text,p_value jsonb,p_actor uuid,p_version timestamptz)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare old_version timestamptz;
begin
 if not exists(select 1 from public.ddpe_permissions where user_id=p_actor and permission='content_editor' and scope_type='organization' and scope_id is null) then raise exception 'forbidden'; end if;
 if p_key !~ '^cms_(page|event):[a-zA-Z0-9_.-]+$' then raise exception 'invalid_key'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_key,0));
 select updated_at into old_version from public.site_settings where setting_key=p_key for update;
 if old_version is distinct from p_version then raise exception 'cms_conflict'; end if;
 insert into public.site_settings(setting_key,value,is_public,updated_by,updated_at) values(p_key,p_value,true,p_actor,clock_timestamp())
 on conflict(setting_key) do update set value=excluded.value,is_public=true,updated_by=excluded.updated_by,updated_at=excluded.updated_at;
end $$;
revoke all on function public.save_ddpe_cms_setting(text,jsonb,uuid,timestamptz) from public,anon,authenticated;
grant execute on function public.save_ddpe_cms_setting(text,jsonb,uuid,timestamptz) to service_role;
create table if not exists public.cms_likes(article_id text not null,visitor text not null,created_at timestamptz not null default now(),primary key(article_id,visitor));
create table if not exists public.cms_comments(id uuid primary key default gen_random_uuid(),article_id text not null,name text not null check(char_length(name) between 2 and 80),body text not null check(char_length(body) between 5 and 2000),status text not null default 'pending' check(status in ('pending','approved','rejected')),created_at timestamptz not null default now());
create index if not exists cms_comments_article on public.cms_comments(article_id,status,created_at desc);
alter table public.cms_likes enable row level security;
alter table public.cms_comments enable row level security;
revoke all on public.cms_likes,public.cms_comments from anon,authenticated;
grant all on public.cms_likes,public.cms_comments to service_role;
insert into public.site_settings(setting_key,value,is_public) values('cms_event:event-amex-2026','{"id":"event-amex-2026","title":"Asa Mimika Expedition / AMEX","text":"Pelaksanaan AMEX pada 14–15 November 2026. Informasi lengkap tersedia di halaman program.","date":"2026-11-14T00:00+09:00","location":"Mimika, Papua Tengah","status":"upcoming","image":"assets/survei_lok_timsesVolunteer.png","alt":"Dokumentasi survei tim Volunteer","button":"Lihat program AMEX","href":"program-amex.html"}'::jsonb,true) on conflict(setting_key) do nothing;
commit;
