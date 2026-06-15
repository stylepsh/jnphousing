-- ============================================================================
-- 019: 계약 경로/계약처 (어디서 계약했는지)
--   - contract_source_type : 직접(자체)/중개업소/소개/기타
--   - contract_source_name : 중개업소명 또는 소개자명
--   - contract_source_contact : 계약처 연락처 (선택)
--   - contract_source_memo : 계약 경로 관련 메모 (선택)
-- ============================================================================

alter table public.leases
  add column if not exists contract_source_type text not null default 'direct'
    check (contract_source_type in ('direct', 'broker', 'referral', 'other')),
  add column if not exists contract_source_name text,
  add column if not exists contract_source_contact text,
  add column if not exists contract_source_memo text;

comment on column public.leases.contract_source_type is '계약 경로: direct(자체)/broker(중개업소)/referral(소개)/other(기타)';
comment on column public.leases.contract_source_name is '중개업소명 또는 소개자명';
comment on column public.leases.contract_source_contact is '계약처 연락처';
