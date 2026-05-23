# Phase 0 — 사전 정비 REPORT

작업 일시: 2026-05-22 ~ 2026-05-23
브랜치: `feature/full-implementation`
시작 commit: `db755f5` (snapshot before full implementation)

## 완료

### 디렉토리
- `docs/audit/` — 감사·보고서
- `src/lib/billing/` — billing 엔진 (Phase 3 채움)
- `src/lib/billing/__tests__/` — vitest
- `src/lib/pdf/` — PDF 컴포넌트 (Phase 6)
- `src/lib/notify/`, `src/lib/notify/adapters/`, `src/lib/notify/templates/` — 알림 (Phase 7)

### 패키지
- devDependencies: `vitest`, `@vitest/ui`
- dependencies: `@react-pdf/renderer`, `jspdf`, `jspdf-autotable`
- `package.json` scripts: `test`, `test:watch` 추가
- `vitest.config.ts` 생성 (node 환경, `@/` alias, `src/**/__tests__/**/*.test.ts` 패턴)

### 핵심 유틸 (`src/lib/`)
- **money.ts**
  - `asWon`, `formatWon`, `formatWonSuffix`, `formatWonMan`
  - `VAT_RATE = 0.1`, `vatOf`, `splitVatInclusive`, `withVat`
  - `normalizePercent`, `applyPercent` (numeric(5,2) 정합성)
  - `prorateRent` (월 일수 기반 일할)
  - `overdueInterest` (연이율 단리 일할)
  - `computeCommission({ fee_type, fee_percent, fee_fixed, base_amount })`
- **dates.ts**
  - `toIsoDate`, `fromIsoDate`, `formatKoreanDate`, `formatKoreanDateWithDay`
  - `resolveDueDate` (rent_day 말일 보정)
  - `previousBusinessDay`/`nextBusinessDay` (주말만, 공휴일 TODO)
  - `leaseRangeFromMonths`, `monthRange`, `isExpiringSoon`
  - `generateDueDates({ start,end }, cycle, rentDay)` — monthly/weekly/daily
- **errors.ts**
  - `AppError(code, message, opts)` + `AppErrorCode` enum
  - `ServerActionResult<T>` 직렬화 안전 표준형
  - `okResult`, `errResult`
  - `handleAction(rawInput, { schema, requireRole, fn, loadContext })`
    - 인증/권한/zod 3종 일괄 처리 → 작업 원칙 #3 강제
  - `requireAdmin`, `notFound`, `businessRule` 헬퍼

## 검증
- `npm run build` ✅ 통과 (30개 라우트 그대로)

## TODO
- 공휴일 데이터셋 도입 (`previousBusinessDay`/`nextBusinessDay` 정확도 향상). 우선순위: 낮음 (월말 청구일과 충돌 시에만 필요).

## 작업 원칙 준수
- #1 금액 integer: `asWon`/`Math.floor`로 강제 — money.ts에서 소수 들어오면 throw
- #6 .env 자동 생성 없음 — 변경 안 함
- #7 중복 grep 확인 — `src/lib/{money,dates,errors,billing}*` 없음 확인 후 생성
- #8 git push 없음 — 로컬 commit만

다음: Phase 1 (보안 감사).
