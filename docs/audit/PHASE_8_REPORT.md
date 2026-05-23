# Phase 8 — 공개 SEO + 부동산 완성 REPORT

작업 일시: 2026-05-23
시작 commit: `89d8da5`

## 신규
- `src/components/shared/JsonLd.tsx`
  - `OrganizationJsonLd` — RealEstateAgent 스키마 (회사명/연혁/지점/연락처/사업영역)
  - `PropertyJsonLd` — Residence 스키마 (이름/주소/세대수/유형)
  - `</script>` 인젝션 방어 (`.replace(/</g, "\\u003c")`)
- `src/app/(public)/contact/actions.ts`
  - `submitContact(formData)` — IP rate limit 5건/10분 + zod + 에러 마스킹

## 변경
- `(public)/layout.tsx` — `<OrganizationJsonLd />` 주입 (전 공개 페이지)
- `(public)/properties/page.tsx` — 검색 필터 (이름·주소 q, type chip)
- `(public)/properties/[id]/page.tsx` — `<PropertyJsonLd />` 주입
- `contact-form.tsx` — 클라이언트 직접 INSERT → Server Action `submitContact` 로 전환 (IP rate limit 적용)

## 작업원칙 준수
- #3 모든 server action zod+인증(여기는 public, IP rate limit 으로 대체)+에러 마스킹 ✅
- #4 dangerouslySetInnerHTML 은 정적 JSON.stringify + `</script>` 이스케이프 → 사용자 입력 X (회사 정보 + DB schema-fixed) → 안전 ✅

## 미처리 (`docs/audit/BLOCKED.md` 참조)
- `/agency/vacancies` CRUD (부동산 본인 매물 등록) — 비즈니스 모델 결정 필요 (관리사 단독 등록 vs 부동산 직접 등록). 부장님 확인 후 별도 Phase.

## 검증
- `npm run build` ✅
- `npm run test` ✅ 46/46

## 다음
Phase 9 — Cron + 운영 도구 (admin-tools) + 감사 로그 (audit_logs).
