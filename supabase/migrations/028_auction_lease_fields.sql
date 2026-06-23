-- 028: 경매 임차계약 입력 필드 — 보증금 + 수금일 메모(매월 다른 수금일 자유입력).
-- (기존: monthly_rent, management_fee_rate, individual_tax_rate, tenant_name, lease_id)
alter table public.auction_property
  add column if not exists deposit bigint,                 -- 보증금(원)
  add column if not exists rent_collection_memo text;      -- 수금일(매월 다름, 자유입력 "이달 27일" 등)
