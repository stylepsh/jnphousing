# E2E 수동 시나리오 체크리스트

`npm run dev` + Supabase 키 + admin_users 1건 등록 후, 아래 시나리오를 순서대로 검증.

## 사전 준비
- [ ] `.env.local` 채움 (`.env.example` 참조, `TENANT_AUTH_SECRET` 32자+)
- [ ] `supabase/migrations/001_init.sql` → `002_lease_and_billing.sql` → `003_audit_and_ops.sql` 순 실행
- [ ] `supabase/seed.sql` 실행 (샘플 데이터)
- [ ] Supabase Auth Users 에 본인 계정 생성 후 `admin_users` 에 INSERT (super)
- [ ] `npm run dev` 띄우고 http://localhost:3000

## 1. 공개 페이지
- [ ] `/` 메인 — 히어로 / 그룹 구조 / 관리현장 카드 표시
- [ ] `/about` — 27년차·지점·그룹 정보
- [ ] `/services` — 주택관리/위탁임대 탭 정상 전환
- [ ] `/properties?q=오피스텔` — 검색 필터 동작 (이름·주소 q + type chip)
- [ ] `/properties/[id]` — JSON-LD `<script type="application/ld+json">` 페이지 소스에서 확인
- [ ] `/contact` — 폼 제출 → toast → IP 5건/10분 제한 (6번째 차단 확인)

## 2. 관리자
- [ ] `/admin/login` — 잘못된 계정 → 실패 메시지, 정상 → /admin/dashboard
- [ ] `/admin/dashboard` — KPI 8개 (운영 4 + 월세 4), 만료 임박 카드
- [ ] `/admin/landlords` — 임대인 등록 (계좌 마스킹 표시)
- [ ] `/admin/tenants` — 임차인 등록 (휴대폰 마스킹)
- [ ] `/admin/leases/new` — 신규 계약 (lease_type/cycle/fee_type 분기 동작)
- [ ] `/admin/leases/[id]` — "활성화" 버튼 → 청구 스케줄 생성 + 이벤트 타임라인
- [ ] `/admin/rent` — "청구서 발행" 트리거 → invoice 생성
- [ ] `/admin/rent/invoices/[id]` — 입금 등록 (cascade on) → 다음 invoice 자동 충당
- [ ] `/admin/rent/invoices/[id]/receipt` — PDF 다운로드 (paid > 0)
- [ ] `/admin/leases/[id]` "해지" 모달 → 정산 결과 toast (보증금 - 미납 - 원상복구비 = 환급)
- [ ] `/admin/leases/[id]` "갱신" 모달 → 새 lease 생성, prev_lease_id 참조
- [ ] `/admin/commissions` "월별 정산 생성" → paid 기반 commission 생성
- [ ] `/admin/agencies` 승인/거절 → notifications 테이블 row 생성 + SMS notify console 출력
- [ ] `/admin/audit` — 위 작업들이 감사 로그에 기록됨

## 3. 임차인 존
- [ ] `/tenant` — 비인증 시 "본인 인증" 카드
- [ ] `/tenant/login` — 호실 + phone last4 → 매칭 성공 시 cookie 발급
- [ ] 5회 잘못된 시도 → rate limit 메시지
- [ ] `/tenant/my-lease` — 본인 계약 정보 표시
- [ ] `/tenant/my-rent` — 청구·납부 내역
- [ ] `/tenant/complaint?b={uuid}` (QR 진입) — 건물 자동 선택, 사진 5장/5MB 첨부
- [ ] `/tenant/complaint/lookup` — 연락처 + 접수번호 8자리 → 처리 상태 확인

## 4. 부동산 존
- [ ] `/agency/signup` — 사업자 10자리 검증
- [ ] `/agency/login` — pending → /agency/pending 안내
- [ ] 관리자 승인 후 재로그인 → /agency/vacancies 열람 가능
- [ ] `/agency/vacancies?property=&minDeposit=&maxDeposit=` 필터 동작
- [ ] `/agency/vacancies/[id]` — 카톡/전화 문의 버튼

## 5. Cron (수동)
- [ ] `/admin/admin-tools` 에서 "청구서 발행" → /api/cron/daily 와 동일 로직 실행 결과 toast
- [ ] curl `-H "x-cron-secret: $CRON_SECRET" /api/cron/daily` 401 → 401, 정상 → 200
- [ ] cron 결과가 audit_logs 에 `cron.daily` 로 기록

## 6. PDF
- [ ] 영수증 PDF 한글 표시 (Pretendard CDN 의존 → 인터넷 가능 환경)
- [ ] paid_total=0 인 invoice → PDF 라우트 400 응답

## 7. 보안
- [ ] `/admin/dashboard` 비로그인 → /admin/login redirect
- [ ] `/agency/vacancies` 비승인 부동산 → /agency/login?error=not_approved
- [ ] `/tenant/my-lease` 쿠키 없음 → /tenant/login
- [ ] Server Action 외부 호출 (curl) — 인증 없으면 401/403
