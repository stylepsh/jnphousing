-- ============================================================================
-- 013: leases FK 재배선 — 신 통합 모델로 단일화
--   leases.unit_id    : properties_units → properties   (코크핏으로 만든 호실도 계약 가능)
--   leases.landlord_id: landlords        → owners        (통합 소유주에 계약 연결)
--
--   안전: 012에서 id를 재사용해 이관했으므로(properties⊇properties_units id,
--         owners⊇landlords id) 기존 leases의 unit_id/landlord_id 값이 새 FK도 만족.
--   → 기존 계약 무손상 + 신규(코크핏) 호실/소유주 계약 가능.
--
--   기본 제약명(postgres 관례): leases_unit_id_fkey / leases_landlord_id_fkey
-- ============================================================================

alter table public.leases drop constraint if exists leases_unit_id_fkey;
alter table public.leases
  add constraint leases_unit_id_fkey
  foreign key (unit_id) references public.properties(id) on delete restrict;

alter table public.leases drop constraint if exists leases_landlord_id_fkey;
alter table public.leases
  add constraint leases_landlord_id_fkey
  foreign key (landlord_id) references public.owners(id) on delete restrict;
