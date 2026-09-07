import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { buildSurveySheetXlsx } from "./survey-export";
import { normalizeRow, rowsFromMatrix } from "./survey-sheet";
import type { SurveyRow } from "./survey-rows";

const rows: SurveyRow[] = [
  {
    id: "todo",
    property_no: 101,
    case_number: "2026타경10001",
    court: "수원지방법원",
    category: "다세대",
    address: "경기도 수원시 팔달구 인계동 100-1 아주 긴 주소와 건물명 101호",
    address_short: "101호",
    owner_name: "가나주택",
    creditor: "주택도시보증공사",
    survey_status: "revisit",
  },
  {
    id: "done",
    property_no: 102,
    case_number: "2026타경10002",
    court: "수원지방법원",
    category: "오피스텔",
    address: "경기도 수원시 팔달구 인계동 100-2 202호",
    address_short: "202호",
    owner_name: "가나주택",
    creditor: "서울보증보험",
    survey_status: "vacant",
  },
];

describe("답사지 XLSX 출력 형식", () => {
  it("PDF와 같은 전체 행을 담고 인쇄·완료행 표시를 안전하게 설정한다", async () => {
    const buffer = await buildSurveySheetXlsx(rows, {
      label: "수원 팔달구",
      teamName: "답사팀 A",
      printedAt: "2026-09-03",
      todoCount: 1,
      referenceCount: 1,
    });
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer as unknown as ArrayBuffer);
    const ws = wb.worksheets[0];

    expect(ws.pageSetup.orientation).toBe("landscape");
    expect(ws.pageSetup.fitToPage).toBe(true);
    expect(ws.pageSetup.fitToWidth).toBe(1);
    expect(ws.pageSetup.fitToHeight).toBe(0);
    expect(ws.pageSetup.printTitlesRow).toBe("1:2");
    expect(ws.pageSetup.printArea).toBe(`A1:N${ws.rowCount}`);

    const caseRows = ws.getRows(1, ws.rowCount)!.filter((row) =>
      ["2026타경10001", "2026타경10002"].includes(row.getCell(4).text),
    );
    expect(caseRows).toHaveLength(2);
    expect(caseRows.every((row) => row.collapsed === false && row.hidden === false)).toBe(true);
    expect(caseRows.every((row) => (row.height ?? 0) >= 30)).toBe(true);

    const done = caseRows.find((row) => row.getCell(4).text === "2026타경10002")!;
    expect(done.getCell(7).text).toBe("");
    expect(done.getCell(14).text).toContain("기존 답사완료");
    expect(done.getCell(7).dataValidation?.type).toBeUndefined();
    expect(done.getCell(1).fill).toMatchObject({ type: "pattern" });

    expect(ws.getCell("A1").text).toContain("답사팀 A");
    expect(ws.getCell("A1").text).toContain("신규 1건");
    expect(ws.getCell("A1").text).toContain("기존완료 참고 1건");

    const matrix: string[][] = [];
    ws.eachRow({ includeEmpty: true }, (row) => {
      const cells: string[] = [];
      row.eachCell({ includeEmpty: true }, (cell) => cells.push(cell.text ?? ""));
      matrix.push(cells);
    });
    const parsedDone = rowsFromMatrix(matrix).rows
      .map(normalizeRow)
      .find((row) => row.caseNumber === "2026타경10002");
    expect(parsedDone?.occupancy).toBeNull();
  });
});
