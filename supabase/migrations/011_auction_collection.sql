-- ============================================================================
-- 011: 경매 물건 수집 + 답사 (부동산위탁관리 앱에서 이식)
--   박성혁 요청: jnphousing OS 경매 카테고리에 경매수집·답사 기능 이식
--   원본: C:\Users\style\projects\부동산위탁관리 (Prisma) → Supabase 변환
--
--   흐름: 지지옥션 등 텍스트 붙여넣기 → HUG/SGI 채권자 필터 → auction_property 저장
--        → 소유자별 풀에서 다중 선택 → 답사(survey) 진행/상태 관리
-- ============================================================================

-- ─── A. auction_survey_batch (답사 배치 — 한 번에 임포트한 그룹) ───
create table if not exists public.auction_survey_batch (
  id uuid primary key default uuid_generate_v4(),
  name text not null,                          -- 배치명 (예: "2026-06-02 보증채권 임포트")
  area text,                                   -- 답사 지역 (예: "서울 강서구")
  assigned_to text,                            -- 답사 담당자
  status text not null default 'created' check (status in
    ('created','assigned','in_progress','completed')),
  total_count integer not null default 0,
  vacant_count integer not null default 0,
  occupied_count integer not null default 0,
  revisit_count integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_auction_batch_status
  on public.auction_survey_batch(status);

alter table public.auction_survey_batch enable row level security;
drop policy if exists "auction_survey_batch admin all" on public.auction_survey_batch;
create policy "auction_survey_batch admin all"
  on public.auction_survey_batch for all
  using (public.is_admin()) with check (public.is_admin());

-- ─── B. auction_property (수집된 경매물건 + 답사 결과) ───
create table if not exists public.auction_property (
  id uuid primary key default uuid_generate_v4(),
  batch_id uuid references public.auction_survey_batch(id) on delete set null,

  -- 경매 물건 정보 (파싱 결과)
  case_number text not null,                   -- 사건번호 (예: 2026-50501 / 2024타경12345)
  court text,                                  -- 법원/계 (예: 서부6계)
  address text not null,                       -- 상세주소
  address_short text,                          -- 시/구/동
  owner_name text not null,                    -- 소유자
  creditor text,                               -- 채권자 (HUG/SGI)
  creditor_type text check (creditor_type in ('HUG','SGI','OTHER')),
  category text,                               -- 분류 (다세대, 아파트 등)
  appraisal_value bigint,                      -- 감정가 (원, 정수)
  minimum_bid bigint,                          -- 최저가 (원, 정수)
  auction_date text,                           -- 매각기일 (YYYY-MM-DD 문자열)
  dividend_deadline text,                      -- 배당종기일
  status text,                                 -- 진행상태 (진행/유찰 등 원본)
  raw_text text,                               -- 원본 붙여넣기 텍스트

  -- 답사 결과
  survey_status text not null default 'pending' check (survey_status in
    ('pending','vacant','occupied','revisit','skip','rejected')),
  survey_date date,
  survey_by text,                              -- 답사자
  door_code text,                              -- 현관 비밀번호
  meter_check jsonb,                           -- 계량기 체크
  survey_memo text,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_auction_property_batch
  on public.auction_property(batch_id);
create index if not exists idx_auction_property_owner
  on public.auction_property(owner_name);
create index if not exists idx_auction_property_survey
  on public.auction_property(survey_status);
create index if not exists idx_auction_property_case
  on public.auction_property(case_number);
-- 중복 차단 보조 (같은 주소 미답사 후보)
create index if not exists idx_auction_property_address
  on public.auction_property(address);

alter table public.auction_property enable row level security;
drop policy if exists "auction_property admin all" on public.auction_property;
create policy "auction_property admin all"
  on public.auction_property for all
  using (public.is_admin()) with check (public.is_admin());

comment on table public.auction_property is '경매 물건 수집 풀 + 답사 결과 — HUG/SGI 채권자 보증사고 물건 답사 대상';
comment on table public.auction_survey_batch is '경매 답사 배치 — 한 번 임포트한 물건 그룹 단위';
