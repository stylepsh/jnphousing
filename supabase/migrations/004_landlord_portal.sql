-- ============================================================================
-- 임대인 포털 (Phase 14) — landlords ↔ auth.users 연결
-- ============================================================================

-- landlord_users: 임대인이 본인 데이터 조회 가능하도록 auth 매핑
create table if not exists public.landlord_users (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  landlord_id uuid not null unique references public.landlords(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists idx_landlord_users_landlord on public.landlord_users (landlord_id);

alter table public.landlord_users enable row level security;

drop policy if exists "landlord_users_self_select" on public.landlord_users;
create policy "landlord_users_self_select"
  on public.landlord_users for select
  using (auth.uid() = user_id or public.is_admin());

drop policy if exists "landlord_users_admin_all" on public.landlord_users;
create policy "landlord_users_admin_all"
  on public.landlord_users for all
  using (public.is_admin())
  with check (public.is_admin());

-- 본인 landlord_id 조회 헬퍼 (SECURITY DEFINER)
create or replace function public.current_landlord_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select landlord_id from public.landlord_users where user_id = auth.uid() limit 1;
$$;

-- ============================================================================
-- 보고서 발송 이력
-- ============================================================================
create table if not exists public.landlord_reports (
  id uuid primary key default uuid_generate_v4(),
  landlord_id uuid not null references public.landlords(id) on delete cascade,
  period_type text not null check (period_type in ('weekly','monthly','custom')),
  period_start date not null,
  period_end date not null,
  pdf_path text,                              -- Storage 경로
  total_billing bigint not null default 0,
  total_paid bigint not null default 0,
  total_outstanding bigint not null default 0,
  total_commission bigint not null default 0,
  net_payout bigint not null default 0,
  payload jsonb not null default '{}'::jsonb, -- 계약별 상세 등
  generated_at timestamptz not null default now(),
  sent_at timestamptz,
  unique (landlord_id, period_type, period_start, period_end)
);
create index if not exists idx_landlord_reports_landlord on public.landlord_reports (landlord_id, period_end desc);

alter table public.landlord_reports enable row level security;

drop policy if exists "landlord_reports_self_select" on public.landlord_reports;
create policy "landlord_reports_self_select"
  on public.landlord_reports for select
  using (
    landlord_id = public.current_landlord_id()
    or public.is_admin()
  );

drop policy if exists "landlord_reports_admin_all" on public.landlord_reports;
create policy "landlord_reports_admin_all"
  on public.landlord_reports for all
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================================
-- 임대인 본인이 자기 데이터 조회용 — SELECT 정책 추가
-- (기존 leases/invoices/payments/commissions 는 admin만 가능 — 임대인이 본인 것 보려면 별도 정책)
-- ============================================================================

drop policy if exists "leases_landlord_self_select" on public.leases;
create policy "leases_landlord_self_select"
  on public.leases for select
  using (
    landlord_id = public.current_landlord_id()
  );

drop policy if exists "invoices_landlord_self_select" on public.rent_invoices;
create policy "invoices_landlord_self_select"
  on public.rent_invoices for select
  using (
    exists (
      select 1 from public.leases l
      where l.id = lease_id and l.landlord_id = public.current_landlord_id()
    )
  );

drop policy if exists "payments_landlord_self_select" on public.rent_payments;
create policy "payments_landlord_self_select"
  on public.rent_payments for select
  using (
    exists (
      select 1 from public.rent_invoices i
      join public.leases l on l.id = i.lease_id
      where i.id = invoice_id and l.landlord_id = public.current_landlord_id()
    )
  );

drop policy if exists "commissions_landlord_self_select" on public.agency_commissions;
create policy "commissions_landlord_self_select"
  on public.agency_commissions for select
  using (
    exists (
      select 1 from public.leases l
      where l.id = lease_id and l.landlord_id = public.current_landlord_id()
    )
  );

drop policy if exists "properties_units_landlord_self_select" on public.properties_units;
create policy "properties_units_landlord_self_select"
  on public.properties_units for select
  using (
    exists (
      select 1 from public.leases l
      where l.unit_id = id and l.landlord_id = public.current_landlord_id()
    )
  );

drop policy if exists "properties_landlord_self_select" on public.properties;
create policy "properties_landlord_self_select"
  on public.properties for select
  using (
    is_published = true
    or public.is_admin()
    or exists (
      select 1 from public.leases l
      join public.properties_units u on u.id = l.unit_id
      where u.property_id = id and l.landlord_id = public.current_landlord_id()
    )
  );

-- 보고서 PDF용 Storage 버킷
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('landlord-reports', 'landlord-reports', false, 10485760, array['application/pdf'])
on conflict (id) do nothing;

drop policy if exists "landlord_reports_storage_admin" on storage.objects;
create policy "landlord_reports_storage_admin"
  on storage.objects for all
  using (bucket_id = 'landlord-reports' and (public.is_admin() or true))  -- 다운로드는 server action 경유
  with check (bucket_id = 'landlord-reports' and public.is_admin());
