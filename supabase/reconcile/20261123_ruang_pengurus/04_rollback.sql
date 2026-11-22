-- Rollback 02_apply.sql (Ruang Pengurus). Mengembalikan skema, policy, dan hak EXECUTE seperti sebelum apply.
-- Baris yang dibuat lewat RPC baru setelah apply (pendaftaran, kemitraan, konten, izin) TIDAK dihapus.
-- Isi kolom article_comments.status ikut hilang (komentar yang ditolak akan tampil lagi).
begin;
drop function if exists public.consume_ddpe_rate_limit(text, integer);
drop function if exists public.submit_ddpe_application(uuid, uuid, jsonb, text);
drop function if exists public.submit_ddpe_partnership(uuid, jsonb, text);
drop function if exists public.review_ddpe_application(uuid, text, text, uuid);
drop function if exists public.review_ddpe_partnership(uuid, text, text, uuid);
drop function if exists public.save_ddpe_cms_setting(text, jsonb, uuid, timestamptz);
drop function if exists public.save_ddpe_leadership(jsonb, uuid, timestamptz);
drop function if exists public.grant_ddpe_permission(text, text, text, text, text, uuid);
drop function if exists public.revoke_ddpe_permission(uuid, uuid);
drop table if exists public.ddpe_rate_limits;

-- Hak EXECUTE dan search_path fungsi lama seperti semula.
grant execute on function public.list_ddpe_permissions(uuid) to public, anon, authenticated;
grant execute on function public.has_ddpe_permission(uuid, text) to public, anon, authenticated;
alter function public.list_ddpe_permissions(uuid) reset search_path;
alter function public.has_ddpe_permission(uuid, text) reset search_path;

-- Policy baca komentar seperti semula.
drop policy if exists article_comments_public_read_approved on public.article_comments;
create policy "Public can read article comments" on public.article_comments for select to anon, authenticated using (true);
create policy "Publik dapat membaca komentar" on public.article_comments for select to public using (true);
alter table public.article_comments drop constraint if exists article_comments_status_check;
alter table public.article_comments drop column if exists status;
commit;

notify pgrst, 'reload schema';
