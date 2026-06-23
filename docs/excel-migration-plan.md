# 엑셀 원장 → OS 완전 이관 + 라운드트립 계획

> 원본: `DM-임대관리현황.xlsx` (18시트, 2.3MB) — 회사 실사용 원장(source of truth)
> 목표: ① 엑셀의 모든 데이터(숨은 행/열/시트 포함) 100% OS 적재 ② OS에 그릇 없으면 스키마/UI 확장 ③ 편리한 입력 ④ "엑셀 내보내기" = 원본 18시트 구조와 100% 일치, 수시 재생산

## 0. 워크북 실측 요약 (Phase 0 완료)

- 18 시트. 핵심 척추 = **`ALL`** (임대인·건물·호실·계약·임차·월별수금 통합), R2 헤더 / R4~ 데이터.
- **대량 숨김 발견**: `ALL` 숨은 컬럼 56개(계약·금액·임차·월별수금 전부) + 숨은 행 52개. `보고서` 127행 숨김. `1이지웅장부` 726/752행 숨김.
- 실제 임대인 ~14명: 이지웅·김상혁·김정호·이장미·㈜파크앤시티·임수형·대명낙찰자·이제영(리빙트리)·박정욱·양희정·황정현·이인호·정경모·노건철. (나머지는 소계/수식 노이즈 행)
- 건물 ~35동, 호실 265개(임차 236, 공실 29).
- 데이터 도메인: 단기임대 + 전세/장기 + 경매 + 임대인별 정산회계 + 퇴실정산 + 물건 상세.

## 1. 시트 분류

| 시트 | 성격 | OS 대상 |
|---|---|---|
| ALL | 물건·임차·수금 마스터 | owners/properties/tenants/leases/rent_* |
| 보고서 | 단기임대인 수익지급 요약(파생) | 내보내기 시 재생성(뷰) |
| N임대인장부 (8개) | 임대인별 정산회계(수입/지출/이익배분) | **신규: 정산 서브시스템** |
| 5파크앤시티물건지 / 4트라움장부 | 건물별 임차현황(상세) | leases 보강 소스 |
| N물건지 (김상혁/이지웅/트라움/김정호/박정욱) | 임대인별 물건 상세 로스터 | properties 상세필드 소스 |
| 퇴실정산 | 호실별 퇴실정산 + 검침 | **신규: 퇴실정산** |
| 9황정현 | 황정현 정산장부 | 정산 서브시스템 |

## 2. 스키마 갭 분석 (엑셀에 있는데 OS에 그릇 없음)

### owners (임대인)
- 신규: `settlement_method`(분배기준: "5:5","5:2.5:2.5","위탁","70/30","위탁+관리비" 등) , `sub_beneficiaries`(후배 등 공동수익자 jsonb), 이름에 박힌 전화/사업자(예 "이제영(주)리빙트리010-8889-4900()30%") 파싱.
- 사업체형: ㈜파크앤시티·(주)트라움하임·(주)리빙트리 → business_name/representative 활용.

### properties (건물·호실) — 물건지 시트에서 대량 보강
- 신규 컬럼: `building_type_detail`(형태: 다세대주택/OP/주택), `room_layout`(방2화1), `ev_available`, `direction`(방향), `household_count`(세대수), `parking`(주차장), `approval_date`(사용승인일), `entrance_code`(공동현관), `door_code`(비번), `options_text`, `condition_grade`(상/중/하), `mgmt_office`(관리실), `repair_notes`(수리여부외특이사항), `room_condition`(룸컨디션), `product_status`(상품상태: 즉시/수선/협의), `registered_at`/`registered_by`, `utility_info`(전기/수도/가스 검침·납부 jsonb), `vacancy_status`.

### leases (계약)
- 신규: `prepaid_mgmt_fee`(선수관리비), `elevator_fee`(엘베사용료), `payment_timing`(선불/후불), `balance_due_date`(잔금일), `unpaid_mgmt_fee`(미납관리비), `usage_period_text`(사용기간 "6M","1M씩연장").

### 경매 (auction)
- ALL/물건지의 경매개시·임차권·배당종기·매각기일·허그·사건번호(타경) → 기존 auction 서브시스템(auction_property/case)과 연결 또는 properties에 경매요약 컬럼. (기존 auction 테이블 재사용 우선 검토)

### 신규 서브시스템 A — 임대인 정산 (장부)
- `landlord_settlements`: owner_id, period, 입금총계, 지출총계, 임대인이익금, 당사이익금, 보증금파킹, 통장잔고, 지급완료, 잔액, 지급일, status.
- `settlement_entries`: settlement_id, kind(income/expense), category(보증금/임대료/위탁관리비/관리비/중개보수료/보수공과비/청소비/기타/보증금반환…), amount, memo, lease_id?.
- 분배: 임대인:당사:(후배) 비율 적용.

### 신규 서브시스템 B — 퇴실정산
- `move_out_settlements`: lease_id/unit, tenant, period, 만기/중도, 보증금반환, 공제내역, 검침(한전/가스/수도 meter readings jsonb), status.
- (기존 020_move_in_and_unit_expenses 와 정합 확인)

### 라운드트립 보존 — 원본 셀 미러 (선택, 100% 일치 보장용)
- `source_excel_cells`(또는 커밋된 workbook-dump.json): sheet,row,col,value/formula 원형 무손실 저장. 내보내기/감사/롤백 안전망.

## 3. 내보내기(Export) 충실도 정의 ★합의 필요

- **달성 가능(권장)**: 같은 18 시트명·컬럼순서·헤더·병합 레이아웃으로 내보내고, **데이터 셀 100% 일치**. 수식/요약 시트(보고서·장부)는 정규화 데이터에서 **재계산하여 값 또는 동등 수식**으로 채움. 내보낸 파일을 다시 가져오기(round-trip) 검증 통과.
- **비권장(비현실)**: 모든 숨은 보조수식·서식까지 byte-identical 복제 (장부 시트의 726개 계산행 등). 가치 대비 비용 과다.

## 4. 실행 순서 (체크포인트마다 검수)

0. [x] 워크북 완전 분석(숨은 내용 포함) → workbook-dump.json
1. [ ] 스키마 갭 → 확장 마이그레이션(025_…) 설계·작성 + 매핑표 확정
2. [ ] ETL: 엑셀 → 정제 스테이징 JSON (노이즈 제거, 표준화, 중복병합, 금액정합성 리포트)
3. [ ] 백업(현 DB 전체) → 옮기다 만 데이터 비우기 → 정본 멱등 적재 → 대조 검수
4. [ ] 입력 UI 개선(신규 필드 + 입력 최소화)
5. [ ] 엑셀 내보내기(원본 18시트 재현) + round-trip 검증

## 5. 안전장치
- 모든 파괴적 작업 전 CSV/JSON 백업. dry-run 검수 통과 후에만 본 적재.
- 금액 integer(원), RLS 유지, 단계별 commit. (feedback-jnp-implementation-rules 준수)
