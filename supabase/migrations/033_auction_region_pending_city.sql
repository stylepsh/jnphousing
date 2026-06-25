-- 033: 수집 화면 '지역별 미답사' 카드를 시(군/구) 단위로 묶는다.
--   기존(020)은 주소 앞 3토큰(도 시 구/동) → "안산시 상록구", "안산시 단원구"로 쪼개졌다.
--   요청: 큰 틀(시 단위)로만 — 앞 2토큰(도/광역시 + 시/군/구)으로 그룹.
--   예) "경기도 안산시 상록구 …", "경기도 안산시 단원구 …" → 모두 "경기도 안산시"(표시: 안산시).
--   필터는 region 전체 문자열로 ilike prefix 매칭하므로 이 view 만 바꾸면 된다.
create or replace view public.v_auction_region_pending
with (security_invoker = true) as
select
  trim(
    coalesce(split_part(address, ' ', 1), '') || ' ' ||
    coalesce(split_part(address, ' ', 2), '')
  ) as region,
  count(*) as pending_count
from public.auction_property
where survey_status = 'pending'
group by 1;

comment on view public.v_auction_region_pending is '지역(주소 앞 2토큰=시 단위)별 미답사 건수 — 수집 화면 지역 게이트';
