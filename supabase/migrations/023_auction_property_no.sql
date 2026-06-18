-- ============================================================================
-- 023: 물건 단위 전역 고유번호(property_no)
--   박성혁 워크플로우: 답사지를 전체로 뽑든 지역별로 뽑든, 번호가 발급마다
--   1부터 다시 시작하면 의정부 1번과 동두천 1번이 동시에 돌아다녀 섞인다.
--
--   해결: 임대인·소유자·지역과 무관하게 "물건(상세주소) 1건 = 영구 고유번호".
--     - 수집(import) 시 자동 증가 정수로 한 번 부여 → 영원히 그 번호.
--     - 어느 답사지에 인쇄되든 같은 물건은 같은 번호 → 절대 안 겹침.
--     - 번호 일괄입력은 발급(sheet)을 고를 필요 없이 번호만으로 전역 매칭.
--   ※ 발급(sheet)/survey_seq 는 "나머지 전부 거주" 범위 산정용으로만 남는다.
-- ============================================================================

-- ─── A. 전역 시퀀스 + 컬럼 ───
create sequence if not exists public.auction_property_no_seq;

alter table public.auction_property
  add column if not exists property_no bigint;

-- ─── B. 기존 행 백필 (생성순서대로 1, 2, 3 …) ───
with ordered as (
  select id, row_number() over (order by created_at, id) as rn
  from public.auction_property
  where property_no is null
)
update public.auction_property p
set property_no = o.rn
from ordered o
where p.id = o.id;

-- 시퀀스를 현재 최대값 다음으로 전진 (다음 insert 가 안 겹치게)
select setval(
  'public.auction_property_no_seq',
  coalesce((select max(property_no) from public.auction_property), 0) + 1,
  false
);

-- ─── C. 이후 insert 자동 부여 + 무결성 ───
alter table public.auction_property
  alter column property_no set default nextval('public.auction_property_no_seq');

alter table public.auction_property
  alter column property_no set not null;

create unique index if not exists uq_auction_property_no
  on public.auction_property(property_no);

comment on column public.auction_property.property_no is
  '물건 전역 고유번호 — 수집 시 자동 증가로 1회 부여, 영구·유일. 답사지/일괄입력 매칭 키(발급 무관)';
