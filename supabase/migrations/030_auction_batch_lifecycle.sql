-- 030: 발급 배치(auction_survey_batch) 라이프사이클 자동화.
--   상태: created(발행) → assigned(현장배포·수동) → in_progress(회수·입력중·자동) → completed(마감·자동)
--   기존 status CHECK = created/assigned/in_progress/completed 그대로 사용.
--   진행률은 읽기 시 계산(미답사 아닌 물건 / 전체).
alter table public.auction_survey_batch add column if not exists closed_at timestamptz;

-- 배치 소속 물건의 survey_status 변경 시 배치 상태 자동 전이.
create or replace function public.auction_batch_progress_autoclose() returns trigger language plpgsql as $$
declare bid uuid; pend int; tot int;
begin
  bid := NEW.batch_id;
  if bid is null then return null; end if;
  select count(*) filter (where survey_status='pending'), count(*) into pend, tot
    from public.auction_property where batch_id = bid;
  if tot > 0 and pend = 0 then
    update public.auction_survey_batch set status='completed', closed_at=coalesce(closed_at, now()), updated_at=now()
      where id = bid and status <> 'completed';
  elsif tot > 0 and pend < tot then
    update public.auction_survey_batch set status='in_progress', updated_at=now()
      where id = bid and status in ('created','assigned');
  end if;
  return null;
end $$;

drop trigger if exists trg_auction_batch_progress on public.auction_property;
create trigger trg_auction_batch_progress
  after update of survey_status on public.auction_property
  for each row when (NEW.batch_id is not null)
  execute function public.auction_batch_progress_autoclose();
