-- Rekonsiliasi minimal agar Ruang Pengurus dapat membuat, menyimpan, mengedit, dan menerbitkan artikel.
-- Sumber masalah: database live tidak memiliki kolom editorial yang dipakai API dan RPC publish_ddpe_article.
-- Sifat perubahan: aditif. Tidak menghapus, mengganti tipe, atau menulis ulang data yang sudah ada.
-- Hak akses pengurus (ddpe_permissions, ddpe_profiles) tidak disentuh.
-- Aman dijalankan ulang (idempoten).
begin;

alter table public.site_articles
  add column if not exists cover_caption text not null default '',
  add column if not exists author_bio text not null default '',
  add column if not exists tags jsonb not null default '[]'::jsonb,
  add column if not exists meta_description text not null default '';

alter table public.site_article_revisions
  add column if not exists slug text,
  add column if not exists cover_caption text not null default '',
  add column if not exists author_bio text not null default '',
  add column if not exists tags jsonb not null default '[]'::jsonb,
  add column if not exists meta_description text not null default '';

update public.site_article_revisions r
set slug = a.slug
from public.site_articles a
where a.id = r.article_id and r.slug is null;

alter table public.site_article_revisions alter column slug set not null;

-- Fungsi publish disesuaikan dengan skema live: site_articles.id bertipe uuid,
-- sedangkan API mengirim id sebagai teks. Id yang bukan uuid ditolak sebagai article_not_found.
create or replace function public.publish_ddpe_article(p_article_id text, p_revision_id uuid, p_actor_id uuid)
returns setof public.site_articles
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_article_id uuid;
  article_row public.site_articles%rowtype;
  revision_row public.site_article_revisions%rowtype;
begin
  if p_actor_id is null or not exists (
    select 1 from public.ddpe_permissions permission_row
    where permission_row.user_id = p_actor_id and permission_row.permission = 'publisher'
      and permission_row.scope_type = 'organization' and permission_row.scope_id is null
  ) then raise exception 'publisher_required'; end if;

  if p_article_id is null or p_article_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    raise exception 'article_not_found';
  end if;
  v_article_id := p_article_id::uuid;

  select * into article_row from public.site_articles where id = v_article_id for update;
  if not found then raise exception 'article_not_found'; end if;

  if p_revision_id is not null then
    select * into revision_row from public.site_article_revisions
    where id = p_revision_id and article_id = v_article_id for update;
    if not found or revision_row.status <> 'submitted' then raise exception 'revision_not_submitted'; end if;
    update public.site_articles set
      slug = revision_row.slug, title = revision_row.title, excerpt = revision_row.excerpt,
      body = revision_row.body, category = revision_row.category, author = revision_row.author,
      author_bio = revision_row.author_bio, cover_url = revision_row.cover_url,
      cover_media_id = revision_row.cover_media_id, cover_alt = revision_row.cover_alt,
      cover_caption = revision_row.cover_caption, tags = revision_row.tags,
      meta_description = revision_row.meta_description,
      status = 'published', published_at = coalesce(article_row.published_at, now()),
      published_by = p_actor_id, updated_by = p_actor_id, updated_at = now()
    where id = v_article_id returning * into article_row;
    update public.site_article_revisions set status = 'approved', reviewed_at = now(), reviewed_by = p_actor_id
    where id = p_revision_id;
  else
    if article_row.status <> 'submitted' then raise exception 'article_not_submitted'; end if;
    update public.site_articles set status = 'published', published_at = coalesce(article_row.published_at, now()),
      published_by = p_actor_id, updated_by = p_actor_id, updated_at = now()
    where id = v_article_id returning * into article_row;
  end if;

  insert into public.ddpe_audit_log (actor_id, action, entity_type, entity_id, details)
  values (p_actor_id, 'article_published', 'article', v_article_id::text, jsonb_build_object('revision_id', p_revision_id));
  return next article_row;
end;
$$;

-- Hanya API server (service_role) yang boleh memanggil fungsi ini.
revoke all on function public.publish_ddpe_article(text, uuid, uuid) from public, anon, authenticated;
grant execute on function public.publish_ddpe_article(text, uuid, uuid) to service_role;

commit;

-- Muat ulang cache skema PostgREST agar kolom dan RPC baru langsung terbaca.
notify pgrst, 'reload schema';
