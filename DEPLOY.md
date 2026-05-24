# 배포 가이드 — jnphousing.com / jnphousing.co.kr

전체 흐름: **GitHub → Supabase → Vercel → 가비아 DNS**.
박성혁님이 단계별로 따라가면 1~2시간 안에 라이브 가능.

---

## 0. 사전 준비물

- [x] 가비아에서 산 도메인: `jnphousing.com`, `jnphousing.co.kr`
- [ ] GitHub 계정 (없으면 https://github.com 가입, 무료)
- [ ] Vercel 계정 (없으면 https://vercel.com/signup, GitHub 로그인 추천)
- [ ] Supabase 계정 (없으면 https://supabase.com/dashboard, GitHub 로그인 추천)

---

## 1. GitHub Repository 생성 + 코드 업로드

### 1-1. GitHub에서 새 repo 생성
- https://github.com/new
- **Repository name**: `jnp-housing`
- **Private** 선택 (운영 코드, 회사 정보 포함)
- **Add a README / .gitignore / license** 모두 **체크 해제** (이미 있음)
- Create repository 클릭
- 안내 화면의 `git remote add origin ...` URL 복사

### 1-2. 로컬에서 원격 연결 + push
터미널에서 (이 폴더에서):

```bash
# main 브랜치로 정리 (현재 feature/full-implementation 브랜치)
git checkout master
git merge feature/full-implementation
git branch -M main

# 위 1-1에서 복사한 URL 사용
git remote add origin https://github.com/<본인-아이디>/jnp-housing.git
git push -u origin main
```

> ❗ 처음 push 시 GitHub 로그인 화면이 뜹니다. PAT(Personal Access Token) 또는 브라우저 로그인.

---

## 2. Supabase 프로덕션 프로젝트

### 2-1. 새 프로젝트 생성
- https://supabase.com/dashboard → New project
- **Name**: `jnp-housing-prod`
- **Region**: `Northeast Asia (Seoul)` ← 한국 사용자 latency
- **Database Password**: 강력한 비밀번호 (별도 저장)
- Create new project (1~2분 소요)

### 2-2. 마이그레이션 실행 (Dashboard → SQL Editor)
순서대로 한 번씩 실행:

1. `supabase/migrations/001_init.sql` 전체 복붙 → Run
2. `supabase/migrations/002_lease_and_billing.sql` → Run
3. `supabase/migrations/003_audit_and_ops.sql` → Run
4. `supabase/migrations/004_landlord_portal.sql` → Run
5. `supabase/migrations/005_photos_and_channels.sql` → Run

> ⚠ `seed.sql`은 **운영에서 실행 X** (샘플 데이터 들어감)

### 2-3. API 키 복사 (Settings → API)
- **Project URL**: `https://xxxxx.supabase.co` ← `NEXT_PUBLIC_SUPABASE_URL`
- **anon public**: `eyJ...` ← `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **service_role**: `eyJ...` ← `SUPABASE_SERVICE_ROLE_KEY` (절대 공개 금지!)

### 2-4. Auth URL 설정 (도메인 연결 후 다시 옴)
나중에 도메인 연결 후 Settings → Authentication → URL Configuration:
- **Site URL**: `https://jnphousing.com`
- **Redirect URLs**:
  - `https://jnphousing.com/auth/callback`
  - `https://www.jnphousing.com/auth/callback`
  - `https://jnphousing.co.kr/auth/callback`

### 2-5. 관리자 계정 만들기
1. Authentication → Users → **Add User** → 이메일/비밀번호 (박재흥 부장님 계정 등)
2. 생성된 user_id 복사
3. SQL Editor에서:
```sql
insert into public.admin_users (user_id, name, role) values
  ('생성된-UUID-여기', '박재흥', 'super');
```

---

## 3. Vercel 프로젝트 생성

### 3-1. GitHub repo Import
- https://vercel.com/new
- GitHub 연동 후 `jnp-housing` repo 선택 → Import
- **Framework**: Next.js 자동 감지 OK
- **Root Directory**: `.` (기본)

### 3-2. Environment Variables 입력
**Deploy 누르기 전에** Environment Variables 섹션에서 추가:

| Key | Value | 비고 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | (2-3에서 복사) | 공개 OK |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | (2-3에서 복사) | 공개 OK |
| `SUPABASE_SERVICE_ROLE_KEY` | (2-3에서 복사) | 비공개 |
| `NEXT_PUBLIC_SITE_URL` | `https://jnphousing.com` |  |
| `TENANT_AUTH_SECRET` | (32자+ 무작위) | 아래 생성 방법 |
| `CRON_SECRET` | (32자+ 무작위) | 아래 생성 방법 |
| `NOTIFY_ENABLE_KAKAO` | `false` | 카톡 알림 미정이면 false |
| `NOTIFY_ENABLE_SMS` | `false` |  |

**무작위 시크릿 생성** (PowerShell):
```powershell
-join ((48..57) + (97..122) | Get-Random -Count 48 | % {[char]$_})
```
또는 https://www.random.org/strings/ 에서 48자 영숫자 2개 생성.

### 3-3. Deploy
- Deploy 클릭 → 2~3분 빌드
- 완료 후 `https://jnp-housing-xxxxx.vercel.app` 같은 임시 URL 발급
- 이 URL로 한 번 들어가서 사이트 정상 표시 확인

### 3-4. Cron 활성화 확인
- Vercel Dashboard → Settings → Cron Jobs
- `/api/cron/daily` (매일 00:00) 와 `/api/cron/monthly` (매월 1일 01:00) 자동 등록됨

---

## 4. Vercel 에서 도메인 추가

Vercel Dashboard → Settings → Domains:

1. **`jnphousing.com`** 추가 → Vercel이 DNS 설정 안내
   - Type **A**, Name `@`, Value `76.76.21.21`
2. **`www.jnphousing.com`** 추가
   - Type **CNAME**, Name `www`, Value `cname.vercel-dns.com`
3. **`jnphousing.co.kr`** 추가 → Vercel 가 자동으로 jnphousing.com 으로 리다이렉트
   - 동일 A 레코드: `76.76.21.21`
   - CNAME: `www` → `cname.vercel-dns.com`

> Vercel이 "Invalid Configuration" 표시할 때는 아래 가비아 DNS 설정 후 자동 재검증됨

---

## 5. 가비아 DNS 설정

가비아 → **My가비아** → 도메인 목록 → 각 도메인의 **DNS 관리** → **DNS 설정**

### `jnphousing.com`
1. **A 레코드** 추가:
   - 호스트: `@` (또는 비워둠)
   - 값: `76.76.21.21`
2. **CNAME 레코드** 추가:
   - 호스트: `www`
   - 값: `cname.vercel-dns.com.` ← 마지막 `.` 포함
3. (있다면) 기존 가비아 기본 A 레코드 (네임서버 IP 가리키는 것) 삭제

### `jnphousing.co.kr`
동일하게:
1. A 레코드 `@` → `76.76.21.21`
2. CNAME `www` → `cname.vercel-dns.com.`

### DNS 전파 확인
- 보통 5~30분 (최대 48시간)
- https://dnschecker.org 에서 본인 도메인 입력해 확인
- 또는 PowerShell: `nslookup jnphousing.com`

---

## 6. 도메인 연결 후 마무리

### 6-1. Supabase Auth URL 갱신 (위 2-4 참조)
- Site URL: `https://jnphousing.com`
- Redirect URLs 3개 추가

### 6-2. `NEXT_PUBLIC_SITE_URL` 확인
- Vercel Env Var 의 값이 `https://jnphousing.com` 인지 확인 (스킴 포함)

### 6-3. SSL 인증서
- Vercel이 Let's Encrypt 자동 발급 (수 분 내)
- `https://jnphousing.com` 접속 시 자물쇠 아이콘 확인

### 6-4. 동작 시나리오 검증
- `https://jnphousing.com/` → 메인 정상
- `https://jnphousing.co.kr/` → jnphousing.com 으로 자동 리다이렉트
- `https://www.jnphousing.com/` → jnphousing.com 으로 자동 리다이렉트
- `https://jnphousing.com/admin/login` → 관리자 로그인 (3-3에서 만든 계정으로)
- `https://jnphousing.com/admin/audit` → 감사 로그 정상 표시

---

## 7. 운영 운용 팁

- **데이터 백업**: `https://jnphousing.com/admin/admin-tools` → "지금 엑셀 백업 받기" 주 1회 권장
- **Vercel 모니터링**: Dashboard → Analytics 자동 활성화
- **Supabase 모니터링**: Dashboard → Logs 로 에러 추적
- **도메인 만료 알림**: 가비아 만료 알림 이메일 설정
- **백업 자동화**: 추후 Phase 18 에서 외부 스토리지 자동 백업 추가 검토

---

## 문제 발생 시

- 빌드 실패 → Vercel Dashboard → Deployments → 실패한 deployment → Build Logs 확인
- DNS 전파 안 됨 → `dig jnphousing.com` 또는 dnschecker.org 로 직접 확인
- Supabase 연결 실패 → Vercel Env Vars 값과 Supabase Settings → API 값 비교
- 카톡 알림 미발송 → P7 BLOCKED.md 참조 (비즈메시지 사업자 인증 필요)
