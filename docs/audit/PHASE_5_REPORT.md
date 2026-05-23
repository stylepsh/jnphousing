# Phase 5 — 임차인 존 확장 REPORT

작업 일시: 2026-05-23
시작 commit: `dd81131`

## 신규 패키지
- `jose` ^6 — JWT (HS256) 서명/검증, edge runtime 호환

## 신규 환경변수 (`.env.example`)
- `TENANT_AUTH_SECRET` (32자+ HS256 secret)
- `CRON_SECRET` (Phase 9 예약)

## 신규 모듈
- `src/lib/tenant-session.ts`
  - `signTenantSession`/`verifyTenantSession` — 24h TTL, issuer=jnp-housing, audience=tenant
  - `setTenantSessionCookie`/`clearTenantSessionCookie` — httpOnly + same-site lax
  - `getTenantSession` — Server Component/Action 양쪽 사용

## 신규 페이지
- `/tenant/login` — UnitSelect + phone last4
  - server action `tenantLogin`: IP rate limit (5회/10분) + zod + `find_lease_by_phone_unit` SECURITY DEFINER 함수 호출
  - 매칭 성공 시 JWT 발급 + cookie
- `/tenant/my-lease` — 인증 후 본인 계약 정보 (보증금/월세/특약), 계약서 다운로드 placeholder, 로그아웃
- `/tenant/my-rent` — 청구·납부 내역 50건, 미납 잔액·연체이자 KPI
- `/tenant` 메인 — 세션 유무에 따라 분기 (인증 전: "본인 인증" 카드 / 인증 후: 내 계약·청구 카드)

## 미들웨어 강화
- `/tenant/my-*` 경로: `tenant_session` 쿠키 없으면 `/tenant/login`으로 redirect
- 실제 JWT 검증은 server component 단계 (edge runtime 의존성 회피)

## 보안
- brute force 방지: 동일 IP 5회/10분 + 실패만 추가 카운트
- httpOnly + secure (prod) + sameSite lax 쿠키
- JWT secret 32자 강제 (런타임 에러)

## TODO (Phase 후속)
- 첨부파일 magic-bytes 검증 (Phase 6 storage 강화와 함께)
- realtime 민원 상태 (Supabase realtime 구독) — MVP는 새로고침
- 계약서 PDF 다운로드 presigned 5분 — Phase 6
- `find_lease_by_phone_unit` 실패 시도 audit_logs 기록 — Phase 9
- 다중 인스턴스 환경 rate limit Redis 전환 — Phase 9
- `/tenant/notice` 본인 매물 한정 필터 — 현재 모든 공지 노출 (개선 여지)

## 검증
- `npm run build` ✅
- `npm run test` ✅ 46/46

## 다음
Phase 6 — PDF 문서 시스템 (`@react-pdf/renderer`) + Storage 정책 + presigned 다운로드.
