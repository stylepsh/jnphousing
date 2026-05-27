-- ============================================================================
-- 008: DM 단기임대 + 건물위탁관리 (박성혁 엑셀 분석 반영)
--   - 박성혁 회사: DM 컴퍼니 → JNP주택관리 (사명 변경)
--   - 사업 2개 라인:
--     [1] DM 단기임대: 임대인 수익 분배 (5:5/7:3/8:2/6:2:2)
--     [2] 건물 위탁관리: 12개 건물 + 6종 시설관리 (인터넷·청소·전기·수도·소방·승강기)
-- ============================================================================

-- ─── A. properties 확장 (건물 운영 정보) ───
alter table public.properties
  add column if not exists business_name text,             -- 사업자명 (예: 트라움하임)
  add column if not exists business_number text,           -- 사업자등록번호
  add column if not exists corporate_number text,          -- 고유번호증 (예: 606-80-21237)
  add column if not exists entrance_password text,         -- 공동현관 비밀번호
  add column if not exists management_account text,        -- 관리단 계좌번호
  add column if not exists service_modes text[] default '{}',  -- ['dm','housing_mgmt','rental_consigned']
  add column if not exists landlord_business_id uuid,      -- 임사자 매핑
  add column if not exists short_alias text;               -- 짧은 별칭 (신림더로프트 등)

create index if not exists idx_properties_landlord_business
  on public.properties(landlord_business_id);
create index if not exists idx_properties_service_modes
  on public.properties using gin(service_modes);

-- ─── B. landlord_business (임사자 = 임대사업자) ───
create table if not exists public.landlord_business (
  id uuid primary key default uuid_generate_v4(),
  name text not null,                          -- 임사자 명 (예: 이장미, 트라움)
  business_name text,                          -- 사업자명 (예: 트라움하임)
  business_number text,                        -- 사업자등록번호
  resident_number_encrypted text,              -- 주민번호 (PII 암호화)
  corporate_number text,                       -- 고유번호증
  representative text,                         -- 대표자명
  phone text,
  email text,
  account_bank text,
  account_number_encrypted text,               -- 계좌번호 (PII)
  account_holder text,
  memo text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_landlord_business_active
  on public.landlord_business(is_active, name);

alter table public.landlord_business enable row level security;
drop policy if exists "landlord_business admin all" on public.landlord_business;
create policy "landlord_business admin all"
  on public.landlord_business for all
  using (public.is_admin()) with check (public.is_admin());

-- properties → landlord_business FK
alter table public.properties
  drop constraint if exists fk_properties_landlord_business;
alter table public.properties
  add constraint fk_properties_landlord_business
  foreign key (landlord_business_id)
  references public.landlord_business(id) on delete set null;

-- ─── C. building_vendors (건물 시설관리 업체) ───
-- 카테고리: internet / cleaning / electric / water / fire / elevator
create table if not exists public.building_vendors (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid references public.properties(id) on delete cascade,
  category text not null check (category in
    ('internet','cleaning','electric','water','fire','elevator','etc')),
  vendor_name text not null,                   -- 업체명 (예: SK브로드밴드)
  contact_person text,                         -- 담당자 (예: 양휴창 과장)
  contact_phone text,
  contact_email text,
  customer_number text,                        -- 고객번호 / 납부번호
  account_bank text,
  account_number_encrypted text,               -- 자동이체 계좌 (PII)
  account_holder text,
  monthly_fee bigint,                          -- 월 비용
  billing_cycle text,                          -- 매월/말일자동이체, 2개월 등
  contract_start date,
  contract_end date,
  contract_url text,                           -- 계약서 PDF URL (Supabase Storage)
  customer_center_phone text,                  -- 고객센터 번호
  notes text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_building_vendors_property
  on public.building_vendors(property_id, category);
create index if not exists idx_building_vendors_active
  on public.building_vendors(is_active);

alter table public.building_vendors enable row level security;
drop policy if exists "building_vendors admin all" on public.building_vendors;
create policy "building_vendors admin all"
  on public.building_vendors for all
  using (public.is_admin()) with check (public.is_admin());

-- ─── D. dm_units (단기임대 운영 호실) ───
-- 일반 leases 와 별도로 단기임대 모드만 관리
create table if not exists public.dm_units (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid references public.properties(id) on delete cascade,
  unit_id uuid references public.properties_units(id) on delete set null,
  landlord_business_id uuid references public.landlord_business(id) on delete set null,
  alias text,                                  -- 호실 별칭 (예: "1호" "201호")
  profit_share_ratio text check (profit_share_ratio in
    ('5:5','6:4','7:3','8:2','9:1','6:2:2','7:2:1','custom')),
  custom_share jsonb,                          -- custom 시 {"landlord":50, "company":50}
  deposit_amount bigint default 0,             -- 보증금 예치
  contract_type text check (contract_type in
    ('weekly','monthly','quarterly','custom')) default 'monthly',
  monthly_target_revenue bigint,               -- 목표 월수익
  payment_method text check (payment_method in
    ('monthly_cash','monthly_transfer','deposit_included','custom')),
  status text not null default 'active' check (status in
    ('active','vacant','maintenance','terminated')),
  notes text,
  started_at date,
  ended_at date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_dm_units_property
  on public.dm_units(property_id, status);
create index if not exists idx_dm_units_landlord
  on public.dm_units(landlord_business_id, status);

alter table public.dm_units enable row level security;
drop policy if exists "dm_units admin all" on public.dm_units;
create policy "dm_units admin all"
  on public.dm_units for all
  using (public.is_admin()) with check (public.is_admin());

-- ─── E. dm_monthly_settlement (DM 월별 정산) ───
create table if not exists public.dm_monthly_settlement (
  id uuid primary key default uuid_generate_v4(),
  dm_unit_id uuid references public.dm_units(id) on delete cascade,
  landlord_business_id uuid references public.landlord_business(id) on delete set null,
  period_year int not null,
  period_month int not null check (period_month between 1 and 12),
  revenue bigint default 0,                    -- 월 수익 (입주자 결제액)
  company_share bigint default 0,              -- 회사 (JNP) 몫
  landlord_share bigint default 0,             -- 임대인 몫
  third_party_share bigint default 0,          -- 제3자 (6:2:2 의 마지막 2)
  third_party_name text,                       -- 제3자 이름 (예: 후배, 관리자)
  previous_balance bigint default 0,           -- 이월금액
  current_balance bigint default 0,            -- 금월잔액
  accumulated_balance bigint default 0,        -- 누계잔액
  payment_status text default 'pending' check (payment_status in
    ('pending','partial','paid','withheld','rejected')),
  payment_method text,                         -- 매월/현금, 매월/이체, 보증금포함
  paid_amount bigint default 0,
  paid_at date,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(dm_unit_id, period_year, period_month)
);
create index if not exists idx_dm_settlement_period
  on public.dm_monthly_settlement(period_year desc, period_month desc);
create index if not exists idx_dm_settlement_status
  on public.dm_monthly_settlement(payment_status, period_year, period_month);
create index if not exists idx_dm_settlement_landlord
  on public.dm_monthly_settlement(landlord_business_id, period_year, period_month);

alter table public.dm_monthly_settlement enable row level security;
drop policy if exists "dm_settlement admin all" on public.dm_monthly_settlement;
create policy "dm_settlement admin all"
  on public.dm_monthly_settlement for all
  using (public.is_admin()) with check (public.is_admin());

-- ─── F. monthly_ledger (건물 위탁관리 월별 수입/지출/손익) ───
create table if not exists public.monthly_ledger (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid references public.properties(id) on delete cascade,
  period_year int not null,
  period_month int not null check (period_month between 1 and 12),
  category text check (category in
    ('management_fee','vendor_payment','revenue_other','expense_other',
     'maintenance','salary','office_rent','tax')) default 'management_fee',
  subcategory text,                            -- 인터넷·청소·전기 등 (vendors 카테고리 같이)
  revenue bigint default 0,
  expense bigint default 0,
  profit bigint generated always as (revenue - expense) stored,
  description text,
  vendor_id uuid references public.building_vendors(id) on delete set null,
  paid_at date,
  payment_status text default 'planned' check (payment_status in
    ('planned','pending','paid','overdue')),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_ledger_period_property
  on public.monthly_ledger(property_id, period_year desc, period_month desc);
create index if not exists idx_ledger_status
  on public.monthly_ledger(payment_status, period_year, period_month);

alter table public.monthly_ledger enable row level security;
drop policy if exists "monthly_ledger admin all" on public.monthly_ledger;
create policy "monthly_ledger admin all"
  on public.monthly_ledger for all
  using (public.is_admin()) with check (public.is_admin());

-- ─── G. auto_debit_accounts (건물별 자동이체 계좌) ───
create table if not exists public.auto_debit_accounts (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid references public.properties(id) on delete cascade,
  purpose text not null,                       -- 인터넷, 전기, 수도, 청소, 소방, 승강기 등
  bank_name text,
  account_number_encrypted text,
  account_holder text,
  monthly_amount bigint,
  withdrawal_day int check (withdrawal_day between 1 and 31),
  status text default 'active' check (status in ('active','paused','cancelled')),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_auto_debit_property
  on public.auto_debit_accounts(property_id, status);

alter table public.auto_debit_accounts enable row level security;
drop policy if exists "auto_debit admin all" on public.auto_debit_accounts;
create policy "auto_debit admin all"
  on public.auto_debit_accounts for all
  using (public.is_admin()) with check (public.is_admin());

-- ─── H. company_history (DM → JNP 회사 변경 이력) ───
create table if not exists public.company_history (
  id uuid primary key default uuid_generate_v4(),
  legal_name text not null,
  brand_name text not null,
  business_number text,
  start_date date,
  end_date date,
  is_current boolean default false,
  notes text,
  created_at timestamptz default now()
);

-- 초기 데이터: DM 컴퍼니 → JNP주택관리 변경 이력
insert into public.company_history (legal_name, brand_name, start_date, end_date, is_current, notes)
values
  ('DM 컴퍼니', 'DM', null, '2026-05-08', false, '단기임대 사업 시작 회사명. 2026-05-08 JNP주택관리로 변경'),
  ('제이앤피 주택관리', 'JNP주택관리', '2026-05-08', null, true, 'DM 컴퍼니에서 변경. 사업자등록번호 361-27-02026')
on conflict do nothing;

-- ─── I. trigger: updated_at 자동 갱신 ───
create trigger trg_landlord_business_updated_at
  before update on public.landlord_business
  for each row execute function public.set_updated_at();

create trigger trg_building_vendors_updated_at
  before update on public.building_vendors
  for each row execute function public.set_updated_at();

create trigger trg_dm_units_updated_at
  before update on public.dm_units
  for each row execute function public.set_updated_at();

create trigger trg_dm_settlement_updated_at
  before update on public.dm_monthly_settlement
  for each row execute function public.set_updated_at();

create trigger trg_monthly_ledger_updated_at
  before update on public.monthly_ledger
  for each row execute function public.set_updated_at();

create trigger trg_auto_debit_updated_at
  before update on public.auto_debit_accounts
  for each row execute function public.set_updated_at();

-- ─── J. View: 건물별 시설관리 요약 ───
create or replace view public.v_property_vendors_summary as
select
  p.id as property_id,
  p.name as property_name,
  p.short_alias,
  count(distinct v.id) as vendor_count,
  count(distinct v.category) as category_count,
  coalesce(sum(v.monthly_fee), 0) as total_monthly_fee
from public.properties p
left join public.building_vendors v on v.property_id = p.id and v.is_active = true
group by p.id, p.name, p.short_alias;

-- ─── K. View: DM 임사자별 정산 요약 ───
create or replace view public.v_dm_landlord_summary as
select
  lb.id as landlord_business_id,
  lb.name as landlord_name,
  lb.business_name,
  count(distinct du.id) filter (where du.status = 'active') as active_units,
  count(distinct du.id) filter (where du.status = 'vacant') as vacant_units,
  coalesce(sum(s.landlord_share) filter (
    where s.period_year * 100 + s.period_month >=
          extract(year from current_date)::int * 100 + extract(month from current_date)::int - 5
  ), 0) as recent_6mo_landlord_share,
  coalesce(sum(s.accumulated_balance) filter (
    where s.period_year * 100 + s.period_month =
          extract(year from current_date)::int * 100 + extract(month from current_date)::int
  ), 0) as current_accumulated
from public.landlord_business lb
left join public.dm_units du on du.landlord_business_id = lb.id
left join public.dm_monthly_settlement s on s.landlord_business_id = lb.id
where lb.is_active = true
group by lb.id, lb.name, lb.business_name;

comment on table public.landlord_business is '임사자(임대사업자) - 박성혁 엑셀 8명 (하이안/박정완/트라움/이장미/정경모/김동미/박정욱/양희정 등)';
comment on table public.building_vendors is '건물 시설관리 업체 - 6종 카테고리 (인터넷/청소/전기/수도/소방/승강기)';
comment on table public.dm_units is 'DM 단기임대 운영 호실 - 수익 분배 비율 명시';
comment on table public.dm_monthly_settlement is 'DM 단기임대 월별 정산 - 회사·임대인·3자 분배';
comment on table public.monthly_ledger is '건물 위탁관리 월별 수입/지출/손익';
comment on table public.auto_debit_accounts is '건물별 자동이체 계좌 (인터넷/전기/수도/청소 등)';
