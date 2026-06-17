-- ============================================================================
-- 021: 전수조사 대상 임대인 (2차 worklist)
--   박성혁 워크플로우: 1차 표본 답사 → 임대인별 자동 판정.
--   표본이 전부 공실인 임대인 = "운용 안 하고 깔아둔 임대인" 의심 →
--   그 임대인의 보유 물건 전체를 재수집(2차 전수조사)해야 한다.
--   이 테이블은 "전수조사할 임대인 별도 명단"을 영속화한다(owner_name 텍스트 키).
--
--   흐름: 판정 화면에서 [전수조사 지정] → 여기 적재(pending)
--        → 사무실이 그 임대인 전체 물건 재수집(collecting)
--        → 2차 공실 재답사 완료(done) / 제외(dropped)
-- ============================================================================

create table if not exists public.auction_full_survey_target (
  id uuid primary key default uuid_generate_v4(),
  owner_name text not null unique,               -- 임대인(소유자명) — auction_property.owner_name 과 동일 키
  status text not null default 'pending' check (status in
    ('pending','collecting','done','dropped')),
  reason text,                                   -- 지정 사유 (예: "표본 3/3 공실")
  sample_total integer not null default 0,       -- 지정 시점 표본 답사 건수
  sample_vacant integer not null default 0,      -- 그중 공실 건수
  designated_by text,                            -- 지정자
  note text,                                      -- 진행 메모
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_full_survey_target_status
  on public.auction_full_survey_target(status);

alter table public.auction_full_survey_target enable row level security;
drop policy if exists "auction_full_survey_target admin all" on public.auction_full_survey_target;
create policy "auction_full_survey_target admin all"
  on public.auction_full_survey_target for all
  using (public.is_admin()) with check (public.is_admin());

comment on table public.auction_full_survey_target is
  '전수조사 대상 임대인 명단(2차 worklist) — 1차 표본 전부 공실인 임대인을 전체 재수집 대상으로 지정';
