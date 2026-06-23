-- 027: 사건번호 기준 재수집 중복차단 보강.
--   점유(occupied)/공실/재방문 등으로 답사 완료된 건이 지지옥션 재수집 시
--   다시 후보로 나오지 않도록(답사자 재방문 방지) case_number 조회를 가속한다.
--   부분 인덱스: rejected 아닌 활성행만.
create index if not exists idx_auction_property_case_active
  on public.auction_property (case_number)
  where survey_status <> 'rejected';
