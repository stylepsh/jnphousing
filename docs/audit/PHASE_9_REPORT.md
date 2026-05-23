# Phase 9 — Cron + 운영 도구 + 감사 로그 REPORT

작업 일시: 2026-05-23
시작 commit: `4461135`

## DB
- `supabase/migrations/003_audit_and_ops.sql`
  - `audit_logs` 테이블: actor_id/actor_role/action/resource_type/resource_id/before/after/ip/user_agent/created_at
  - 인덱스: actor/resource/action × created_at desc
  - RLS: admin SELECT 만 (INSERT/UPDATE/DELETE 정책 없음 = 불변 로그)
  - `inquiries.DELETE` 정책 추가 (P1 high #5 클리어)

## 라이브러리
- `src/lib/audit.ts` — `audit({ action, resource_type, resource_id, before, after, actor_id, actor_role, ip, user_agent })`
  - try/catch 로 감싸 실패해도 throw X (감사 누락이 비즈 실패 야기 금지)
  - service_role 직접 사용

## Cron 라우트 (`x-cron-secret` 또는 `Authorization: Bearer` 검증)
- `/api/cron/daily` (GET)
  1. 청구서 발행 (3일 lead)
  2. 연체 갱신 (status/days/interest)
  3. 만료 임박 lease (60일) → status='expiring'
  4. 만료 lease → status='expired'
  5. `audit_logs` 에 `cron.daily` 기록
- `/api/cron/monthly` (GET)
  1. 이전 월 paid invoice 기준 위탁수수료 upsert
  2. `audit_logs` 에 `cron.monthly_commission` 기록

## Vercel 설정
- `vercel.json` — daily 00:00, monthly 매월 1일 01:00

## 통합 (audit + notify)
- `admin/agencies/actions.ts`
  - approveAgency: before snapshot + audit + SMS notify (agency_approved)
  - rejectAgency: before snapshot + audit + SMS notify (agency_rejected)
  - notify 는 fire-and-forget (`void notify(...)`) — 비동기 발송 실패가 작업 차단 X
- 다른 server action들 (lease, payment, complaint, …) 의 audit/notify 통합은 후속 작업 (BLOCKED.md TODO).

## 관리자 UI
- `/admin/admin-tools`: 시스템 통계 6개 KPI + 수동 cron 버튼 3개 + cron 설정 가이드
- `/admin/audit`: 최근 500건 감사 로그 (시각/주체/액션/대상/변경/IP)
- 사이드바 "시스템" 그룹 추가 (admin-tools + audit)

## 검증
- `npm run build` ✅
- `npm run test` ✅ 46/46
- cron 라우트 보호: `CRON_SECRET` 미설정 시 401, 일치 시만 통과

## TODO (BLOCKED.md 참조)
- 모든 server action 에 audit + notify 통합 일괄 — 다음 패스 권장
- recordPayment 후 receipt PDF 자동 생성/저장 — Phase 후속

## 다음
Phase 10 — 최종 점검 (build/test 통과 확인, E2E checklist, FINAL_REPORT, README 갱신).
