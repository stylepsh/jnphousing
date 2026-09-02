-- 042: 배치 진행률 자동 전이 트리거를 행 단위 → 구문 단위로 교체 (O(N²) 제거)
--
-- 배경
--   030 의 트리거는 `for each row` 였고, 매 행마다 배치 전체를 count 했다.
--   답사표 업로드로 한 배치의 500행을 갱신하면 500번의 전체 집계가 돌아
--   O(N²) 가 된다. 구문 단위 트리거 + 전이 테이블(new_rows)로 바꾸면
--   영향받은 배치만 한 번씩 집계한다.
--
-- 주의: PostgreSQL 은 전이 테이블과 컬럼 목록(update of survey_status)을 함께 허용하지
--       않는다[0A000.. 그래서 트리거는 전체 UPDATE 에 걸고, 함수 안에서
--       survey_status 가 실제로 바뀐 행만 골라 같은 동작을 유지한다.
--
-- 동작은 030 과 동일하다.
--   - 배치에 pending 이 하나도 없으면 completed (+ closed_at 최초 1회 기록)
--   - 일부만 처리됐고 배치가 created/assigned 면 in_progress
--
-- 롤백 (030 의 행 단위 트리거로 복귀)
--   drop trigger if exists trg_auction_batch_progress_stmt on public.auction_property;
--   drop function if exists public.auction_batch_progress_autoclose_stmt();
--   create trigger trg_auction_batch_progress
--     after update of survey_status on public.auction_property
--     for each row when (NEW.batch_id is not null)
--     execute function public.auction_batch_progress_autoclose();
--   (030 의 함수 auction_batch_progress_autoclose() 는 남겨두므로 그대로 재사용 가능)

create or replace function public.auction_batch_progress_autoclose_stmt()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- 전이 테이블은 컬럼 목록[update of ...]과 함께 쓸 수 없어[PG 제약 0A000.
  -- 트리거를 전체 UPDATE 에 걸고, survey_status 가 실제로 바뀐 행만 여기서 고른다.
  with touched as (
    select distinct n.batch_id
      from new_rows n
      join old_rows o on o.id = n.id
     where n.batch_id is not null
       and n.survey_status is distinct from o.survey_status
  ),
  agg as (
    select p.batch_id,
           count(*) filter (where p.survey_status = 'pending') as pend,
           count(*)                                            as tot
      from public.auction_property p
      join touched t on t.batch_id = p.batch_id
     group by p.batch_id
  )
  update public.auction_survey_batch b
     set status = case when a.pend = 0 then 'completed' else 'in_progress' end,
         closed_at = case when a.pend = 0 then coalesce(b.closed_at, now()) else b.closed_at end,
         updated_at = now()
    from agg a
   where b.id = a.batch_id
     and a.tot > 0
     and (
          (a.pend = 0 and b.status <> 'completed')
       or (a.pend > 0 and a.pend < a.tot and b.status in ('created', 'assigned'))
     );
  return null;
end $$;

comment on function public.auction_batch_progress_autoclose_stmt() is
  '배치 진행률 자동 전이 — 구문 단위. 영향받은 배치마다 한 번만 집계한다.';

-- 행 단위 트리거 제거 후 구문 단위로 교체
drop trigger if exists trg_auction_batch_progress on public.auction_property;
drop trigger if exists trg_auction_batch_progress_stmt on public.auction_property;
create trigger trg_auction_batch_progress_stmt
  after update on public.auction_property
  referencing old table as old_rows new table as new_rows
  for each statement
  execute function public.auction_batch_progress_autoclose_stmt();
