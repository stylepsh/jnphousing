/**
 * 임대 취합 워크북 생성기 — 부동산 3곳의 제각각인 양식을 하나로 모으기 위한 엑셀.
 *
 *   node scripts/build-rental-workbook.mjs [출력경로]
 *
 * 흐름: 답사지 → 공실 → 상품화완료 → 부동산제공 → (부동산별 탭) → 계약통합 → 월별징수
 *
 * 부동산 탭은 계속 늘릴 수 있다. `00_설정` 시트의 부동산 목록에 이름을 적고
 * 같은 이름의 탭을 복사해 만들면 계약통합이 자동으로 끌어온다.
 *
 * 수식은 INDIRECT 기반이라 구버전 엑셀에서도 동작한다(FILTER/VSTACK 미사용).
 */

import ExcelJS from "exceljs";
import path from "node:path";
import os from "node:os";

const AGENCIES = ["미래부동산", "홍길동부동산", "인천부동산"];
const ROWS_PER_AGENCY = 100;   // 부동산 탭당 계약 입력 칸
const MONTHS = 6;              // 월별 징수 시트가 다루는 개월 수
const BASE_MONTH = "2026-08";  // 징수 시작 월

// ---------------------------------------------------------------- 공통 스타일
const NAVY = "FF1C2B4A";
const LIGHT = "FFF1F5F9";
const MONEY = '#,##0"원"';
const DATE = "yyyy-mm-dd";

function header(ws, cols, widths) {
  ws.columns = cols.map((h, i) => ({ header: h, key: `c${i}`, width: widths[i] ?? 14 }));
  const row = ws.getRow(1);
  row.height = 26;
  row.eachCell((c) => {
    c.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
    c.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    c.border = { bottom: { style: "thin", color: { argb: NAVY } } };
  });
  ws.views = [{ state: "frozen", ySplit: 1 }];
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: cols.length } };
}

function note(ws, text) {
  const r = ws.addRow([]);
  r.getCell(1).value = text;
  r.getCell(1).font = { italic: true, color: { argb: "FF64748B" }, size: 10 };
  return r;
}

// 열 번호 → 엑셀 열 문자
function cc(n) {
  let s = "";
  while (n > 0) { const t = (n - 1) % 26; s = String.fromCharCode(65 + t) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

// ---------------------------------------------------------------- 워크북
const wb = new ExcelJS.Workbook();
wb.creator = "JNP주택관리";
wb.created = new Date();

/* ============================ 00_설정 ============================ */
{
  const ws = wb.addWorksheet("00_설정", { properties: { tabColor: { argb: NAVY } } });
  ws.getColumn(1).width = 26;
  ws.getColumn(2).width = 78;

  ws.addRow(["JNP 임대 취합 워크북"]).getCell(1).font = { bold: true, size: 16 };
  ws.addRow([]);
  ws.addRow(["■ 쓰는 순서"]).getCell(1).font = { bold: true, size: 12 };
  [
    ["1", "01_답사지 — 현장팀 답사 결과를 그대로 입력. 점유상태만 정확히 골라주면 나머지는 자동."],
    ["2", "02_공실 — 01에서 '공실'인 것만 자동으로 올라온다. 손댈 필요 없음."],
    ["3", "03_상품화완료 — 공실 중 작업 끝난 것에 완료일·비용 입력."],
    ["4", "04_부동산제공 — 어느 부동산에 언제 넘겼는지 기록."],
    ["5", "부동산 탭 — 부동산이 보내온 계약 내용을 같은 양식으로 옮겨 적는다."],
    ["6", "10_계약통합 — 부동산 탭들이 자동 취합된다. 입력 금지."],
    ["7", "11_월별징수 — 월세 청구·미납이 자동 계산된다. 입금액만 입력."],
    ["8", "12_대시보드 — 임차율·미납 합계 요약."],
  ].forEach(([n, t]) => ws.addRow([n, t]));

  ws.addRow([]);
  ws.addRow(["■ 부동산 추가하는 법"]).getCell(1).font = { bold: true, size: 12 };
  ws.addRow(["", "① 기존 부동산 탭 우클릭 → '이동/복사' → '복사본 만들기' 체크 → 탭 이름을 새 부동산명으로 변경"]);
  ws.addRow(["", "② 아래 '부동산 목록'의 빈칸에 그 이름을 똑같이 적는다 (띄어쓰기까지 동일해야 함)"]);
  ws.addRow(["", "③ 10_계약통합이 자동으로 끌어온다"]);

  ws.addRow([]);
  const listHeadRow = ws.rowCount + 1;
  ws.addRow(["부동산 목록", "← 탭 이름과 똑같이 적으세요"]);
  ws.getRow(listHeadRow).getCell(1).font = { bold: true };
  ws.getRow(listHeadRow).getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: LIGHT } };

  AGENCIES.forEach((a) => ws.addRow([a]));
  for (let i = AGENCIES.length; i < 20; i++) ws.addRow([""]);   // 확장용 빈칸

  ws.addRow([]);
  ws.addRow(["징수 시작월", BASE_MONTH]).getCell(1).font = { bold: true };
  ws.addRow(["", `11_월별징수 시트가 이 달부터 ${MONTHS}개월을 다룹니다.`]);

  // 목록 첫 행 위치를 기억해 다른 시트 수식에서 참조
  globalThis.__AGENCY_ROW = listHeadRow + 1;
}
const AGENCY_LIST_FIRST_ROW = globalThis.__AGENCY_ROW;
const AGENCY_LIST_LAST_ROW = AGENCY_LIST_FIRST_ROW + 19;

/* ============================ 01_답사지 ============================ */
{
  const ws = wb.addWorksheet("01_답사지");
  header(ws,
    ["번호", "사건번호", "주소", "소유주", "답사팀", "답사일", "점유상태", "개문가능", "비고"],
    [7, 18, 40, 14, 12, 13, 12, 12, 30]);

  for (let i = 2; i <= 501; i++) {
    ws.addRow([i - 1, "", "", "", "", null, "", "", ""]);
    ws.getCell(`F${i}`).numFmt = DATE;
    // 점유상태·개문가능은 오타를 막으려고 드롭다운으로 고정
    ws.getCell(`G${i}`).dataValidation = {
      type: "list", allowBlank: true, formulae: ['"공실,거주,재확인"'],
      showErrorMessage: true, errorTitle: "선택값만 입력",
      error: "공실 / 거주 / 재확인 중에서 고르세요.",
    };
    ws.getCell(`H${i}`).dataValidation = {
      type: "list", allowBlank: true, formulae: ['"가능,불가,관리자확인"'],
    };
  }
  ws.addConditionalFormatting({
    ref: "A2:I501",
    rules: [{
      type: "expression", formulae: ['$G2="공실"'], priority: 1,
      style: { fill: { type: "pattern", pattern: "solid", bgColor: { argb: "FFE8F5E9" } } },
    }],
  });
}

/* ============================ 02_공실 ============================ */
{
  const ws = wb.addWorksheet("02_공실");
  header(ws,
    ["답사행", "사건번호", "주소", "소유주", "답사일", "개문가능", "비고"],
    [8, 18, 40, 14, 13, 12, 30]);
  note(ws, "01_답사지에서 점유상태='공실'인 행만 자동으로 올라옵니다. 직접 입력하지 마세요.");

  for (let i = 3; i <= 502; i++) {
    const src = i - 1;   // 01_답사지의 행 번호
    const cond = `IF('01_답사지'!$G${src}="공실"`;
    ws.getCell(`A${i}`).value = { formula: `${cond},${src},"")` };
    ws.getCell(`B${i}`).value = { formula: `${cond},'01_답사지'!B${src},"")` };
    ws.getCell(`C${i}`).value = { formula: `${cond},'01_답사지'!C${src},"")` };
    ws.getCell(`D${i}`).value = { formula: `${cond},'01_답사지'!D${src},"")` };
    ws.getCell(`E${i}`).value = { formula: `${cond},'01_답사지'!F${src},"")` };
    ws.getCell(`E${i}`).numFmt = DATE;
    ws.getCell(`F${i}`).value = { formula: `${cond},'01_답사지'!H${src},"")` };
    ws.getCell(`G${i}`).value = { formula: `${cond},'01_답사지'!I${src},"")` };
  }
}

/* ============================ 03_상품화완료 ============================ */
{
  const ws = wb.addWorksheet("03_상품화완료");
  header(ws,
    ["사건번호", "주소", "소유주", "작업내용", "작업비(원)", "완료일", "상태", "비고"],
    [18, 40, 14, 26, 14, 13, 12, 26]);
  note(ws, "02_공실 목록을 보고 작업이 끝난 물건을 여기에 옮겨 적습니다.");

  for (let i = 3; i <= 302; i++) {
    ws.addRow(["", "", "", "", null, null, "", ""]);
    ws.getCell(`E${i}`).numFmt = MONEY;
    ws.getCell(`F${i}`).numFmt = DATE;
    ws.getCell(`G${i}`).dataValidation = {
      type: "list", allowBlank: true, formulae: ['"진행중,완료,보류"'],
    };
  }
}

/* ============================ 04_부동산제공 ============================ */
{
  const ws = wb.addWorksheet("04_부동산제공");
  header(ws,
    ["사건번호", "주소", "제공 부동산", "제공일", "희망 보증금", "희망 월세", "회수일", "상태", "비고"],
    [18, 40, 16, 13, 15, 14, 13, 12, 26]);
  note(ws, "어느 부동산에 어떤 물건을 넘겼는지. 같은 물건을 여러 곳에 줬다면 행을 나눠 적으세요.");

  for (let i = 3; i <= 402; i++) {
    ws.addRow(["", "", "", null, null, null, null, "", ""]);
    ws.getCell(`C${i}`).dataValidation = {
      type: "list", allowBlank: true,
      formulae: [`'00_설정'!$A$${AGENCY_LIST_FIRST_ROW}:$A$${AGENCY_LIST_LAST_ROW}`],
    };
    ws.getCell(`D${i}`).numFmt = DATE;
    ws.getCell(`E${i}`).numFmt = MONEY;
    ws.getCell(`F${i}`).numFmt = MONEY;
    ws.getCell(`G${i}`).numFmt = DATE;
    ws.getCell(`H${i}`).dataValidation = {
      type: "list", allowBlank: true, formulae: ['"제공중,계약완료,회수"'],
    };
  }
}

/* ============================ 부동산별 입력 탭 ============================ */
const AGENCY_COLS =
  ["사건번호", "주소", "소유주", "임차인", "계약조건", "보증금", "월세",
   "계약시작", "계약종료", "임대료납부일", "계약일", "비고"];
const AGENCY_WIDTHS = [18, 40, 13, 13, 18, 14, 13, 13, 13, 14, 13, 24];

for (const name of AGENCIES) {
  const ws = wb.addWorksheet(name, { properties: { tabColor: { argb: "FF3182F6" } } });
  header(ws, AGENCY_COLS, AGENCY_WIDTHS);
  note(ws, `${name}이(가) 보내온 계약 내용을 이 양식에 그대로 옮겨 적으세요. 열을 추가·삭제하면 통합이 깨집니다.`);

  for (let i = 3; i < 3 + ROWS_PER_AGENCY; i++) {
    ws.addRow(["", "", "", "", "", null, null, null, null, null, null, ""]);
    ws.getCell(`F${i}`).numFmt = MONEY;
    ws.getCell(`G${i}`).numFmt = MONEY;
    ws.getCell(`H${i}`).numFmt = DATE;
    ws.getCell(`I${i}`).numFmt = DATE;
    ws.getCell(`J${i}`).dataValidation = {
      type: "whole", operator: "between", formulae: [1, 31], allowBlank: true,
      showErrorMessage: true, errorTitle: "납부일", error: "1~31 사이 숫자로 적으세요.",
    };
    ws.getCell(`K${i}`).numFmt = DATE;
  }
}

/* ============================ 10_계약통합 ============================ */
const UNION_FIRST_ROW = 3;
const UNION_LAST_ROW = 3 + 20 * ROWS_PER_AGENCY - 1;
{
  const ws = wb.addWorksheet("10_계약통합", { properties: { tabColor: { argb: "FF10B981" } } });
  header(ws,
    ["계약부동산", "사건번호", "주소", "소유주", "임차인", "계약조건", "보증금", "월세",
     "계약시작", "계약종료", "납부일", "계약일", "비고"],
    [15, 18, 38, 13, 13, 16, 14, 13, 13, 13, 10, 13, 22]);
  note(ws, "부동산 탭에서 자동으로 모입니다. 직접 입력하지 마세요.");

  let r = UNION_FIRST_ROW;
  for (let a = 0; a < 20; a++) {
    const nameCell = `'00_설정'!$A$${AGENCY_LIST_FIRST_ROW + a}`;
    for (let k = 0; k < ROWS_PER_AGENCY; k++) {
      const src = 3 + k;
      const ref = (col) => `INDIRECT("'"&${nameCell}&"'!${col}${src}")`;
      // 부동산명이 비었거나 그 행에 주소가 없으면 빈칸
      const guard = `IF(OR(${nameCell}="",IFERROR(${ref("B")},"")=""),""`;
      ws.getCell(`A${r}`).value = { formula: `${guard},${nameCell})` };
      ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"].forEach((srcCol, idx) => {
        const outCol = cc(2 + idx);   // B..M
        ws.getCell(`${outCol}${r}`).value = { formula: `${guard},IFERROR(${ref(srcCol)},""))` };
      });
      ws.getCell(`G${r}`).numFmt = MONEY;
      ws.getCell(`H${r}`).numFmt = MONEY;
      ws.getCell(`I${r}`).numFmt = DATE;
      ws.getCell(`J${r}`).numFmt = DATE;
      ws.getCell(`L${r}`).numFmt = DATE;
      r++;
    }
  }
}

/* ============================ 11_월별징수 ============================ */
{
  const ws = wb.addWorksheet("11_월별징수", { properties: { tabColor: { argb: "FFF59E0B" } } });

  const months = [];
  const [y0, m0] = BASE_MONTH.split("-").map(Number);
  for (let i = 0; i < MONTHS; i++) {
    const d = new Date(y0, m0 - 1 + i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  const cols = ["주소", "임차인", "계약부동산", "월세", "납부일", "계약시작", "계약종료"];
  const widths = [36, 12, 14, 13, 8, 12, 12];
  months.forEach((m) => { cols.push(`${m} 청구`, `${m} 입금`, `${m} 미납`); widths.push(13, 13, 13); });
  header(ws, cols, widths);
  note(ws, "청구액과 미납은 자동입니다. 연한 주황색 '입금' 칸에만 실제 받은 금액을 적으세요.");

  const N = 300;
  for (let i = 0; i < N; i++) {
    const r = 3 + i;
    const u = UNION_FIRST_ROW + i;
    const blank = `IF('10_계약통합'!$C${u}=""`;
    ws.getCell(`A${r}`).value = { formula: `${blank},"",'10_계약통합'!C${u})` };
    ws.getCell(`B${r}`).value = { formula: `${blank},"",'10_계약통합'!E${u})` };
    ws.getCell(`C${r}`).value = { formula: `${blank},"",'10_계약통합'!A${u})` };
    ws.getCell(`D${r}`).value = { formula: `${blank},"",'10_계약통합'!H${u})` };
    ws.getCell(`E${r}`).value = { formula: `${blank},"",'10_계약통합'!K${u})` };
    ws.getCell(`F${r}`).value = { formula: `${blank},"",'10_계약통합'!I${u})` };
    ws.getCell(`G${r}`).value = { formula: `${blank},"",'10_계약통합'!J${u})` };
    ws.getCell(`D${r}`).numFmt = MONEY;
    ws.getCell(`F${r}`).numFmt = DATE;
    ws.getCell(`G${r}`).numFmt = DATE;

    months.forEach((m, mi) => {
      const base = 8 + mi * 3;
      const [cCharge, cPaid, cDue] = [cc(base), cc(base + 1), cc(base + 2)];
      const first = `DATE(${m.slice(0, 4)},${Number(m.slice(5))},1)`;
      const last = `EOMONTH(${first},0)`;
      // 계약기간이 그 달과 겹치면 월세를 청구
      ws.getCell(`${cCharge}${r}`).value = {
        formula: `IF($D${r}="",0,IF(AND(OR($F${r}="",$F${r}<=${last}),OR($G${r}="",$G${r}>=${first})),$D${r},0))`,
      };
      ws.getCell(`${cDue}${r}`).value = {
        formula: `IF(${cCharge}${r}=0,0,MAX(0,${cCharge}${r}-N(${cPaid}${r})))`,
      };
      [cCharge, cPaid, cDue].forEach((c) => { ws.getCell(`${c}${r}`).numFmt = MONEY; });
      ws.getCell(`${cDue}${r}`).font = { color: { argb: "FFDC2626" } };
      ws.getCell(`${cPaid}${r}`).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF7ED" } };
    });
  }

  // 합계 행
  const sumRow = 3 + N + 1;
  ws.getCell(`A${sumRow}`).value = "합계";
  ws.getCell(`A${sumRow}`).font = { bold: true };
  months.forEach((_, mi) => {
    const base = 8 + mi * 3;
    [0, 1, 2].forEach((k) => {
      const c = cc(base + k);
      ws.getCell(`${c}${sumRow}`).value = { formula: `SUM(${c}3:${c}${3 + N - 1})` };
      ws.getCell(`${c}${sumRow}`).numFmt = MONEY;
      ws.getCell(`${c}${sumRow}`).font = { bold: true };
    });
  });
}

/* ============================ 12_대시보드 ============================ */
{
  const ws = wb.addWorksheet("12_대시보드", { properties: { tabColor: { argb: NAVY } } });
  ws.getColumn(1).width = 30;
  ws.getColumn(2).width = 22;
  ws.getColumn(3).width = 50;

  ws.addRow(["현황 요약"]).getCell(1).font = { bold: true, size: 16 };
  ws.addRow([]);
  const rows = [
    ["답사 물건 수", `COUNTA('01_답사지'!$C$2:$C$501)`, "주소가 적힌 행", null],
    ["공실 물건 수", `COUNTIF('01_답사지'!$G$2:$G$501,"공실")`, "", null],
    ["거주 물건 수", `COUNTIF('01_답사지'!$G$2:$G$501,"거주")`, "", null],
    ["재확인 필요", `COUNTIF('01_답사지'!$G$2:$G$501,"재확인")`, "현장팀이 판단 못한 건", null],
    ["상품화 완료", `COUNTIF('03_상품화완료'!$G$3:$G$302,"완료")`, "", null],
    ["부동산 제공 건수", `COUNTA('04_부동산제공'!$B$3:$B$402)`, "", null],
    ["계약 체결 건수", `COUNTIF('10_계약통합'!$C$${UNION_FIRST_ROW}:$C$${UNION_LAST_ROW},"?*")`, "부동산 탭 합계", null],
    ["임차율(공실 대비)", `IFERROR(COUNTIF('10_계약통합'!$C$${UNION_FIRST_ROW}:$C$${UNION_LAST_ROW},"?*")/COUNTIF('01_답사지'!$G$2:$G$501,"공실"),"")`, "계약 ÷ 공실", "0.0%"],
    ["월세 합계(계약 기준)", `SUM('10_계약통합'!$H$${UNION_FIRST_ROW}:$H$${UNION_LAST_ROW})`, "", MONEY],
    ["보증금 합계", `SUM('10_계약통합'!$G$${UNION_FIRST_ROW}:$G$${UNION_LAST_ROW})`, "", MONEY],
  ];
  rows.forEach(([label, formula, memo, fmt]) => {
    const r = ws.addRow([label, { formula }, memo]);
    r.getCell(1).font = { bold: true };
    r.getCell(3).font = { color: { argb: "FF64748B" }, size: 10 };
    if (fmt) r.getCell(2).numFmt = fmt;
  });

  ws.addRow([]);
  const h = ws.addRow(["부동산별 계약 건수", "건수", "월세 합계"]);
  h.eachCell((c) => { c.font = { bold: true }; c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: LIGHT } }; });
  for (let a = 0; a < 20; a++) {
    const nameCell = `'00_설정'!$A$${AGENCY_LIST_FIRST_ROW + a}`;
    const r = ws.addRow([
      { formula: `IF(${nameCell}="","",${nameCell})` },
      { formula: `IF(${nameCell}="","",COUNTIF('10_계약통합'!$A$${UNION_FIRST_ROW}:$A$${UNION_LAST_ROW},${nameCell}))` },
      { formula: `IF(${nameCell}="","",SUMIF('10_계약통합'!$A$${UNION_FIRST_ROW}:$A$${UNION_LAST_ROW},${nameCell},'10_계약통합'!$H$${UNION_FIRST_ROW}:$H$${UNION_LAST_ROW}))` },
    ]);
    r.getCell(3).numFmt = MONEY;
  }
  ws.addRow([]);
  note(ws, "※ 수치가 안 바뀌면 F9(재계산)를 누르거나, 파일 > 옵션 > 수식 > 계산 옵션이 '자동'인지 확인하세요.");
}

/* ---------------------------------------------------------------- 저장 */
const out = process.argv[2]
  ?? path.join(os.homedir(), "OneDrive", "Desktop", "JNP_임대취합.xlsx");
await wb.xlsx.writeFile(out);
console.log("생성 완료:", out);
console.log("시트:", wb.worksheets.map((w) => w.name).join(" / "));
