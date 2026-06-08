-- ============================================================================
-- 014: 경매 서브시스템 풀 이식 — 사건관리(B) + 파이프라인(D)
--   부동산위탁관리 앱(Prisma/Unit 기반) → jnp Supabase 독립 파이프라인으로 이식.
--   설계 결정: jnp는 Unit 모델이 없으므로 파이프라인을 auction_property 위에 자기완결로 구성.
--             끝단(임대가능→임대)에서 jnp leases 로 핸드오프.
--   헬퍼: 001_init.sql 의 public.set_updated_at(), public.is_admin(), uuid_generate_v4()
--
--   011(수집·답사) 위에 얹는다:
--     - auction_property 에 pipeline_state 등 컬럼 추가
--     - auction_case          : 경매/법무 사건관리 (B)
--     - auction_inspection    : 답사 배정·제출·검토 (D)
--     - auction_pipeline_event: 상태전이 감사로그 (D)
--     - auction_work_item     : 상품화 비용 항목 (D)
--     - auction_opening_record: 개방기록 (D)
-- ============================================================================

-- ─── 0. auction_property 에 파이프라인 컬럼 추가 ───
-- pipeline_state 12단계: Collected→Selected→Inspecting→Reviewing→Approved
--   →WorkPrep→Merchandising→Available→Leased / 분기: OccupiedHold,Recheck,Rejected
alter table public.auction_property
  add column if not exists pipeline_state text not null default 'Collected'
    check (pipeline_state in (
      'Collected','Selected','Inspecting','Reviewing','Approved',
      'WorkPrep','Merchandising','Available','Leased',
      'OccupiedHold','Recheck','Rejected')),
  add column if not exists pipeline_entered_at timestamptz default now(),
  add column if not exists total_work_cost bigint not null default 0,        -- 상품화 누적비용(원)
  add column if not exists management_fee_rate numeric not null default 0,    -- 관리수수료율 %
  add column if not exists individual_tax_rate numeric not null default 0,    -- 개인 세율 %
  add column if not exists monthly_rent bigint,                              -- 계약 월세(원, 핸드오프 시 기록)
  add column if not exists tenant_name text,                                 -- 임차인명(핸드오프 시 기록)
  add column if not exists lease_id uuid references public.leases(id) on delete set null; -- 임대 핸드오프

create index if not exists idx_auction_property_pipeline
  on public.auction_property(pipeline_state);

-- ─── 1. auction_case (경매/법무 사건관리 · B) ───
-- 원본 Auction(unitId 1:1). jnp엔 Unit이 없으므로 auction_property 와 선택적 1:1,
-- 사건만 단독 등록도 가능하도록 property_label(자유 주소표기) 보유.
create table if not exists public.auction_case (
  id uuid primary key default uuid_generate_v4(),
  auction_property_id uuid unique references public.auction_property(id) on delete set null,
  property_label text,                          -- 건물/호실/주소 표기 (Unit 없으니 자유텍스트)

  case_number text not null,                    -- 사건번호 (예: 2024타경12345)
  court text,                                   -- 관할법원
  case_type text,                               -- 임의경매/강제경매/공매/소송/가압류/압류/기타
  stage text not null default 'filed' check (stage in
    ('filed','appraised','scheduled','bidding','awarded','failed','cancelled')),
  auction_date date,                            -- 매각기일
  appraisal_value bigint,                       -- 감정가(원)
  minimum_bid bigint,                           -- 최저입찰가(원)
  claim_amount bigint,                          -- 채권액(원)
  recovery_memo text,                           -- 회수가능성 메모
  auction_url text,                             -- 경매사이트 URL

  -- 법무/추심 진행
  lawsuit_status text,                          -- 소송 상태
  seizure_status text,                          -- 압류 상태
  collection_status text,                       -- 추심/징수 상태
  seizure_target text,                          -- 압류 대상
  seizure_amount bigint,                        -- 압류액(원)
  third_debtor text,                            -- 제3채무자
  execution_doc_file text,                      -- 집행문 파일
  filing_date date,                             -- 제출일
  decision_date date,                           -- 결정일
  dividend_deadline date,                       -- 배당요구종기일
  tenant_response text,                         -- 세입자 대응/HUG 상태

  -- 담당
  assigned_lawyer text,                         -- 담당 변호사/법무사
  lawyer_contact text,                          -- 연락처
  submitted_docs text,                          -- 제출 문서 목록
  court_dates text,                             -- 기일 일정
  memo text,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_auction_case_stage on public.auction_case(stage);
create index if not exists idx_auction_case_property on public.auction_case(auction_property_id);
create index if not exists idx_auction_case_dividend on public.auction_case(dividend_deadline);

drop trigger if exists trg_auction_case_updated_at on public.auction_case;
create trigger trg_auction_case_updated_at before update on public.auction_case
  for each row execute function public.set_updated_at();

alter table public.auction_case enable row level security;
drop policy if exists "auction_case admin all" on public.auction_case;
create policy "auction_case admin all"
  on public.auction_case for all
  using (public.is_admin()) with check (public.is_admin());

comment on table public.auction_case is '경매/법무 사건관리 — 사건번호·법원·압류/추심·배당종기일·담당 변호사 추적';

-- ─── 2. auction_inspection (답사 배정·제출·검토 · D) ───
create table if not exists public.auction_inspection (
  id uuid primary key default uuid_generate_v4(),
  auction_property_id uuid not null references public.auction_property(id) on delete cascade,

  inspector_id text,                            -- 답사자 (admin_users.id 또는 이름키)
  inspector_name text not null,
  requested_by_id text,                         -- 배정한 관리자
  requested_by_name text,
  assigned_at timestamptz default now(),
  submitted_at timestamptz,

  -- 답사자 입력 (제출 시 채워짐)
  occupancy text check (occupancy in ('vacant','occupied','recheck')),
  mail_status text check (mail_status in ('none','normal','overflow')),
  key_needed boolean not null default false,
  can_open text check (can_open in ('possible','impossible','admin_check')),
  open_memo text,
  merchandising_ready text check (merchandising_ready in ('possible','hold','impossible')),
  comment text,
  photos jsonb,                                 -- [{url, tag, uploadedAt}]

  -- 검토 (관리자)
  status text not null default 'assigned' check (status in ('assigned','submitted','reviewed')),
  reviewed_by_id text,
  reviewed_by_name text,
  reviewed_at timestamptz,
  review_memo text,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_auction_inspection_property on public.auction_inspection(auction_property_id);
create index if not exists idx_auction_inspection_inspector on public.auction_inspection(inspector_id);
create index if not exists idx_auction_inspection_status on public.auction_inspection(status);

drop trigger if exists trg_auction_inspection_updated_at on public.auction_inspection;
create trigger trg_auction_inspection_updated_at before update on public.auction_inspection
  for each row execute function public.set_updated_at();

alter table public.auction_inspection enable row level security;
drop policy if exists "auction_inspection admin all" on public.auction_inspection;
create policy "auction_inspection admin all"
  on public.auction_inspection for all
  using (public.is_admin()) with check (public.is_admin());

comment on table public.auction_inspection is '경매 물건 답사 — 배정→제출(점유/우편/개문/상품화)→검토';

-- ─── 3. auction_pipeline_event (상태전이 감사로그 · D) ───
create table if not exists public.auction_pipeline_event (
  id uuid primary key default uuid_generate_v4(),
  auction_property_id uuid not null references public.auction_property(id) on delete cascade,
  from_state text,                              -- 최초 SELECT 시 null
  to_state text not null,
  action text not null,                         -- PipelineAction
  performed_by_id text,
  performed_by text,
  detail text,
  metadata jsonb,
  created_at timestamptz default now()
);
create index if not exists idx_auction_event_property on public.auction_pipeline_event(auction_property_id, created_at);
create index if not exists idx_auction_event_action on public.auction_pipeline_event(action);

alter table public.auction_pipeline_event enable row level security;
drop policy if exists "auction_pipeline_event admin all" on public.auction_pipeline_event;
create policy "auction_pipeline_event admin all"
  on public.auction_pipeline_event for all
  using (public.is_admin()) with check (public.is_admin());

comment on table public.auction_pipeline_event is '파이프라인 상태전이 불변 감사로그';

-- ─── 4. auction_work_item (상품화 비용 항목 · D) ───
create table if not exists public.auction_work_item (
  id uuid primary key default uuid_generate_v4(),
  auction_property_id uuid not null references public.auction_property(id) on delete cascade,
  category text not null,                       -- wallpaper/flooring/cleaning/repair/appliance/photo/key/etc
  provider text,
  amount bigint not null default 0,             -- 비용(원)
  work_date date,
  memo text,
  receipt_url text,
  is_completed boolean not null default false,
  created_by_id text,
  created_by text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_auction_work_item_property on public.auction_work_item(auction_property_id);

drop trigger if exists trg_auction_work_item_updated_at on public.auction_work_item;
create trigger trg_auction_work_item_updated_at before update on public.auction_work_item
  for each row execute function public.set_updated_at();

alter table public.auction_work_item enable row level security;
drop policy if exists "auction_work_item admin all" on public.auction_work_item;
create policy "auction_work_item admin all"
  on public.auction_work_item for all
  using (public.is_admin()) with check (public.is_admin());

comment on table public.auction_work_item is '상품화 작업 비용 항목 — 합산이 정산의 작업비';

-- ─── 5. auction_opening_record (개방기록 · D) ───
create table if not exists public.auction_opening_record (
  id uuid primary key default uuid_generate_v4(),
  auction_property_id uuid not null references public.auction_property(id) on delete cascade,
  reason text,                                  -- 개방 사유
  attendees jsonb,                              -- 입회자 목록
  pre_photos jsonb,
  post_photos jsonb,
  found_items_summary text,                     -- 잔존물 요약
  disposal_list text,                           -- 처분 목록
  lock_changed boolean not null default false,
  new_lock_info text,
  emergency_actions text,
  opened_at timestamptz,
  status text not null default 'requested' check (status in ('requested','approved','opened','closed')),
  memo text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_auction_opening_property on public.auction_opening_record(auction_property_id);

drop trigger if exists trg_auction_opening_updated_at on public.auction_opening_record;
create trigger trg_auction_opening_updated_at before update on public.auction_opening_record
  for each row execute function public.set_updated_at();

alter table public.auction_opening_record enable row level security;
drop policy if exists "auction_opening_record admin all" on public.auction_opening_record;
create policy "auction_opening_record admin all"
  on public.auction_opening_record for all
  using (public.is_admin()) with check (public.is_admin());

comment on table public.auction_opening_record is '공실 물건 개방기록 — 전/후 사진, 잔존물, 잠금변경';
