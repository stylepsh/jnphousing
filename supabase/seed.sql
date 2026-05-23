-- ============================================================================
-- JNP주택관리 초기 시드 데이터 (개발/데모용)
-- 운영 환경에서는 신중히 실행. 기존 데이터는 그대로 두고 sample 만 추가됨.
-- ============================================================================

-- 샘플 관리현장 ------------------------------------------------------------
insert into public.properties (name, address, type, total_units, description, display_order)
values
  ('샘플 오피스텔 A',  '경기도 부천시 원미구 ___', 'officetel', 32, '부천 중동 인근 신축급 오피스텔', 1),
  ('샘플 빌라 B',      '경기도 부천시 소사구 ___', 'villa', 12,    '소사역 도보 5분 빌라 단지', 2),
  ('샘플 아파트 C',    '서울특별시 강서구 ___',   'apartment', 80, '강서구 30평형대 아파트', 3)
on conflict do nothing;

-- 샘플 공지 ----------------------------------------------------------------
insert into public.notices (title, content, is_pinned)
values
  ('JNP 입주민 서비스 오픈 안내',
   E'안녕하세요. JNP주택관리입니다.\n이제 QR 코드를 통해 민원/AS 접수, 공지 확인, 서류 다운로드를 한 곳에서 할 수 있습니다.\n불편 사항은 카카오톡 채팅으로도 언제든 문의 주세요.',
   true)
on conflict do nothing;

-- 샘플 다운로드 ------------------------------------------------------------
insert into public.downloads (category, title, description, file_url, version, display_order)
values
  ('contract', '단기 임대 표준 계약서 (1안)',
   '6개월 이내 단기 임대용 계약서 양식. 사용 전 변호사 자문 필수.',
   'https://example.com/placeholder.pdf', '1.0', 1),
  ('guide', '입주민 생활 안내문',
   '신규 입주민을 위한 시설 이용·관리비·소음 등 기본 안내문.',
   'https://example.com/placeholder.pdf', '1.0', 1)
on conflict do nothing;

-- ============================================================================
-- Phase 2 시드: landlord/tenant/unit/lease 샘플
-- ============================================================================
-- 샘플 임대인
insert into public.landlords (name, phone, account_holder, account_bank, email)
values
  ('홍길동 임대인', '010-1111-2222', '홍길동', '국민은행', 'hong@example.com'),
  ('김부장 임대인', '010-3333-4444', '김부장', '신한은행', 'kim@example.com')
on conflict do nothing;

-- 샘플 임차인
insert into public.tenants (name, phone, emergency_contact, move_in_date)
values
  ('이임차 임차인', '010-9999-0001', '010-9999-9999', current_date - interval '90 days'),
  ('박단기 임차인', '010-9999-0002', null, current_date - interval '15 days')
on conflict do nothing;

-- 샘플 호실 (샘플 오피스텔 A 의 502호)
insert into public.properties_units (property_id, unit_no, floor, area_pyeong, room_count, bathroom_count, deposit_default, rent_default, management_fee_default)
select p.id, '502', 5, 12.5, 1, 1, 5000000, 500000, 70000
from public.properties p
where p.name = '샘플 오피스텔 A'
on conflict (property_id, unit_no) do nothing;

-- 계약 1건: long_term, percent 10%
insert into public.leases (
  lease_type, unit_id, landlord_id, tenant_id,
  status, start_date, end_date, deposit, rent_amount,
  rent_cycle, rent_day, management_fee, vat_included,
  fee_type, fee_percent, fee_fixed
)
select 'long_term', u.id, l.id, t.id,
  'active', current_date - interval '90 days', current_date + interval '275 days',
  5000000, 500000,
  'monthly', 25, 70000, false,
  'percent', 10.00, null
from public.properties_units u, public.landlords l, public.tenants t
where u.unit_no = '502'
  and l.name = '홍길동 임대인'
  and t.name = '이임차 임차인'
limit 1
on conflict do nothing;

-- ============================================================================
-- 관리자 계정 등록 가이드
-- ============================================================================
-- 1. Supabase Dashboard → Authentication → Users → Add User 로 이메일/패스워드 생성
-- 2. 생성된 user_id 를 아래 INSERT 의 placeholder 자리에 넣고 실행
-- 3. 그 계정으로 /admin/login 접속 가능
--
-- insert into public.admin_users (user_id, name, role) values
--   ('UUID-FROM-AUTH-USERS-HERE', '관리자', 'super');
