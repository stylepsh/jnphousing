-- ============================================================================
-- 006: Content CMS — 공지사항 게시판, 블로그, FAQ, 후기, 회사 연혁, 인증서
--      + downloads.audience 컬럼 추가 (서식 다운로드 영역 분리)
-- ============================================================================

-- ─── 1) downloads 에 audience 컬럼 추가 (부동산 전용 / 임차인 전용 / 공용 분리) ───
alter table public.downloads
  add column if not exists audience text not null default 'public'
  check (audience in ('public','tenant','agency','landlord'));

create index if not exists idx_downloads_audience
  on public.downloads (audience, is_published, display_order);

-- ─── 2) 공지사항 게시판 (회사 공식 공지·뉴스, 모든 방문자 열람) ───
create table if not exists public.notices_board (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  slug text unique,
  category text not null default 'general'
    check (category in ('general','press','update','holiday','important')),
  content text not null,
  excerpt text,
  cover_image_url text,
  is_pinned boolean not null default false,
  is_published boolean not null default false,
  published_at timestamptz,
  view_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_notices_board_published
  on public.notices_board (is_published, is_pinned desc, published_at desc);

alter table public.notices_board enable row level security;
drop policy if exists "notices_board public read" on public.notices_board;
create policy "notices_board public read"
  on public.notices_board for select
  using (is_published = true);
drop policy if exists "notices_board admin all" on public.notices_board;
create policy "notices_board admin all"
  on public.notices_board for all
  using (public.is_admin()) with check (public.is_admin());

create trigger trg_notices_board_updated_at
  before update on public.notices_board
  for each row execute function public.set_updated_at();

-- ─── 3) 블로그 (전문 칼럼) ───
create table if not exists public.blog_posts (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  slug text unique not null,
  category text not null default 'tip',
  tags text[] not null default '{}',
  content text not null,
  excerpt text,
  cover_image_url text,
  author_name text not null default '제이앤피 주택관리',
  reading_time_min int,
  is_published boolean not null default false,
  published_at timestamptz,
  view_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_blog_posts_published
  on public.blog_posts (is_published, published_at desc);
create index if not exists idx_blog_posts_category
  on public.blog_posts (category, is_published, published_at desc);

alter table public.blog_posts enable row level security;
drop policy if exists "blog public read" on public.blog_posts;
create policy "blog public read"
  on public.blog_posts for select
  using (is_published = true);
drop policy if exists "blog admin all" on public.blog_posts;
create policy "blog admin all"
  on public.blog_posts for all
  using (public.is_admin()) with check (public.is_admin());

create trigger trg_blog_posts_updated_at
  before update on public.blog_posts
  for each row execute function public.set_updated_at();

-- ─── 4) FAQ ───
create table if not exists public.faq (
  id uuid primary key default uuid_generate_v4(),
  category text not null default 'general'
    check (category in ('general','housing','rental','dispute','contract','payment')),
  question text not null,
  answer text not null,
  display_order int not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_faq_published
  on public.faq (is_published, category, display_order);

alter table public.faq enable row level security;
drop policy if exists "faq public read" on public.faq;
create policy "faq public read"
  on public.faq for select
  using (is_published = true);
drop policy if exists "faq admin all" on public.faq;
create policy "faq admin all"
  on public.faq for all
  using (public.is_admin()) with check (public.is_admin());

create trigger trg_faq_updated_at
  before update on public.faq
  for each row execute function public.set_updated_at();

-- ─── 5) 후기/리뷰 (임대인·임차인) ───
create table if not exists public.reviews (
  id uuid primary key default uuid_generate_v4(),
  author_role text not null check (author_role in ('tenant','landlord','agency')),
  author_initial text not null,  -- 김OO, 박OO (이니셜만 노출)
  property_name text,  -- 부천 OO빌딩 (선택)
  rating int not null check (rating between 1 and 5),
  content text not null,
  is_featured boolean not null default false,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_reviews_published
  on public.reviews (is_published, is_featured desc, created_at desc);

alter table public.reviews enable row level security;
drop policy if exists "reviews public read" on public.reviews;
create policy "reviews public read"
  on public.reviews for select
  using (is_published = true);
drop policy if exists "reviews admin all" on public.reviews;
create policy "reviews admin all"
  on public.reviews for all
  using (public.is_admin()) with check (public.is_admin());

-- ─── 6) 회사 연혁 (about 페이지 timeline 강화용) ───
create table if not exists public.company_milestones (
  id uuid primary key default uuid_generate_v4(),
  year int not null,
  month int,
  title text not null,
  description text,
  display_order int not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists idx_milestones_year
  on public.company_milestones (is_published, year desc, month desc, display_order);

alter table public.company_milestones enable row level security;
drop policy if exists "milestones public read" on public.company_milestones;
create policy "milestones public read"
  on public.company_milestones for select
  using (is_published = true);
drop policy if exists "milestones admin all" on public.company_milestones;
create policy "milestones admin all"
  on public.company_milestones for all
  using (public.is_admin()) with check (public.is_admin());

-- ─── 7) 인증서·자격증 (회사소개 신뢰도 강화용) ───
create table if not exists public.certifications (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  issuer text,  -- 발급기관 (HUG, 협회 등)
  issued_date date,
  image_url text,
  display_order int not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists idx_certifications_order
  on public.certifications (is_published, display_order);

alter table public.certifications enable row level security;
drop policy if exists "certifications public read" on public.certifications;
create policy "certifications public read"
  on public.certifications for select
  using (is_published = true);
drop policy if exists "certifications admin all" on public.certifications;
create policy "certifications admin all"
  on public.certifications for all
  using (public.is_admin()) with check (public.is_admin());

-- ─── 8) 부동산 활동 로그 (P28-82) ───
create table if not exists public.agency_activity_log (
  id bigserial primary key,
  agency_id uuid not null references public.agencies(id) on delete cascade,
  vacancy_id uuid references public.vacancies(id) on delete set null,
  action text not null check (action in ('view','bookmark','unbookmark','inquiry_request','contract_request')),
  metadata jsonb default '{}'::jsonb,
  ip text,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists idx_agency_activity_agency
  on public.agency_activity_log (agency_id, created_at desc);
create index if not exists idx_agency_activity_vacancy
  on public.agency_activity_log (vacancy_id, created_at desc);

alter table public.agency_activity_log enable row level security;
drop policy if exists "agency_activity self read" on public.agency_activity_log;
create policy "agency_activity self read"
  on public.agency_activity_log for select
  using (
    agency_id in (select id from public.agencies where user_id = auth.uid())
  );
drop policy if exists "agency_activity admin read" on public.agency_activity_log;
create policy "agency_activity admin read"
  on public.agency_activity_log for select
  using (public.is_admin());

-- ─── 9) 부동산 찜 (P28-79) ───
create table if not exists public.agency_bookmarks (
  agency_id uuid not null references public.agencies(id) on delete cascade,
  vacancy_id uuid not null references public.vacancies(id) on delete cascade,
  note text,
  created_at timestamptz not null default now(),
  primary key (agency_id, vacancy_id)
);
create index if not exists idx_agency_bookmarks_agency
  on public.agency_bookmarks (agency_id, created_at desc);

alter table public.agency_bookmarks enable row level security;
drop policy if exists "agency_bookmarks self" on public.agency_bookmarks;
create policy "agency_bookmarks self"
  on public.agency_bookmarks for all
  using (
    agency_id in (select id from public.agencies where user_id = auth.uid())
  ) with check (
    agency_id in (select id from public.agencies where user_id = auth.uid())
  );

-- ─── 10) 부동산 임차인 연결 신청 (P28-80) ───
create table if not exists public.agency_lead_requests (
  id uuid primary key default uuid_generate_v4(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  vacancy_id uuid not null references public.vacancies(id) on delete cascade,
  tenant_name text not null,
  tenant_phone text not null,
  preferred_move_in date,
  budget_deposit bigint,
  budget_rent bigint,
  note text,
  status text not null default 'submitted'
    check (status in ('submitted','contacted','contracted','rejected','withdrawn')),
  admin_memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_lead_requests_status
  on public.agency_lead_requests (status, created_at desc);
create index if not exists idx_lead_requests_agency
  on public.agency_lead_requests (agency_id, created_at desc);

alter table public.agency_lead_requests enable row level security;
drop policy if exists "lead_requests self" on public.agency_lead_requests;
create policy "lead_requests self"
  on public.agency_lead_requests for all
  using (
    agency_id in (select id from public.agencies where user_id = auth.uid() and status = 'approved')
  ) with check (
    agency_id in (select id from public.agencies where user_id = auth.uid() and status = 'approved')
  );
drop policy if exists "lead_requests admin all" on public.agency_lead_requests;
create policy "lead_requests admin all"
  on public.agency_lead_requests for all
  using (public.is_admin()) with check (public.is_admin());

create trigger trg_lead_requests_updated_at
  before update on public.agency_lead_requests
  for each row execute function public.set_updated_at();
