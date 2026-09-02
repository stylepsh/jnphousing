/**
 * 배포용 제출 양식 생성기 — 현장팀·부동산에 건네주는 빈 양식.
 *
 *   node scripts/build-submission-forms.mjs [출력폴더]
 *
 * 만드는 파일 2개
 *   JNP_답사양식.xlsx        현장팀용. 공실/거주 판정을 빠뜨리지 않게.
 *   JNP_부동산제출양식.xlsx  부동산용. 계약 내용을 같은 형식으로 받게.
 *
 * 실제로 받은 자료에서 났던 문제를 양식 단계에서 막는다.
 *   - 월세를 만원/원 섞어 적어 합계가 망가짐  → "만원" 칸으로 고정하고 원 단위 입력 차단
 *   - 입주일을 안 적어 월별 청구가 안 잡힘     → 필수 칸이 비면 빨갛게
 *   - 공실/거주를 안 적음                      → 드롭다운 + 빈칸 강조
 *   - "6개월 자동연장" 을 자유롭게 적음        → 드롭다운으로 통일
 *
 * 부동산제출양식의 열 순서는 JNP_임대취합.xlsx 의 부동산 탭과 같다.
 * 받은 파일에서 입력 범위를 복사해 취합 워크북 탭에 그대로 붙여넣으면 된다.
 */

import ExcelJS from "exceljs";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";

const NAVY = "FF1C2B4A";
const RED_BG = "FFFEE2E2";
const EXAMPLE = "FFF8FAFC";
const DATE = "yyyy-mm-dd";
const ROWS = 200;

function styleHeader(ws, cols) {
  ws.columns = cols.map((c, i) => ({ header: c.label, key: `c${i}`, width: c.w }));
  const r = ws.getRow(1);
  r.height = 30;
  r.eachCell((cell, i) => {
    const col = cols[i - 1];
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: col?.required ? "FFB91C1C" : NAVY } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  });
  ws.views = [{ state: "frozen", ySplit: 2 }];
}

/** 필수 칸이 비어 있으면 빨갛게 — 눈으로 바로 보이게 */
function markRequired(ws, colLetter, firstRow, lastRow, addrCol) {
  ws.addConditionalFormatting({
    ref: `${colLetter}${firstRow}:${colLetter}${lastRow}`,
    rules: [{
      type: "expression",
      // 그 행에 주소가 적혀 있는데 이 칸만 비었을 때
      formulae: [`AND($${addrCol}${firstRow}<>"",${colLetter}${firstRow}="")`],
      priority: 1,
      style: { fill: { type: "pattern", pattern: "solid", bgColor: { argb: RED_BG } } },
    }],
  });
}

function guideSheet(wb, title, lines) {
  const ws = wb.addWorksheet("작성요령", { properties: { tabColor: { argb: NAVY } } });
  ws.getColumn(1).width = 4;
  ws.getColumn(2).width = 96;
  ws.addRow(["", title]).getCell(2).font = { bold: true, size: 16 };
  ws.addRow([]);
  lines.forEach(([mark, text]) => {
    const r = ws.addRow(["", mark ? `${mark} ${text}` : ""]);
    if (mark === "■") r.getCell(2).font = { bold: true, size: 12 };
    else if (mark === "⚠") r.getCell(2).font = { color: { argb: "FFB91C1C" }, size: 11 };
    else r.getCell(2).font = { size: 11 };
    r.getCell(2).alignment = { wrapText: true, vertical: "top" };
  });
  return ws;
}

/* 1. 답사 양식 (현장팀) */
async function buildSurveyForm(outDir) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "JNP주택관리";

  guideSheet(wb, "답사 결과 작성요령 (현장팀용)", [
    ["■", "이 파일에 답사 결과를 적어 그대로 돌려주시면 됩니다."],
    ["", ""],
    ["■", "가장 중요한 것"],
    ["⚠", "'점유상태' 칸은 반드시 채워 주세요. 이 칸이 비면 그 물건은 아무 처리도 못 합니다."],
    ["·", "공실 / 거주 / 재확인 중에서 고릅니다. 직접 타이핑하지 말고 칸을 눌러 목록에서 선택하세요."],
    ["·", "애매하면 비워두지 말고 '재확인' 을 고르고 메모에 이유를 적어 주세요."],
    ["", ""],
    ["■", "빨간 칸의 뜻"],
    ["·", "주소를 적었는데 꼭 필요한 칸이 비면 그 칸이 빨갛게 변합니다. 빨간 칸이 없어야 완료입니다."],
    ["", ""],
    ["■", "각 칸 설명"],
    ["·", "사건번호 — 발급받은 답사지에 적힌 번호를 그대로 옮겨 적습니다."],
    ["·", "주소 — 동/호수까지 적어 주세요. 같은 건물이라도 호수가 다르면 다른 물건입니다."],
    ["·", "답사일 — 실제로 다녀온 날짜. 2026-08-15 처럼 적습니다."],
    ["·", "개문가능 — 문을 열 수 있는지. 가능 / 불가 / 관리자확인."],
    ["·", "우편물 — 우편함 상태. 없음 / 보통 / 쌓임. 쌓여 있으면 장기 공실 신호입니다."],
    ["·", "메모 — 현장에서 본 것을 자유롭게. 짐이 있었는지, 인기척이 있었는지 등."],
    ["", ""],
    ["■", "하지 말아야 할 것"],
    ["⚠", "열을 추가하거나 지우지 마세요. 순서가 바뀌면 시스템이 읽지 못합니다."],
    ["⚠", "한 칸에 두 물건을 몰아 적지 마세요. 물건 하나에 한 줄입니다."],
  ]);

  const ws = wb.addWorksheet("답사입력", { properties: { tabColor: { argb: "FF3182F6" } } });
  styleHeader(ws, [
    { label: "번호", w: 7 },
    { label: "사건번호", w: 18 },
    { label: "주소 (동/호수까지)", w: 44, required: true },
    { label: "소유주", w: 14 },
    { label: "답사일\n(2026-08-15)", w: 14, required: true },
    { label: "점유상태\n★필수 선택", w: 14, required: true },
    { label: "개문가능", w: 13 },
    { label: "우편물", w: 11 },
    { label: "메모", w: 34 },
  ]);

  const ex = ws.addRow([1, "2026타경1234", "인천 남동구 구월동 101-1 201호", "김소유",
    new Date("2026-08-15"), "공실", "가능", "쌓임", "← 예시입니다. 지우고 쓰세요."]);
  ex.eachCell((c) => {
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXAMPLE } };
    c.font = { italic: true, color: { argb: "FF94A3B8" } };
  });
  ws.getCell("E2").numFmt = DATE;

  for (let i = 3; i < 3 + ROWS; i++) {
    ws.addRow([i - 2, "", "", "", null, "", "", "", ""]);
    ws.getCell(`E${i}`).numFmt = DATE;
    ws.getCell(`F${i}`).dataValidation = {
      type: "list", allowBlank: false, formulae: ['"공실,거주,재확인"'],
      showErrorMessage: true, errorTitle: "점유상태",
      error: "공실 / 거주 / 재확인 중에서 고르세요. 애매하면 재확인.",
    };
    ws.getCell(`G${i}`).dataValidation = { type: "list", allowBlank: true, formulae: ['"가능,불가,관리자확인"'] };
    ws.getCell(`H${i}`).dataValidation = { type: "list", allowBlank: true, formulae: ['"없음,보통,쌓임"'] };
  }

  ["C", "E", "F"].forEach((c) => markRequired(ws, c, 3, 2 + ROWS, "C"));
  ws.addConditionalFormatting({
    ref: `A3:I${2 + ROWS}`,
    rules: [{
      type: "expression", formulae: ['$F3="공실"'], priority: 2,
      style: { fill: { type: "pattern", pattern: "solid", bgColor: { argb: "FFE8F5E9" } } },
    }],
  });

  const out = path.join(outDir, "JNP_답사양식.xlsx");
  await wb.xlsx.writeFile(out);
  return out;
}

/* 2. 부동산 제출 양식 */
async function buildAgencyForm(outDir) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "JNP주택관리";

  guideSheet(wb, "계약 내용 작성요령 (부동산용)", [
    ["■", "계약이 성사된 물건을 이 파일에 적어 그대로 보내주시면 됩니다."],
    ["", ""],
    ["■", "금액은 '만원' 단위로 적어 주세요"],
    ["⚠", "월세 70만원 → 70  /  보증금 500만원 → 500 처럼 적습니다."],
    ["⚠", "700000 처럼 원 단위로 적으면 입력이 거부됩니다. 만원 단위로만 적어 주세요."],
    ["·", "이 부분에서 착오가 가장 많이 납니다. 합계가 통째로 틀어지니 꼭 지켜 주세요."],
    ["", ""],
    ["■", "입주일은 반드시 적어 주세요"],
    ["⚠", "입주일이 없으면 월세를 언제부터 받을지 계산할 수 없습니다."],
    ["·", "2026-08-15 형식으로 적습니다."],
    ["", ""],
    ["■", "계약기간"],
    ["·", "계약조건 칸에서 '6개월 만료후 자동연장' 처럼 목록에서 고르면 종료일은 자동 계산됩니다."],
    ["·", "종료일이 따로 정해져 있으면 '계약종료일' 칸에 직접 적어 주세요."],
    ["", ""],
    ["■", "빨간 칸의 뜻"],
    ["·", "주소를 적었는데 꼭 필요한 칸이 비면 빨갛게 변합니다. 빨간 칸이 없어야 완료입니다."],
    ["", ""],
    ["■", "각 칸 설명"],
    ["·", "주소 — 동/호수까지. 같은 건물이라도 호수가 다르면 다른 계약입니다."],
    ["·", "임차인 — 실제 계약자 이름. 소유주와 헷갈리지 않게 주의해 주세요."],
    ["·", "임대료 납부일 — 매달 며칠에 내는지. 1~31 사이 숫자만."],
    ["", ""],
    ["■", "하지 말아야 할 것"],
    ["⚠", "열을 추가하거나 지우거나 순서를 바꾸지 마세요. 시스템이 읽지 못합니다."],
    ["⚠", "한 칸에 여러 물건을 몰아 적지 마세요. 계약 하나에 한 줄입니다."],
    ["⚠", "같은 물건을 다른 부동산과 중복으로 올리지 마세요. 중복은 자동으로 잡힙니다."],
  ]);

  const ws = wb.addWorksheet("계약입력", { properties: { tabColor: { argb: "FF10B981" } } });
  // 열 순서는 JNP_임대취합.xlsx 의 부동산 탭과 동일 — 복사·붙여넣기로 취합된다.
  styleHeader(ws, [
    { label: "사건번호", w: 18 },
    { label: "주소 (동/호수까지)", w: 42, required: true },
    { label: "소유주", w: 13 },
    { label: "임차인", w: 13, required: true },
    { label: "계약조건", w: 22 },
    { label: "보증금\n(만원)", w: 13 },
    { label: "월세\n(만원) ★", w: 13, required: true },
    { label: "입주일\n(2026-08-15) ★", w: 16, required: true },
    { label: "계약종료일\n(비워도 됨)", w: 16 },
    { label: "임대료\n납부일(1~31)", w: 14 },
    { label: "계약일", w: 14 },
    { label: "비고", w: 28 },
  ]);

  const ex = ws.addRow(["2026타경1234", "인천 남동구 구월동 101-1 201호", "김소유", "홍길동",
    "6개월 만료후 자동연장", 500, 70, new Date("2026-08-15"), null, 25, new Date("2026-08-10"),
    "← 예시입니다. 지우고 쓰세요."]);
  ex.eachCell((c) => {
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXAMPLE } };
    c.font = { italic: true, color: { argb: "FF94A3B8" } };
  });
  ws.getCell("H2").numFmt = DATE;
  ws.getCell("K2").numFmt = DATE;

  for (let i = 3; i < 3 + ROWS; i++) {
    ws.addRow(["", "", "", "", "", null, null, null, null, null, null, ""]);
    ws.getCell(`E${i}`).dataValidation = {
      type: "list", allowBlank: true,
      formulae: ['"6개월 만료후 자동연장,12개월 만료후 자동연장,6개월,12개월,24개월,기타"'],
    };
    // 만원 단위 강제 — 원 단위로 적으면 거부한다. 실제 자료에서 가장 잦았던 오류.
    ws.getCell(`F${i}`).dataValidation = {
      type: "whole", operator: "between", formulae: [0, 99999], allowBlank: true,
      showErrorMessage: true, errorTitle: "보증금은 만원 단위",
      error: "500만원이면 500 이라고 적습니다. 5000000 처럼 원 단위로 적지 마세요.",
    };
    ws.getCell(`G${i}`).dataValidation = {
      type: "whole", operator: "between", formulae: [1, 9999], allowBlank: true,
      showErrorMessage: true, errorTitle: "월세는 만원 단위",
      error: "70만원이면 70 이라고 적습니다. 700000 처럼 원 단위로 적지 마세요.",
    };
    ws.getCell(`H${i}`).numFmt = DATE;
    ws.getCell(`I${i}`).numFmt = DATE;
    ws.getCell(`J${i}`).dataValidation = {
      type: "whole", operator: "between", formulae: [1, 31], allowBlank: true,
      showErrorMessage: true, errorTitle: "납부일", error: "1~31 사이 숫자로 적어 주세요.",
    };
    ws.getCell(`K${i}`).numFmt = DATE;
  }

  ["B", "D", "G", "H"].forEach((c) => markRequired(ws, c, 3, 2 + ROWS, "B"));

  const note = ws.getCell(`A${3 + ROWS + 1}`);
  note.value = "※ 취합 담당자: 이 시트의 A3:L 범위를 복사해 JNP_임대취합.xlsx 의 해당 부동산 탭 A3 에 붙여넣으면 됩니다.";
  note.font = { italic: true, size: 9, color: { argb: "FF94A3B8" } };

  const out = path.join(outDir, "JNP_부동산제출양식.xlsx");
  await wb.xlsx.writeFile(out);
  return out;
}

/* 실행 */
const outDir = process.argv[2] ?? path.join(os.homedir(), "OneDrive", "Desktop", "JNP_배포양식");
fs.mkdirSync(outDir, { recursive: true });
console.log("생성 완료");
console.log(" -", await buildSurveyForm(outDir));
console.log(" -", await buildAgencyForm(outDir));
