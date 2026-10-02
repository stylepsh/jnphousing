// DM-임대관리현황 시트 → 운영자 페이지(임대 현황) 읽기 전용 연결.
// 시트에서 [확장 프로그램 → Apps Script] 에 이 코드를 붙여넣고
// [배포 → 새 배포 → 웹 앱] 실행 사용자: 나, 액세스 권한: 모든 사용자 로 배포한다.
// TOKEN 은 Vercel 환경변수 DM_SHEET_SCRIPT_TOKEN 과 같아야 한다(여기엔 자리표시만 둔다).
const TOKEN = '여기에_토큰';

function doGet(e) {
  if (!e || !e.parameter || e.parameter.token !== TOKEN) {
    return json_({ error: 'forbidden' });
  }
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('ALL');
  const range = sh.getRange(1, 1, Math.min(sh.getLastRow(), 1500), Math.min(sh.getLastColumn(), 105));
  return json_({ values: range.getDisplayValues(), bgs: range.getBackgrounds() });
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
