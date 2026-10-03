// DM-임대관리현황 시트 → 운영자 페이지 읽기 전용 연결 (v2: 모든 탭).
// 시트에서 [확장 프로그램 → Apps Script] 에 이 코드를 붙여넣고
// [배포 → 배포 관리 → 연필 → 버전: 새 버전 → 배포] 로 갱신한다(주소 그대로 유지).
// TOKEN 은 Vercel 환경변수 DM_SHEET_SCRIPT_TOKEN 과 같아야 한다(여기엔 자리표시만 둔다).
const TOKEN = '여기에_토큰';

function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.token !== TOKEN) return json_({ error: 'forbidden' });
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (p.list) return json_({ tabs: ss.getSheets().map(function (s) { return s.getName(); }) });
  const sh = ss.getSheetByName(p.tab || 'ALL');
  if (!sh) return json_({ error: 'no_tab' });
  const rows = Math.max(1, Math.min(sh.getLastRow(), 3000));
  const cols = Math.max(1, Math.min(sh.getLastColumn(), 130));
  const range = sh.getRange(1, 1, rows, cols);
  return json_({ values: range.getDisplayValues(), bgs: range.getBackgrounds() });
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
