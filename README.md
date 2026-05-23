# JNP주택관리 사이트

제이앤피 주택관리 + 이한종합건설 그룹의 통합 관리 플랫폼.

**영역**
- 공개 페이지 (회사소개·서비스·관리현장·관리문의·JSON-LD SEO)
- 세입자존 (QR 진입 민원 접수·공지·서류 다운로드, JWT 세션 my-lease/my-rent)
- 부동산존 (가입·로그인·공실 매물 열람)
- 관리자 패널 (민원·문의·계약·월세·위탁수수료·임대인·임차인·관리현장·공지·서류·QR·알림·운영도구·감사로그)

**핵심 비즈니스 기능** (P0~P9 풀 구현)
- 위탁수수료 percent/fixed 분기 + 수금주의 자동 정산
- 장기·단기 임대 분기 + 월/주/일 주기 청구 스케줄 + 첫 달 일할 계산
- 입금 매칭 (수기 + cascade 자동 충당)
- 연체 갱신 (연이율 단리 일할) + D+1/7/15/30 알림 트리거
- 해지 보증금 정산 시뮬레이션, 갱신 계약 생성
- PDF 영수증/정산서 (한글 폰트), presigned 다운로드
- 알림 시스템 (kakao/sms/console adapter + 13개 한국어 템플릿)
- Cron (Vercel) — daily/monthly + 감사 로그

## 기술 스택

- **프레임워크**: Next.js 15 (App Router) + React 19
- **UI**: Tailwind CSS 4 + shadcn/ui (base-ui 기반)
- **DB/Auth/Storage**: Supabase (RLS 강제)
- **폼/검증**: react-hook-form + zod
- **인증**: Supabase Auth (admin/agency) + jose JWT (tenant)
- **PDF**: @react-pdf/renderer + jspdf
- **테스트**: vitest (46개 단위테스트, billing 엔진)
- **타이포그래피**: Pretendard Variable
- **배포**: Vercel + (선택) Cloudflare Registrar

## 초기 셋업

### 1) 의존성 설치

```bash
npm install
```

### 2) Supabase 프로젝트 준비

1. [Supabase Dashboard](https://supabase.com/dashboard) 에서 새 프로젝트 생성
2. **SQL Editor** 에서 마이그레이션 순서대로 실행:
   - `supabase/migrations/001_init.sql` — 8개 테이블 (공개·민원·매물 등) + RLS + Storage 버킷
   - `supabase/migrations/002_lease_and_billing.sql` — 11개 테이블 (계약·월세·위탁수수료·알림로그)
   - `supabase/migrations/003_audit_and_ops.sql` — audit_logs + 운영 정책 추가
3. (선택) `supabase/seed.sql` — 샘플 임대인/임차인/계약/관리현장

### 테스트 실행
```bash
npm run test           # 한 번 실행 (46개 단위테스트)
npm run test:watch     # 변경 감지
```

### 3) 환경변수

`.env.local` 생성 후 `.env.example` 참고하여 채우기:

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR-ANON-KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR-SERVICE-ROLE-KEY
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

- `URL`/`ANON_KEY`: Supabase Dashboard → Settings → API 에서 복사
- `SERVICE_ROLE_KEY`: 동일 페이지 하단의 `service_role` (비공개 키 — 절대 클라이언트 노출 금지)

### 4) 관리자 계정 생성

1. Supabase Dashboard → **Authentication** → **Users** → Add User
2. 이메일/비밀번호 입력 후 생성, 표시된 `user id` 복사
3. SQL Editor 에서 실행:
   ```sql
   insert into public.admin_users (user_id, name, role)
   values ('생성된-UUID', '부장님', 'super');
   ```
4. `/admin/login` 에서 그 이메일/비밀번호로 로그인

### 5) 로컬 실행

```bash
npm run dev
```

→ http://localhost:3000 접속

## 회사 정보 변경

회사명·지점 주소·연락처·카카오 오픈채팅 URL 등은 **`src/lib/company.ts`** 한 파일에서 관리됩니다.
부장님께 최종 정보를 받으면 이 파일만 수정하면 전체 사이트에 반영됩니다.

업데이트 필요 항목:
- `contact.phone` / `contact.phoneHref`: 대표 전화 (현재 placeholder)
- `contact.email`: 대표 이메일
- `legal.registrationNumber`: 사업자등록번호

## QR 코드 출력

1. `/admin/qr` 접속
2. 건물 선택 → A4 인쇄 또는 PNG 다운로드
3. 건물 1층/엘리베이터/현관 등에 부착
4. 입주민이 QR을 스캔하면 `/tenant?b={property_id}` 로 자동 진입 → 민원 폼에 건물 자동 선택

## 디렉토리 구조

```
src/
├── app/
│   ├── (public)/      공개 페이지 (Header/Footer 포함)
│   ├── tenant/        세입자존 (별도 layout, 모바일 우선)
│   ├── agency/        부동산존 (로그인 보호: vacancies)
│   ├── admin/
│   │   ├── (panel)/   관리자 대시보드 (사이드바 layout)
│   │   ├── _components/  사이드바 컴포넌트
│   │   └── login/     로그인 (사이드바 없음)
│   └── auth/callback/ Supabase 인증 콜백
├── components/
│   ├── ui/            shadcn 컴포넌트
│   ├── layout/        Header, Footer
│   └── shared/        KakaoChatFloat 등
├── lib/
│   ├── supabase/      client / server / middleware
│   ├── company.ts     ← 회사 정보 한 곳에서 관리
│   └── utils.ts
└── types/database.ts  Supabase 스키마 타입
```

## 배포 (Vercel)

1. GitHub에 푸시
2. [vercel.com/new](https://vercel.com/new) → 저장소 import
3. Environment Variables 에 `.env.local` 의 모든 값 추가
4. Deploy → `*.vercel.app` 도메인 발급
5. 도메인 구매 후 Vercel **Domains** 에서 연결

### Supabase Auth Redirect URL 설정 (배포 후 필수)

Supabase Dashboard → Authentication → URL Configuration:
- Site URL: `https://your-domain.com`
- Redirect URLs: `https://your-domain.com/auth/callback`

## 라이선스

내부 사용 전용. (외부 배포 시 라이선스 정책 결정 필요)
