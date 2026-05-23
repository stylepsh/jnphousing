# Phase 1 — REPORT (보안 감사 + Critical 수정)

작업 일시: 2026-05-23
시작 commit: `9a4fb92`

## 변경 요약

### 신규
- `src/lib/auth-guard.ts` — `requireAdmin`/`requireSuperAdmin`/`requireApprovedAgency`/`rateLimit`/`getClientIp`

### 수정 (Critical)
- admin server actions 8개 그룹 일괄 강화 — `requireAdmin()` + zod 검증 + 에러 마스킹
  - complaints, inquiries, agencies(approve/reject), vacancies(create/status/delete), properties(upsert/delete), notices(upsert/delete), downloads(upsert/delete)
- tenant/complaint/lookup actions — zod 검증 + IP rate limit (10회/10분, 실패 시 가속)
- `src/lib/supabase/middleware.ts` — `/agency/pending`, `/agency/rejected` 로그인 요구 추가

### Critical 처리 결과
| 항목 | 상태 |
|---|---|
| #1 admin actions 권한/zod 누락 | ✅ 완료 (15개 액션 전부 requireAdmin + 입력 검증) |
| #2 tenant lookup brute force | ✅ 완료 (IP rate limit + zod 강화) |
| #3 rejectAgency 본인 검증 누락 | ✅ 완료 (approveAgency·rejectAgency 모두 requireAdmin) |

### High 처리 결과
| 항목 | 상태 |
|---|---|
| #1 /agency/pending·rejected 미보호 | ✅ 완료 (middleware) |
| #5 에러 메시지 leak | ✅ 부분 완료 (admin actions DB error 마스킹, console.error로 서버 로그만) |
| #2 storage MIME magic-bytes | ⏭ Phase 5 |
| #3 downloads MIME 강화 | ⏭ Phase 6 |
| #4 파일 업로드 서버 검증 | ⏭ Phase 5 |

## 검증
- `npm run build` ✅ 통과
- middleware 90.4 kB (이전 90.3 → +0.1, agency/pending·rejected 분기)

## 미들웨어 매트릭스 (현재)

| 경로 | 인증 | 추가 권한 |
|---|:-:|---|
| `/admin/login` | ❌ | - |
| `/admin/*` (login 제외) | ✅ | `admin_users` row |
| `/agency/login`·`signup` | ❌ | - |
| `/agency/pending`·`rejected` | ✅ | (본인 데이터 표시용, status 검증은 페이지 자체) |
| `/agency/vacancies/*` | ✅ | `agencies.status='approved'` |
| `/tenant/*` | ❌ | (server action에서 IP rate limit) |
| 공개 페이지 | ❌ | - |
| Server Actions | path 통과 후 자체 검증 | `requireAdmin()` 강제 |

## TODO
- magic-bytes 파일 검증 → Phase 5
- 다중 인스턴스 환경(Vercel) rate limit은 Upstash Redis 교체 필요 → Phase 9
- `inquiries.DELETE` 정책 명시 → Phase 9 (운영 도구)

## 다음
Phase 2 — 데이터 모델 (계약/월세 11개 테이블).
