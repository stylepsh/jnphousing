-- ============================================================================
-- 012: 임대인(소유주) 중심 통합 — owners 단일화 + properties(건물·호실) 단일화
--   리팩토링 A단계. docs/refactor-admin-os.md 참조.
--
--   전략: "id 재사용 + 순수 추가(additive)".
--   - 구 테이블(landlords/landlord_business/properties_units)과 기존 FK는 그대로 둔다.
--   - 새 통합 구조(owners, properties.unit_type/owner_id/parent_building_id)를 옆에 만든다.
--   - PK uuid를 그대로 재사용해 이관하므로 leases.unit_id / landlord_id 값이 새 구조에서도
--     id-일치로 그대로 조인된다 → 기존 페이지 무손상, 점진 전환 가능.
--   - 구 테이블 정리(drop/deprecated)는 페이지 전환 끝난 뒤 별도 마이그레이션에서.
--
--   ⚠️ 적용 전 권장: Supabase 대시보드에서 landlords/landlord_business/properties/
--      properties_units 를 CSV export 해두면 완벽한 롤백 안전망.
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────
-- A. owners — landlords + landlord_business 통합 (둘의 컬럼 합집합, 무손실)
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.owners (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  phone text,
  email text,
  -- 계좌 (PII 암호화 컬럼은 그대로 보존)
  account_bank text,
  account_holder text,
  account_number_encrypted text,
  -- 사업자/개인 식별 (landlord_business 계열)
  business_name text,
  business_number text,
  business_number_encrypted text,          -- landlords 계열
  corporate_number text,
  representative text,
  resident_number_encrypted text,
  -- 계약유형 플래그는 물건(properties.service_modes)이 source. 여기선 캐시/수동보정용(옵션).
  memo text,
  is_active boolean not null default true,
  source_kind text check (source_kind in ('landlord','business')),  -- 이관 출처 추적
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.owners enable row level security;
drop policy if exists "owners admin all" on public.owners;
create policy "owners admin all"
  on public.owners for all
  using (public.is_admin()) with check (public.is_admin());

-- landlords → owners (id 재사용)
insert into public.owners (id, name, phone, email, account_bank, account_holder,
  account_number_encrypted, business_number_encrypted, memo, source_kind, created_at, updated_at)
select l.id, l.name, l.phone, l.email, l.account_bank, l.account_holder,
  l.account_number_encrypted, l.business_number_encrypted, l.memo, 'landlord', l.created_at, l.updated_at
from public.landlords l
on conflict (id) do nothing;

-- landlord_business → owners (id 재사용)
insert into public.owners (id, name, business_name, business_number, resident_number_encrypted,
  corporate_number, representative, phone, email, account_bank, account_number_encrypted,
  account_holder, memo, is_active, source_kind, created_at, updated_at)
select b.id, b.name, b.business_name, b.business_number, b.resident_number_encrypted,
  b.corporate_number, b.representative, b.phone, b.email, b.account_bank, b.account_number_encrypted,
  b.account_holder, b.memo, coalesce(b.is_active, true), 'business', b.created_at, b.updated_at
from public.landlord_business b
on conflict (id) do nothing;

-- ─────────────────────────────────────────────────────────────────────────
-- B. properties — 건물·호실 통합 컬럼 추가
-- ─────────────────────────────────────────────────────────────────────────
alter table public.properties
  add column if not exists owner_id uuid references public.owners(id) on delete set null,
  add column if not exists unit_type text not null default 'building'
    check (unit_type in ('building','unit')),
  add column if not exists parent_building_id uuid references public.properties(id) on delete set null,
  -- 호실(unit) 속성 (properties_units에서 이관)
  add column if not exists unit_no text,
  add column if not exists dong text,
  add column if not exists ho text,
  add column if not exists floor int,
  add column if not exists area_m2 numeric(8,2),
  add column if not exists area_pyeong numeric(8,2),
  add column if not exists room_count int,
  add column if not exists bathroom_count int,
  add column if not exists deposit_default bigint default 0,
  add column if not exists rent_default bigint default 0,
  add column if not exists management_fee_default bigint default 0;
  -- service_modes text[] 는 008에서 이미 존재 (관리유형 source)

create index if not exists idx_properties_owner on public.properties(owner_id);
create index if not exists idx_properties_unit_type on public.properties(unit_type);
create index if not exists idx_properties_parent on public.properties(parent_building_id);

-- 기존 properties 행은 모두 건물
update public.properties set unit_type = 'building' where unit_type is null;

-- properties_units → properties (unit_type='unit', id 재사용, 상위=parent_building_id)
-- name/address/type 는 NOT NULL 이라 상위 건물에서 상속
insert into public.properties (id, unit_type, parent_building_id,
  name, address, type, unit_no, dong, ho, floor, area_m2, area_pyeong,
  room_count, bathroom_count, deposit_default, rent_default, management_fee_default,
  service_modes, created_at, updated_at)
select u.id, 'unit', u.property_id,
  coalesce(b.name,'') || ' ' || u.unit_no, b.address, b.type,
  u.unit_no, u.dong, u.ho, u.floor, u.area_m2, u.area_pyeong,
  u.room_count, u.bathroom_count, u.deposit_default, u.rent_default, u.management_fee_default,
  coalesce(b.service_modes, '{}'), u.created_at, u.updated_at  -- 호실 관리유형은 상위 건물에서 상속 (010 미적용 DB 호환)
from public.properties_units u
join public.properties b on b.id = u.property_id
on conflict (id) do nothing;

-- ─────────────────────────────────────────────────────────────────────────
-- C. owner_id 베스트에포트 채우기
-- ─────────────────────────────────────────────────────────────────────────
-- 건물: 기존 landlord_business_id 매핑 (id 재사용했으므로 그대로 owner)
update public.properties p
  set owner_id = p.landlord_business_id
  where p.unit_type = 'building' and p.owner_id is null and p.landlord_business_id is not null;

-- 호실: 상위 건물의 owner 상속
update public.properties u
  set owner_id = b.owner_id
  from public.properties b
  where u.parent_building_id = b.id and u.unit_type = 'unit' and u.owner_id is null
    and b.owner_id is not null;

-- 호실: 계약의 임대인에서 보정 (leases.landlord_id = owner id, 재사용)
update public.properties p
  set owner_id = l.landlord_id
  from public.leases l
  where l.unit_id = p.id and p.unit_type = 'unit' and p.owner_id is null;

-- ─────────────────────────────────────────────────────────────────────────
-- D. 임대인별 파이프라인 집계 뷰 (security_invoker → RLS 적용)
--    물건 소유: properties.owner_id / 임차·월세: leases.landlord_id (= owner id)
-- ─────────────────────────────────────────────────────────────────────────
create or replace view public.v_owner_pipeline
with (security_invoker = true) as
select
  o.id   as owner_id,
  o.name as owner_name,
  coalesce(pc.building_count, 0)  as building_count,
  coalesce(pc.unit_count, 0)      as unit_count,
  coalesce(pc.vacant_count, 0)    as vacant_count,
  coalesce(pc.occupied_count, 0)  as occupied_count,
  coalesce(rc.invoice_count, 0)   as month_invoice_count,
  coalesce(rc.paid_count, 0)      as month_paid_count,
  coalesce(rc.overdue_count, 0)   as month_overdue_count
from public.owners o
left join (
  select p.owner_id,
    count(*) filter (where p.unit_type = 'building') as building_count,
    count(*) filter (where p.unit_type = 'unit')     as unit_count,
    count(*) filter (where p.unit_type = 'unit' and not exists (
      select 1 from public.leases l where l.unit_id = p.id and l.status in ('active','expiring')
    )) as vacant_count,
    count(*) filter (where p.unit_type = 'unit' and exists (
      select 1 from public.leases l where l.unit_id = p.id and l.status in ('active','expiring')
    )) as occupied_count
  from public.properties p
  where p.owner_id is not null
  group by p.owner_id
) pc on pc.owner_id = o.id
left join (
  select l.landlord_id as owner_id,
    count(ri.id) as invoice_count,
    count(ri.id) filter (where ri.paid_total >= ri.amount_total) as paid_count,
    count(ri.id) filter (where ri.paid_total < ri.amount_total and ri.due_date < current_date) as overdue_count
  from public.leases l
  join public.rent_invoices ri on ri.lease_id = l.id
  where date_trunc('month', ri.due_date) = date_trunc('month', current_date)
  group by l.landlord_id
) rc on rc.owner_id = o.id;

comment on table public.owners is '임대인(소유주) 통합 — landlords + landlord_business (012에서 id 재사용 이관)';
comment on view public.v_owner_pipeline is '임대인별 파이프라인 — 물건/공실/임차/이번달 월세징수 롤업';
comment on column public.properties.unit_type is 'building(건물) | unit(호실)';
comment on column public.properties.parent_building_id is 'unit일 때 상위 건물. nullable(호실 단독 위탁 가능)';
comment on column public.properties.owner_id is '임대인 직접 소유 연결(공실 물건도 매달림)';
