-- ============================================================================
-- 매물 사진 다중 관리 + 광고 채널 추적 (Phase 15)
-- ============================================================================

-- ============================================================================
-- vacancy_images: 매물 사진 (다중, 순서)
-- 기존 vacancies.images text[] 는 유지 (백워드 호환), 새로 등록은 이 테이블 사용.
-- ============================================================================
create table if not exists public.vacancy_images (
  id uuid primary key default uuid_generate_v4(),
  vacancy_id uuid not null references public.vacancies(id) on delete cascade,
  url text not null,
  caption text,
  display_order int not null default 0,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_vacancy_images_vacancy on public.vacancy_images (vacancy_id, display_order);

alter table public.vacancy_images enable row level security;

drop policy if exists "vacancy_images_public_select" on public.vacancy_images;
create policy "vacancy_images_public_select"
  on public.vacancy_images for select
  using (
    exists (
      select 1 from public.vacancies v
      where v.id = vacancy_id
        and (v.is_published = true and public.is_approved_agency())
    )
    or public.is_admin()
  );

drop policy if exists "vacancy_images_admin_all" on public.vacancy_images;
create policy "vacancy_images_admin_all"
  on public.vacancy_images for all
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================================
-- 광고 채널 마스터
-- ============================================================================
create table if not exists public.ad_channels (
  id uuid primary key default uuid_generate_v4(),
  code text not null unique,                 -- 'peterpan', '33m2', 'zigbang', 'dabang', 'naver', 'direct'
  name text not null,                        -- '피터팬의좋은방구하기', '삼삼엠투', '직방', '다방', '네이버부동산', 'JNP 자체'
  base_url text,
  notes text,
  display_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.ad_channels enable row level security;

drop policy if exists "ad_channels_select" on public.ad_channels;
create policy "ad_channels_select"
  on public.ad_channels for select
  using (public.is_admin() or public.is_approved_agency());

drop policy if exists "ad_channels_admin_all" on public.ad_channels;
create policy "ad_channels_admin_all"
  on public.ad_channels for all
  using (public.is_admin())
  with check (public.is_admin());

-- 기본 채널 시드
insert into public.ad_channels (code, name, base_url, display_order) values
  ('direct', 'JNP 자체', null, 1),
  ('peterpan', '피터팬의좋은방구하기', 'https://www.peterpanz.com', 2),
  ('33m2', '삼삼엠투', 'https://33m2.co.kr', 3),
  ('zigbang', '직방', 'https://www.zigbang.com', 4),
  ('dabang', '다방', 'https://www.dabangapp.com', 5),
  ('naver', '네이버부동산', 'https://land.naver.com', 6),
  ('etc', '기타', null, 99)
on conflict (code) do nothing;

-- ============================================================================
-- 매물 × 채널 등록 추적
-- ============================================================================
create table if not exists public.vacancy_ad_listings (
  id uuid primary key default uuid_generate_v4(),
  vacancy_id uuid not null references public.vacancies(id) on delete cascade,
  channel_id uuid not null references public.ad_channels(id) on delete restrict,
  listing_url text,
  listed_at date not null default current_date,
  unlisted_at date,
  inquiry_count int not null default 0,        -- 수기 누적
  status text not null default 'active'
    check (status in ('active','closed','contracted')),
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (vacancy_id, channel_id, listed_at)
);
create index if not exists idx_vacancy_ad_vacancy on public.vacancy_ad_listings (vacancy_id);
create index if not exists idx_vacancy_ad_channel on public.vacancy_ad_listings (channel_id, status);

create trigger trg_vacancy_ad_updated_at before update on public.vacancy_ad_listings
  for each row execute function public.set_updated_at();

alter table public.vacancy_ad_listings enable row level security;

drop policy if exists "vacancy_ad_admin_all" on public.vacancy_ad_listings;
create policy "vacancy_ad_admin_all"
  on public.vacancy_ad_listings for all
  using (public.is_admin())
  with check (public.is_admin());

-- 부동산 회원은 본인이 본 매물의 채널 정보 조회 가능
drop policy if exists "vacancy_ad_agency_select" on public.vacancy_ad_listings;
create policy "vacancy_ad_agency_select"
  on public.vacancy_ad_listings for select
  using (
    public.is_approved_agency()
    and exists (
      select 1 from public.vacancies v
      where v.id = vacancy_id and v.is_published = true
    )
  );
