-- ============================================================================
-- 025: 엑셀 원장(DM-임대관리현황.xlsx) 완전 정합 — OS 스키마 확장 (additive)
--   목적: 엑셀의 모든 항목(숨은 열/시트 포함)을 OS가 손실 없이 담는다.
--   원칙:
--     - 전부 additive (add column if not exists / create table if not exists).
--       기존 데이터/FK 무손상.
--     - 금액은 bigint(원 정수). 비율은 numeric. 모든 신규 테이블 RLS on + admin 정책.
--     - 엑셀 원형 보존을 위해 형식이 지저분한 값(날짜 "20.01.07", 기간 "6M",
--       비율 "5:2.5:2.5")은 text로 무손실 저장하고, 필요 시 파생 컬럼은 ETL에서 채움.
--   참조: docs/excel-migration-plan.md
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────
-- A. owners (임대인) — 정산방식/공동수익자
-- ─────────────────────────────────────────────────────────────────────────
alter table public.owners
  add column if not exists settlement_method text,          -- 분배기준 원문: "5:5","5:2.5:2.5","위탁","위탁+관리비","70/30"
  add column if not exists profit_split jsonb,               -- 파싱된 비율 {landlord, company, sub:[{name,rate}]}
  add column if not exists sub_beneficiaries jsonb not null default '[]'::jsonb, -- 후배 등 공동수익자
  add column if not exists settlement_cycle text,            -- 지급주기/지급일 메모 ("5일지급" 등)
  add column if not exists source_sheet text;                -- 원천 시트명(이관 추적)

-- ─────────────────────────────────────────────────────────────────────────
-- B. properties (건물·호실) — 물건지/ALL 상세필드 대량 보강
-- ─────────────────────────────────────────────────────────────────────────
alter table public.properties
  add column if not exists building_type_detail text,        -- 형태 (다세대주택/OP/주택/오피스텔 등 원문)
  add column if not exists room_layout text,                 -- 방구조 ("방2화1")
  add column if not exists ev_available text,                -- E/V (ㅇ/x/0 원문 보존)
  add column if not exists blocked text,                     -- 막힘
  add column if not exists direction text,                   -- 방향
  add column if not exists household_count int,              -- 세대수
  add column if not exists parking text,                     -- 주차장 ("자주식7대", 대수)
  add column if not exists approval_date_text text,          -- 사용승인일 원문("20.01.07")
  add column if not exists entrance_code text,               -- 공동현관
  add column if not exists door_code text,                   -- 비번
  add column if not exists options_text text,                -- 옵션(풀텍스트)
  add column if not exists condition_grade text,             -- 컨디션(상/중/하/최상)
  add column if not exists room_condition text,              -- 룸컨디션
  add column if not exists mgmt_office text,                 -- 관리실
  add column if not exists repair_notes text,                -- 수리여부외특이사항
  add column if not exists product_status text,              -- 상품상태(즉시/수선/협의/체크)
  add column if not exists vacancy_status text,              -- 공실여부(공실/입주 원문)
  add column if not exists registered_at_text text,          -- 등록일 원문
  add column if not exists registered_by text,               -- 등록자
  add column if not exists utility_info jsonb,               -- 전기/수도/가스 검침·납부 {elec,water,gas,...}
  add column if not exists auction_info jsonb,               -- 경매요약 {start,임차권,배당종기,매각기일,허그,사건번호}
  add column if not exists source_sheet text,
  add column if not exists source_row int;

-- ─────────────────────────────────────────────────────────────────────────
-- C. leases (계약) — 엑셀 계약 부가필드
-- ─────────────────────────────────────────────────────────────────────────
alter table public.leases
  add column if not exists prepaid_mgmt_fee bigint not null default 0 check (prepaid_mgmt_fee >= 0), -- 선수관리비
  add column if not exists elevator_fee bigint not null default 0 check (elevator_fee >= 0),         -- 엘베사용료
  add column if not exists payment_timing text,              -- 선불/후불
  add column if not exists balance_due_text text,            -- 잔금일 원문
  add column if not exists unpaid_mgmt_fee bigint not null default 0 check (unpaid_mgmt_fee >= 0),   -- 미납관리비
  add column if not exists usage_period_text text,           -- 사용기간("6M","1M씩연장")
  add column if not exists source_sheet text,
  add column if not exists source_row int;

-- ─────────────────────────────────────────────────────────────────────────
-- D. 임대인 정산(장부) — 신규 서브시스템
--    N임대인장부 시트: 상단 요약 + 하단 거래내역(수입/지출) + 이익배분
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.landlord_settlements (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid references public.owners(id) on delete set null,
  owner_name text not null,                  -- 원문 임대인명(매칭 실패 대비)
  period_label text,                         -- "26.03.31현재","7/31정산" 등 원문
  as_of_date date,
  total_income bigint not null default 0,    -- 입금총계
  total_expense bigint not null default 0,   -- 지출총계
  landlord_profit bigint not null default 0, -- 임대인이익금
  company_profit bigint not null default 0,  -- 당사이익금
  sub_profit bigint not null default 0,      -- 후배/공동 이익금
  deposit_parking bigint not null default 0, -- 보증금파킹
  account_balance bigint,                    -- 통장잔고
  paid_amount bigint not null default 0,     -- 지급완료
  balance_amount bigint not null default 0,  -- 잔액(미지급)
  split_basis text,                          -- 분배기준 원문
  status text not null default 'open' check (status in ('open','partial','settled')),
  memo text,
  source_sheet text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_settlements_owner on public.landlord_settlements(owner_id);
create trigger trg_settlements_updated_at before update on public.landlord_settlements
  for each row execute function public.set_updated_at();

create table if not exists public.settlement_entries (
  id uuid primary key default uuid_generate_v4(),
  settlement_id uuid references public.landlord_settlements(id) on delete cascade,
  owner_id uuid references public.owners(id) on delete set null,
  entry_kind text not null check (entry_kind in ('income','expense')),
  category text not null,                     -- 보증금/임대료/위탁관리비/관리비/선납관리비/엘베사용료/중개보수료/보수공과비/청소비/미납관리비/보증금반환/기타
  amount bigint not null default 0,
  occurred_on date,
  occurred_text text,                         -- 날짜 원문
  lease_id uuid references public.leases(id) on delete set null,
  building_name text, unit_no text,           -- 거래내역 행의 건물/호수 원문
  tenant_name text,
  memo text,
  source_sheet text,
  source_row int,
  created_at timestamptz not null default now()
);
create index if not exists idx_settlement_entries_settlement on public.settlement_entries(settlement_id);
create index if not exists idx_settlement_entries_owner on public.settlement_entries(owner_id);

-- ─────────────────────────────────────────────────────────────────────────
-- E. 퇴실정산 — 신규 (검침/보증금반환/공제)
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.move_out_settlements (
  id uuid primary key default uuid_generate_v4(),
  lease_id uuid references public.leases(id) on delete set null,
  unit_id uuid references public.properties(id) on delete set null,
  owner_id uuid references public.owners(id) on delete set null,
  building_unit_text text,                    -- "에트빌 401호" 원문
  tenant_name text,
  period_text text,                           -- 기간 원문
  move_out_type text,                         -- 만기퇴실/중도 등 사유
  deposit_amount bigint not null default 0,
  deposit_return bigint not null default 0,   -- 환급액
  rent_settle bigint not null default 0,      -- 임대료 정산
  mgmt_settle bigint not null default 0,      -- 관리비 정산
  elec_settle bigint not null default 0,      -- 전기료 정산
  water_settle bigint not null default 0,     -- 수도료 정산
  gas_settle bigint not null default 0,       -- 가스비 정산
  brokerage bigint not null default 0,        -- 중개료
  etc_settle bigint not null default 0,       -- 기타
  meter_readings jsonb,                       -- 검침 원문 {elec,gas,water}
  deductions jsonb,                           -- 공제 상세
  status text not null default 'draft' check (status in ('draft','done')),
  memo text,
  source_sheet text,
  source_row int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_moveout_lease on public.move_out_settlements(lease_id);
create index if not exists idx_moveout_owner on public.move_out_settlements(owner_id);
create trigger trg_moveout_updated_at before update on public.move_out_settlements
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────
-- RLS — 신규 테이블 admin 전용 (002 패턴 동일)
-- ─────────────────────────────────────────────────────────────────────────
alter table public.landlord_settlements enable row level security;
alter table public.settlement_entries   enable row level security;
alter table public.move_out_settlements enable row level security;

drop policy if exists "settlements_admin_all" on public.landlord_settlements;
create policy "settlements_admin_all" on public.landlord_settlements for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "settlement_entries_admin_all" on public.settlement_entries;
create policy "settlement_entries_admin_all" on public.settlement_entries for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "moveout_admin_all" on public.move_out_settlements;
create policy "moveout_admin_all" on public.move_out_settlements for all
  using (public.is_admin()) with check (public.is_admin());

-- comments
comment on table public.landlord_settlements is '임대인별 정산(장부) 요약 — 입금/지출/이익배분/지급/잔액 (엑셀 N임대인장부 이관)';
comment on table public.settlement_entries is '정산 거래내역 — 수입/지출 라인 (장부 하단 거래내역)';
comment on table public.move_out_settlements is '퇴실정산 — 보증금반환/검침/공제 (엑셀 퇴실정산 시트)';
