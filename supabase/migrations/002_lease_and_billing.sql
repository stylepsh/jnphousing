-- ============================================================================
-- JNP주택관리 — 계약/월세/위탁수수료 (Phase 2)
-- 2026-05-23 작성
--
-- 규칙:
-- - 모든 금액은 integer (원). 비율은 numeric(5,2).
-- - 모든 테이블 RLS on + 정책. 정책 없는 테이블 생성 금지.
-- - PII 컬럼명: _encrypted suffix (실제 암복호화는 application layer pgsodium 등 추후).
-- ============================================================================

-- 헬퍼 함수는 001_init.sql에서 정의됨: set_updated_at, is_admin, is_approved_agency

-- =============================================================================
-- 1. landlords (임대인)
-- =============================================================================
create table if not exists public.landlords (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  phone text not null,
  account_holder text,
  account_bank text,
  account_number_encrypted text,           -- 추후 pgsodium/app-side 복호화
  business_number_encrypted text,
  email text,
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_landlords_name on public.landlords (name);
create index if not exists idx_landlords_phone on public.landlords (phone);
create trigger trg_landlords_updated_at before update on public.landlords
  for each row execute function public.set_updated_at();

-- =============================================================================
-- 2. properties_units (매물 세부 호실)
-- 기존 properties (건물 단위) 에 종속. 한 건물에 여러 호실.
-- =============================================================================
create table if not exists public.properties_units (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid not null references public.properties(id) on delete cascade,
  unit_no text not null,                   -- 표시용 "101호", "B102" 등
  dong text,
  ho text,
  floor int,
  area_m2 numeric(8,2),
  area_pyeong numeric(8,2),
  room_count int,
  bathroom_count int,
  deposit_default bigint default 0,
  rent_default bigint default 0,
  management_fee_default bigint default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (property_id, unit_no)
);
create index if not exists idx_units_property on public.properties_units (property_id);
create trigger trg_units_updated_at before update on public.properties_units
  for each row execute function public.set_updated_at();

-- =============================================================================
-- 3. tenants (임차인)
-- =============================================================================
create table if not exists public.tenants (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  phone text not null,
  phone_last4 text generated always as (right(regexp_replace(phone, '[^0-9]', '', 'g'), 4)) stored,
  emergency_contact text,
  id_number_encrypted text,                -- 주민번호 (저장 시 암호화 필수)
  move_in_date date,
  move_out_date date,
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_tenants_phone on public.tenants (phone);
create index if not exists idx_tenants_phone_last4 on public.tenants (phone_last4);
create index if not exists idx_tenants_name on public.tenants (name);
create trigger trg_tenants_updated_at before update on public.tenants
  for each row execute function public.set_updated_at();

-- =============================================================================
-- 4. leases (계약)
-- =============================================================================
create table if not exists public.leases (
  id uuid primary key default uuid_generate_v4(),
  prev_lease_id uuid references public.leases(id) on delete set null,  -- 갱신 시 이전 계약 참조

  lease_type text not null check (lease_type in ('long_term','short_term')),
  unit_id uuid not null references public.properties_units(id) on delete restrict,
  landlord_id uuid not null references public.landlords(id) on delete restrict,
  tenant_id uuid not null references public.tenants(id) on delete restrict,

  status text not null default 'draft'
    check (status in ('draft','active','expiring','renewed','terminated','expired')),

  start_date date not null,
  end_date date not null,
  deposit bigint not null default 0 check (deposit >= 0),
  rent_amount bigint not null default 0 check (rent_amount >= 0),

  rent_cycle text not null default 'monthly'
    check (rent_cycle in ('monthly','weekly','daily')),
  rent_day int check (rent_day between 1 and 31),  -- monthly 일 때만 NOT NULL (아래 제약)

  management_fee bigint not null default 0 check (management_fee >= 0),
  vat_included boolean not null default false,

  fee_type text not null default 'percent' check (fee_type in ('percent','fixed')),
  fee_percent numeric(5,2) check (fee_percent is null or (fee_percent >= 0 and fee_percent <= 100)),
  fee_fixed bigint check (fee_fixed is null or fee_fixed >= 0),

  overdue_annual_rate numeric(5,2) not null default 12.00 check (overdue_annual_rate >= 0 and overdue_annual_rate <= 100),

  special_terms text,
  contract_file_path text,                 -- Storage 경로
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- 비즈니스 제약 -----------------------------------------------------------
  check (end_date >= start_date),
  check (
    (fee_type = 'percent' and fee_percent is not null and fee_fixed is null)
    or (fee_type = 'fixed' and fee_fixed is not null and fee_percent is null)
  ),
  check (
    (rent_cycle = 'monthly' and rent_day is not null)
    or (rent_cycle <> 'monthly' and rent_day is null)
  )
);
create index if not exists idx_leases_status_end on public.leases (status, end_date);
create index if not exists idx_leases_unit on public.leases (unit_id);
create index if not exists idx_leases_landlord on public.leases (landlord_id);
create index if not exists idx_leases_tenant on public.leases (tenant_id);
create trigger trg_leases_updated_at before update on public.leases
  for each row execute function public.set_updated_at();

-- =============================================================================
-- 5. lease_parties (계약 당사자 다대다)
-- 공동임차인, 보증인 등 부가 당사자를 leases.tenant_id 외에 추가 보관.
-- =============================================================================
create table if not exists public.lease_parties (
  id uuid primary key default uuid_generate_v4(),
  lease_id uuid not null references public.leases(id) on delete cascade,
  party_type text not null check (party_type in ('landlord','tenant','co_tenant','guarantor')),
  -- party_id 는 landlord_id 또는 tenant_id. party_type 으로 어느 테이블인지 결정.
  party_id uuid not null,
  note text,
  created_at timestamptz not null default now(),
  unique (lease_id, party_type, party_id)
);
create index if not exists idx_lease_parties_lease on public.lease_parties (lease_id);

-- =============================================================================
-- 6. rent_schedules (청구 스케줄 — 계약 활성화 시 일괄 생성)
-- =============================================================================
create table if not exists public.rent_schedules (
  id uuid primary key default uuid_generate_v4(),
  lease_id uuid not null references public.leases(id) on delete cascade,
  due_date date not null,
  amount_rent bigint not null default 0 check (amount_rent >= 0),
  amount_management bigint not null default 0 check (amount_management >= 0),
  amount_vat bigint not null default 0 check (amount_vat >= 0),
  amount_total bigint not null default 0 check (amount_total >= 0),
  prorated boolean not null default false,  -- 일할 여부
  generated_at timestamptz not null default now(),
  unique (lease_id, due_date)
);
create index if not exists idx_schedules_due on public.rent_schedules (due_date);
create index if not exists idx_schedules_lease on public.rent_schedules (lease_id);

-- =============================================================================
-- 7. rent_invoices (실제 청구서 — schedule 가 due_date 임박 시 발행)
-- =============================================================================
create table if not exists public.rent_invoices (
  id uuid primary key default uuid_generate_v4(),
  schedule_id uuid not null references public.rent_schedules(id) on delete restrict,
  lease_id uuid not null references public.leases(id) on delete restrict,
  issued_at timestamptz not null default now(),
  due_date date not null,
  amount_total bigint not null default 0 check (amount_total >= 0),
  paid_total bigint not null default 0 check (paid_total >= 0),
  status text not null default 'unpaid'
    check (status in ('unpaid','partial','paid','overdue','waived')),
  overdue_days int not null default 0 check (overdue_days >= 0),
  overdue_interest bigint not null default 0 check (overdue_interest >= 0),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (schedule_id)  -- schedule 당 하나의 invoice (재발행 시 update)
);
create index if not exists idx_invoices_status_due on public.rent_invoices (status, due_date);
create index if not exists idx_invoices_lease on public.rent_invoices (lease_id);
create trigger trg_invoices_updated_at before update on public.rent_invoices
  for each row execute function public.set_updated_at();

-- =============================================================================
-- 8. rent_payments (입금)
-- =============================================================================
create table if not exists public.rent_payments (
  id uuid primary key default uuid_generate_v4(),
  invoice_id uuid not null references public.rent_invoices(id) on delete restrict,
  paid_at timestamptz not null default now(),
  amount bigint not null check (amount > 0),
  source text not null default 'manual'
    check (source in ('manual','bank_csv','virtual_account')),
  memo text,
  recorded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_payments_invoice on public.rent_payments (invoice_id, paid_at);

-- =============================================================================
-- 9. agency_commissions (위탁수수료 정산)
-- =============================================================================
create table if not exists public.agency_commissions (
  id uuid primary key default uuid_generate_v4(),
  lease_id uuid not null references public.leases(id) on delete restrict,
  period_start date not null,
  period_end date not null,
  base_amount bigint not null default 0 check (base_amount >= 0),
  commission_amount bigint not null default 0 check (commission_amount >= 0),
  status text not null default 'pending' check (status in ('pending','paid','waived')),
  paid_at timestamptz,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lease_id, period_start, period_end),
  check (period_end >= period_start)
);
create index if not exists idx_commissions_status on public.agency_commissions (status, period_end desc);
create index if not exists idx_commissions_lease on public.agency_commissions (lease_id);
create trigger trg_commissions_updated_at before update on public.agency_commissions
  for each row execute function public.set_updated_at();

-- =============================================================================
-- 10. lease_events (이력)
-- =============================================================================
create table if not exists public.lease_events (
  id uuid primary key default uuid_generate_v4(),
  lease_id uuid not null references public.leases(id) on delete cascade,
  event_type text not null
    check (event_type in (
      'created','activated','renewed','terminated','expired',
      'notice_sent','overdue','payment_received','schedule_generated',
      'invoice_issued','commission_generated'
    )),
  event_date timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null
);
create index if not exists idx_lease_events_lease_date on public.lease_events (lease_id, event_date desc);
create index if not exists idx_lease_events_type on public.lease_events (event_type, event_date desc);

-- =============================================================================
-- 11. notifications (알림 발송 로그)
-- =============================================================================
create table if not exists public.notifications (
  id uuid primary key default uuid_generate_v4(),
  channel text not null check (channel in ('kakao','sms','email','push','console')),
  recipient text not null,                 -- phone/email
  template_key text not null,
  payload jsonb not null default '{}'::jsonb,
  sent_at timestamptz,
  status text not null default 'queued'
    check (status in ('queued','sent','failed','skipped')),
  error_message text,
  related_lease_id uuid references public.leases(id) on delete set null,
  related_invoice_id uuid references public.rent_invoices(id) on delete set null,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);
create index if not exists idx_notifications_status on public.notifications (status, created_at desc);
create index if not exists idx_notifications_lease on public.notifications (related_lease_id);

-- ============================================================================
-- RLS
-- ============================================================================
alter table public.landlords          enable row level security;
alter table public.properties_units   enable row level security;
alter table public.tenants            enable row level security;
alter table public.leases             enable row level security;
alter table public.lease_parties      enable row level security;
alter table public.rent_schedules     enable row level security;
alter table public.rent_invoices      enable row level security;
alter table public.rent_payments      enable row level security;
alter table public.agency_commissions enable row level security;
alter table public.lease_events       enable row level security;
alter table public.notifications      enable row level security;

-- landlords/tenants/units/leases 등 민감 테이블은 admin 전용.
-- service_role 은 모든 RLS 우회 (서버에서만 사용).
-- 일반 user 는 직접 접근 X — 모든 작업은 server action 경유.

create policy "landlords_admin_all" on public.landlords for all
  using (public.is_admin()) with check (public.is_admin());

create policy "units_admin_all" on public.properties_units for all
  using (public.is_admin()) with check (public.is_admin());

-- units 도 공개 SELECT (vacancies 미사용 시 unit 정보 노출 가능). MVP는 admin만.
-- 추후 부동산존 매물 표시 시 별도 view 통해 노출.

create policy "tenants_admin_all" on public.tenants for all
  using (public.is_admin()) with check (public.is_admin());

create policy "leases_admin_all" on public.leases for all
  using (public.is_admin()) with check (public.is_admin());

create policy "lease_parties_admin_all" on public.lease_parties for all
  using (public.is_admin()) with check (public.is_admin());

create policy "schedules_admin_all" on public.rent_schedules for all
  using (public.is_admin()) with check (public.is_admin());

create policy "invoices_admin_all" on public.rent_invoices for all
  using (public.is_admin()) with check (public.is_admin());

create policy "payments_admin_all" on public.rent_payments for all
  using (public.is_admin()) with check (public.is_admin());

create policy "commissions_admin_all" on public.agency_commissions for all
  using (public.is_admin()) with check (public.is_admin());

create policy "lease_events_admin_all" on public.lease_events for all
  using (public.is_admin()) with check (public.is_admin());

create policy "notifications_admin_all" on public.notifications for all
  using (public.is_admin()) with check (public.is_admin());

-- ============================================================================
-- 임차인 본인 조회용 SECURITY DEFINER 함수
--
-- 임차인은 직접 SELECT 권한이 없으므로, server action 에서 service_role 로 조회
-- 또는 아래 함수로 phone_last4 + unit_id 매칭으로 본인 lease 조회.
-- ============================================================================

create or replace function public.find_lease_by_phone_unit(
  p_phone_last4 text,
  p_unit_id uuid
)
returns table (
  lease_id uuid,
  tenant_name text,
  start_date date,
  end_date date,
  rent_amount bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select l.id, t.name, l.start_date, l.end_date, l.rent_amount
  from public.leases l
  join public.tenants t on t.id = l.tenant_id
  where t.phone_last4 = p_phone_last4
    and l.unit_id = p_unit_id
    and l.status in ('active','expiring','renewed');
$$;

-- ============================================================================
-- Storage 추가 버킷
-- ============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('contracts', 'contracts', false, 20971520, array['application/pdf','image/jpeg','image/png']),
  ('receipts',  'receipts',  false, 5242880,  array['application/pdf'])
on conflict (id) do nothing;

-- contracts/receipts 는 비공개. admin 만 업로드/조회. 다운로드는 server action 경유 presigned.
drop policy if exists "contracts_admin_all" on storage.objects;
create policy "contracts_admin_all"
  on storage.objects for all
  using (
    bucket_id in ('contracts','receipts')
    and public.is_admin()
  )
  with check (
    bucket_id in ('contracts','receipts')
    and public.is_admin()
  );
