-- Rollback 02_apply.sql. Memulihkan definisi fungsi lama dari ddpe_backup.ag_functions_20261124.
-- Kolom usia/wali TIDAK dihapus (menghindari kehilangan data pendaftar baru). Untuk menghapusnya,
-- jalankan blok "opsional" di bawah setelah data diekspor dengan aman.
begin;
do $$ declare r record; begin
  for r in select definition from ddpe_backup.ag_functions_20261124 loop execute r.definition; end loop;
end $$;
drop function if exists public.ddpe_program_min_age(text, text, text);
drop function if exists public.ddpe_age_on(date, date);
alter table public.applications drop constraint if exists applications_minor_guardian_check;
commit;

-- opsional (menghapus data tanggal lahir dan wali):
-- alter table public.applications
--   drop column if exists birth_date, drop column if exists age_reference_date, drop column if exists is_minor,
--   drop column if exists guardian_name, drop column if exists guardian_relationship, drop column if exists guardian_whatsapp,
--   drop column if exists guardian_email, drop column if exists guardian_consent, drop column if exists guardian_consent_at,
--   drop column if exists guardian_consent_version;
