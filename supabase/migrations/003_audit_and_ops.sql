-- ============================================================================
-- JNP주택관리 — 감사 로그 + 운영 도구 (Phase 9)
-- 2026-05-23
-- ============================================================================

-- =============================================================================
-- audit_logs (민감 작업 감사)
-- =============================================================================
create table if not exists public.audit_logs (
  id uuid primary key default uuid_generate_v4(),
  actor_id uuid references auth.users(id) on delete set null,  -- 누가
  actor_role text,                                              -- admin|service|tenant 등
  action text not null,                                         -- 'lease.update', 'payment.record', 'agency.approve'
  resource_type text not null,                                  -- 'lease' | 'invoice' | 'agency' ...
  resource_id text,                                             -- 대상 row id (uuid 또는 path)
  before jsonb,                                                 -- 변경 전 상태
  after jsonb,                                                  -- 변경 후 상태
  ip text,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists idx_audit_actor on public.audit_logs (actor_id, created_at desc);
create index if not exists idx_audit_resource on public.audit_logs (resource_type, resource_id, created_at desc);
create index if not exists idx_audit_action on public.audit_logs (action, created_at desc);

alter table public.audit_logs enable row level security;
drop policy if exists "audit_logs_admin_select" on public.audit_logs;
create policy "audit_logs_admin_select"
  on public.audit_logs for select
  using (public.is_admin());
-- INSERT는 server-side(service_role)만, 따라서 정책 미생성 — RLS 차단 = anon insert 불가.
-- UPDATE/DELETE 정책 부재 = admin 도 직접 수정 불가 (불변 로그).

-- =============================================================================
-- inquiries.DELETE 정책 (P1 high #5)
-- =============================================================================
drop policy if exists "inquiries_admin_delete" on public.inquiries;
create policy "inquiries_admin_delete"
  on public.inquiries for delete
  using (public.is_admin());
