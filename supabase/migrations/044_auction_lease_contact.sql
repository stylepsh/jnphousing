-- 044: 경매 물건 임차 연락처·중개사 (답사 결과 보기 → 임차현황 엑셀 업로드)
-- 기존: tenant_name, deposit, monthly_rent, lease_start, lease_end, rent_due_day, management_fee_rate
alter table public.auction_property
  add column if not exists tenant_phone text,
  add column if not exists broker_name text,
  add column if not exists broker_phone text;
