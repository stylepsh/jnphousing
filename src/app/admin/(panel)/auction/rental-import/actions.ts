"use server";
import "server-only";

import ExcelJS from "exceljs";
import { requireAdmin } from "@/lib/auth-guard";
import { AppError } from "@/lib/errors";
import {
  parseContracts,
  parseMonthly,
  summarize,
  type WorkbookSummary,
} from "@/lib/auction/rental-workbook";

export type ImportResult =
  | { ok: true; summary: WorkbookSummary; fileName: string }
  | { ok: false; error: string };

const CONTRACT_SHEET = "10_계약통합";
const MONTHLY_SHEET = "11_월별징수";
const CONFIG_SHEET = "00_설정";
const ROWS_PER_AGENCY = 100;

/** 부동산 탭 열 순서 → 통합 시트 열 순서로 재배열. 통합 시트는 맨 앞에 부동산명이 붙는다. */
function agencyRowToUnion(agency: string, cells: unknown[]): unknown[] {
  return [agency, ...cells.slice(0, 12)];
}

/** 시트를 2차원 배열로. 헤더 2줄(제목+안내)을 건너뛴다. */
function sheetRows(ws: ExcelJS.Worksheet, fromRow: number): unknown[][] {
  const out: unknown[][] = [];
  ws.eachRow({ includeEmpty: false }, (row, n) => {
    if (n < fromRow) return;
    const cells: unknown[] = [];
    row.eachCell({ includeEmpty: true }, (cell, col) => {
      cells[col - 1] = cell.value;
    });
    out.push(cells);
  });
  return out;
}

/**
 * 임대 취합 워크북 업로드 → 요약.
 *
 * DB 에 저장하지 않는다. 올린 파일을 그 자리에서 읽어 그래프·정산에만 쓴다
 * (엑셀이 원본이고, 반쯤 채워진 파일이 운영 데이터를 덮어쓰면 안 된다).
 */
export async function importRentalWorkbook(formData: FormData): Promise<ImportResult> {
  try {
    await requireAdmin();   // 조회 성격이라 readonly 도 허용

    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, error: "파일을 선택해 주세요." };
    }
    if (file.size > 5_000_000) {
      return { ok: false, error: "파일이 너무 큽니다(5MB 초과)." };
    }

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await file.arrayBuffer());

    const contractWs = wb.getWorksheet(CONTRACT_SHEET);
    if (!contractWs) {
      return {
        ok: false,
        error: `'${CONTRACT_SHEET}' 시트를 찾지 못했습니다. JNP_임대취합.xlsx 양식이 맞는지 확인해 주세요.`,
      };
    }

    let { contracts, warnings } = parseContracts(sheetRows(contractWs, 3));

    // 10_계약통합은 INDIRECT 수식이라, 엑셀이 계산해 저장한 값이 없으면 비어 보인다
    // (구글시트·리브레오피스로 편집했거나 프로그램이 만든 파일). 그럴 때는
    // 부동산 탭을 직접 읽어 같은 결과를 만든다 — 수식 캐시에 의존하지 않는다.
    if (contracts.length === 0) {
      const cfg = wb.getWorksheet(CONFIG_SHEET);
      const names: string[] = [];
      if (cfg) {
        cfg.eachRow({ includeEmpty: false }, (row) => {
          const v = row.getCell(1).value;
          const name = typeof v === "string" ? v.trim() : "";
          // 설정 시트의 안내문과 구분하기 위해 실제 시트가 있는 이름만 취한다.
          if (name && wb.getWorksheet(name)) names.push(name);
        });
      }

      const merged: unknown[][] = [];
      for (const name of names) {
        const ws = wb.getWorksheet(name);
        if (!ws) continue;
        for (let i = 3; i < 3 + ROWS_PER_AGENCY; i++) {
          const row = ws.getRow(i);
          const cells: unknown[] = [];
          row.eachCell({ includeEmpty: true }, (cell, col) => { cells[col - 1] = cell.value; });
          if (!cells[1]) continue;   // 주소 없으면 빈 행
          merged.push(agencyRowToUnion(name, cells));
        }
      }

      if (merged.length > 0) {
        const fallback = parseContracts(merged);
        contracts = fallback.contracts;
        warnings = fallback.warnings;
        warnings.push(
          `'${CONTRACT_SHEET}' 시트가 비어 있어 부동산 탭 ${names.length}곳을 직접 읽었습니다. ` +
          "엑셀에서 한 번 열었다 저장하면 통합 시트도 채워집니다.",
        );
      }
    }

    if (contracts.length === 0) {
      return { ok: false, error: "계약 데이터가 없습니다. 부동산 탭에 내용을 채운 뒤 다시 올려주세요." };
    }

    let monthly: ReturnType<typeof parseMonthly> = [];
    const monthlyWs = wb.getWorksheet(MONTHLY_SHEET);
    if (monthlyWs) {
      const header: unknown[] = [];
      monthlyWs.getRow(1).eachCell({ includeEmpty: true }, (cell, col) => {
        header[col - 1] = cell.value;
      });
      // 마지막 '합계' 행은 중복 집계되므로 제외한다.
      const rows = sheetRows(monthlyWs, 3).filter(
        (r) => String(r[0] ?? "").trim() !== "합계",
      );
      monthly = parseMonthly(header, rows);
    } else {
      warnings.push(`'${MONTHLY_SHEET}' 시트가 없어 월별 청구·미납을 계산하지 못했습니다.`);
    }

    return { ok: true, summary: summarize(contracts, monthly, warnings), fileName: file.name };
  } catch (e) {
    if (e instanceof AppError) return { ok: false, error: e.message };
    console.error("[importRentalWorkbook]", e);
    return { ok: false, error: "엑셀을 읽는 중 오류가 발생했습니다. 양식이 맞는지 확인해 주세요." };
  }
}
