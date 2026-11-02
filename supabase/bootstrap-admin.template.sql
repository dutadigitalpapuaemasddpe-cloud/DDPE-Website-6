-- Jalankan satu kali secara manual di SQL Editor setelah membuat akun Auth.
-- Ganti email berikut dengan akun pribadi pengelola awal yang disetujui.
-- Jangan menjalankan dari browser atau membuka endpoint bootstrap publik.
begin;

do $$
declare
  account_id uuid;
  bootstrap_email text := 'GANTI-DENGAN-EMAIL-AKUN-ADMIN';
begin
  select id into account_id
  from auth.users
  where lower(email) = lower(bootstrap_email)
  limit 1;

  if account_id is null then
    raise exception 'Buat akun Auth terlebih dahulu dan ganti email pada template ini.';
  end if;

  insert into public.ddpe_permissions (user_id, permission, scope_type, scope_id, granted_by)
  values
    (account_id, 'access_manager', 'organization', null, account_id),
    (account_id, 'content_editor', 'organization', null, account_id),
    (account_id, 'publisher', 'organization', null, account_id)
  on conflict do nothing;
end $$;

commit;

-- Jangan tambahkan application_reviewer/application_exporter tanpa keputusan terpisah.