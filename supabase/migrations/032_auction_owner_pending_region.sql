-- 032: 임대인 뷰에 대표 지역(top_region) 추가 — '임대인별 보기' 지역별 정렬용.
--   top_region = 그 임대인이 가장 많이 보유한 지역(주소 앞 3토큰: 시 구 동).
--   프런트엔드는 컬럼이 없어도 동작하도록 폴백 처리됨(적용 후 '지역별 정렬' 활성화).
create or replace view public.v_auction_owner_pending
  with (security_invoker = true) as
select owner_name,
       count(*)::int as pending_count,
       string_agg(distinct creditor_type, ',') as creditor_types,
       mode() within group (order by region) as top_region
from (
  select owner_name,
         creditor_type,
         array_to_string((string_to_array(trim(address), ' '))[1:3], ' ') as region
  from public.auction_property
  where survey_status = 'pending'
    and owner_name is not null
    and owner_name <> '(소유자 미상)'
) t
group by owner_name;
