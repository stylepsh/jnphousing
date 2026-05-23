# BLOCKED 항목 — 결정/자료 대기

각 항목은 `// TODO(성혁):` 코드 주석과 연동.

## 1. 부동산 회원의 매물 직접 등록 — 보류 (Phase 8)

**사양 원문**: "/agency/vacancies CRUD (본인 매물만)" + "승인/반려 시 SMS 알림 (스텁)"

**현재 모델**:
- `vacancies` 테이블에 `agency_id` FK 없음 — 부동산은 "열람"만 가능
- 비즈니스 흐름상 보통 관리사가 매물 등록, 부동산은 조회·중개
- 추가하려면 스키마 변경 (vacancies + agency_id), RLS 정책 추가, agency 전용 폼·페이지

**제안**:
- 부장님과 흐름 확인 필요 (부동산이 직접 등록 vs 관리사만 등록)
- 결정에 따라 별도 Phase로 진행

**현재 처리**: Phase 8 에서 보류, 기존 agency 열람 흐름 유지.

---

## 2. 비즈메시지 / SMS 게이트웨이 실호출 (Phase 7)

**사양 원문**: "인터페이스만, 실제 호출은 환경변수로 토글"

**현재**: console fallback. 환경변수 미설정 시 skip 상태로 notifications 테이블 기록.

**필요 자료**:
- 카카오 비즈메시지 발신프로필 등록 (사업자 등록 → 카카오비즈니스 가입 → 알림톡 채널 신청)
- 비즈메시지 API 키 / profileKey
- SMS 게이트웨이 선택 (NHN Cloud / Aligo / SOLAPI) + 발신번호 사전 등록

---

## 3. 한글 폰트 자체 호스팅 (Phase 6)

**현재**: jsdelivr CDN URL 사용 (`@react-pdf/renderer` Font.register)
**개선**: `public/fonts/Pretendard-Regular.otf` 직접 호스팅
**이유**: CDN 장애 시 PDF 한글 깨짐 위험

---

## 4. 개인정보 암호화 (PII)

**현재**: `landlords.account_number_encrypted` / `landlords.business_number_encrypted` / `tenants.id_number_encrypted` 모두 컬럼명만 `_encrypted`, 실제로는 plain 저장.

**선택지**:
- pgsodium (Supabase 지원) — DB-level
- application-layer (`crypto` 모듈 + key in env) — 더 유연
- 외부 KMS (AWS KMS, GCP KMS)

**결정 대기**: 결정 후 Phase 후속에서 일괄 마이그레이션.

---

## 5. 첨부파일 magic-bytes 검증 (Phase 5)

**현재**: 클라이언트 확장자 검증 + Storage `allowed_mime_types`
**부족**: 서버에서 파일 첫 N바이트 magic-bytes 검증 없음
**위험도**: 낮음 (다운로드 시 미실행, image 태그만 사용)
**처리 시점**: Phase 5/6 후속 강화 작업
