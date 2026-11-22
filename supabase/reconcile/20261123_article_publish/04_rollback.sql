-- Rollback 02_apply.sql: kembali ke skema sebelum rekonsiliasi.
-- Perhatian: isi kolom baru (cover_caption, author_bio, tags, meta_description, slug revisi)
-- yang ditulis setelah apply akan hilang. Kolom lama dan baris artikel tetap utuh.
-- Untuk mengembalikan isi baris persis seperti sebelum apply, gunakan snapshot ddpe_backup (bagian akhir).
begin;
drop function if exists public.publish_ddpe_article(text, uuid, uuid);

alter table public.site_article_revisions
  drop column if exists slug,
  drop column if exists cover_caption,
  drop column if exists author_bio,
  drop column if exists tags,
  drop column if exists meta_description;

alter table public.site_articles
  drop column if exists cover_caption,
  drop column if exists author_bio,
  drop column if exists tags,
  drop column if exists meta_description;
commit;

notify pgrst, 'reload schema';

-- Opsional, hanya jika isi artikel juga harus dikembalikan ke kondisi snapshot:
-- begin;
-- delete from public.site_article_revisions;
-- delete from public.site_articles where id not in (select id from ddpe_backup.site_articles_20261123);
-- update public.site_articles a set
--   slug = b.slug, title = b.title, excerpt = b.excerpt, body = b.body, category = b.category,
--   category_label = b.category_label, author = b.author, cover_url = b.cover_url, cover_image = b.cover_image,
--   cover_media_id = b.cover_media_id, cover_alt = b.cover_alt, status = b.status, published_at = b.published_at,
--   published_by = b.published_by, updated_by = b.updated_by, updated_at = b.updated_at
-- from ddpe_backup.site_articles_20261123 b where a.id = b.id;
-- insert into public.site_article_revisions select * from ddpe_backup.site_article_revisions_20261123;
-- commit;
