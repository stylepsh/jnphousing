// 답사지 엑셀 라운드트립 검증:
//   buildSurveySheetXlsx 로 만든 파일 → (답사자가 점유 O/X/△ 입력) → import 와 동일하게 재파싱.
//   "정확히 그 건에 저장"의 핵심 = 사건번호가 그대로 살아남고 점유가 올바른 상태로 매핑되는가.
import { describe, it, expect } from "vitest";
import ExcelJS from "exceljs";
import { buildSurveySheetXlsx } from "./survey-export";
import { rowsFromMatrix, normalizeRow } from "./survey-sheet";
import { SURVEY_STATUS_OF, type Occupancy } from "./occupancy";
import type { SurveyRow } from "./survey-rows";

const rows: SurveyRow[] = [
  {
    id: "a", property_no: 101, case_number: "2024타경12345", court: "인천지방법원",
    category: "아파트", address: "인천광역시 부평구 부평동 100-1", address_short: "101동 202호",
    owner_name: "김철수", creditor: "주택도시보증공사", survey_status: "pending",
  },
  {
    id: "b", property_no: 102, case_number: "2024타경67890", court: "인천지방법원",
    category: "다세대", address: "인천광역시 부평구 산곡동 55-3", address_short: "B01호",
    owner_name: "김철수", creditor: "주택도시보증공사", survey_status: "pending",
  },
  {
    id: "c", property_no: 103, case_number: "2023타경5550", court: "인천지방법원",
    category: "오피스텔", address: "인천광역시 남동구 구월동 7", address_short: "1203호",
    owner_name: "이영희", creditor: "서울보증보험", survey_status: "pending",
  },
];

// 답사자가 점유 칸에 적을 값 (사건번호 → 점유표기)
const filled: Record<string, string> = {
  "2024타경12345": "X", // 공실
  "2024타경67890": "O", // 거주
  "2023타경5550": "△",  // 재방문
};
// 답사자 표기 → import 가 계산하는 occupancy
const expectedOccupancy: Record<string, "vacant" | "occupied" | "recheck"> = {
  "2024타경12345": "vacant",
  "2024타경67890": "occupied",
  "2023타경5550": "recheck",
};
// occupancy → auction_property.survey_status 로 저장되는 값 (recheck→revisit)
const expectedDbStatus: Record<string, string> = {
  "2024타경12345": "vacant",
  "2024타경67890": "occupied",
  "2023타경5550": "revisit",
};

// import-actions.extractSheets 와 동일하게 워크북 → matrix.
function toMatrix(ws: ExcelJS.Worksheet): string[][] {
  const matrix: string[][] = [];
  ws.eachRow({ includeEmpty: true }, (row) => {
    const cells: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell) => cells.push(cell.text ?? ""));
    matrix.push(cells);
  });
  return matrix;
}

describe("답사지 엑셀 라운드트립 (생성 → 입력 → 재파싱)", () => {
  it("사건번호가 보존되고 점유 O/X/△ 가 올바른 상태로 매핑된다", async () => {
    // 1) 빈 답사용지 생성
    const blank = await buildSurveySheetXlsx(rows, "인천 부평구 외");

    // 2) 답사자가 점유 칸(사건번호 매칭)을 채운다
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(blank as unknown as ArrayBuffer);
    const ws = wb.worksheets[0];
    // 사건번호 컬럼=4, 점유 컬럼=7
    ws.eachRow({ includeEmpty: true }, (row) => {
      const caseText = String(row.getCell(4).text ?? "").trim();
      if (filled[caseText]) row.getCell(7).value = filled[caseText];
    });
    const filledBuf = await wb.xlsx.writeBuffer();

    // 3) import 와 동일 파이프라인으로 재파싱
    const wb2 = new ExcelJS.Workbook();
    await wb2.xlsx.load(filledBuf);
    const { rows: parsed } = rowsFromMatrix(toMatrix(wb2.worksheets[0]));

    // 점유가 채워진 행만 import 대상(occupancy 없으면 skip)
    const normalized = parsed.map(normalizeRow).filter((n) => n.occupancy);

    // 3건 모두 매칭되어야 함
    expect(normalized.length).toBe(3);

    for (const n of normalized) {
      expect(n.caseNumber).toBeTruthy();
      const expOcc = expectedOccupancy[n.caseNumber!];
      expect(expOcc, `알 수 없는 사건번호: ${n.caseNumber}`).toBeTruthy();
      // import-actions 가 .eq("case_number", n.caseNumber).update({survey_status}) 로 쓰는 값
      expect(n.occupancy).toBe(expOcc);
      expect(SURVEY_STATUS_OF[n.occupancy as Occupancy]).toBe(expectedDbStatus[n.caseNumber!]);
    }

    // 세 사건번호가 빠짐없이 라운드트립되었는지
    const seen = new Set(normalized.map((n) => n.caseNumber));
    expect(seen).toEqual(new Set(Object.keys(filled)));
  });

  it("점유 칸이 비어 있으면 import 대상에서 제외된다(덮어쓰기 사고 방지)", async () => {
    const blank = await buildSurveySheetXlsx(rows, "인천");
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(blank as unknown as ArrayBuffer);
    const { rows: parsed } = rowsFromMatrix(toMatrix(wb.worksheets[0]));
    const withOcc = parsed.map(normalizeRow).filter((n) => n.occupancy);
    expect(withOcc.length).toBe(0); // 아무도 안 채웠으면 0건 반영
  });
});
