# Phase 3 — billing 엔진 REPORT

작업 일시: 2026-05-23
시작 commit: `c8584b7`

## 순수 함수 모듈 (DB 미접근, 단위 테스트 대상)

| 파일 | 책임 |
|---|---|
| `src/lib/billing/schedule-builder.ts` | `buildSchedules(lease)` — 계약 기간 전체 `rent_schedules` 행 생성, 첫 달 일할 분기 |
| `src/lib/billing/payment-allocator.ts` | `applyPaymentToInvoice` — 부분/완납/초과 처리, overflow 계산 |
| `src/lib/billing/overdue-calc.ts` | `computeOverdue` + `overdueNoticeStage` (D+1/7/15/30) |
| `src/lib/billing/commission-calc.ts` | `computeMonthCommission` — percent/fixed 분기, 수금주의 |

## DB 연동 Server Actions (`src/lib/billing/actions.ts`)

| 함수 | 트리거 | 권한 |
|---|---|---|
| `activateLease(leaseId)` | 관리자 페이지에서 수동 | `requireAdmin` |
| `issueInvoicesForDate(targetDate, leadDays=3)` | cron 매일 + 수동 | `requireAdmin` (cron은 Phase 9에서 secret 헤더 분리) |
| `recordPayment(formData)` | 관리자 입금 등록 | `requireAdmin`, 자동 cascade 옵션 |
| `refreshOverdueInvoices(now)` | cron 매일 | `requireAdmin` |
| `generateMonthlyCommissions(year, month)` | cron 매월 1일 | `requireAdmin` |
| `terminateLease(formData)` | 관리자 해지 처리 | `requireAdmin` |
| `renewLease(formData)` | 관리자 갱신 | `requireAdmin` |

모든 액션 공통:
- `requireAdmin()` 권한 체크
- `zod safeParse` 입력 검증
- 에러 마스킹 (DB constraint leak 차단)
- `revalidatePath` 캐시 무효화
- `lease_events` 자동 기록 (활동 이력)

## 단위 테스트 (`__tests__/`)

| 파일 | 테스트 수 |
|---|---:|
| `money.test.ts` | 24 |
| `schedule-builder.test.ts` | 6 |
| `payment-allocator.test.ts` | 5 |
| `overdue-calc.test.ts` | 6 |
| `commission-calc.test.ts` | 5 |
| **합계** | **46** |

`npm run test` → **46/46 ✅**

## 발견·수정한 버그
- **`splitVatInclusive` float 정밀도 이슈**: `total / 1.1` 이 1,100,000원 입력 시 999,999 반환.
  → `(total * 10) / 11` 정수 연산으로 변경. 모든 테스트 통과.

## 검증
- `npm run build` ✅
- `npm run test` ✅ 46/46

## TODO
- VAT 비포함 계약에서도 청구 시 별도 항목으로 VAT 표시 옵션 (현재는 vat_included=false 면 amount_vat=0)
- short_term 의 일/주 단위 첫/마지막 일할은 미지원 (보통 풀 기간 단위로 떨어지는 가정). 필요 시 보강.
- cron 인증: Phase 9에서 `x-cron-secret` 헤더 또는 Vercel Cron 시그니처 검증 추가

## 다음
Phase 4 — 관리자 패널 UI (leases / rent / landlords / tenants / commissions).
