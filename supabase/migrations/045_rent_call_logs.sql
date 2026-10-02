-- ============================================================================
-- 045: 임대 현황(구글 시트 연동) — 미납 통화 기록
-- 호실 정보는 구글 시트(ALL 탭)가 정본이라 여기엔 통화 내용만 쌓는다.
-- unit_key = 주소(공백 제거)|호수 — 시트 행 순서가 바뀌어도 호실을 따라간다.
-- ============================================================================

create table if not exists public.rent_call_logs (
  id uuid primary key default uuid_generate_v4(),
  unit_key text not null,
  building text,
  unit text,
  tenant_name text,
  outcome text not null
    check (outcome in ('called','no_answer','promised','moving_out','other')),
  promise_date date,                       -- 입금 약속일 (지나면 다시 전화 목록에 뜸)
  memo text,
  created_by uuid references auth.users(id) on delete set null,
  author_name text,
  created_at timestamptz default now()
);

create index if not exists idx_rent_call_logs_unit
  on public.rent_call_logs(unit_key, created_at desc);

alter table public.rent_call_logs enable row level security;

drop policy if exists "rent_call_logs admin all" on public.rent_call_logs;
create policy "rent_call_logs admin all"
  on public.rent_call_logs for all
  using (public.is_admin()) with check (public.is_admin());

comment on table public.rent_call_logs is '임대 현황 — 미납 세대 통화 기록·입금 약속일';
