-- ============================================================================
-- 020: 입주일 + 호실별 지출/수익분배
--   (1) leases.move_in_date  : 계약일과 별개인 실제 입주일
--   (2) unit_expenses 테이블  : 호실별 수리/공사 등 지출 + 임대인/회사 분배
-- ============================================================================

-- (1) 입주일 ----------------------------------------------------------------
alter table public.leases
  add column if not exists move_in_date date;

comment on column public.leases.move_in_date is '실제 입주일 (계약일 start_date 와 다를 수 있음)';

-- (2) 호실별 지출 ------------------------------------------------------------
create table if not exists public.unit_expenses (
  id uuid primary key default uuid_generate_v4(),
  unit_id uuid references public.properties(id) on delete cascade,   -- 호실(properties unit_type='unit')
  owner_id uuid references public.owners(id) on delete set null,     -- 소유주(임대인)
  lease_id uuid references public.leases(id) on delete set null,     -- 연관 계약(선택)

  category text not null default 'repair'
    check (category in ('wallpaper_floor','plumbing','waterproof','cleaning','appliance','repair','etc')),
  description text,                         -- "도배장판 교체", "배관 누수 보수" 등
  amount bigint not null default 0,        -- 총 지출액 (원)
  incurred_on date not null default current_date,

  -- 분배 방식: shared(비율분배) / owner_all(임대인 전액) / company_all(회사 전액)
  split_type text not null default 'shared'
    check (split_type in ('shared','owner_all','company_all')),
  owner_ratio int not null default 50 check (owner_ratio between 0 and 100),    -- 임대인 부담 %
  company_ratio int not null default 50 check (company_ratio between 0 and 100),-- 회사 부담 %
  owner_amount bigint not null default 0,   -- 계산된 임대인 부담액
  company_amount bigint not null default 0, -- 계산된 회사 부담액

  billed_to_owner boolean not null default false,  -- 임대인에게 청구서 발행했는지
  billed_at date,
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_unit_expenses_unit on public.unit_expenses(unit_id);
create index if not exists idx_unit_expenses_owner on public.unit_expenses(owner_id);
create index if not exists idx_unit_expenses_incurred on public.unit_expenses(incurred_on);

comment on table public.unit_expenses is '호실별 지출(수리/공사) + 임대인·회사 수익분배';
comment on column public.unit_expenses.split_type is 'shared(비율분배)/owner_all(임대인전액)/company_all(회사전액)';

-- updated_at 자동 갱신 (기존 trigger 함수 set_updated_at 재사용)
drop trigger if exists trg_unit_expenses_updated on public.unit_expenses;
create trigger trg_unit_expenses_updated
  before update on public.unit_expenses
  for each row execute function public.set_updated_at();
