-- ============================================================================
-- JNP주택관리 초기 스키마
-- 2026-05-22 작성
-- ============================================================================

-- 확장 ----------------------------------------------------------------------
create extension if not exists "uuid-ossp";

-- 공용 트리거 함수 ----------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================================
-- 1. properties (관리현장)
-- ============================================================================
create table if not exists public.properties (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  address text not null,
  type text not null check (type in ('officetel','apartment','villa','commercial')),
  total_units int default 0,
  description text,
  thumbnail_url text,
  is_published boolean not null default true,
  display_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_properties_published_order
  on public.properties (is_published, display_order);

create trigger trg_properties_updated_at
  before update on public.properties
  for each row execute function public.set_updated_at();

-- ============================================================================
-- 2. complaints (민원/AS 접수)
-- ============================================================================
create table if not exists public.complaints (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid references public.properties(id) on delete set null,
  building_name text,
  unit_number text,
  tenant_name text not null,
  tenant_phone text not null,
  category text not null check (category in ('as','complaint','noise','facility','etc')),
  title text not null,
  content text not null,
  images text[] default '{}',
  status text not null default 'received'
    check (status in ('received','in_progress','resolved','closed')),
  admin_memo text,
  assigned_to text,
  kakao_channel_sent boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists idx_complaints_status_created
  on public.complaints (status, created_at desc);
create index if not exists idx_complaints_property
  on public.complaints (property_id);
create index if not exists idx_complaints_phone
  on public.complaints (tenant_phone);

create trigger trg_complaints_updated_at
  before update on public.complaints
  for each row execute function public.set_updated_at();

-- ============================================================================
-- 3. notices (입주민 공지)
-- ============================================================================
create table if not exists public.notices (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid references public.properties(id) on delete set null,
  title text not null,
  content text not null,
  is_pinned boolean not null default false,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_notices_published_pinned
  on public.notices (is_published, is_pinned desc, created_at desc);

create trigger trg_notices_updated_at
  before update on public.notices
  for each row execute function public.set_updated_at();

-- ============================================================================
-- 4. downloads (서류 다운로드)
-- ============================================================================
create table if not exists public.downloads (
  id uuid primary key default uuid_generate_v4(),
  category text not null check (category in ('contract','guide','form')),
  title text not null,
  description text,
  file_url text not null,
  file_size_kb int,
  version text,
  is_published boolean not null default true,
  display_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_downloads_published_order
  on public.downloads (is_published, category, display_order);

create trigger trg_downloads_updated_at
  before update on public.downloads
  for each row execute function public.set_updated_at();

-- ============================================================================
-- 5. inquiries (신규건물 관리문의)
-- ============================================================================
create table if not exists public.inquiries (
  id uuid primary key default uuid_generate_v4(),
  company_name text,
  contact_name text not null,
  phone text not null,
  email text,
  building_address text not null,
  building_type text,
  total_units int,
  message text not null,
  status text not null default 'new'
    check (status in ('new','contacted','closed')),
  admin_memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_inquiries_status_created
  on public.inquiries (status, created_at desc);

create trigger trg_inquiries_updated_at
  before update on public.inquiries
  for each row execute function public.set_updated_at();

-- ============================================================================
-- 6. agencies (부동산 회원)
-- ============================================================================
create table if not exists public.agencies (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  company_name text not null,
  business_number text not null,
  representative text not null,
  phone text not null,
  address text,
  status text not null default 'pending'
    check (status in ('pending','approved','rejected')),
  reject_reason text,
  approved_at timestamptz,
  approved_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_agencies_status on public.agencies (status);
create index if not exists idx_agencies_user on public.agencies (user_id);

create trigger trg_agencies_updated_at
  before update on public.agencies
  for each row execute function public.set_updated_at();

-- ============================================================================
-- 7. vacancies (공실매물)
-- ============================================================================
create table if not exists public.vacancies (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid not null references public.properties(id) on delete cascade,
  unit_number text not null,
  floor int,
  area_m2 numeric(8,2),
  area_pyeong numeric(8,2),
  room_count int,
  bathroom_count int,
  deposit bigint default 0,
  monthly_rent bigint default 0,
  maintenance_fee bigint default 0,
  move_in_date date,
  description text,
  images text[] default '{}',
  status text not null default 'available'
    check (status in ('available','reserved','contracted')),
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_vacancies_published_status
  on public.vacancies (is_published, status, created_at desc);
create index if not exists idx_vacancies_property
  on public.vacancies (property_id);

create trigger trg_vacancies_updated_at
  before update on public.vacancies
  for each row execute function public.set_updated_at();

-- ============================================================================
-- 8. admin_users (관리자)
-- ============================================================================
create table if not exists public.admin_users (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  name text not null,
  role text not null default 'staff' check (role in ('super','staff')),
  created_at timestamptz not null default now()
);

-- ============================================================================
-- 헬퍼: 현재 사용자가 관리자인지 / 승인된 부동산인지
-- ============================================================================
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users where user_id = auth.uid()
  );
$$;

create or replace function public.is_approved_agency()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.agencies
    where user_id = auth.uid() and status = 'approved'
  );
$$;

-- ============================================================================
-- RLS
-- ============================================================================
alter table public.properties enable row level security;
alter table public.complaints enable row level security;
alter table public.notices enable row level security;
alter table public.downloads enable row level security;
alter table public.inquiries enable row level security;
alter table public.agencies enable row level security;
alter table public.vacancies enable row level security;
alter table public.admin_users enable row level security;

-- properties: 공개 조회 (is_published=true), 관리자만 변경
drop policy if exists "properties_public_select" on public.properties;
create policy "properties_public_select"
  on public.properties for select
  using (is_published = true or public.is_admin());

drop policy if exists "properties_admin_all" on public.properties;
create policy "properties_admin_all"
  on public.properties for all
  using (public.is_admin())
  with check (public.is_admin());

-- complaints: 누구나 INSERT, 관리자만 SELECT (조회는 서버 액션에서 phone+id 매칭)
drop policy if exists "complaints_public_insert" on public.complaints;
create policy "complaints_public_insert"
  on public.complaints for insert
  with check (true);

drop policy if exists "complaints_admin_select" on public.complaints;
create policy "complaints_admin_select"
  on public.complaints for select
  using (public.is_admin());

drop policy if exists "complaints_admin_modify" on public.complaints;
create policy "complaints_admin_modify"
  on public.complaints for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "complaints_admin_delete" on public.complaints;
create policy "complaints_admin_delete"
  on public.complaints for delete
  using (public.is_admin());

-- notices: 공개 조회, 관리자 변경
drop policy if exists "notices_public_select" on public.notices;
create policy "notices_public_select"
  on public.notices for select
  using (is_published = true or public.is_admin());

drop policy if exists "notices_admin_all" on public.notices;
create policy "notices_admin_all"
  on public.notices for all
  using (public.is_admin())
  with check (public.is_admin());

-- downloads: 공개 조회, 관리자 변경
drop policy if exists "downloads_public_select" on public.downloads;
create policy "downloads_public_select"
  on public.downloads for select
  using (is_published = true or public.is_admin());

drop policy if exists "downloads_admin_all" on public.downloads;
create policy "downloads_admin_all"
  on public.downloads for all
  using (public.is_admin())
  with check (public.is_admin());

-- inquiries: 누구나 INSERT, 관리자만 SELECT/수정
drop policy if exists "inquiries_public_insert" on public.inquiries;
create policy "inquiries_public_insert"
  on public.inquiries for insert
  with check (true);

drop policy if exists "inquiries_admin_select" on public.inquiries;
create policy "inquiries_admin_select"
  on public.inquiries for select
  using (public.is_admin());

drop policy if exists "inquiries_admin_modify" on public.inquiries;
create policy "inquiries_admin_modify"
  on public.inquiries for update
  using (public.is_admin())
  with check (public.is_admin());

-- agencies: 누구나 본인용 INSERT, 본인 또는 관리자 SELECT, 관리자만 status 변경
drop policy if exists "agencies_self_insert" on public.agencies;
create policy "agencies_self_insert"
  on public.agencies for insert
  with check (auth.uid() = user_id);

drop policy if exists "agencies_self_or_admin_select" on public.agencies;
create policy "agencies_self_or_admin_select"
  on public.agencies for select
  using (auth.uid() = user_id or public.is_admin());

drop policy if exists "agencies_self_update_profile" on public.agencies;
create policy "agencies_self_update_profile"
  on public.agencies for update
  using (auth.uid() = user_id and status = 'approved')
  with check (auth.uid() = user_id);

drop policy if exists "agencies_admin_all" on public.agencies;
create policy "agencies_admin_all"
  on public.agencies for all
  using (public.is_admin())
  with check (public.is_admin());

-- vacancies: 승인된 부동산 또는 관리자만 조회, 관리자만 변경
drop policy if exists "vacancies_approved_or_admin_select" on public.vacancies;
create policy "vacancies_approved_or_admin_select"
  on public.vacancies for select
  using (
    (is_published = true and public.is_approved_agency())
    or public.is_admin()
  );

drop policy if exists "vacancies_admin_all" on public.vacancies;
create policy "vacancies_admin_all"
  on public.vacancies for all
  using (public.is_admin())
  with check (public.is_admin());

-- admin_users: 관리자만
drop policy if exists "admin_users_self_select" on public.admin_users;
create policy "admin_users_self_select"
  on public.admin_users for select
  using (auth.uid() = user_id or public.is_admin());

drop policy if exists "admin_users_super_modify" on public.admin_users;
create policy "admin_users_super_modify"
  on public.admin_users for all
  using (
    exists (
      select 1 from public.admin_users
      where user_id = auth.uid() and role = 'super'
    )
  )
  with check (
    exists (
      select 1 from public.admin_users
      where user_id = auth.uid() and role = 'super'
    )
  );

-- ============================================================================
-- Storage 버킷 (Supabase Dashboard 에서 만들거나 아래 SQL 실행)
-- ============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('complaints-images', 'complaints-images', true, 5242880, array['image/jpeg','image/png','image/webp','image/heic']),
  ('vacancy-images',    'vacancy-images',    true, 10485760, array['image/jpeg','image/png','image/webp']),
  ('downloads',         'downloads',         true, 20971520, null),
  ('property-images',   'property-images',   true, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

-- Storage 정책 (public read는 위 public=true 로 자동 처리, 업로드 정책만 추가)
-- complaints-images: 누구나 업로드 (민원 접수용)
drop policy if exists "complaints_images_public_upload" on storage.objects;
create policy "complaints_images_public_upload"
  on storage.objects for insert
  with check (bucket_id = 'complaints-images');

-- vacancy-images, downloads, property-images: 관리자만 업로드/삭제
drop policy if exists "admin_uploads" on storage.objects;
create policy "admin_uploads"
  on storage.objects for insert
  with check (
    bucket_id in ('vacancy-images','downloads','property-images')
    and public.is_admin()
  );

drop policy if exists "admin_deletes" on storage.objects;
create policy "admin_deletes"
  on storage.objects for delete
  using (
    bucket_id in ('vacancy-images','downloads','property-images','complaints-images')
    and public.is_admin()
  );

drop policy if exists "admin_updates" on storage.objects;
create policy "admin_updates"
  on storage.objects for update
  using (
    bucket_id in ('vacancy-images','downloads','property-images')
    and public.is_admin()
  );
