-- ============================================================================
-- 046: 임대 현황 — 미납 세대 담당자 배정 (직원끼리 나눠서 전화)
-- unit_key 는 045 rent_call_logs 와 같다(주소|호수).
-- ============================================================================

create table if not exists public.rent_assignments (
  unit_key text primary key,
  assignee_id uuid references public.admin_users(id) on delete cascade,
  assignee_name text,
  assigned_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz default now()
);

alter table public.rent_assignments enable row level security;

drop policy if exists "rent_assignments admin all" on public.rent_assignments;
create policy "rent_assignments admin all"
  on public.rent_assignments for all
  using (public.is_admin()) with check (public.is_admin());

comment on table public.rent_assignments is '임대 현황 — 세대별 전화 담당 직원';
