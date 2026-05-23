# Phase 7 — 알림 시스템 (스텁) REPORT

작업 일시: 2026-05-23
시작 commit: `0cfcb07`

## 구조 (`src/lib/notify/`)

```
notify/
├── index.ts             notify(input) — 채널 토글, console fallback, notifications 테이블 자동 기록
├── adapters/
│   ├── console.ts       stdout 출력 (개발/fallback)
│   ├── kakao.ts         비즈메시지 인터페이스 (실호출 TODO)
│   └── sms.ts           NHN Toast/Aligo/SOLAPI 인터페이스 (실호출 TODO)
└── templates/
    └── index.ts         13개 한국어 템플릿 + {{var}} interpolate + 금액/날짜 자동 포맷
```

## 템플릿 13종
- `invoice_issued` / `payment_received`
- `rent_overdue_d1` / `d7` / `d15` / `d30`
- `lease_expiring_60d` / `lease_terminated`
- `complaint_received` / `complaint_resolved`
- `agency_signup_received` / `agency_approved` / `agency_rejected`

자동 enrich:
- `*amount*` / `*refund*` / `*interest*` → `formatWonSuffix`
- `*date*` / `*_at` (date prefix) → `formatKoreanDate`
- `site_url` 자동 주입

## 환경변수 (`.env.example` 추가)
- `NOTIFY_ENABLE_KAKAO/SMS/EMAIL/PUSH` — 토글 (false면 console fallback)
- `KAKAO_BIZMSG_API_URL/KEY/PROFILE_KEY`
- `SMS_PROVIDER/API_URL/API_KEY/SENDER`
- `NEXT_PUBLIC_PRETENDARD_REGULAR_URL/BOLD_URL` (Phase 6 함께 정리)

## 관리자 UI
- `/admin/notifications`: 발송 이력 + 템플릿 미리보기 탭
- 사이드바 "운영" 그룹에 추가

## 호출 통합 (TODO)
실제 트리거 지점은 별도 통합 작업 (각 server action 안에서 `await notify(...)`):
- billing/actions.ts → recordPayment / refreshOverdueInvoices / terminateLease / renewLease
- complaint actions (tenant submit 시) / admin update 시
- agency actions (approve/reject)

이 통합은 Phase 9 cron 통합과 함께. Phase 7은 인터페이스/템플릿/UI 기반만.

## 검증
- `npm run build` ✅
- `npm run test` ✅ 46/46

## 다음
Phase 8 — 공개 페이지 SEO + 부동산 회원 완성 (JSON-LD, /properties 검색).
