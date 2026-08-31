-- 038: 경매 임대 수익 구조 — 현장팀 투입비 회수 → 순이익 배분.
--
--   사업 구조(2026-08-31 박성혁 확정):
--     · 상품화 비용(인테리어·열쇠개문·공실관리비·부동산 중개수수료)은 **현장팀이 전액 지급**
--     · 월세에서 받는 관리수수료로 현장팀 투입비를 **먼저 전액 회수**
--     · 회수가 끝난 뒤부터 남는 순이익을 배분율대로 나눔
--   따라서 호실마다 "얼마 넣어서 언제 회수되는지"를 추적해야 한다.

-- ─── 1. 지출: 누가 냈는가 ───────────────────────────────
-- payer 가 없으면 회수 대상(현장팀이 낸 돈)을 가려낼 수 없다.
alter table public.auction_work_item
  add column if not exists payer text not null default 'field_team';

comment on column public.auction_work_item.payer is
  '비용 부담 주체: field_team(현장팀·회수대상) / company(회사) / landlord(임대인)';

create index if not exists idx_auction_work_item_payer
  on public.auction_work_item (auction_property_id, payer);

-- category 는 자유 텍스트(체크제약 없음). 추가로 쓰는 값:
--   brokerage(부동산 중개수수료), maintenance(공실 관리비)
--   기존: wallpaper/flooring/cleaning/repair/appliance/photo/key/etc

-- ─── 2. 계약 조건 · 배분율 ──────────────────────────────
alter table public.auction_property
  add column if not exists lease_start date,                       -- 임대 시작일
  add column if not exists lease_end date,                         -- 만기일 (알림 기준)
  add column if not exists rent_due_day integer,                   -- 매월 수금일 1~31
  add column if not exists profit_share_rate numeric not null default 0; -- 현장팀 순이익 배분율 %

alter table public.auction_property
  drop constraint if exists auction_property_rent_due_day_check;
alter table public.auction_property
  add constraint auction_property_rent_due_day_check
  check (rent_due_day is null or (rent_due_day between 1 and 31));

comment on column public.auction_property.profit_share_rate is
  '현장팀 순이익 배분율(%). 투입비 전액 회수 후부터 적용.';

-- 만기 임박 조회용
create index if not exists idx_auction_property_lease_end
  on public.auction_property (lease_end)
  where lease_end is not null;

-- ─── 3. 월별 수납 ───────────────────────────────────────
-- 미납 계산의 유일한 근거. 물건 × 월(YYYY-MM) 1행.
create table if not exists public.auction_rent_receipt (
  id                  uuid primary key default uuid_generate_v4(),
  auction_property_id uuid not null references public.auction_property(id) on delete cascade,
  period              text not null,                    -- 'YYYY-MM'
  due_date            date,                             -- 그 달 수금 예정일
  expected            bigint not null default 0,        -- 받아야 할 월세(원)
  received            bigint not null default 0,        -- 실제 받은 금액(원)
  received_at         date,                             -- 입금일
  memo                text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (auction_property_id, period)
);

create index if not exists idx_auction_rent_receipt_period
  on public.auction_rent_receipt (period);
create index if not exists idx_auction_rent_receipt_unpaid
  on public.auction_rent_receipt (due_date)
  where received = 0;

drop trigger if exists trg_auction_rent_receipt_updated_at on public.auction_rent_receipt;
create trigger trg_auction_rent_receipt_updated_at before update on public.auction_rent_receipt
  for each row execute function public.set_updated_at();

alter table public.auction_rent_receipt enable row level security;
drop policy if exists "auction_rent_receipt admin all" on public.auction_rent_receipt;
create policy "auction_rent_receipt admin all"
  on public.auction_rent_receipt for all
  using (public.is_admin()) with check (public.is_admin());

comment on table public.auction_rent_receipt is
  '경매 임대 물건의 월별 수납 기록 — 미납·실수령·회수 진행률의 근거';
