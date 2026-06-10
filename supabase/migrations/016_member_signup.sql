-- ============================================================================
-- 016: 통합 회원가입 신청 + 승인 (임대인·임차인) / super 권한 정리
--   - member_applications: 홈페이지 가입신청 (임대인=auth 계정 생성, 임차인=신청만)
--   - landlord_users.landlord_id FK: landlords → owners 재배선
--     (012에서 owners 가 landlords id 를 재사용해 이관했으므로 기존 링크 그대로 유효,
--      신규 owners 레코드도 연결 가능해짐)
--   - stylepsh@gmail.com 만 super, 나머지 관리자는 staff 로 정리
-- ============================================================================

-- ─── 1) 가입신청 테이블 ───
create table if not exists public.member_applications (
  id uuid primary key default uuid_generate_v4(),
  role text not null check (role in ('landlord','tenant')),
  user_id uuid references auth.users(id) on delete set null,  -- 임대인 신청만 (auth.signUp 직후)
  name text not null,
  phone text not null,
  email text,
  property_info text,            -- 임대인: 보유 물건 주소 / 임차인: 거주 건물·호실
  memo text,
  status text not null default 'pending'
    check (status in ('pending','approved','rejected')),
  reject_reason text,
  linked_owner_id uuid references public.owners(id) on delete set null,  -- 임대인 승인 시 연결된 소유주
  approved_at timestamptz,
  approved_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

create index if not exists idx_member_applications_status
  on public.member_applications(status, role, created_at desc);

alter table public.member_applications enable row level security;

-- 본인 신청 등록 (임대인: signUp 직후 본인 user_id 로 insert)
drop policy if exists "member_applications insert own" on public.member_applications;
create policy "member_applications insert own"
  on public.member_applications for insert
  with check (auth.uid() = user_id);

-- 본인 신청 조회 (승인 대기 화면)
drop policy if exists "member_applications select own" on public.member_applications;
create policy "member_applications select own"
  on public.member_applications for select
  using (auth.uid() = user_id or public.is_admin());

-- 관리자 전체 권한 (승인/반려는 server action 에서 super 검증)
drop policy if exists "member_applications admin all" on public.member_applications;
create policy "member_applications admin all"
  on public.member_applications for all
  using (public.is_admin()) with check (public.is_admin());

drop trigger if exists trg_member_applications_updated_at on public.member_applications;
create trigger trg_member_applications_updated_at
  before update on public.member_applications
  for each row execute function public.set_updated_at();

comment on table public.member_applications is '홈페이지 통합 회원가입 신청 — super 관리자만 승인';

-- ─── 2) landlord_users — 없으면 생성(004 미적용 환경), 있으면 FK 만 owners 로 재배선 ───
create table if not exists public.landlord_users (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  landlord_id uuid not null unique references public.owners(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists idx_landlord_users_landlord on public.landlord_users (landlord_id);

alter table public.landlord_users enable row level security;

drop policy if exists "landlord_users_self_select" on public.landlord_users;
create policy "landlord_users_self_select"
  on public.landlord_users for select
  using (auth.uid() = user_id or public.is_admin());

drop policy if exists "landlord_users_admin_all" on public.landlord_users;
create policy "landlord_users_admin_all"
  on public.landlord_users for all
  using (public.is_admin()) with check (public.is_admin());

-- 기존 테이블이 landlords 를 참조 중이면 owners 로 재배선 (신규 생성 시엔 사실상 no-op)
alter table public.landlord_users drop constraint if exists landlord_users_landlord_id_fkey;
alter table public.landlord_users
  add constraint landlord_users_landlord_id_fkey
  foreign key (landlord_id) references public.owners(id) on delete cascade;

-- ─── 3) super 권한 정리: stylepsh@gmail.com 만 super ───
update public.admin_users a
set role = 'super'
from auth.users u
where a.user_id = u.id and u.email = 'stylepsh@gmail.com';

update public.admin_users a
set role = 'staff'
from auth.users u
where a.user_id = u.id and u.email <> 'stylepsh@gmail.com' and a.role = 'super';
