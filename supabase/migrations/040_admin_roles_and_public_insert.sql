-- 040: 관리자 역할 3단계 + 공개 문의 직접 insert 차단 + 팝업 배너 연락처 교체
--
-- 배경
--   1. admin_users.role 이 super/staff 뿐이라 "조회만 가능한 계정"을 만들 수 없었다.
--   2. inquiries 에 `with check (true)` INSERT 정책이 있어 anon 키만 있으면
--      서버 액션(검증·rate limit)을 우회해 무제한 적재가 가능했다.
--      공개 문의 저장은 전부 service_role 서버 액션을 통하므로 정책이 필요 없다.
--   3. 009 에서 시드한 팝업 배너의 오픈채팅 URL 이 구 주소로 남아 있다.
--
-- 롤백
--   -- 1. 역할 되돌리기 (readonly 계정이 있으면 먼저 staff 로 바꿀 것)
--   update public.admin_users set role='staff' where role='readonly';
--   alter table public.admin_users drop constraint admin_users_role_check;
--   alter table public.admin_users add constraint admin_users_role_check
--     check (role in ('super','staff'));
--   drop function if exists public.is_admin_mutable();
--   -- 2. 공개 insert 정책 복원
--   create policy "inquiries_public_insert" on public.inquiries
--     for insert with check (true);
--   -- 3. 배너 URL 복원
--   update public.site_popup_banner set link_url='https://open.kakao.com/o/scZWs5vi'
--     where link_url='https://open.kakao.com/o/s69LUALi';

-- ---------------------------------------------------------------------------
-- 1. 역할 3단계: super / staff / readonly
-- ---------------------------------------------------------------------------
alter table public.admin_users drop constraint if exists admin_users_role_check;
alter table public.admin_users
  add constraint admin_users_role_check check (role in ('super', 'staff', 'readonly'));

comment on column public.admin_users.role is
  'super=전체 권한, staff=일반 업무(쓰기 가능), readonly=조회 전용(생성·수정·삭제·상태전이 불가)';

-- 쓰기 권한이 있는 관리자인지 (readonly 제외). RLS 정책에서 사용.
create or replace function public.is_admin_mutable()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users
    where user_id = auth.uid() and role in ('super', 'staff')
  );
$$;

comment on function public.is_admin_mutable() is
  '쓰기 가능한 관리자(super/staff)인지. readonly 는 false.';

-- ---------------------------------------------------------------------------
-- 2. 공개 문의 직접 insert 차단
--    서버 액션(submitContact / submitAuctionLead)은 service_role 이라 RLS 우회 →
--    정책을 지워도 정상 접수는 그대로 동작한다.
-- ---------------------------------------------------------------------------
drop policy if exists "inquiries_public_insert" on public.inquiries;

-- ---------------------------------------------------------------------------
-- 3. 팝업 배너 오픈채팅 URL 을 1:1 상담방으로 교체 (구 주소가 남아있는 행만)
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.site_popup_banner') is not null then
    update public.site_popup_banner
       set link_url = 'https://open.kakao.com/o/s69LUALi', updated_at = now()
     where link_url in (
       'https://open.kakao.com/o/scZWs5vi',   -- 최초 그룹 오픈채팅
       'https://open.kakao.com/o/gtMOCALi'    -- 중간에 쓰던 그룹 오픈채팅
     );
  end if;
end $$;
