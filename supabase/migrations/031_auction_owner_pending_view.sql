-- 031: 임대인별 미답사(pending) 물건 집계 뷰.
--   목적: "운용 안 하고 공실로 깔아둔 임대인" 발굴 — 보유 미답사 물건 ≥2/≥3 임대인.
--   수집 화면 '임대인별 보기'에서 보유건수 내림차순 + 임계치 필터에 사용.
create or replace view public.v_auction_owner_pending
  with (security_invoker = true) as
select owner_name,
       count(*)::int as pending_count,
       string_agg(distinct creditor_type, ',') as creditor_types
from public.auction_property
where survey_status = 'pending'
  and owner_name is not null
  and owner_name <> '(소유자 미상)'
group by owner_name;
