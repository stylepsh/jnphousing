-- 036: 답사지 발급 이력 (누구에게·언제·어느 지역·몇 건).
--   문제: 엑셀 답사지는 발급 기록이 아예 안 남고(PDF만 sheet 생성), 받는 팀도 기록이 없어
--         "7월에 이 지역 A팀 줬는데 9월에 또 줬다"를 시스템이 못 막았다.
--   해결: 발급 시 팀명·발급수단 기록 + 발급-물건 매핑 보존(sheet_id 는 최신만 남아 이력 소실).
--         물건에는 마지막 배포 표시용 컬럼을 두어 목록에서 배지로 바로 보이게 한다.
alter table public.auction_survey_sheet
  add column if not exists team_name text,                   -- 받는 답사팀 (자유 입력)
  add column if not exists kind text not null default 'pdf', -- pdf | xlsx
  add column if not exists note text;

-- 발급 시점의 물건 명단 보존 (sheet_id 는 재발급 시 덮어써지므로 이력용으로 부족)
create table if not exists public.auction_sheet_item (
  sheet_id    uuid not null references public.auction_survey_sheet(id) on delete cascade,
  property_id uuid not null references public.auction_property(id) on delete cascade,
  primary key (sheet_id, property_id)
);
create index if not exists idx_auction_sheet_item_property
  on public.auction_sheet_item(property_id);

alter table public.auction_sheet_item enable row level security;
drop policy if exists "auction_sheet_item admin all" on public.auction_sheet_item;
create policy "auction_sheet_item admin all"
  on public.auction_sheet_item for all
  using (public.is_admin()) with check (public.is_admin());

-- 목록에서 "7/12 A팀 배포" 배지를 조인 없이 보여주기 위한 비정규화 컬럼
alter table public.auction_property
  add column if not exists last_issued_at timestamptz,
  add column if not exists last_issued_team text;

comment on table public.auction_sheet_item is
  '답사지 발급 시점의 물건 명단 — 발급 이력 재조회·재다운로드용.';
