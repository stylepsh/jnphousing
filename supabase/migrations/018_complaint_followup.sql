-- ============================================================================
-- 018: 민원/AS 후속 처리 필드
--   - visit_scheduled_at : 방문 예정일 (입주민 조회 시 공개)
--   - internal_memo       : 내부 메모 (우리끼리만, 입주민 비공개)
--   ※ admin_memo 는 기존대로 '입주민 회신/답변' 으로 사용 (입주민 조회 시 노출)
-- ============================================================================

alter table public.complaints
  add column if not exists visit_scheduled_at date,
  add column if not exists internal_memo text;

comment on column public.complaints.admin_memo is '입주민 회신/답변 (입주민 조회 시 공개)';
comment on column public.complaints.visit_scheduled_at is '방문 예정일 (입주민 조회 시 공개)';
comment on column public.complaints.internal_memo is '내부 메모 — 입주민에게 비공개. 조회 액션에서 select 금지.';
