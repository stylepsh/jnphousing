-- ============================================================================
-- 017: 직원(staff) 가입 신청 허용 — member_applications.role 에 'staff' 추가
--   홈페이지 회원가입에서 직원 신청 → super(stylepsh) 승인 시 admin_users 등록
-- ============================================================================

alter table public.member_applications
  drop constraint if exists member_applications_role_check;
alter table public.member_applications
  add constraint member_applications_role_check
  check (role in ('landlord','tenant','staff'));
