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

export interface SurveyImportResult {
  ok: boolean;
  error?: string;
  region?: string;
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

// 답사 점유 → 파이프라인 판정 상태
const JUDGE_STATE: Record<string, string> = {
  vacant: "Approved",
  occupied: "OccupiedHold",
  recheck: "Recheck",
};
// inspection.occupancy(recheck) → auction_property.survey_status(revisit) 어휘 차이 보정
const SURVEY_STATUS: Record<string, string> = {
  vacant: "vacant",
  occupied: "occupied",
  recheck: "revisit",
};

async function extractFromFile(
  file: File,
): Promise<{ region: string | null; rows: SurveySheetRow[] }> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv")) {
    const text = new TextDecoder("utf-8").decode(await file.arrayBuffer());
    return extractRowsFromCsv(text);
  }
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());
  const ws = wb.worksheets[0];
  if (!ws) return { region: null, rows: [] };
  const matrix: string[][] = [];
  ws.eachRow({ includeEmpty: true }, (row) => {
    const cells: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell) => {
      cells.push(cell.text ?? "");
    });
    matrix.push(cells);
  });
  return rowsFromMatrix(matrix);
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

    const { region, rows } = await extractFromFile(file);
    if (rows.length === 0) {
      return { ...EMPTY, error: "답사표 행을 찾지 못했습니다. 헤더(사건번호·점유상태)를 확인하세요." };
    }

    const supabase = createServiceClient();
    const { data: batch } = await supabase
      .from("auction_survey_batch")
      .insert({
        name: `${region ?? "답사표"} 업로드`,
        area: region,
        status: "imported",
        total_count: rows.length,
      })
      .select("id")
      .single();
    const batchId = (batch as { id: string } | null)?.id ?? null;

    const result: SurveyImportResult = {
      ...EMPTY,
      ok: true,
      region: region ?? undefined,
      total: rows.length,
    };
    const nowIso = new Date().toISOString();
    const today = nowIso.slice(0, 10);

    for (const raw of rows) {
      const n = normalizeRow(raw);
      if (!n.caseNumber || !n.occupancy) {
        result.skipped++;
        continue;
      }
      const surveyStatus = SURVEY_STATUS[n.occupancy];
      let nextState = JUDGE_STATE[n.occupancy];
      if (n.occupancy === "vacant" && n.canOpen === "possible") nextState = "WorkPrep";

      // 사건번호는 유니크가 아님(수집 중복행 존재) → 가장 먼저 수집된 1건을 갱신.
      const { data: matchRows } = await supabase
        .from("auction_property")
        .select("id, pipeline_state")
        .eq("case_number", n.caseNumber)
        .order("created_at", { ascending: true })
        .limit(1);
      const existing = (matchRows ?? [])[0] ?? null;

      let propertyId: string;
      let fromState = "Collected";
      if (existing) {
        const ex = existing as { id: string; pipeline_state: string | null };
        propertyId = ex.id;
        fromState = ex.pipeline_state ?? "Collected";
        await supabase
          .from("auction_property")
          .update({
            door_code: n.doorCode,
            meter_check: n.meterCheck,
            survey_memo: n.memo,
            survey_status: surveyStatus,
            survey_date: today,
            survey_by: ctx.admin.name,
            address_short: n.addressShort,
            pipeline_state: nextState,
            pipeline_entered_at: nowIso,
            sheet_id: batchId,
            updated_at: nowIso,
          })
          .eq("id", propertyId);
        result.matched++;
      } else {
        const { data: created, error: insErr } = await supabase
          .from("auction_property")
          .insert({
            batch_id: batchId,
            sheet_id: batchId,
            case_number: n.caseNumber,
            address: n.address || "(주소 미상)",
            address_short: n.addressShort,
            owner_name: n.ownerName ?? "(소유자 미상)",
            creditor: n.creditor,
            creditor_type: n.creditorType,
            category: n.category,
            door_code: n.doorCode,
            meter_check: n.meterCheck,
            survey_memo: n.memo,
            survey_status: surveyStatus,
            survey_date: today,
            survey_by: ctx.admin.name,
            pipeline_state: nextState,
            pipeline_entered_at: nowIso,
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

      // 답사기록(엑셀 업로드분) — 이미 검토완료 상태로 적재
      await supabase.from("auction_inspection").insert({
        auction_property_id: propertyId,
        inspector_name: ctx.admin.name,
        requested_by_id: ctx.user.id,
        requested_by_name: ctx.admin.name,
        occupancy: n.occupancy,
        mail_status: n.mail,
        can_open: n.canOpen,
        merchandising_ready: n.merch,
        comment: n.memo ?? "(엑셀 업로드)",
        status: "reviewed",
        submitted_at: nowIso,
        reviewed_by_id: ctx.user.id,
        reviewed_by_name: ctx.admin.name,
        reviewed_at: nowIso,
      });

      await supabase.from("auction_pipeline_event").insert({
        auction_property_id: propertyId,
        from_state: fromState,
        to_state: nextState,
        action: "IMPORT_SURVEY",
        performed_by_id: ctx.user.id,
        performed_by: ctx.admin.name,
        detail: `답사표 업로드(${region ?? "-"})`,
      });

      if (n.occupancy === "vacant") result.vacant++;
      else if (n.occupancy === "occupied") result.occupied++;
      else result.recheck++;
    }

    if (batchId) {
      await supabase
        .from("auction_survey_batch")
        .update({
          vacant_count: result.vacant,
          occupied_count: result.occupied,
          revisit_count: result.recheck,
          updated_at: nowIso,
        })
        .eq("id", batchId);
    }

    revalidatePath("/admin/auction/survey");
    revalidatePath("/admin/auction/pipeline");
    revalidatePath("/admin/auction/collection");
    return result;
  } catch (e) {
    if (e instanceof AppError) return { ...EMPTY, error: e.message };
    return { ...EMPTY, error: "업로드 처리 중 오류가 발생했습니다." };
  }
}
