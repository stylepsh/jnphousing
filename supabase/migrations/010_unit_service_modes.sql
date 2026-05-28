-- ============================================================================
-- 010: 호실(properties_units) 단위 관리 유형 — 주택관리 / 임대관리 / 단기임대
--   박성혁 요청: 건물에서 전체 지정 + 호실마다 개별 체크
-- ============================================================================

alter table public.properties_units
  add column if not exists service_modes text[] default '{}';
  -- 값: 'housing_mgmt'(주택관리) / 'rental'(임대관리) / 'dm'(단기임대)

create index if not exists idx_units_service_modes
  on public.properties_units using gin(service_modes);

comment on column public.properties_units.service_modes is '호실 관리 유형 — housing_mgmt(주택관리)/rental(임대관리)/dm(단기임대)';
