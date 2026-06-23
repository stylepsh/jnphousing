# 경매 답사표 엑셀 왕복 + 파이프라인 연결 — 설계

> 작성 2026-06-23 (박성혁 브레인스토밍). 대상: JNP주택관리 OS `auction` 서브시스템.
> 한 줄: 답사자가 제각각 정리해 오는 포맷을 없애고, **우리가 표준 엑셀 답사표를 주고(내보내기) → 답사자가 칸만 채워 다시 올리면(업로드) → 기존 답사 파이프라인에 그대로 적재**되는 왕복 흐름을 만든다.

## 1. 배경 / 문제

- 팀원들이 안산·수원·시흥 등 현장 답사 후 **제각각 정리한 CSV/엑셀**을 가져온다(예: `5_6183887483214767171.csv` = 시흥 단기임대 55건). 셀 안 줄바꿈·임대인과 채권자 한 칸·비고 병합 등으로 **파싱이 깨지기 쉽고 보기 불편**하다.
- 기존 OS에는 이미 **완전한 디지털 답사 워크플로우**가 있다: 답사자 포털 웹폼(`occupancy`·`can_open`·`merchandising_ready`·`mail_status`·`key_needed`·`comment`) → 검토 → 상태머신 전이. 하지만 현장 답사자는 웹폼보다 **엑셀 일괄 정리**를 선호한다.
- 따라서 새 파이프라인을 만드는 게 아니라, 기존 워크플로우에 **오프라인 엑셀 다리 2지점**(답사표 내보내기 / 채워온 표 업로드)을 추가한다.

## 2. 목표 / 비목표

**목표**
- 표준 답사표 엑셀을 수집풀에서 생성(식별칸 미리 채움)해 답사자에게 제공.
- 채워온 표준 엑셀을 업로드 → 사건번호 매칭 → 답사기록(`auction_inspection`) 일괄 생성·제출 → 상태 전이.
- 점유상태 분류를 파이프라인에 연결: **X=공실→상품화 가능 / O=점유→영구 제외 / △=추후 재방문**.
- 지역(안산·수원·시흥)별 배치로 공존·필터.

**비목표 (YAGNI)**
- PDF 파싱(표 추출 불안정) — V1 제외. 답사자가 CSV/xlsx로 내보내면 됨.
- 모바일 전용 입력 앱.
- 답사자 포털 웹폼 대체(웹폼은 그대로 두고 엑셀 경로를 병행 추가).

## 3. 전체 파이프라인 (수집 → 최종 임대) — 컨텍스트

| # | 단계 | pipeline_state | 처리 | 신규 |
|---|---|---|---|---|
| 1 | 수집 | `Collected` | 지지옥션 텍스트 → HUG/SGI 필터 → 중복차단 | 기존 |
| 2 | 선별 | `Selected` | 답사 갈 물건 선정 | 기존 |
| 3 | 답사 배정 | `Inspecting` | 답사자 배정 + **📤 표준 답사표 내보내기** | 🆕 |
| 4 | 현장 답사 | — | 답사자가 엑셀 빈칸 채움 | — |
| 5 | 답사 취합 | `Reviewing` | **📥 채워온 엑셀 업로드 → 일괄 적재** | 🆕 |
| 6 | 판정(개방) | → `Available`/`Occupied`/`Recheck` | X→상품화가능 · O→영구제외 · △→재방문 | 기존 |
| 7 | 상품화 | `Available` | 작업비용 입력·수리·청소 | 기존 |
| 8 | 임대(최종) | `Leased` | 월세·수수료율 → 계약 → jnp 임대 연결 | 기존 |

기존 상태머신: `@/lib/auction/pipeline/state-machine`. 액션 `SELECT·ASSIGN_INSPECTION·SUBMIT_INSPECTION·APPROVE·MARK_OCCUPIED·REQUEST_RECHECK·REJECT·CONTRACT_SIGNED`.

## 4. 신규 컴포넌트 A — 표준 답사표 내보내기 (3단계)

- **위치:** `/admin/auction/pipeline/assign` (또는 survey) 에 "답사표 엑셀 내보내기" 버튼.
- **입력:** 지역/배치 또는 선택된 물건 id 목록.
- **출력:** `.xlsx` 1지역=1시트. 기존 엑셀 내보내기 유틸(`src/lib/building-export.ts`·`overview-export.ts`) 패턴 재사용.
- **컬럼**
  - *미리 채움(잠금 권장):* `방문순번 · 동 · 상세주소 · 사건번호 · 물건종류 · 임대인 · 채권자`
  - *답사자 입력(빈칸 + 드롭다운):* `점유상태(O/X/△) · 개방가능(가능/불가/관리실확인) · 상품화준비(가능/보류/불가) · 우편(O/X) · 계량기(O/X) · 현관비번 · 관리실 · 비고`
- **사건번호는 매칭 키**라 숨김/잠금 컬럼이라도 반드시 보존.
- 첫 행에 지역명(예 "시흥 단기임대") — 업로드 시 지역 자동 인식에 사용.

## 5. 신규 컴포넌트 B — 답사표 업로드·취합 (5단계)

- **위치:** `/admin/auction/survey` (또는 collection 옆) "답사표 업로드".
- **파일:** `.xlsx`/`.csv`. 첫 줄 지역명 + 헤더 행 자동 감지. 셀 내 줄바꿈 정규화.
- **파싱 → 정규화 매핑**

  | 답사표 | → 저장 | 처리 |
  |---|---|---|
  | 사건번호 | `auction_property.case_number` | **매칭 키** |
  | 동+상세주소 | `address` / `address_short` | `[도로명]`·줄바꿈 분리 |
  | 물건종류 | `category` | 그대로 |
  | 임대인 채권 | `owner_name` + `creditor`/`creditor_type` | "박국섭 주택도시보증공사"→소유자 박국섭, HUG. "서울보증보험"→SGI. `classifyCreditor()` 재사용 |
  | 점유상태 O/X/△ | inspection `occupancy` (vacant/occupied/recheck) | **X→vacant · O→occupied · △→recheck** |
  | 개방가능 | inspection `can_open` (possible/impossible/admin_check) | |
  | 상품화준비 | inspection `merchandising_ready` (possible/hold/impossible) | |
  | 우편 | inspection `mail_status` (none/normal/overflow) | O→normal(비고에 "대량"이면 overflow) |
  | 계량기 | `auction_property.meter_check` (jsonb) | O/X 보존 |
  | 현관비번 | `auction_property.door_code` + inspection `key_needed` | |
  | 관리실/비고 | inspection `comment` / `survey_memo` | 합류·줄바꿈 정리 |

- **매칭 로직:** 사건번호로 `auction_property` 조회.
  - 있으면: `auction_inspection` 생성(answer)→ `SUBMIT_INSPECTION`(→Reviewing) 후 자동 판정 전이(아래).
  - 없으면(미매칭): **자동 신규 등록** — `auction_property` insert(survey 배치 태깅) 후 동일 처리. (점유 O 신규도 등록돼야 향후 재수집에서 영구 제외됨)
- **자동 판정(개방) 전이** — 업로드 시 1차 자동, 검토 화면에서 수정 가능:
  - `X(vacant) + 개방가능` → `APPROVE` → **Available(상품화 가능)**
  - `O(occupied)` → `MARK_OCCUPIED` → **Occupied(영구 제외)**
  - `△(recheck)` → `REQUEST_RECHECK` → **Recheck(재방문)**
- **결과 요약:** 총 N · 공실(상품화 가능) N · 점유(제외) N · 재방문 N · 신규등록 N · 매칭 N.

## 6. 재수집 영구 제외 보강 (요구사항 핵심)

- 현재 `importAuctionText` 중복차단은 **주소 문자열** 기준 → 답사표 주소와 지지옥션 주소 포맷이 달라 새어나갈 수 있음.
- **보강:** 중복차단을 **사건번호(case_number) 우선 + 주소 보조**로 변경. 기존 행이 `vacant/occupied/recheck/skip`(=rejected 아님)이면 재수집 제외 — 점유 O는 영원히 다시 안 나옴.

## 7. 시흥 55건 처리

- 표준 컬럼이 현재 시흥 CSV와 동일하므로, **시흥 CSV를 컴포넌트 B 업로드의 첫 실적재**로 투입(셀 줄바꿈 정규화 포함). 재입력 불필요.

## 8. 데이터/구현 메모

- 신규 테이블 불필요(기존 `auction_property`·`auction_inspection`·`auction_survey_batch`·`auction_pipeline_event` 재사용). 필요 시 `meter_check` 외 추가 필드는 additive 마이그레이션.
- 금액 정수(원), RLS 유지, zod 검증, 단계별 commit — [[feedback-jnp-implementation-rules]] 준수.
- 엑셀 파싱/생성 라이브러리는 기존 export 유틸이 쓰는 것 재사용(없으면 `exceljs`).
- 권한: `requireAdmin()`.

## 9. 결정 기록 (브레인스토밍)

- 형태 = **앱 기능**(업로드 페이지 + DB 적재 + 엑셀 내보내기).
- 점유 분류: **X=공실 / O=점유(영구제외) / △=재방문**.
- 미매칭 사건번호 = **자동 신규 등록**.
- 답사자에게는 **식별칸 미리 채운 표준 엑셀** 제공(왕복).
- PDF 미지원(V1).
