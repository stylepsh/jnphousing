# JNP주택관리 디자인 토큰 문서

**기준일**: 2026-05-24
**근거**: 박성혁 실행 원칙 #6 (디자인 토큰 고정)
**적용처**: `src/app/globals.css` (`:root` 변수) + Tailwind v4 @theme inline

---

## 🎨 색상 (Color Tokens)

### Brand
| 토큰 | 값 | 용도 |
|---|---|---|
| `--brand` / `--primary` | `#1C2B4A` | 메인 navy — 헤더, CTA, 제목 |
| `--brand-accent` / `--ring` | `#3182F6` | 강조 blue — 링크, focus, 차트 |
| `--brand-foreground` | `#FFFFFF` | navy 위 글자 |

### Status
| 토큰 | 색 | 배경 | 보더 | 용도 |
|---|---|---|---|---|
| `--success` | `#10B981` | `--success-bg` | `--success-border` | 정상·승인·완료 |
| `--warning` | `#F59E0B` | `--warning-bg` | `--warning-border` | 만료 임박·주의 |
| `--error` | `#DC2626` | `--error-bg` | `--error-border` | 연체·오류·실패 |
| `--info` | `#3182F6` | `--info-bg` | `--info-border` | 안내·신규 |

### Neutral
| 토큰 | 값 (light) | 값 (dark) |
|---|---|---|
| `--background` | `#F8FAFC` | `#0F1A2E` |
| `--foreground` | `#0F1A2E` | `#F1F5F9` |
| `--card` | `#FFFFFF` | `#1C2A44` |
| `--muted` | `#F1F5F9` | `#1C2A44` |
| `--muted-foreground` | `#64748B` | `#94A3B8` |
| `--border` | `#E2E8F0` | rgba(255,255,255,0.1) |

### Tailwind 클래스 매핑
- `.bg-primary`, `.text-primary-foreground` — navy
- `.ring-ring` — blue focus ring
- `.bg-success`, `.text-success-foreground` — 성공
- `.bg-warning`, `.bg-error`, `.bg-info` — 상태
- `.border-success-border` 등 보더 별도

---

## 📐 간격 시스템 (Spacing Scale)

**기준**: 8px (= 0.5rem). 모든 패딩/마진/gap 은 8 의 배수 권장.

| Token | rem | px | Tailwind | 일반 용도 |
|---|---|---|---|---|
| `xs` | `0.25rem` | 4px | `p-1`, `gap-1` | 아이콘과 텍스트 사이 |
| `sm` | `0.5rem` | 8px | `p-2`, `gap-2` | 배지 내부, 작은 카드 |
| `md` | `1rem` | 16px | `p-4`, `gap-4` | **기본 카드 패딩** |
| `lg` | `1.5rem` | 24px | `p-6`, `gap-6` | 섹션 내부 여백 |
| `xl` | `2rem` | 32px | `p-8`, `gap-8` | 큰 카드 / 모달 패딩 |
| `2xl` | `3rem` | 48px | `p-12`, `py-12` | 페이지 섹션 간격 |
| `3xl` | `4rem` | 64px | `p-16`, `py-16` | Hero 상하 패딩 |
| `4xl` | `5rem` | 80px | `py-20` | 큰 hero 패딩 |

### 컴포넌트별 권장
| 컴포넌트 | 패딩 |
|---|---|
| Badge / Chip | `px-2 py-0.5` (8 × 2px) |
| Button | `px-4 py-2` (16 × 8px) |
| Input | `px-3 py-2` (12 × 8px) |
| Card content | `p-4` ~ `p-6` (16~24px) |
| Section | `py-12 md:py-20` (48~80px) |

### 반응형 권장
- 모바일: `px-4 py-8` (16/32)
- 태블릿: `px-6 py-12` (24/48)
- 데스크톱: `px-8 py-16` (32/64)

---

## ✏️ 타이포그래피 (P20-1 정의)

| 요소 | 모바일 | 데스크톱 | weight |
|---|---|---|---|
| h1 | 32px / 1.15 | 40px / 1.1 | 700 |
| h2 | 26px / 1.2 | 32px / 1.2 | 700 |
| h3 | 20px / 1.3 | 24px / 1.3 | 600 |
| h4 | 18px / 1.35 | 20px / 1.35 | 600 |
| h5 | 16px / 1.4 | 16px / 1.4 | 600 |
| h6 | 14px / 1.45 | 14px / 1.45 | 600 |
| body | 16px / 1.6 | — | 400 |
| small | 14px / 1.45 | — | 400 |
| `.text-caption` | 12px / 1rem | — | 400 |
| `.text-overline` | 11px UPPERCASE | — | 600 |

**Letter-spacing**: h1 `-0.025em`, h2 `-0.02em`, h3 `-0.015em` (가독성 미세 조정).
**폰트**: Pretendard Variable (CDN, jsdelivr).

---

## 🔄 반경 (Radius)

| Token | 값 | 용도 |
|---|---|---|
| `--radius-sm` | `0.375rem` (6px) | 작은 배지·input |
| `--radius-md` | `0.5rem` (8px) | 일반 input·작은 카드 |
| `--radius-lg` | `0.625rem` (10px) | **기본 Card / Button** |
| `--radius-xl` | `0.875rem` (14px) | 큰 카드 |
| `--radius-2xl` | `1.125rem` (18px) | Hero 카드·모달 |
| `--radius-3xl` | `1.375rem` (22px) | 특수 강조 |

---

## 🌗 그림자 (Shadow)

Tailwind 기본값 사용. 권장:
- `shadow-sm` — 카드 기본
- `shadow-md` — hover 시
- `shadow-lg` — 모달·dropdown
- `shadow-xl` — Hero 핵심 카드
- `shadow-2xl` — 떠다니는 카드 (Hero 우측 등)

---

## ⏱ 모션 (Motion)

| 클래스 | duration | 용도 |
|---|---|---|
| `.animate-fade-in` | 0.5s | 페이지 진입 |
| `.animate-slide-up` | 0.6s | 카드 위로 슬라이드 |
| `.animate-scale-in` | 0.4s | 모달·다이얼로그 |
| `.animate-gradient` | 12s loop | Hero 배경 |
| `.animate-shimmer` | 2s loop | 로딩 스켈레톤 |
| `.animate-pulse-soft` | 2.5s loop | 라이브 인디케이터 |

**transition**: 일반 hover `transition-all duration-200`.
**prefers-reduced-motion**: 모든 애니메이션 자동 비활성.

---

## 🎯 사용 원칙

1. **Tailwind utility 먼저** — `text-3xl` 같은 직접 클래스 우선. 베이스는 fallback.
2. **8px 그리드 준수** — 4의 배수보다 8의 배수가 더 일관됨.
3. **상태 색은 토큰만** — `bg-red-500` 대신 `bg-error`, `text-emerald-700` 대신 `text-success`.
4. **반응형 분기는 md(768) 기준** — 모바일 우선 작성.
5. **다크모드**: 모든 토큰이 dark 변형 가짐. 직접 hex 색 사용 금지.

---

## 🔧 추가 / 수정 절차

1. `src/app/globals.css` 의 `:root` (+ `.dark`) 에 변수 추가
2. Tailwind 인식 필요 시 `@theme inline` 에 `--color-XXX` 추가
3. 본 문서 (`docs/design-tokens.md`) 업데이트
4. PR 메시지에 토큰명 명시

> 토큰 변경은 디자인 일관성을 위해 신중하게. 직접 hex 입력하기보다 token 추가/재사용 우선.
