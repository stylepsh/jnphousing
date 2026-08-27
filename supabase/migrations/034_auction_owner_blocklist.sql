-- 034: 임대인 차단 목록 (수집 영구 제외).
--   목적: "이 사람 물건은 아예 안 본다" 를 한 번 지정하면
--         지지옥션 재파싱(임포트) 때마다 자동으로 걸러지도록.
--   owner_key = 회사표기·공백·기호 제거한 비교 키(normalizeOwnerName 결과).
--               "(주)대성하우징" / "대성하우징(주)" / "대성 하우징" 을 한 사람으로 묶는다.
create table if not exists public.auction_owner_blocklist (
  owner_key   text primary key,
  owner_name  text not null,
  reason      text,
  created_at  timestamptz not null default now()
);

alter table public.auction_owner_blocklist enable row level security;
drop policy if exists "auction_owner_blocklist admin all" on public.auction_owner_blocklist;
create policy "auction_owner_blocklist admin all"
  on public.auction_owner_blocklist for all
  using (public.is_admin()) with check (public.is_admin());

comment on table public.auction_owner_blocklist is
  '경매 수집 영구 제외 임대인. 임포트 시 owner_key 로 자동 필터.';
