-- 035: 차단 임대인 물건 보관 상태 'blocked' 추가.
--   기존엔 차단 임대인 물건을 아예 안 들여오거나 'rejected' 로 섞어버려
--   "접수는 됐는데 어디로 갔는지" 확인할 데가 없었다.
--   → 수집은 그대로 하되 survey_status='blocked' 로 들어가고,
--     /admin/auction/blocked 카테고리에서만 보인다. 차단 해제 시 'pending' 복귀.
alter table public.auction_property
  drop constraint if exists auction_property_survey_status_check;

alter table public.auction_property
  add constraint auction_property_survey_status_check
  check (survey_status in
    ('pending','vacant','occupied','revisit','skip','rejected','blocked'));

create index if not exists idx_auction_property_blocked
  on public.auction_property (owner_name)
  where survey_status = 'blocked';
