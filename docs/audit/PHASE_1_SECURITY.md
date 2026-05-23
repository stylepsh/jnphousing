# Phase 1 — 보안 감사 (Audit)

감사 일시: 2026-05-23
대상 브랜치: `feature/full-implementation` @ `9a4fb92`

## 0. 요약

| 등급 | 건수 | 비고 |
|---|---:|---|
| 🔴 Critical | 3 | admin server actions 권한 누락 / tenant lookup brute force / agency 거절 시 본인 검증 누락 |
| 🟡 High | 5 | rate limit, storage MIME 검증, agency 로그인 미보호, RLS 누락 가능성, 에러 leak |
| 🟢 Low | 3 | NEXT_PUBLIC 점검, robots, 폰트 CDN 의존 |

## 1. RLS 정책 매트릭스 (기존 8개 테이블)

| 테이블 | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `properties` | `is_published OR is_admin()` | admin | admin | admin |
| `complaints` | admin only | **anyone** | admin | admin |
| `notices` | `is_published OR is_admin()` | admin | admin | admin |
| `downloads` | `is_published OR is_admin()` | admin | admin | admin |
| `inquiries` | admin only | **anyone** | admin | — (no delete policy) |
| `agencies` | self OR admin | self (`auth.uid()=user_id`) | self(approved만) OR admin | admin |
| `vacancies` | `approved_agency` OR admin | admin | admin | admin |
| `admin_users` | self OR admin | super only | super only | super only |

🟢 RLS 자체는 모두 활성화 + 정책 작성 완료.
🟡 `inquiries` 에 DELETE 정책 없음 (서비스에서도 안 쓸 거라 OK, 그러나 Phase 9에서 admin DELETE 정책 명시 권장).
🟡 `agencies.SELECT` 가 본인+admin인데, RLS 안에서는 본인 row만 보이므로 admin 페이지에서 service_role 사용 — 의도된 동작이나 audit 필요.

## 2. Server Actions 전수 감사 (8개 파일)

| 파일 | action | 인증 | 권한 | zod | 에러처리 | PII 로그 |
|---|---|:-:|:-:|:-:|:-:|:-:|
| admin/complaints/actions.ts | `updateComplaint` | ❌ | ❌ | ❌ | 부분 | OK |
| admin/inquiries/actions.ts | `updateInquiry` | ❌ | ❌ | ❌ | 부분 | OK |
| admin/agencies/actions.ts | `approveAgency` | ⚠ (user 확인만, admin 미확인) | ❌ | ❌ | 부분 | OK |
| admin/agencies/actions.ts | `rejectAgency` | ❌ | ❌ | ❌ | 부분 | OK |
| admin/vacancies/actions.ts | `createVacancy` | ❌ | ❌ | ✅ | OK | OK |
| admin/vacancies/actions.ts | `updateVacancyStatus` | ❌ | ❌ | ❌ | 부분 | OK |
| admin/vacancies/actions.ts | `deleteVacancy` | ❌ | ❌ | ❌ | 부분 | OK |
| admin/properties/actions.ts | `upsertProperty` | ❌ | ❌ | ✅ | OK | OK |
| admin/properties/actions.ts | `deleteProperty` | ❌ | ❌ | ❌ | 부분 | OK |
| admin/notices/actions.ts | `upsertNotice` | ❌ | ❌ | ✅ | OK | OK |
| admin/notices/actions.ts | `deleteNotice` | ❌ | ❌ | ❌ | 부분 | OK |
| admin/downloads/actions.ts | `upsertDownload` | ❌ | ❌ | ✅ | OK | OK |
| admin/downloads/actions.ts | `deleteDownload` | ❌ | ❌ | ❌ | 부분 | OK |
| tenant/complaint/lookup/actions.ts | `lookupComplaint` | n/a (public) | ✅ phone+id 매칭 | ⚠ FormData 수동 검증 | OK | OK |

**🔴 Critical #1**: 모든 admin actions 14개 중 13개가 **인증/권한 무체크**. middleware가 `/admin/*` path를 보호하지만 server action endpoint는 path 우회 호출 가능. POST `/admin/...?_action=...` 또는 action ID 직접 호출 시 service_role로 임의 DB 변경 가능. **즉시 수정 필요.**

**🔴 Critical #2**: `tenant/complaint/lookup/actions.ts` — 최근 30일 모든 complaints 가져와서 in-memory 매칭. brute force 시 phone last4 + uuid prefix 4자 = 충돌 가능성. IP rate limit 없음. → Phase 5에서 강화하지만 Phase 1에서 **간단한 in-memory rate limit** 즉시 추가.

**🔴 Critical #3**: `rejectAgency` 호출자 검증 없음. anonymous로 호출 가능하면 누구나 부동산 회원 거절 가능. → Critical #1과 함께 수정.

## 3. middleware.ts 보호 매트릭스

| 경로 | 인증 요구 | 추가 권한 | 우회 가능? |
|---|:-:|---|:-:|
| `/admin/login` | ❌ | — | OK (의도) |
| `/admin/*` | ✅ | `admin_users` row 존재 | NO (path 기반 middleware) |
| `/agency/vacancies/*` | ✅ | `agencies.status='approved'` | NO |
| `/agency/login` | ❌ | — | OK |
| `/agency/signup` | ❌ | — | OK |
| `/agency/pending` | ❌ (미보호) | — | ⚠ 본인 데이터 아닌 사람도 접근 가능 (UI상 의미 없음, low risk) |
| `/agency/rejected` | ❌ (미보호) | — | ⚠ 동일 |
| `/tenant/*` | ❌ | — | OK (의도) |
| 공개 페이지 | ❌ | — | OK |
| server action endpoints | middleware는 path 기준이라 통과 | actions 자체 검증 필요 | **🔴 위 #1 참조** |

🟡 **High #1**: `/agency/pending`, `/agency/rejected` 는 로그인 안 해도 접근 가능. 본인 데이터는 안 보이지만 UX 일관성 위해 로그인 요구 권장. → Phase 1에서 함께 수정.

## 4. Storage 정책

| 버킷 | public read | INSERT | UPDATE | DELETE | MIME 검증 | 크기 제한 |
|---|:-:|---|---|---|:-:|---|
| complaints-images | ✅ | anyone | — | admin | jpeg/png/webp/heic | 5MB |
| vacancy-images | ✅ | admin | admin | admin | jpeg/png/webp | 10MB |
| downloads | ✅ | admin | admin | admin | (없음 — any) | 20MB |
| property-images | ✅ | admin | admin | admin | jpeg/png/webp | 10MB |

🟡 **High #2**: `complaints-images` INSERT anyone. MIME 검증은 있으나 실제 파일 내용은 검증 X (확장자만). 이미지 파일 위장 악성 코드 업로드 가능. 위험도 낮음(다운로드 시 미실행, 사이트 자체는 image 태그로만 표시) 그러나 magic-bytes 검증 권장. → Phase 5/6 에서 처리, 지금은 기록만.
🟡 **High #3**: `downloads` 버킷 MIME 검증 없음. 관리자 업로드 한정이라 risk 낮지만 향후 부동산 회원에게 업로드 권한 줄 경우 위험. → 명시 권장.

## 5. SERVICE_ROLE 사용 위치

- `src/lib/supabase/server.ts` — `createServiceClient()` 정의 (server-only)
- 사용처 (`'use server'` 파일에서만):
  - 모든 admin/* actions (7개 파일)
  - tenant/complaint/lookup/actions.ts (RLS 우회로 phone+code 매칭)

✅ 클라이언트 컴포넌트(`"use client"`)에서 `createServiceClient` import 없음.
✅ middleware.ts 는 anon key만 사용.

## 6. NEXT_PUBLIC_ 변수

- `NEXT_PUBLIC_SUPABASE_URL` ✅ (의도된 공개)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` ✅ (의도)
- `NEXT_PUBLIC_SITE_URL` ✅ (sitemap/robots)
- `NEXT_PUBLIC_KAKAO_CHANNEL_ID` — 현재 사용 X (`COMPANY.contact.kakaoOpenChat` 하드코딩). 향후 활성화 가능.

🟢 모두 안전.

## 7. dangerouslySetInnerHTML / eval

```
grep -r "dangerouslySetInnerHTML|eval\(|new Function\(" src/
→ 매치 0
```

✅ 없음.

## 8. 파일 업로드 검증

- 클라이언트(`tenant/complaint/complaint-form.tsx`): 크기 5MB, 개수 5, MIME accept="image/*" — **클라이언트 검증만** 🟡
- 서버 검증: Storage 버킷의 `allowed_mime_types` + `file_size_limit` 가 마지막 방어선 ✅
- magic-bytes 검증 없음

🟡 **High #4**: 클라이언트 검증은 우회 가능. Server Action으로 업로드 받고 검증 후 Storage put 패턴 권장. → Phase 5에서 처리.

## 9. 에러 정보 노출

🟡 **High #5**: 일부 action에서 `error.message` 그대로 toast로 반환 → DB constraint 메시지 leak 가능 (예: foreign key 위반 시 테이블/컬럼명 노출). `errors.ts`의 `safeToShow` 패턴으로 마스킹 권장. → Phase 1에서 부분 적용.

---

## Phase 1 수정 계획

### 🔴 Critical 즉시 수정
1. `src/lib/auth-guard.ts` 신규 — `requireAdminContext()`, `requireAgencyApprovedContext()` 헬퍼
2. 모든 admin actions 첫 줄에 `await requireAdminContext()` 호출 추가
3. `tenant/complaint/lookup/actions.ts` 에 in-memory IP rate limit (Phase 5에서 Redis로 교체)
4. agency_actions `rejectAgency` 에도 admin 체크

### 🟡 High 부분 수정
5. middleware: `/agency/pending`, `/agency/rejected` 로그인 요구
6. action 에러 메시지 마스킹 (safeToShow 패턴)

### 보류 (Phase 별로 분배)
- 파일 업로드 magic-bytes → Phase 5
- Storage MIME 강화 → Phase 5
- inquiries DELETE 정책 → Phase 9
