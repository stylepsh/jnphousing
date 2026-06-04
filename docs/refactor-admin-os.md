# /admin OS 리팩토링 — 임대인(소유주) 중심 재구성

> 공개 사이트는 건드리지 않는다. /admin 영역만 재구성.
> 핵심 멘탈모델: **모든 게 임대인별로.** 임대인 → 건물 → 호실 → 관리유형 → 임차 → 월세징수.

## 0. 잠긴 설계 결정 (2026-06-02 확정)

| 항목 | 결정 |
|---|---|
| 소유주 | `landlords` + `landlord_business` → 단일 **`owners`** 통합 |
| 물건 | `properties` + `properties_units` → 단일 **`properties`** + `unit_type(building/unit)` + `parent_building_id`(nullable, 호실 단독 등록 가능) |
| 소유 관계 | **`properties.owner_id` 신설** — 현재는 lease를 통해서만 간접 연결. 공실 물건도 임대인에 직접 매달려야 파이프라인 성립 |
| 관리유형 | 물건별 `service_modes[]`가 source(등록 시 선택). 임대인 카드엔 자동 **rollup** 배지 |
| 데이터 | 테스트 단계(실데이터 거의 없음) → 과감한 재구성 가능. 단 마이그레이션은 무손실 백업 후 |

## 1. 목표 데이터 모델

```
owners                         (임대인 = 소유주, landlords+landlord_business 통합)
  id, name, phone, email
  account_bank/holder/number_enc, business_name/number/corporate_enc, representative
  resident_number_enc, memo, is_active

properties                     (건물·호실 통합)
  id
  owner_id            → owners.id            ★신설
  unit_type           'building' | 'unit'    ★신설
  parent_building_id  → properties.id (nullable, unit일 때 상위 건물)  ★신설
  service_modes[]     ['housing_mgmt','rental_consigned','dm']  (관리유형 source)
  name/address (building) | unit_no/dong/ho/floor/area (unit)
  deposit/rent/management_fee_default
  entrance_password, business_name, ...

leases     unit_id → properties(unit_type=unit) | owner_id → owners | tenant_id → tenants
rent_schedules → rent_invoices → rent_payments   (월세 징수)
agency_commissions → leases                       (정산/수수료)
```

## 2. 임대인별 파이프라인 (가장 중요한 화면)

**소유주 리스트(/admin/owners)** — 행마다 자동 롤업:
임대인명 · 관리유형배지 · 건물N/호실M · 공실수 · 임차중수 · 이번달 월세(완납/연체/미수)

**소유주 상세(/admin/owners/[id])** — 탭 통합 (현재 임대인/위탁관리건물/위탁수수료 메뉴 흡수):
- 기본정보·메모
- 계약유형(체크박스, rollup 표시)
- 물건(건물→호실 드릴다운, 각 호실 임차상태·월세상태)
- 정산(수수료)

**대시보드(/admin/dashboard)** — 회사 전체 = 임대인 파이프라인 합계 + "오늘 할 일"(연체/입금대기/만료임박/미처리민원), 0값 카드는 회색.

## 3. 마이그레이션 계획 (012_owner_centric.sql)

무손실 우선. 단계:
1. **백업**: 기존 landlords/landlord_business/properties/properties_units 행을 백업 테이블 또는 export.
2. `owners` 생성 → landlords 전체 + landlord_business(미중복) 이관. 매핑표(old_id→owner_id) 보관.
3. `properties`에 `owner_id`, `unit_type` default 'building', `parent_building_id` 추가.
4. `properties_units` 행 → `properties`(unit_type='unit', parent_building_id=기존 property_id)로 이관. unit_id 매핑표 보관.
5. FK 재배선: `leases.unit_id`(→ properties), `leases.landlord_id`→`owner_id`, `dm_units`/`monthly_ledger`/기존 `properties.landlord_business_id` → `owner_id`.
6. 구 테이블은 즉시 drop하지 않고 `_deprecated` 접미사로 보존(롤백 안전망).
7. owner 카드 롤업용 뷰 `v_owner_pipeline`(임대인별 건물/호실/공실/임차/월세 집계) 생성.

## 4. 영향받는 기존 페이지 (전환 대상)

landlords, properties(+[id]), units/board, leases(+new/[id]), rent(+bulk/match), commissions,
buildings-managed(+vendors), dm(+units/settlement), landlord-business, ledger, tenants
→ 새 모델 쿼리로 수정 또는 신규 owner/billing 페이지로 흡수. 구 라우트는 삭제 대신 redirect.

## 5. 진행 순서

- [x] ① 사이드바 IA 4단 + CMS 분리 (b25232c)
- [x] A. 마이그레이션 012 (owners/properties 통합 + owner_id + v_owner_pipeline) — DB 적용 완료
- [x] ② 대시보드 재설계 (임대인 파이프라인 + 오늘 할 일) (327f24d)
- [x] ③-a 소유주 리스트 + 상세 탭 골격 (bec4cf2)
- [x] ③-b 소유주 코크핏 — 인라인 건물·호실 등록(상속·일괄) (e398a6e)
- [x] DM→JNP 라벨 일괄 변경 (5009e88)
- [x] 현황 통합 엑셀 내보내기 (0b43e3c)
- [x] P0 leases 재배선 코드 (1736345) — **마이그레이션 013 적용 필요(미적용 시 신규 호실 계약만 막힘)**
- [x] ③-c 정산(수수료) 탭 — 소유주 정산 연결 (4d58f3f)
- [x] ④ 수금·청구 통합 (/admin/rent 허브 + /admin/billing) (0597803)
- [x] P1 공실→계약→수금 자동 생성 (9e9dee1)
- [x] P3 건물·호실 편집 (71e9378)
- [ ] **P0 마이그레이션 013 적용** (박성혁이 Supabase에 붙여넣기 — 미적용 시 신규 호실 계약만 막힘)
- [x] P2 라이트 통합 (ec7ec7b): 임사자→소유주 redirect, 위탁관리건물 시설업체 코크핏 링크, DM 정산 진입 링크 (DM 특화 로직 유지)
- [ ] P2 딥 통합(선택): dm_units 수익분배·정산을 소유주/계약 모델로 흡수 — 감독 하 권장
- [ ] P3 카카오 주소검색 (API 키 필요)
- [ ] 정리: 구 테이블(_deprecated) + downstream ~14페이지(rent/commissions/properties/units-board 등) 신 모델 전환

각 단계: 빌드·실행 확인 후 다음. 구 라우트 redirect로 북마크 보존.

## 6. 제약 (불변)

디자인: navy #1C2B4A / blue #3182F6 / Pretendard Variable / lucide-react.
UI 한국어. 금액 integer(bigint). RLS 필수(is_admin()). zod+인증+권한. 모바일 구조 유지.
