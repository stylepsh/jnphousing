# Phase 4 — 관리자 패널 UI REPORT

작업 일시: 2026-05-23
시작 commit: `9d1b06a`

## 신규 페이지

### 사이드바 재구성 (`_components/sidebar.tsx`)
4개 그룹: 운영 / 계약·월세 / 매물·관리현장 / 콘텐츠 — `NAV` 데이터 구조로 그룹화.

### 임대인 (`/admin/landlords`)
- 목록 (Table) + `LandlordDialog` (create/edit)
- actions.ts: `upsertLandlord`, `deleteLandlord` (requireAdmin + zod + 마스킹된 필드 저장)
- 계좌번호/사업자번호: TODO(성혁) plain 저장 — Phase 후속에서 암호화

### 임차인 (`/admin/tenants`)
- 목록 + `TenantDialog`
- actions.ts: `upsertTenant`, `deleteTenant`
- 주민번호/연락처 마스킹 표시 (`src/lib/pii.ts`)

### 계약 (`/admin/leases`)
- 목록: 필터 chip (전체/draft/active/expiring/terminated/expired)
- 만료 60일 이내 표시
- `/admin/leases/new`: `LeaseForm` — lease_type 분기, rent_cycle 분기, fee_type 분기
- `/admin/leases/[id]`:
  - 좌측: 계약 정보 카드
  - 우측: 이벤트 타임라인 (최근 50)
  - 하단: 청구 스케줄 + 발행 청구서 테이블 (각 20개)
  - `LeaseActions`: 활성화 / 갱신 모달 / 해지 모달 (각 status별 가시성 분기)
- actions.ts: `upsertLease` (zod + 비즈니스 규칙 사전 검증), `deleteLease` (draft만)
- 활성화/해지/갱신은 `src/lib/billing/actions.ts` 재사용

### 월세 (`/admin/rent`)
- 이번달 청구 KPI 4개 (청구합계/수금완료/부분미납/연체)
- 청구서 테이블 (마감일/호실/임차인/금액/상태/관리)
- 트리거 버튼: 청구서 발행, 연체 갱신 (`RentTriggers`)
- `/admin/rent/invoices/[id]`: 청구서 상세 + `PaymentForm` (수기 입금 + cascade 옵션)

### 위탁수수료 (`/admin/commissions`)
- 정산 대기·완료 목록
- `CommissionTrigger`: 월별 정산 생성 (`generateMonthlyCommissions`)
- `CommissionPayButton`: 정산 완료 표시

### 대시보드 확장 (`/admin/dashboard`)
- KPI 2 그룹:
  - 운영: 신규민원/처리중/신규문의/공실
  - 월세·수수료: 이번달 청구액/수금률/연체미수/수수료 정산대기
- 만료 임박 계약 + 최근 민원 + 최근 관리문의 3-column

## TS 캐스팅 우회
- Supabase JOIN 결과 (`properties:property_id(name)`) 가 배열로 추론되는 이슈
  → `as unknown as` 캐스팅으로 통과. 정상 동작 (1:1 FK).

## 검증
- `npm run build` ✅ (라우트 변동: +9개 신규 admin 페이지)
- `npm run test` ✅ 46/46 (billing 엔진 단위 테스트 그대로)

## TODO
- /admin/leases/[id]/edit — 현재 lease-form 재사용 가능, 페이지만 추가 필요. Phase 후속.
- 일괄 CSV/엑셀 업로드 (vacancies — 기존 v0 사양). 필요시 Phase 9.
- PII 실제 암호화 (pgsodium 또는 app-side) — Phase 후속.

## 다음
Phase 5 — 임차인 존 확장 (JWT 토큰 lookup, my-lease, my-rent, complaint realtime).
