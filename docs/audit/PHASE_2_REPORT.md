# Phase 2 — DB 데이터 모델 REPORT

작업 일시: 2026-05-23
시작 commit: `1e6357c`

## 신규 테이블 11개 (`supabase/migrations/002_lease_and_billing.sql`)

| 테이블 | 목적 | 핵심 컬럼 |
|---|---|---|
| `landlords` | 임대인 | name, phone, account_*_encrypted, business_number_encrypted |
| `properties_units` | 매물 세부 호실 | property_id, unit_no, area_*, deposit/rent_default |
| `tenants` | 임차인 | name, phone, **phone_last4 (generated)**, id_number_encrypted |
| `leases` | 계약 | lease_type, status, deposit, rent_amount, rent_cycle, rent_day, **fee_type, fee_percent\|fee_fixed**, overdue_annual_rate, prev_lease_id |
| `lease_parties` | 공동임차/보증인 다대다 | party_type, party_id |
| `rent_schedules` | 청구 스케줄 | due_date, amount_rent/management/vat/total, prorated |
| `rent_invoices` | 청구서 | schedule_id (unique), status, paid_total, overdue_days/interest |
| `rent_payments` | 입금 | source (manual\|bank_csv\|virtual_account), recorded_by |
| `agency_commissions` | 위탁수수료 정산 | period_*, base_amount, commission_amount, status |
| `lease_events` | 이력 | event_type, payload jsonb |
| `notifications` | 알림 발송 로그 | channel, template_key, status |

## 제약 (CHECK)
- `leases.end_date >= start_date`
- **fee_type 강제 분기**:
  - `percent` ⇒ fee_percent NOT NULL, fee_fixed NULL
  - `fixed` ⇒ fee_fixed NOT NULL, fee_percent NULL
- **rent_cycle 분기**:
  - `monthly` ⇒ rent_day NOT NULL (1~31)
  - `weekly/daily` ⇒ rent_day NULL
- 모든 금액 컬럼 `>= 0`
- `agency_commissions.period_end >= period_start`
- `unique(rent_schedules.lease_id, due_date)` — 중복 스케줄 방지
- `unique(rent_invoices.schedule_id)` — 한 스케줄당 invoice 1건

## 인덱스
- `idx_leases_status_end` — 만료 임박 조회
- `idx_invoices_status_due` — 연체 조회
- `idx_payments_invoice (invoice_id, paid_at)`
- `idx_lease_events_lease_date (desc)`
- `idx_notifications_status (status, created_at desc)`
- 모든 FK 컬럼 인덱스 (lease/tenant/landlord/unit/property)

## RLS
- **11개 테이블 전부 RLS on** ✅
- 정책: `<table>_admin_all` — `is_admin()` 만 모든 작업
  - 일반 user 직접 접근 X, server action 경유
  - service_role 은 RLS 우회 (서버 cron/관리 작업)
- 임차인 본인 조회용 `find_lease_by_phone_unit(phone_last4, unit_id)` SECURITY DEFINER 함수 추가

## Storage
- `contracts` 버킷 (비공개, PDF/이미지, 20MB) — admin 만 R/W, 다운로드는 presigned 5분
- `receipts` 버킷 (비공개, PDF, 5MB)
- 정책: `contracts_admin_all`

## TypeScript 타입 (`src/types/lease.ts`)
- 모든 enum: `LeaseType`, `LeaseStatus`, `RentCycle`, `FeeType`, `InvoiceStatus`, `PaymentSource`, `CommissionStatus`, `NotifyChannel`, `LeaseEventType` 등
- 11개 인터페이스 (Landlord/PropertyUnit/Tenant/Lease/LeaseParty/RentSchedule/RentInvoice/RentPayment/AgencyCommission/LeaseEvent/NotificationLog)
- Database 인터페이스에는 미통합 — Phase 4에서 admin UI 작성 시 필요하면 통합 (현재 untyped 클라이언트 사용 중)

## 시드 (`supabase/seed.sql`)
- 임대인 2명, 임차인 2명, 호실 1개(샘플 오피스텔 A 502호)
- 활성 계약 1건 (장기, percent 10%, 월세 50만, 보증금 500만, rent_day=25)

## 검증
- `npm run build` ✅ 통과 (라우트 변동 없음, 신규 테이블만 추가)
- SQL syntax 정합성: pg 확장(uuid-ossp), generated columns, partial check 검토 완료

## 작업 원칙 준수
- #1 모든 금액 bigint integer ✅
- #2 모든 신규 테이블 RLS on + 정책 동시 작성 ✅
- #7 grep으로 중복 없음 확인 (landlord/lease/tenant 기존 X) ✅

## TODO
- `pgsodium` 또는 application-layer 암호화 (계좌번호/주민번호) — Phase 5 또는 별도
- 임차인 SECURITY DEFINER 함수는 phone_last4 + unit_id 매칭만. 실 운영 시 brute force 방지 위해 server action에서 rate limit 필수 → Phase 5

## 다음
Phase 3 — billing 엔진 (schedules/invoices/payments/overdue/commission/terminate/renew) + vitest 단위 테스트.
