-- 037: 답사지 회수 관리.
--   발급은 기록되는데 "돌려받았는지"가 없어서, 미회수분이 몇 주씩 방치돼도 표시가 없었다.
--   회수 완료 시각만 있으면 "미회수 N건 / 발급 후 며칠 경과"를 뽑을 수 있다.
alter table public.auction_survey_sheet
  add column if not exists returned_at timestamptz;

create index if not exists idx_auction_sheet_open
  on public.auction_survey_sheet (printed_at desc)
  where returned_at is null;
