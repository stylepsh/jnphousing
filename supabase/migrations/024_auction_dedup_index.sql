-- ============================================================================
-- 024: 수집 중복차단 복합 인덱스
--   collection import 의 dedup 쿼리가 address IN (...) + survey_status != 'rejected'
--   조건으로 풀 전체를 훑는다. 30k+ 규모에서 단일 address 인덱스만으로는
--   survey_status 필터가 인덱스에 안 잡혀 느려진다. 복합 인덱스로 보강.
-- ============================================================================

create index if not exists idx_auction_property_address_status
  on public.auction_property(address, survey_status);

comment on index public.idx_auction_property_address_status is
  '수집 dedup용 — (상세주소, 답사상태) 복합. 같은 주소가 풀에 이미 있는지 빠르게 확인';
