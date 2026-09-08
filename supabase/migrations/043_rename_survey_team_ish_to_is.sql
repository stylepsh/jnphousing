-- 답사팀 이름 오타 정리: 'ish' → 'is'
-- 발급 이력에 팀 이름이 'ish' 로 잘못 쌓였다(입력 중 발급된 것으로 보인다).
-- 이력 추적이 팀 이름에 걸려 있어 그대로 두면 "누구한테 준 건지" 가 갈린다.
-- 두 곳을 함께 고친다: 발급 이력(sheet) 과 물건의 마지막 배포 표시.

update auction_survey_sheet
set team_name = 'is'
where team_name = 'ish';

update auction_property
set last_issued_team = 'is'
where last_issued_team = 'ish';
