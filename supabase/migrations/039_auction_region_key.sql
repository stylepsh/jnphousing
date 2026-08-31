-- 039: 지역 조회를 인덱스로 — "부산 전체(15곳)" 선택이 느리던 문제.
--
--   기존: address ILIKE '부산 강서구%' 를 지역 수만큼 OR 로 묶어 조회.
--         ILIKE 는 btree 인덱스를 못 타서 3만 건을 매번 전수 스캔했다.
--   해결: 지역 라벨(주소 앞 2토큰)을 저장 컬럼으로 만들고 인덱스를 건다.
--         v_auction_region_pending 뷰가 만드는 값과 계산식이 동일해야 한다.
alter table public.auction_property
  add column if not exists region_key text
  generated always as (
    trim(
      coalesce(split_part(address, ' ', 1), '') || ' ' ||
      coalesce(split_part(address, ' ', 2), '')
    )
  ) stored;

comment on column public.auction_property.region_key is
  '지역 라벨(주소 앞 2토큰) — v_auction_region_pending.region 과 같은 값. 조회 인덱스용.';

-- 후보 풀 조회는 항상 survey_status='pending' 과 함께 온다.
create index if not exists idx_auction_property_region_pending
  on public.auction_property (region_key)
  where survey_status = 'pending';

create index if not exists idx_auction_property_region_all
  on public.auction_property (region_key);
