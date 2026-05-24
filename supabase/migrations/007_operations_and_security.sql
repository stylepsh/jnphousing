-- ============================================================================
-- 007: 운영 자동화 (P26) + 보안 (P30) 마이그레이션
-- ============================================================================

-- ─── P26-60: 건물별 임대료/관리비 기본값 ───
alter table public.properties
  add column if not exists default_rent bigint,
  add column if not exists default_maintenance_fee bigint;

-- ─── P26-64: 비상 연락처 필수화 준비 (NOT NULL 은 일괄 업데이트 후 별도 마이그) ───
alter table public.tenants
  add column if not exists emergency_contact text,
  add column if not exists emergency_relation text;

-- ─── P26-66: 임대인별 계약 템플릿 ───
create table if not exists public.contract_templates (
  id uuid primary key default uuid_generate_v4(),
  landlord_id uuid references public.landlords(id) on delete cascade,
  name text not null,
  body_md text not null,
  default_terms jsonb default '{}'::jsonb,
  is_default boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_contract_templates_landlord on public.contract_templates (landlord_id);

alter table public.contract_templates enable row level security;
drop policy if exists "contract_templates admin all" on public.contract_templates;
create policy "contract_templates admin all"
  on public.contract_templates for all
  using (public.is_admin()) with check (public.is_admin());

-- ─── P26-65: 퇴거 체크리스트 ───
create table if not exists public.move_out_checklists (
  id uuid primary key default uuid_generate_v4(),
  lease_id uuid references public.leases(id) on delete cascade,
  facility_inspected boolean default false,
  facility_note text,
  unpaid_settled boolean default false,
  unpaid_amount bigint,
  deposit_refund_amount bigint,
  refunded_at timestamptz,
  completed boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_move_out_lease on public.move_out_checklists (lease_id);

alter table public.move_out_checklists enable row level security;
drop policy if exists "move_out_checklists admin all" on public.move_out_checklists;
create policy "move_out_checklists admin all"
  on public.move_out_checklists for all
  using (public.is_admin()) with check (public.is_admin());

-- ─── P26-67: 계약 만료 알림 발송 이력 ───
create table if not exists public.lease_expiry_alerts (
  id bigserial primary key,
  lease_id uuid references public.leases(id) on delete cascade,
  days_before int not null check (days_before in (60, 30, 7)),
  sent_at timestamptz default now(),
  channel text check (channel in ('kakao','sms','email','console'))
);
create index if not exists idx_lease_expiry_lease on public.lease_expiry_alerts (lease_id, days_before);

-- ─── P25-53: 즐겨찾기 (관리자) ───
create table if not exists public.admin_favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  resource_type text not null check (resource_type in ('property','tenant','landlord','lease','vacancy','agency')),
  resource_id uuid not null,
  label text,
  created_at timestamptz default now(),
  primary key (user_id, resource_type, resource_id)
);
create index if not exists idx_admin_favorites_user on public.admin_favorites (user_id, created_at desc);

alter table public.admin_favorites enable row level security;
drop policy if exists "admin_favorites self" on public.admin_favorites;
create policy "admin_favorites self"
  on public.admin_favorites for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ─── P25-57: readonly 역할 ───
alter table public.admin_users
  drop constraint if exists admin_users_role_check;
alter table public.admin_users
  add constraint admin_users_role_check check (role in ('super','staff','readonly'));

-- ─── P27-75: 자동이체 신청 ───
create table if not exists public.auto_debit_requests (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  bank_name text not null,
  account_holder text not null,
  account_masked text not null,
  withdraw_day int check (withdraw_day between 1 and 28),
  status text default 'submitted' check (status in ('submitted','processing','active','rejected','cancelled')),
  admin_note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_auto_debit_tenant on public.auto_debit_requests (tenant_id);
create index if not exists idx_auto_debit_status on public.auto_debit_requests (status, created_at desc);

alter table public.auto_debit_requests enable row level security;
drop policy if exists "auto_debit admin all" on public.auto_debit_requests;
create policy "auto_debit admin all"
  on public.auto_debit_requests for all
  using (public.is_admin()) with check (public.is_admin());

-- ─── P27-76: 서류 자동 예약 신청 ───
create table if not exists public.tenant_document_requests (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  document_type text not null check (document_type in ('move_in_confirm','payment_proof','contract_copy','etc')),
  status text default 'submitted' check (status in ('submitted','preparing','ready','delivered','rejected')),
  delivery_method text check (delivery_method in ('download','kakao','sms','email')),
  note text,
  ready_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_doc_req_tenant on public.tenant_document_requests (tenant_id, status);

alter table public.tenant_document_requests enable row level security;
drop policy if exists "doc_req admin all" on public.tenant_document_requests;
create policy "doc_req admin all"
  on public.tenant_document_requests for all
  using (public.is_admin()) with check (public.is_admin());

-- ─── P29-91: 월간 보고서 발송 이력 ───
create table if not exists public.landlord_report_dispatches (
  id bigserial primary key,
  report_id uuid references public.landlord_reports(id) on delete cascade,
  landlord_id uuid references public.landlords(id) on delete cascade,
  channel text check (channel in ('email','kakao','sms')),
  sent_at timestamptz default now(),
  status text default 'sent' check (status in ('sent','failed','retrying'))
);
create index if not exists idx_report_dispatch_landlord on public.landlord_report_dispatches (landlord_id, sent_at desc);

-- ─── P28-84: 공실 알림 설정 ───
create table if not exists public.agency_vacancy_alerts (
  id uuid primary key default uuid_generate_v4(),
  agency_id uuid references public.agencies(id) on delete cascade,
  property_ids uuid[] default '{}',
  property_types text[] default '{}',
  min_deposit bigint,
  max_deposit bigint,
  min_rent bigint,
  max_rent bigint,
  is_active boolean default true,
  last_sent_at timestamptz,
  created_at timestamptz default now()
);
create index if not exists idx_vacancy_alerts_agency on public.agency_vacancy_alerts (agency_id, is_active);

alter table public.agency_vacancy_alerts enable row level security;
drop policy if exists "vacancy_alerts self" on public.agency_vacancy_alerts;
create policy "vacancy_alerts self"
  on public.agency_vacancy_alerts for all
  using (agency_id in (select id from public.agencies where user_id = auth.uid()))
  with check (agency_id in (select id from public.agencies where user_id = auth.uid()));

-- ─── P30-94: PII 암호화 준비 (pgcrypto 활성화) ───
create extension if not exists pgcrypto;

-- account_number, id_number, business_number 컬럼은 이미 *_encrypted suffix 로 선언됨.
-- 실제 암호화는 app-side (lib/crypto.ts) 에서 처리 (BUNDLE 8 항목 #94).

-- ─── P30-96: Notification Queue 강화 ───
alter table public.notifications
  add column if not exists retry_count int default 0,
  add column if not exists next_retry_at timestamptz,
  add column if not exists last_error text;
create index if not exists idx_notifications_retry on public.notifications (status, next_retry_at) where status = 'failed';

-- ─── P42 게시판 검색 (pg_trgm) ───
create extension if not exists pg_trgm;
create index if not exists idx_blog_posts_search on public.blog_posts using gin (
  (title || ' ' || coalesce(excerpt, '') || ' ' || coalesce(content, '')) gin_trgm_ops
);
create index if not exists idx_notices_board_search on public.notices_board using gin (
  (title || ' ' || coalesce(excerpt, '') || ' ' || coalesce(content, '')) gin_trgm_ops
);

-- ─── P30-100: Materialized view 대시보드 통계 ───
create materialized view if not exists public.mv_dashboard_stats as
select
  (select count(*) from public.complaints where status = 'received') as new_complaints,
  (select count(*) from public.complaints where status = 'in_progress') as in_progress_complaints,
  (select count(*) from public.inquiries where status = 'new') as new_inquiries,
  (select count(*) from public.rent_invoices where status in ('unpaid','overdue') and due_date < current_date) as overdue_invoices,
  (select coalesce(sum(amount), 0) from public.rent_invoices where status in ('unpaid','overdue') and due_date < current_date) as overdue_amount,
  (select count(*) from public.leases where status = 'active' and end_date between current_date and current_date + interval '60 days') as expiring_leases,
  (select count(*) from public.agencies where status = 'pending') as pending_agencies,
  (select count(*) from public.vacancies where status = 'available' and is_published = true) as available_vacancies,
  now() as refreshed_at;
create unique index if not exists idx_mv_dashboard_stats on public.mv_dashboard_stats ((refreshed_at::date));

-- refresh function (cron 에서 매시간 호출)
create or replace function public.refresh_dashboard_stats() returns void as $$
  refresh materialized view concurrently public.mv_dashboard_stats;
$$ language sql security definer;
