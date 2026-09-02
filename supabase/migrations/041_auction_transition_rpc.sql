-- 041: 경매 파이프라인 상태 전이를 단일 트랜잭션 RPC 로 통합
--
-- 배경
--   기존 코드는 (1) 현재 상태 read → (2) update → (3) 이벤트 insert → (4) 답사 update
--   를 네 번의 왕복으로 처리했다. 동시에 두 명이 같은 물건을 처리하면
--   - 마지막 쓰기가 이기고 (lost update)
--   - 이벤트 로그의 from_state 가 실제와 어긋나며
--   - 상태만 바뀌고 이벤트가 빠지는 부분 실패가 가능했다.
--   PostgreSQL 함수는 그 자체가 하나의 트랜잭션이므로 전부 묶는다.
--   행 잠금(for update)으로 동시 요청은 직렬화되고, 기대 상태와 다르면 전이를 거부한다.
--
-- 롤백
--   drop function if exists public.auction_apply_transition(
--     uuid, text, text, text, text, text, text, jsonb, jsonb, uuid, jsonb);
--   → 애플리케이션 코드도 함께 이전 버전으로 되돌려야 한다(코드가 RPC 를 호출하므로).
--     RPC 가 없으면 전이 액션이 실패로 응답한다(데이터 손상은 없음).

create or replace function public.auction_apply_transition(
  p_property_id       uuid,
  p_expected_from     text,                    -- 클라이언트가 본 상태. null 이면 검사 생략
  p_to                text,                    -- 목표 상태
  p_action            text,                    -- PipelineAction
  p_performed_by_id   text     default null,
  p_performed_by      text     default null,
  p_detail            text     default null,
  p_metadata          jsonb    default null,
  p_patch             jsonb    default null,   -- 핸드오프 등 부가 컬럼 (아래 화이트리스트만)
  p_inspection_id     uuid     default null,   -- 함께 갱신할 답사 (없으면 생략)
  p_inspection_patch  jsonb    default null    -- status/reviewed_* 등
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn_auction_transition$
declare
  v_from text;
  v_exists boolean;
begin
  -- 1) 대상 행 잠금 + 현재 상태 확인 (동시 전이 직렬화)
  select coalesce(pipeline_state, 'Collected') into v_from
    from public.auction_property
   where id = p_property_id
     for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  -- 2) 조건부 전이 — 클라이언트가 본 상태와 실제가 다르면 거부(경합 감지)
  if p_expected_from is not null and v_from is distinct from p_expected_from then
    return jsonb_build_object('ok', false, 'error', 'state_conflict', 'from', v_from, 'expected', p_expected_from);
  end if;

  -- 3) 상태 + 화이트리스트 컬럼 갱신.
  --    p_patch 에 없는 키는 coalesce 로 기존 값을 유지한다.
  update public.auction_property ap
     set pipeline_state       = p_to,
         pipeline_entered_at  = now(),
         management_fee_rate  = coalesce((p_patch->>'management_fee_rate')::numeric,  ap.management_fee_rate),
         individual_tax_rate  = coalesce((p_patch->>'individual_tax_rate')::numeric,  ap.individual_tax_rate),
         profit_share_rate    = coalesce((p_patch->>'profit_share_rate')::numeric,    ap.profit_share_rate),
         monthly_rent         = coalesce((p_patch->>'monthly_rent')::bigint,          ap.monthly_rent),
         deposit              = coalesce((p_patch->>'deposit')::bigint,               ap.deposit),
         rent_collection_memo = coalesce( p_patch->>'rent_collection_memo',           ap.rent_collection_memo),
         tenant_name          = coalesce( p_patch->>'tenant_name',                    ap.tenant_name),
         lease_id             = coalesce((p_patch->>'lease_id')::uuid,                ap.lease_id),
         lease_start          = coalesce((p_patch->>'lease_start')::date,             ap.lease_start),
         lease_end            = coalesce((p_patch->>'lease_end')::date,               ap.lease_end),
         rent_due_day         = coalesce((p_patch->>'rent_due_day')::integer,         ap.rent_due_day),
         updated_at           = now()
   where ap.id = p_property_id;

  -- 4) 이벤트·감사 로그 (같은 트랜잭션 — 상태만 바뀌고 로그가 빠지는 일이 없다)
  insert into public.auction_pipeline_event (
    auction_property_id, from_state, to_state, action,
    performed_by_id, performed_by, detail, metadata)
  values (
    p_property_id, v_from, p_to, p_action,
    p_performed_by_id, p_performed_by, p_detail, p_metadata);

  -- 5) 관련 답사 상태 갱신 — 소속 검증 포함.
  --    다른 물건의 답사 id 가 넘어오면 전이 전체를 롤백한다.
  if p_inspection_id is not null then
    select exists (
      select 1 from public.auction_inspection
       where id = p_inspection_id and auction_property_id = p_property_id
    ) into v_exists;

    if not v_exists then
      raise exception 'inspection_mismatch: % does not belong to property %', p_inspection_id, p_property_id;
    end if;

    if p_inspection_patch is not null then
      update public.auction_inspection ai
         set status              = coalesce( p_inspection_patch->>'status',              ai.status),
             occupancy           = coalesce( p_inspection_patch->>'occupancy',           ai.occupancy),
             mail_status         = coalesce( p_inspection_patch->>'mail_status',         ai.mail_status),
             key_needed          = coalesce((p_inspection_patch->>'key_needed')::boolean, ai.key_needed),
             can_open            = coalesce( p_inspection_patch->>'can_open',            ai.can_open),
             open_memo           = coalesce( p_inspection_patch->>'open_memo',           ai.open_memo),
             merchandising_ready = coalesce( p_inspection_patch->>'merchandising_ready', ai.merchandising_ready),
             comment             = coalesce( p_inspection_patch->>'comment',             ai.comment),
             submitted_at        = coalesce((p_inspection_patch->>'submitted_at')::timestamptz, ai.submitted_at),
             reviewed_by_id      = coalesce( p_inspection_patch->>'reviewed_by_id',      ai.reviewed_by_id),
             reviewed_by_name    = coalesce( p_inspection_patch->>'reviewed_by_name',    ai.reviewed_by_name),
             reviewed_at         = coalesce((p_inspection_patch->>'reviewed_at')::timestamptz, ai.reviewed_at),
             review_memo         = coalesce( p_inspection_patch->>'review_memo',         ai.review_memo)
       where ai.id = p_inspection_id;
    end if;
  end if;

  return jsonb_build_object('ok', true, 'from', v_from, 'to', p_to);
end $fn_auction_transition$;

comment on function public.auction_apply_transition is
  '경매 파이프라인 전이 — 행 잠금·조건부 전이·이벤트 기록·답사 갱신을 한 트랜잭션으로 묶는다.';

-- 답사 id ↔ 물건 id 소속 검증용 인덱스 (5번 단계의 exists 조회).
create index if not exists idx_auction_inspection_property
  on public.auction_inspection (auction_property_id);
