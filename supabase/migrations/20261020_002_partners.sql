-- Additive partners catalog for official DDPE partners.
-- Review the live schema and take a backup before applying.

create table if not exists public.ddpe_partners (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  name_en text not null default '',
  summary_id text not null default '',
  summary_en text not null default '',
  logo_url text,
  alt_text_id text not null default '',
  alt_text_en text not null default '',
  website_url text,
  is_featured boolean not null default false,
  display_order integer not null default 0,
  is_published boolean not null default true,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id)
);

create index if not exists ddpe_partners_public_idx
  on public.ddpe_partners (is_published, display_order, created_at desc)
  where is_published = true and archived_at is null;

create index if not exists ddpe_partners_featured_idx
  on public.ddpe_partners (is_featured, display_order)
  where is_featured = true and is_published = true and archived_at is null;

insert into public.ddpe_partners (
  slug,
  name,
  name_en,
  summary_id,
  summary_en,
  is_featured,
  display_order,
  is_published,
  alt_text_id,
  alt_text_en
)
values
  (
    'ruangnmp-id',
    'Ruangnmp.id',
    'Ruangnmp.id',
    'Komunitas ruang belajar dan kolaborasi yang mendorong ekosistem digital terarah di Papua.',
    'A learning and collaboration community that supports a more purposeful digital ecosystem in Papua.',
    true,
    1,
    true,
    'Logo Ruangnmp.id',
    'Logo Ruangnmp.id'
  ),
  (
    'kwaran-kuala-kencana',
    'Kwaran Kuala Kencana',
    'Kwaran Kuala Kencana',
    'Jaringan komunitas yang memperkuat semangat kolaborasi dan penguatan kepemudaan di wilayah Kuala Kencana.',
    'A community network strengthening youth collaboration and civic engagement in the Kuala Kencana area.',
    true,
    2,
    true,
    'Logo Kwaran Kuala Kencana',
    'Logo Kwaran Kuala Kencana'
  ),
  (
    'smks-pk-yapis-tik-timika',
    'SMKS PK YAPIS TIK TIMIKA',
    'SMKS PK YAPIS TIK TIMIKA',
    'Satuan pendidikan mitra yang membuka ruang sinergi literasi, teknologi, dan pengembangan generasi muda.',
    'A partner school supporting opportunities for literacy, technology, and youth development through practical collaboration.',
    true,
    3,
    true,
    'Logo SMKS PK YAPIS TIK TIMIKA',
    'Logo SMKS PK YAPIS TIK TIMIKA'
  )
on conflict (slug) do nothing;

alter table public.ddpe_partners enable row level security;

create policy if not exists ddpe_partners_select_public
  on public.ddpe_partners
  for select
  to public
  using (is_published = true and archived_at is null);

create policy if not exists ddpe_partners_manage_admin
  on public.ddpe_partners
  for all
  to authenticated
  using (true)
  with check (true);

-- The policy above is intentionally permissive for development review and must be tightened
-- to role-based access agreed by the project owner before production publication.
