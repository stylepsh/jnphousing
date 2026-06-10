-- ============================================================================
-- 015: 팀 할 일 보드 (회사 내 해야 할 일 정리 + 완료 체크 + 팀원 공유)
-- ============================================================================

create table if not exists public.team_todos (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  detail text,
  assignee text,                                -- 담당자 이름 (자유 입력)
  due_date date,                                -- 기한 (없으면 상시)
  status text not null default 'todo'
    check (status in ('todo','done')),
  completed_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

create index if not exists idx_team_todos_status
  on public.team_todos(status, due_date);

alter table public.team_todos enable row level security;

-- 관리자(팀원)만 전체 권한
drop policy if exists "team_todos admin all" on public.team_todos;
create policy "team_todos admin all"
  on public.team_todos for all
  using (public.is_admin()) with check (public.is_admin());

-- updated_at 자동 갱신
drop trigger if exists trg_team_todos_updated_at on public.team_todos;
create trigger trg_team_todos_updated_at
  before update on public.team_todos
  for each row execute function public.set_updated_at();

comment on table public.team_todos is '팀 할 일 보드 — 등록·담당자·기한·완료 체크';
