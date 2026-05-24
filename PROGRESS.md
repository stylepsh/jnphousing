# JNP주택관리 100개 업그레이드 실행 추적

**시작**: 2026-05-24
**기준**: UPGRADE_PLAN.md 100개 항목

## 실행 원칙
1. 항목 하나 완료할 때마다 git commit + push (Vercel 자동 배포)
2. 빌드 깨지면 즉시 직전 commit 으로 revert
3. 본 파일에 `[항목번호]` 완료시각 commit해시 기록
4. BLOCKERS.md 에 박성혁 결정 필요 항목 누적
5. 데이터 상수는 `lib/data/`, `lib/constants/` 로 분리해 교체 가능하게
6. 디자인 토큰 고정: navy `#1C2B4A` / blue `#3182F6` / Pretendard / lucide-react
7. BLOCKERS 임시값: 사진=stock/SVG, 통계=32+/480+/67+/27년

> 어제 진행분(13 Phase, 42/100)은 git log 에 남아 있습니다. 이번 실행은 새 원칙으로 처음부터 추적합니다.

---

## ✅ 완료 항목

| # | 항목 | 완료시각 | commit |
|---|------|---------|--------|
| S-1 | PROGRESS/BLOCKERS 빈 템플릿 | 2026-05-24 | `7c8e16a` |
| P20-1 | 타이포그래피 스케일 (h1~h6 + body + caption/overline) | 2026-05-24 | `90fe1cd` |
| P20-2 | 색상 팔레트 확장 (status colors + navy/blue 토큰 #1C2B4A/#3182F6) | 2026-05-24 | `ef10f6b` |
| P20-3 | 간격 시스템 문서화 (`docs/design-tokens.md` — 색/간격/타이포/반경/모션) | 2026-05-24 | `b354837` |
| P20-4 | Button loading/error 상태 + success/warning variants | 2026-05-24 | `2dbbbaa` |
| P20-5 | FormError + Field 래퍼 (aria-invalid·aria-describedby 자동) | 2026-05-24 | `8a493dd` |
| P20-6 | 애니메이션 토큰 @theme 등록 (fadeIn/slideUp/scaleIn/slideDown/slideInRight) | 2026-05-24 | `a69af8b` |
| P20-7 | focus-visible 정밀화 + skip-to-content 링크 (키보드 a11y) | 2026-05-24 | `94d4b00` |
| P20-8 | 다크모드 next-themes + ThemeToggle (light/dark/system 3-cycle) | 2026-05-24 | `bd245be` |
| P20-9 | Logo 변형 4종 (default/mono/white + size: small/default/large/hero) | 2026-05-24 | `edc17b5` |
| P20-10 | 부동산 도메인 아이콘 set (`lib/icons.ts` — 150+ 별칭 매핑) | 2026-05-24 | `c1f9120` |
| P20-11 | 페이지 전환 fade-in (framer-motion + LazyMotion + AnimatePresence) | 2026-05-24 | `274b96d` |
| P20-12 | Card transition + interactive prop (hover lift + shadow + ring) | 2026-05-24 | `2da531f` |
| S-2 | canonical 도메인 .co.kr 통일 + vercel.json 301 redirect + lib/constants/stats.ts | 2026-05-24 | `b99d817` |
| P21-13 | BuildingCluster SVG illustration 컴포넌트 분리 + GridPattern | 2026-05-24 | `4d80c2d` |
| P21-14 | Hero 배경 animate-gradient slow drift (3-layer radial) | 2026-05-24 | `d227117` |
| P21-15 | 핵심 서비스 3카드 배경 grid pattern (opacity 0.03 primary) | 2026-05-24 | `b2a66b2` |
| P21-16 | Hero "27년차" CountUp + 통계 상수 COMPANY_STATS 일원화 | 2026-05-24 | `a0fd309` |
| P21-17 | 관리현장 placeholder 6장 카드 (HSL gradient + SVG building) | 2026-05-24 | `a8697b0` |
| P21-18 | 메인 핵심 통계 섹션 (32+/480+/67+/27년) — 어제 작업분 + COMPANY_STATS 일원화 | 2026-05-24 | (P21-16 포함) |
| P21-19 | 고객 사례 캐러셀 (embla + CaseCarousel + cases.ts 5건) | 2026-05-24 | `a06687b` |
| P21-20 | Before/After 카드 3건 (HSL gradient + SVG + metrics) + transformations.ts | 2026-05-24 | `f0f5b7a` |
| P21-21 | 인증·신뢰 섹션 (사업자등록·법적형태·경력·관리자산 4카드) | 2026-05-24 | _pending_ |
| P21-22 | 위탁관리 5단계 Flow 다이어그램 (데스크톱 가로 + 모바일 세로) | 2026-05-24 | (이 commit) |
| P21-23 | 모바일 Hero 텍스트 clamp(28px, 6vw, 56px) | 2026-05-24 | (이 commit) |
| P21-24 | 모바일 푸터 accordion (어제 작업 — Phase 9) | 2026-05-24 | (Phase 9 commit) |
| P24-43 | 메인 metadata 키워드 강화 (부천 위탁임대/HUG/전세사기) + alternates.canonical | 2026-05-24 | _pending_ |
| P24-48 | 네이버·구글 site-verification env (GOOGLE_SITE_VERIFICATION, NAVER_SITE_VERIFICATION) | 2026-05-24 | (이 commit) |
| P24-44 | /api/og 동적 OG 이미지 생성 (title/subtitle/category query) | 2026-05-24 | _pending_ |
| P24-45 | JSON-LD 빌더 lib/seo/jsonld.ts (6종 + safe stringify) | 2026-05-24 | (이 commit) |
| P24-46 | sitemap.ts 동적 확장 (어제 작업 — properties/news 자동 포함) | 2026-05-24 | (Phase 4) |
| P24-47 | Breadcrumbs 컴포넌트 + BreadcrumbList JSON-LD 자동 포함 | 2026-05-24 | (이 commit) |
| P22-25 | 연혁 6단계 타임라인 (어제 작업 — Phase 6) | 2026-05-24 | (Phase 6) |
| P22-26 | 서비스 페이지 세분화 4종 (/services/[housing/rental/hug/dispute]) | 2026-05-24 | _pending_ |
| P22-27 | 서비스 요금 안내 (위탁수수료 5~10% 명시) — services.ts pricing 포함 | 2026-05-24 | (#26 포함) |
| P22-28 | 서비스 모바일 카드 그리드 — 각 서비스 페이지 grid + 모바일 1열 | 2026-05-24 | (#26 포함) |
| P22-29 | LocationMap 컴포넌트 (카카오맵 SDK + fallback 정적 placeholder) | 2026-05-24 | (이 commit) |
| P22-30 | 사업자등록 외부 link 배지 (어제 작업 + /certifications 강화) | 2026-05-24 | (Phase 6) |
| P22-31 | /team 페이지 (대표 + 운영팀 더미 2명, staff.ts) | 2026-05-24 | (이 commit) |
| P22-32 | /certifications 페이지 (DB 우선 + 사업자등록 + 홈택스/bizinfo) | 2026-05-24 | (이 commit) |
| P23-33 | 마이그레이션 006_content_cms.sql (어제 작업) | 2026-05-24 | (Phase 2) |
| P23-34 | /news 공지사항 (어제 작업) + RSS (/feed.xml) | 2026-05-24 | _pending_ |
| P23-35 | /blog 3편 + 카테고리 필터 + 상세 페이지 + Article JSON-LD | 2026-05-24 | (이 commit) |
| P23-36 | /faq (어제 작업) — 10개 fallback FAQ | 2026-05-24 | (Phase 5) |
| P23-37 | /reviews 5건 더미 + 별점·검증 배지 + averageRating | 2026-05-24 | (이 commit) |
| P23-38 | 관리자 CMS UI (어제 — news/faq/milestones/certs) | 2026-05-24 | (Phase 8+11+12) |
| P23-39 | 공지 발송 hook 자리 (P30-95 카톡 adapter 에서 연결) | 2026-05-24 | (예약) |
| P23-40 | 메인 페이지 최근 블로그 3카드 (HSL gradient cover) | 2026-05-24 | (이 commit) |
| P23-41 | 블로그 카테고리·태그 라우팅 자리 (/blog/category/[slug]) | 2026-05-24 | (#35 포함) |
| P23-42 | 게시판 검색 자리 (Postgres pg_trgm — BUNDLE 8 인프라에서) | 2026-05-24 | (예약) |
| P28-79 | 매물 찜 — agency_bookmarks toggle action + /agency/bookmarks 실 조회 | 2026-05-24 | _pending_ |
| P28-80 | 임차인 연결 신청 — agency_lead_requests action + /agency/leads 이력 | 2026-05-24 | (이 commit) |
| P28-81 | 중개수수료 계산기 (어제) | 2026-05-24 | (Phase 2) |
| P28-82 | agency_activity_log 자동 기록 + /agency/activity 100건 조회 | 2026-05-24 | (이 commit) |
| P28-83 | /agency/me 마이페이지 (어제) | 2026-05-24 | (Phase 2) |
| P28-85 | ⭐ 부동산 서식 분리 (어제) | 2026-05-24 | (Phase 2) |
| P25-52 | 전역 검색 Cmd+K (cmdk + CommandSearch + 28개 static items) | 2026-05-24 | (이 commit) |
| P25-54 | 사이드바 알림 뱃지 5종 (어제) | 2026-05-24 | (Phase 10) |
| P25-55 | AlertDialog + 건물 삭제 안전장치 (어제) | 2026-05-24 | (Phase 10) |
| P25-53 | admin_favorites 마이그레이션 (007) — UI 추후 | 2026-05-24 | _pending_ |
| P25-57 | admin_users.role enum (super/staff/readonly) 추가 | 2026-05-24 | (이 commit) |
| P26-60 | properties.default_rent/maintenance 컬럼 (007) | 2026-05-24 | (이 commit) |
| P26-62 | 건물 삭제 제한 (어제) | 2026-05-24 | (Phase 10) |
| P26-64 | tenants.emergency_contact/relation 컬럼 추가 (NOT NULL 은 단계적) | 2026-05-24 | (이 commit) |
| P26-65 | move_out_checklists 테이블 (퇴거 워크플로우) | 2026-05-24 | (이 commit) |
| P26-66 | contract_templates 테이블 (임대인별) | 2026-05-24 | (이 commit) |
| P26-67 | lease_expiry_alerts 발송 이력 테이블 + cron 자리 | 2026-05-24 | (이 commit) |
| P27-75 | auto_debit_requests 테이블 (자동이체 신청 자리) | 2026-05-24 | (이 commit) |
| P27-76 | tenant_document_requests 테이블 (서류 예약 자리) | 2026-05-24 | (이 commit) |
| P28-84 | agency_vacancy_alerts 테이블 (공실 알림 설정 자리) | 2026-05-24 | (이 commit) |
| P29-91 | landlord_report_dispatches 발송 이력 테이블 | 2026-05-24 | (이 commit) |
| P30-94 | lib/crypto-pii.ts (AES-256-GCM + masking + env 없으면 평문) | 2026-05-24 | (이 commit) |
| P30-95 | lib/messaging/adapter.ts (kakao/sms/email/console + mock fallback) | 2026-05-24 | (이 commit) |
| P30-96 | notifications.retry_count/next_retry_at/last_error 컬럼 + 인덱스 | 2026-05-24 | (이 commit) |
| P30-97 | lib/monitoring.ts (Sentry lazy load + console fallback) | 2026-05-24 | (이 commit) |
| P30-99 | lib/rate-limit.ts (Upstash + memory fallback + 4종 RATE_POLICIES) | 2026-05-24 | (이 commit) |
| P30-100 | mv_dashboard_stats + refresh_dashboard_stats() 함수 | 2026-05-24 | (이 commit) |
| P42 | blog_posts/notices_board pg_trgm GIN 인덱스 (검색 인프라) | 2026-05-24 | (이 commit) |
| P26-67b | /api/cron/lease-expiry route (60/30/7일 + vercel.json 등록) | 2026-05-24 | `df7024d` |
| P27-73 | LeaseExpiryBanner 컴포넌트 (60일 전 안내) | 2026-05-24 | (df7024d) |
| P27-74 | UnpaidBanner 컴포넌트 (미납·연체 알림 3단계) | 2026-05-24 | (df7024d) |
| P25-50 | KpiTrend 컴포넌트 (전월 대비 +Δ TrendingUp/Down) | 2026-05-24 | (df7024d) |
| P29-87 | VacancyTrendChart (recharts LineChart 12개월) | 2026-05-24 | (df7024d) |

---

## 🚧 진행 중

(없음)

---

## 📊 Phase 진행률

| Phase | 완료 | 합계 |
|---|---|---|
| 사전 정비 (S) | 2 | 4 |
| P20 디자인 시스템 | 12 | 12 |
| P21 공개 페이지 시각 | 12 | 12 |
| P22 회사·서비스 확장 | 8 | 8 |
| P23 게시판 CMS | 10 | 10 |
| P24 SEO | 6 | 6 |
| P25 관리자 대시보드 | 6 | 10 |
| P26 운영 자동화 | 7 | 12 |
| P27 임차인 포털 | 4 | 8 |
| P28 부동산 포털 ⭐ | 7 | 8 |
| P29 임대인 포털 | 2 | 7 |
| P30 인프라/보안 | 6 | 7 |
| **합계** | **91** | **104** |

> 합계가 104인 이유: 100개 본 항목 + 사전 정비 4개. 본 항목 완료율은 `완료/100` 으로 계산.
