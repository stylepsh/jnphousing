-- ============================================================================
-- 020: 답사지 "발급(sheet)" 단위 + 통짜 번호(survey_seq)
--   박성혁 워크플로우: 30k 물건을 DB에 깔아두고, 답사팀이 지역별로 요청할 때
--   그 지역만 뽑아 답사지를 발급. 여러 지역 발급분이 동시에 미회수 상태로 존재한다.
--
--   따라서 "최근 1개"가 아니라 발급 단위로 식별해야 번호가 안 섞인다:
--     auction_survey_sheet  = 한 번의 답사지 발급(지역라벨 + 발급시각 + 건수)
--     auction_property.sheet_id = 이 물건이 속한 발급
--     auction_property.survey_seq = 그 발급 안에서의 통짜 번호(1~N)
--   사무실은 일괄입력 시 발급분을 직접 골라("2026-06-17 인천 부평구 · 312건")
--   그 안의 번호로만 매칭 → 부평구 47번이 남동구 47번에 섞이지 않는다.
-- ============================================================================

-- ─── A. 답사지 발급 ───
create table if not exists public.auction_survey_sheet (
  id uuid primary key default uuid_generate_v4(),
  region_label text not null,                    -- 지역 라벨 (주소 앞 3토큰 자동, 여러 지역이면 "… 외 N곳")
  printed_at timestamptz not null default now(), -- 발급(출력) 시각
  total_count integer not null default 0,        -- 발급 건수(번호 1~N)
  created_by text,                               -- 발급자
  created_at timestamptz default now()
);
create index if not exists idx_auction_sheet_printed
  on public.auction_survey_sheet(printed_at desc);

alter table public.auction_survey_sheet enable row level security;
drop policy if exists "auction_survey_sheet admin all" on public.auction_survey_sheet;
create policy "auction_survey_sheet admin all"
  on public.auction_survey_sheet for all
  using (public.is_admin()) with check (public.is_admin());

-- ─── B. auction_property 에 발급/번호 연결 ───
alter table public.auction_property
  add column if not exists survey_seq integer,   -- 발급 안에서의 통짜 번호(1~N)
  add column if not exists sheet_id uuid references public.auction_survey_sheet(id) on delete set null;

-- 번호 입력 화면이 "이 발급분의 N번"을 빠르게 찾도록
create index if not exists idx_auction_property_sheet
  on public.auction_property(sheet_id, survey_seq);

comment on table public.auction_survey_sheet is '답사지 발급 단위 — 지역별 발급분. 여러 발급이 동시에 미회수 상태로 공존한다';
comment on column public.auction_property.survey_seq is '발급(sheet) 안에서의 통짜 일련번호(1~N) — 번호 일괄입력 매칭 키';
comment on column public.auction_property.sheet_id is '이 물건이 속한 답사지 발급';

-- ─── C. 지역별 미답사 건수 (수집 화면 지역 게이트용) ───
-- 30k 를 브라우저에 다 올리지 않고, 지역 목록만 먼저 보여주고 선택 지역만 로드.
create or replace view public.v_auction_region_pending
with (security_invoker = true) as
select
  trim(
    coalesce(split_part(address, ' ', 1), '') || ' ' ||
    coalesce(split_part(address, ' ', 2), '') || ' ' ||
    coalesce(split_part(address, ' ', 3), '')
  ) as region,
  count(*) as pending_count
from public.auction_property
where survey_status = 'pending'
group by 1;

comment on view public.v_auction_region_pending is '지역(주소 앞 3토큰)별 미답사 건수 — 수집 화면 지역 게이트';
