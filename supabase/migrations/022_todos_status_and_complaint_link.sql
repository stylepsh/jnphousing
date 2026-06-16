-- ============================================================================
-- 022: 할 일(team_todos) 상태 확장 + 입력자/연결고리 + 민원 자동연결
--   - status 에 'delayed'(지연) 추가
--   - recorder(입력자), source_type/source_id/source_label(연결고리)
--   - 민원 접수 시 할 일 자동 생성, 민원 상태 변경 시 할 일 상태 동기화
-- ============================================================================

-- (1) status 체크 제약 교체: todo / delayed / done -----------------------------
do $$
declare c text;
begin
  select conname into c
    from pg_constraint
   where conrelid = 'public.team_todos'::regclass
     and contype = 'c'
     and pg_get_constraintdef(oid) ilike '%status%';
  if c is not null then
    execute format('alter table public.team_todos drop constraint %I', c);
  end if;
end $$;

alter table public.team_todos
  add constraint team_todos_status_check check (status in ('todo','delayed','done'));

-- (2) 입력자 + 연결고리 컬럼 --------------------------------------------------
alter table public.team_todos
  add column if not exists recorder text,
  add column if not exists source_type text,     -- 'complaint' 등
  add column if not exists source_id uuid,
  add column if not exists source_label text;

create index if not exists idx_team_todos_source
  on public.team_todos(source_type, source_id);

comment on column public.team_todos.recorder is '입력자(작성자) 이름';
comment on column public.team_todos.source_type is '연결 출처 종류(complaint 등)';

-- (3) 민원 접수 → 할 일 자동 생성 --------------------------------------------
create or replace function public.complaint_to_todo()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.team_todos (title, detail, recorder, source_type, source_id, source_label, status)
  values (
    '[민원] ' || coalesce(nullif(new.title, ''), '민원 접수'),
    new.content,
    '민원 자동연결',
    'complaint',
    new.id,
    trim(both ' ·' from coalesce(new.building_name, '') || ' ' || coalesce(new.unit_number, '') || ' · ' || coalesce(new.tenant_name, '')),
    'todo'
  );
  return new;
end;
$$;

drop trigger if exists trg_complaint_to_todo on public.complaints;
create trigger trg_complaint_to_todo
  after insert on public.complaints
  for each row execute function public.complaint_to_todo();

-- (4) 민원 상태 변경 → 연결된 할 일 상태 동기화 -------------------------------
create or replace function public.complaint_sync_todo()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.status is distinct from old.status then
    if new.status in ('resolved','closed') then
      update public.team_todos
         set status = 'done', completed_at = now()
       where source_type = 'complaint' and source_id = new.id and status <> 'done';
    else
      update public.team_todos
         set status = 'todo', completed_at = null
       where source_type = 'complaint' and source_id = new.id and status = 'done';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_complaint_sync_todo on public.complaints;
create trigger trg_complaint_sync_todo
  after update on public.complaints
  for each row execute function public.complaint_sync_todo();
