-- 029: 작업비(auction_work_item) 변경 시 auction_property.total_work_cost 자동 재집계.
-- 기존엔 addWorkItem 서버액션이 매번 전건 SUM 후 update(N+1) → 트리거로 일원화.
-- 삭제/수정 시에도 정합 유지(서버 코드가 누락해도 DB가 보장).
create or replace function public.auction_recompute_work_cost() returns trigger language plpgsql as $$
declare pid uuid;
begin
  pid := coalesce(NEW.auction_property_id, OLD.auction_property_id);
  if pid is null then return null; end if;
  update public.auction_property
     set total_work_cost = coalesce((select sum(amount) from public.auction_work_item where auction_property_id = pid), 0),
         updated_at = now()
   where id = pid;
  return null;
end $$;

drop trigger if exists trg_auction_work_cost on public.auction_work_item;
create trigger trg_auction_work_cost
  after insert or update or delete on public.auction_work_item
  for each row execute function public.auction_recompute_work_cost();
