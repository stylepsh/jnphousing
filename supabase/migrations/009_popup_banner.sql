-- ============================================================================
-- 009: 홈페이지 진입 팝업 배너 (관리자 OS 에서 on/off + 내용 편집)
-- ============================================================================

create table if not exists public.site_popup_banner (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  body text,
  link_url text,
  link_label text,
  theme text not null default 'info'
    check (theme in ('info','important','event','holiday')),
  is_active boolean not null default false,
  start_at timestamptz,
  end_at timestamptz,
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

create index if not exists idx_popup_banner_active
  on public.site_popup_banner(is_active, start_at, end_at);

alter table public.site_popup_banner enable row level security;

-- 공개: 활성 배너만 읽기 가능
drop policy if exists "popup_banner public read" on public.site_popup_banner;
create policy "popup_banner public read"
  on public.site_popup_banner for select
  using (is_active = true);

-- 관리자: 전체 권한
drop policy if exists "popup_banner admin all" on public.site_popup_banner;
create policy "popup_banner admin all"
  on public.site_popup_banner for all
  using (public.is_admin()) with check (public.is_admin());

-- updated_at 자동 갱신
drop trigger if exists trg_popup_banner_updated_at on public.site_popup_banner;
create trigger trg_popup_banner_updated_at
  before update on public.site_popup_banner
  for each row execute function public.set_updated_at();

-- 초기 예시 배너 1개 (비활성 상태로 생성 — 관리자가 켜면 노출)
insert into public.site_popup_banner (title, body, link_url, link_label, theme, is_active)
values (
  '설 연휴 휴무 안내',
  '2/9(월)~2/12(목) 휴무합니다. 긴급 민원은 카카오톡 오픈채팅으로 접수해 주세요.',
  'https://open.kakao.com/o/sy898MLi',
  '카톡 문의하기',
  'holiday',
  false
)
on conflict do nothing;

comment on table public.site_popup_banner is '홈페이지 진입 팝업 배너 — 관리자 OS 에서 on/off';
