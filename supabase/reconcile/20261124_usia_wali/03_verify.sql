-- Verifikasi read-only setelah 02_apply.sql. Semua baris harus bernilai true.
select 'kolom usia & wali ada' as cek, (select count(*) from information_schema.columns
  where table_schema = 'public' and table_name = 'applications'
    and column_name in ('birth_date', 'age_reference_date', 'is_minor', 'guardian_name', 'guardian_relationship',
      'guardian_whatsapp', 'guardian_email', 'guardian_consent', 'guardian_consent_at', 'guardian_consent_version')) = 10 as ok
union all
select 'constraint wali untuk peserta di bawah 18 ada', exists (select 1 from pg_constraint where conname = 'applications_minor_guardian_check')
union all
select 'lantai usia: DLDPE 14, DIDPE 14, AMEX 16',
  public.ddpe_program_min_age('ambassador', 'dldpe', null) = 14 and public.ddpe_program_min_age('ambassador', 'didpe', null) = 14
  and public.ddpe_program_min_age('volunteer', null, 'amex') = 16
union all
select 'hitung usia: ulang tahun belum tiba = tahun lalu',
  public.ddpe_age_on(date '2012-06-15', date '2026-06-14') = 13 and public.ddpe_age_on(date '2012-06-15', date '2026-06-15') = 14
union all
select 'RPC hanya untuk service_role', not has_function_privilege('anon', 'public.submit_ddpe_application(uuid,uuid,jsonb,text)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.submit_ddpe_application(uuid,uuid,jsonb,text)', 'EXECUTE')
  and has_function_privilege('service_role', 'public.submit_ddpe_application(uuid,uuid,jsonb,text)', 'EXECUTE')
union all
select 'jumlah pendaftar tidak berubah', (select count(*) from public.applications) = (select count(*) from ddpe_backup.ag_applications_20261124)
union all
select 'jumlah angkatan tidak berubah', (select count(*) from public.recruitments) = (select count(*) from ddpe_backup.ag_recruitments_20261124);
