-- Semua baris harus true.
select
  (select pg_get_functiondef('public.save_ddpe_cms_setting(text,jsonb,uuid,timestamptz)'::regprocedure) like '%(page|event|partner)%') as rpc_allows_partner,
  (select count(*) = 3 from public.site_settings where setting_key in
    ('cms_partner:ruangnmp-id','cms_partner:kwaran-kuala-kencana','cms_partner:smks-pk-yapis-tik-timika')) as three_legacy_partners,
  (select count(*) = 1 from public.site_settings where setting_key = 'cms_partner:ruangnmp-id') as no_duplicate,
  (select bool_and(is_public) from public.site_settings where setting_key like 'cms_partner:%') as partners_public,
  (select count(*) from public.site_settings where setting_key not like 'cms_partner:%')
    = (select count(*) from ddpe_backup.mc_site_settings_20261125) as other_settings_untouched,
  not has_function_privilege('anon', 'public.save_ddpe_cms_setting(text,jsonb,uuid,timestamptz)', 'execute') as rpc_not_anon;
