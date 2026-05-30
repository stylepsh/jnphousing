# 박성혁 결정 필요 항목 (누적)

작업 중 박성혁님 입력이 필요해서 임시값으로 진행한 항목들.
박성혁님 결정 메시지 → 정확한 값 교체 → [✅ 결정 완료] 이동.

---

## 🟡 결정 대기 중

### [B-108] 공휴일 청구일 보정 — 비즈니스 결정 필요
- **상황**: `src/lib/dates.ts` 영업일 함수는 주말만 스킵, 공휴일 미반영. 현재 청구일 생성(`generateDueDates`)에는 영업일 보정 자체가 적용되지 않음.
- **박성혁 결정 필요**:
  1. 임대료 청구일이 공휴일/주말에 걸리면 앞/뒤 영업일로 당길지? (현행: 보정 없이 달력일 그대로)
  2. 보정한다면 기준(이전 영업일 vs 다음 영업일)?
- **그 다음 필요**: 정확한 한국 공휴일 데이터 소스(음력 설/추석/대체공휴일 포함 — 공공데이터포털 특일정보 API 등).
- **현재 처리**: 부정확한 공휴일 하드코딩은 위험하므로 미적용. 결정 시 데이터+보정 로직+테스트 일괄 추가.

### [B-109] PII 암호화 키 운영 설정 (배포 전 필수)
- **상황**: 계좌·주민·사업자번호 AES-256-GCM 암호화 코드 연결 완료(이번 세션). 단, `PII_ENCRYPTION_KEY` 미설정 시 평문 저장 fallback.
- **박성혁 액션**: 운영 환경(Vercel)에 `PII_ENCRYPTION_KEY` 설정 — `openssl rand -hex 32` 로 생성한 64자 hex.
  - ⚠️ **설정 후 변경 금지**: 키를 바꾸면 기존 암호문 복호화 불가.
  - 이미 평문으로 저장된 기존 행이 있다면, 키 설정 후 한 번 재저장(edit)하면 암호화로 전환됨(decrypt 는 평문도 통과 처리하므로 혼재 안전).

---

## ✅ 박성혁 명시 결정 (적용 완료)

### [B-001] 통계 수치 — `32+ / 480+ / 67+ / 27년` 사용 결정
- **결정**: 박성혁 명시 (2026-05-24 실행 원칙 #7)
- **적용처**: `src/lib/constants/stats.ts` (이전 `company.ts` 의 stats 필드)
- **적용 항목**:
  - 운영 건물: **32+**
  - 관리 세대: **480+**
  - 해결 분쟁: **67+**
  - 누적 운영: **27년**
- **상태**: 코드 반영 대기 (사전 정비 S-3 에서 처리)

### [B-002] 건물 사진 — stock/SVG 로 임시 진행
- **결정**: 박성혁 명시 (2026-05-24 실행 원칙 #7)
- **적용처**: Hero 우측, 관리현장 placeholder, 회사소개 인증서
- **임시 처리**: SVG illustration · gradient placeholder · stock pattern
- **교체 시점**: 실제 회사 건물 사진 받으면 `public/images/properties/` 에 업로드 후 경로만 교체

### [B-003] 디자인 토큰 — navy `#1C2B4A` / blue `#3182F6`
- **결정**: 박성혁 명시 (2026-05-24 실행 원칙 #6)
- **이전값**: navy `#1C3A5E` / blue `#2563EB`
- **적용처**: `src/app/globals.css` → `--primary`, `--ring`, `--chart-2` 등
- **상태**: 코드 반영 대기 (사전 정비 S-2 에서 처리)

---

## ⏸ 알려져 있으나 향후 박성혁 결정 필요

### [B-101] 카카오 비즈메시지 사업자 인증
- **필요 시점**: P30-95 카톡 adapter 실 발송
- **박성혁 액션**: 카카오비즈(business.kakao.com) 가입 + 발신프로필 등록
- **현재**: SMS 까지만 작동, 카톡은 큐에 적재만

### [B-102] 임차인 후기 (P23-37 /reviews)
- **필요 시점**: /reviews 페이지 실 노출 시
- **박성혁 액션**: 실제 후기 5~10개 수집 (이니셜 + 건물명 + 한 줄)
- **현재**: 페이지 골격만 / "준비 중"

### [B-103] 회사 인증서·자격증 이미지
- **필요 시점**: P21-21 인증서 섹션 + P22-32 인증서 갤러리
- **박성혁 액션**: HUG/협회 인증서 스캔본 업로드
- **현재**: 사업자등록 1건만 카드로 표시

### [B-104] 직원 소개 페이지 (P22-31)
- **필요 시점**: /team 페이지
- **박성혁 액션**: 부장님 인사말 + 사진 + 경력
- **현재**: 페이지 비활성

### [B-105] 블로그 글 콘텐츠 (P23-35)
- **필요 시점**: /blog 페이지 실 노출 시
- **박성혁 액션**: 본인 콘텐츠 1~3편 직접 작성
- **현재**: 3편 더미 작성 완료 (HUG/전세사기/공실 전략) — 실 콘텐츠 교체 시 lib/data/blog-posts.ts 수정 또는 DB 등록

### [B-106] 외부 서비스 인증·API 키 (P30 인프라 활성화)
- **필요 시점**: 실 발송·모니터링 활성
- **박성혁 액션 (선택적):**
  - 카카오 비즈메시지: `KAKAO_BIZ_API_KEY` / `KAKAO_BIZ_SENDER` (B-101 발신프로필 필수)
  - NCP SENS SMS: `NCP_SENS_ACCESS_KEY` / `_SECRET_KEY` / `_SERVICE_ID` / `_FROM`
  - Sentry: `npm install @sentry/nextjs` + `NEXT_PUBLIC_SENTRY_DSN`
  - Upstash Redis: `UPSTASH_REDIS_REST_URL` / `_TOKEN` (분산 rate limit)
  - PostHog: `NEXT_PUBLIC_POSTHOG_KEY` (이벤트 추적)
  - PII 암호화: `PII_ENCRYPTION_KEY` (32 bytes hex, openssl rand -hex 32)
  - 카카오맵 SDK: `NEXT_PUBLIC_KAKAO_MAP_KEY` (현재는 외부 링크 + placeholder)
  - 구글/네이버 사이트 인증: `GOOGLE_SITE_VERIFICATION` / `NAVER_SITE_VERIFICATION`
- **현재**: 모든 lib 이 env 없으면 mock fallback (빌드·실행 안 깨짐)

### [B-107] Supabase SQL 추가 마이그레이션 실행
- **필요 시점**: BUNDLE 6/7/8 기능 활성화
- **박성혁 액션**:
  - Supabase SQL Editor 에서 `007_operations_and_security.sql` 실행
  - (확인) `006_content_cms.sql` 이미 실행되어 있는지 점검
- **현재**: 마이그레이션 파일은 git 에 push 완료. 실행만 박성혁이 수동 진행.
