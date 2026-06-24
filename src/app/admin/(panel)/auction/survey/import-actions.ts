"use server";
import "server-only";

import ExcelJS from "exceljs";
import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth-guard";
import { AppError } from "@/lib/errors";
import {
  extractRowsFromCsv,
  rowsFromMatrix,
  normalizeRow,
  type SurveySheetRow,
} from "@/lib/auction/survey-sheet";
import { SURVEY_STATUS_OF, JUDGE_STATE_OF, type Occupancy } from "@/lib/auction/occupancy";

export interface SurveyImportResult {
  ok: boolean;
  error?: string;
  region?: string;
  regions?: string[];
  total: number;
  matched: number;
  created: number;
  vacant: number;
  occupied: number;
  recheck: number;
  skipped: number;
}

const EMPTY: SurveyImportResult = {
  ok: false, total: 0, matched: 0, created: 0, vacant: 0, occupied: 0, recheck: 0, skipped: 0,
};

interface SheetData {
  region: string | null;
  rows: SurveySheetRow[];
}

// 파일 → 시트별 데이터 (xlsx는 시트=지역, csv는 1개)
async function extractSheets(file: File): Promise<SheetData[]> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv")) {
    const text = new TextDecoder("utf-8").decode(await file.arrayBuffer());
    const { region, rows } = extractRowsFromCsv(text);
    return rows.length ? [{ region, rows }] : [];
  }
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());
  const sheets: SheetData[] = [];
  for (const ws of wb.worksheets) {
    const matrix: string[][] = [];
    ws.eachRow({ includeEmpty: true }, (row) => {
      const cells: string[] = [];
      row.eachCell({ includeEmpty: true }, (cell) => {
        cells.push(cell.text ?? "");
      });
      matrix.push(cells);
    });
    const { region, rows } = rowsFromMatrix(matrix);
    if (rows.length) sheets.push({ region: region ?? ws.name, rows });
  }
  return sheets;
}

export async function importSurveySheet(formData: FormData): Promise<SurveyImportResult> {
  try {
    const ctx = await requireAdmin();
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return { ...EMPTY, error: "파일이 없습니다." };
    }
    if (file.size > 5_000_000) {
      return { ...EMPTY, error: "파일이 너무 큽니다(5MB 초과)." };
    }

    const sheets = await extractSheets(file);
    if (sheets.length === 0) {
      return { ...EMPTY, error: "답사표 행을 찾지 못했습니다. 헤더(점유 상태·주소)를 확인하세요." };
    }

    const supabase = createServiceClient();
    const result: SurveyImportResult = { ...EMPTY, ok: true, total: 0, regions: [] };
    const nowIso = new Date().toISOString();
    const today = nowIso.slice(0, 10);

    for (const sheet of sheets) {
      const region = sheet.region;
      if (region) result.regions!.push(region);

      const { data: batch } = await supabase
        .from("auction_survey_batch")
        .insert({
          name: `${region ?? "답사표"} 업로드`,
          area: region,
          status: "completed",
          total_count: sheet.rows.length,
        })
        .select("id")
        .single();
      const batchId = (batch as { id: string } | null)?.id ?? null;
      let bVacant = 0, bOccupied = 0, bRecheck = 0;

      for (const raw of sheet.rows) {
        const n = normalizeRow(raw);
        if (!n.occupancy) {
          result.skipped++;
          continue;
        }
        result.total++;
        const surveyStatus = SURVEY_STATUS_OF[n.occupancy as Occupancy] ?? n.occupancy;
        let nextState = JUDGE_STATE_OF[n.occupancy as Occupancy] ?? "Approved";
        if (n.occupancy === "vacant" && n.canOpen === "possible") nextState = "WorkPrep";

        // 사건번호 있을 때만 기존 풀과 매칭(최초 수집건). 없으면 신규.
        let existing: { id: string; pipeline_state: string | null } | null = null;
        if (n.caseNumber) {
          const { data: matchRows } = await supabase
            .from("auction_property")
            .select("id, pipeline_state")
            .eq("case_number", n.caseNumber)
            .order("created_at", { ascending: true })
            .limit(1);
          existing = (matchRows ?? [])[0] ?? null;
        }

        let propertyId: string;
        let fromState = "Collected";
        if (existing) {
          propertyId = existing.id;
          fromState = existing.pipeline_state ?? "Collected";
          await supabase
            .from("auction_property")
            .update({
              door_code: n.doorCode, meter_check: n.meterCheck, survey_memo: n.memo,
              survey_status: surveyStatus, survey_date: today, survey_by: ctx.admin.name,
              address_short: n.addressShort, pipeline_state: nextState, pipeline_entered_at: nowIso,
              batch_id: batchId, updated_at: nowIso,
            })
            .eq("id", propertyId);
          result.matched++;
        } else {
          const { data: created, error: insErr } = await supabase
            .from("auction_property")
            .insert({
              batch_id: batchId, case_number: n.caseNumber ?? "(미상)",
              address: n.address || "(주소 미상)", address_short: n.addressShort,
              owner_name: n.ownerName ?? "(소유자 미상)", creditor: n.creditor,
              creditor_type: n.creditorType, category: n.category,
              door_code: n.doorCode, meter_check: n.meterCheck, survey_memo: n.memo,
              survey_status: surveyStatus, survey_date: today, survey_by: ctx.admin.name,
              pipeline_state: nextState, pipeline_entered_at: nowIso,
            })
            .select("id")
            .single();
          if (insErr || !created) {
            result.skipped++;
            continue;
          }
          propertyId = (created as { id: string }).id;
          result.created++;
        }

        await supabase.from("auction_inspection").insert({
          auction_property_id: propertyId, inspector_name: ctx.admin.name,
          requested_by_id: ctx.user.id, requested_by_name: ctx.admin.name,
          occupancy: n.occupancy, mail_status: n.mail, can_open: n.canOpen,
          merchandising_ready: n.merch, comment: n.memo ?? "(엑셀 업로드)",
          status: "reviewed", submitted_at: nowIso,
          reviewed_by_id: ctx.user.id, reviewed_by_name: ctx.admin.name, reviewed_at: nowIso,
        });
        await supabase.from("auction_pipeline_event").insert({
          auction_property_id: propertyId, from_state: fromState, to_state: nextState,
          action: "IMPORT_SURVEY", performed_by_id: ctx.user.id, performed_by: ctx.admin.name,
          detail: `답사표 업로드(${region ?? "-"})`,
        });

        if (n.occupancy === "vacant") { result.vacant++; bVacant++; }
        else if (n.occupancy === "occupied") { result.occupied++; bOccupied++; }
        else { result.recheck++; bRecheck++; }
      }

      if (batchId) {
        await supabase
          .from("auction_survey_batch")
          .update({ vacant_count: bVacant, occupied_count: bOccupied, revisit_count: bRecheck, updated_at: nowIso })
          .eq("id", batchId);
      }
    }

    result.region = result.regions && result.regions.length ? result.regions.join(", ") : undefined;
    revalidatePath("/admin/auction/survey");
    revalidatePath("/admin/auction/pipeline");
    revalidatePath("/admin/auction/collection");
    return result;
  } catch (e) {
    if (e instanceof AppError) return { ...EMPTY, error: e.message };
    return { ...EMPTY, error: "업로드 처리 중 오류가 발생했습니다." };
  }
}
