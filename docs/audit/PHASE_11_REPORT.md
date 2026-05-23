# Phase 11 — 호실 CRUD + 엑셀 백업 REPORT

작업 일시: 2026-05-23
시작 commit: `60d82b4`
요청: "건물추가 / 관리사항 / 입금내역 / 임대관리 / 호실추가 / 공실여부 / 임차인·계약·월세 수령일 + 수시 엑셀 백업"

## 1. 호실 (`properties_units`) 관리 — 누락 보완

### 신규 파일
- `src/app/admin/(panel)/properties/[id]/page.tsx` — 건물 상세 페이지 신규
- `src/app/admin/(panel)/properties/[id]/unit-dialog.tsx` — 호실 추가/편집 모달
- `src/app/admin/(panel)/properties/[id]/units-actions.ts` — `upsertUnit` / `deleteUnit` (requireAdmin + zod + audit)

### 건물 상세 페이지 (`/admin/properties/[id]`)
- **건물 통계 4종**: 총 호실 / 임차중 / 공실 / 만료 임박(60일)
- **호실 목록 테이블**: 호실번호 · 평형/층 · 기본 임대조건 · 상태(공실/준비중/임차중/만료임박) · 임차인+계약만료일
- 임차인 셀 클릭 → 해당 계약 상세로 이동
- 호실 추가 다이얼로그: 호실번호·동·층·평형(m² 자동변환)·방·욕실·기본 보증금/월세/관리비·메모
- 평형 → m² 자동 변환 (× 3.3058)

### 목록 페이지 (`/admin/properties`) 보강
- "호실 (임차/공실)" 컬럼 추가 — `5 / 3 / 총 8` 형식
- 건물명 클릭 → 상세 페이지 진입
- "호실" 버튼으로 빠른 진입

## 2. 종합 엑셀 백업

### 패키지
- `exceljs` ^4 — node 환경 .xlsx 생성, 한글 안전

### 신규 모듈
- `src/lib/excel-backup.ts` — `buildBackupWorkbook()` 호출 한 번으로 단일 .xlsx 생성
  - **18개 시트** + 메타 시트
    - `01_건물` `02_호실` `03_임대인` `04_임차인` `05_계약`
    - `06_청구스케줄` `07_청구서` `08_입금` `09_위탁수수료`
    - `10_민원` `11_관리문의` `12_부동산회원` `13_공실매물`
    - `14_공지` `15_서류` `16_계약이벤트` `17_알림로그` `18_감사로그`
  - 모든 시트:
    - 한국어 헤더, 자동 열 너비
    - 헤더 스타일 (네이비 배경 + 흰 글자 + bold)
    - 1행 freeze pane + auto filter
    - timestamp는 KST 'YYYY-MM-DD HH:mm'
    - jsonb 컬럼은 단축 문자열로 직렬화

### 다운로드 라우트
- `GET /api/admin/backup/excel`
  - `requireAdmin` 보호
  - `Content-Disposition` 한국어 파일명 `JNP_백업_YYYY-MM-DDTHH-MM.xlsx` (UTF-8 인코딩)
  - `Cache-Control: private, no-cache`
  - 다운로드 시각·바이트 수를 `audit_logs.backup.download` 으로 자동 기록 → /admin/audit 에서 추적 가능

### 관리자 UI
- `/admin/admin-tools` 페이지 최상단에 **데이터 엑셀 백업** 카드 (Primary 색 강조)
  - "지금 엑셀 백업 받기" 큰 버튼
  - 안내문: "매일/매주 다운로드 후 별도 저장소(개인 PC + 외장하드 + 클라우드)에 분산 보관"
  - 감사 로그 기록 안내

## 3. 검증
- `npm run build` ✅
- `npm run test` ✅ 46/46

## 4. 미해결 (BLOCKED.md 참조)
- 자동 정기 백업 (매일 02:00 외부 스토리지 업로드) — 운영 단계에서 검토. 현재는 수동 다운로드.
- 일부 건물별 "운영 메모/관리사항" 별도 필드 — `properties.description` 으로 활용 가능, 분리 필요 시 컬럼 추가.

## 5. 박성혁님 답변 매핑

| 요청 | 해결 위치 |
|---|---|
| 건물 추가 / 관리사항 | `/admin/properties` 등록 (description 필드) |
| 입금 내역 등 관리 정보 | `/admin/rent`, `/admin/rent/invoices/[id]` |
| 임대관리 — 건물·호실 추가 | `/admin/properties` + `/admin/properties/[id]` (호실 추가) |
| 공실 여부 | `/admin/properties/[id]` 호실별 상태 표시 + `/admin/vacancies` (외부 노출용) |
| 임차인 내용 | `/admin/tenants` 등록 + 계약 연결 표시 |
| 계약 내용 | `/admin/leases` 전체 흐름 (CRUD + 활성화/해지/갱신) |
| 월세 수령 날짜 | `due_date` (스케줄/청구서) + `paid_at` (입금) |
| 수시 엑셀 저장 — 2중 3중 백업 | `/admin/admin-tools` → "지금 엑셀 백업 받기" 18개 시트 단일 파일 |

## 다음
- 백업 다운로드 단축 진입 — Dashboard 우상단에도 버튼 추가 검토
- 일별 자동 백업 (cron + 외부 스토리지) — 운영 결정 후
