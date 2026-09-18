"use server";
import "server-only";

import ExcelJS from "exceljs";
import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { requireMutableAdmin } from "@/lib/auth-guard";
import { AppError } from "@/lib/errors";
import {
  extractRowsFromCsv,
  rowsFromMatrix,
  normalizeRow,
  occupancyFromSheetName,
  type SurveySheetRow,
} from "@/lib/auction/survey-sheet";
import { SURVEY_STATUS_OF, JUDGE_STATE_OF, type Occupancy } from "@/lib/auction/occupancy";
import { shouldSkipSurveyImport } from "@/lib/auction/survey-import-policy";

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
  /** 저장에 실패해 다시 올려야 하는 행(사건번호 또는 주소). */
  failed?: string[];
}

const EMPTY: SurveyImportResult = {
  ok: false, total: 0, matched: 0, created: 0, vacant: 0, occupied: 0, recheck: 0, skipped: 0,
};

interface SheetData {
  region: string | null;
  rows: SurveySheetRow[];
  /** 탭 이름(공실/거주/재방문)으로 점유를 정한 정리본 탭 — 지역 정보가 없다. */
  byTabName?: boolean;
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
    // 점유 칸이 있는 원본 답사지를 우선, 없으면 탭 이름(공실/거주/재방문)으로 판정.
    let parsed = rowsFromMatrix(matrix);
    let byTabName = false;
    const tabOcc = occupancyFromSheetName(ws.name);
    if (!parsed.rows.length && tabOcc) {
      parsed = rowsFromMatrix(matrix, tabOcc);
      byTabName = parsed.rows.length > 0;
    }
    if (!parsed.rows.length) continue;
    sheets.push({ region: byTabName ? null : parsed.region ?? ws.name, rows: parsed.rows, byTabName });
  }
  return sheets;
}

// 답사표 첫 줄 배너가 통째로 지역명으로 잡히면 배치 이름이 장황해진다.
// 괄호 안 지역만 뽑고(없으면 앞부분), 군더더기(· 이후)를 잘라 간결화한다.
function cleanRegionLabel(raw: string | null): string | null {
  if (!raw) return null;
  const paren = raw.match(/\(([^)]+)\)/);
  let s = (paren ? paren[1] : raw).replace(/·.*$/, "").trim();
  if (s.length > 60) s = s.slice(0, 60).trim();
  return s || null;
}

export async function importSurveySheet(formData: FormData): Promise<SurveyImportResult> {
  try {
    const ctx = await requireMutableAdmin();
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
      const region = cleanRegionLabel(sheet.region);
      if (region) result.regions!.push(region);

      const { data: batch } = await supabase
        .from("auction_survey_batch")
        .insert({
          name: `${region ?? file.name.replace(/\.[^.]+$/, "")} 업로드`,
          area: region,
          status: "completed",
          total_count: sheet.rows.length,
        })
        .select("id")
        .single();
      const batchId = (batch as { id: string } | null)?.id ?? null;
      let bVacant = 0, bOccupied = 0, bRecheck = 0;

      // 행마다 case_number 로 기존 물건을 조회하면 500행 업로드에 500회 왕복이 된다.
      // 시트의 사건번호를 모아 한 번에(청크로) 조회한 뒤 메모리에서 매칭한다.
      const normalized = sheet.rows.map((raw) => normalizeRow(raw));
      const caseNumbers = [...new Set(
        normalized.map((n) => n.caseNumber).filter((c): c is string => !!c),
      )];
      type Existing = { id: string; pipeline_state: string | null; survey_status: string | null };
      const existingByCase = new Map<string, Existing>();
      // 답사지 번호(property_no)가 있으면 그게 가장 정확하다(같은 사건번호에 물건 여러 개인 경우).
      const existingByNo = new Map<number, Existing & { case_number: string }>();
      const propertyNos = [...new Set(normalized.map((n) => n.propertyNo).filter((v): v is number => v != null))];
      for (let i = 0; i < propertyNos.length; i += 200) {
        const { data: noRows, error: noErr } = await supabase
          .from("auction_property")
          .select("id, property_no, case_number, pipeline_state, survey_status")
          .in("property_no", propertyNos.slice(i, i + 200));
        if (noErr) {
          console.error("[importSurveySheet] 물건번호 조회 실패", noErr);
          return { ...EMPTY, error: "기존 물건 조회에 실패했습니다. 다시 시도해 주세요." };
        }
        for (const r of (noRows ?? []) as (Existing & { property_no: number; case_number: string })[]) existingByNo.set(r.property_no, r);
      }
      for (let i = 0; i < caseNumbers.length; i += 200) {
        const { data: matchRows, error: matchErr } = await supabase
          .from("auction_property")
          .select("id, case_number, pipeline_state, survey_status")
          .in("case_number", caseNumbers.slice(i, i + 200))
          .order("created_at", { ascending: true });
        if (matchErr) {
          console.error("[importSurveySheet] 기존 물건 조회 실패", matchErr);
          return { ...EMPTY, error: "기존 물건 조회에 실패했습니다. 다시 시도해 주세요." };
        }
        // 같은 사건번호에 거부·차단 행과 활성 행이 함께 있으면 활성 행을 쓴다
        // (거부해 둔 물건이 업로드로 되살아나지 않게 — 기존 동작 유지).
        const isActive = (st: string | null) => st !== "rejected" && st !== "blocked";
        for (const r of (matchRows ?? []) as {
          id: string; case_number: string; pipeline_state: string | null; survey_status: string | null;
        }[]) {
          const prev = existingByCase.get(r.case_number);
          if (!prev) {
            existingByCase.set(r.case_number, r);
          } else if (isActive(r.survey_status) && !isActive(prev.survey_status)) {
            existingByCase.set(r.case_number, r);
          }
        }
      }

      // 부분 실패 집계 — 어떤 행이 왜 빠졌는지 사용자에게 알린다.
      const failures: string[] = [];

      for (const raw of sheet.rows) {
        const n = normalizeRow(raw);
        if (!n.occupancy) {
          result.skipped++;
          continue;
        }
        const surveyStatus = SURVEY_STATUS_OF[n.occupancy as Occupancy] ?? n.occupancy;
        let nextState = JUDGE_STATE_OF[n.occupancy as Occupancy] ?? "Approved";
        if (n.occupancy === "vacant" && n.canOpen === "possible") nextState = "WorkPrep";

        // 사건번호가 있으면 위에서 일괄 조회한 결과에서 매칭한다(왕복 0회).
        // 구형 표준용지의 '방문순번'(1,2,3…)이 물건번호로 오인되지 않게, 사건번호가 적혀 있으면 일치할 때만 번호 매칭.
        const byNo = n.propertyNo != null ? existingByNo.get(n.propertyNo) : undefined;
        const noTrusted = byNo && (!n.caseNumber || byNo.case_number === n.caseNumber) ? byNo : undefined;
        const existing = noTrusted ?? (n.caseNumber ? existingByCase.get(n.caseNumber) ?? null : null);
        // 동일 답사표를 다시 올려도 완료 판정·검사·이벤트를 중복 생성하지 않는다.
        // 완료값을 정정할 때는 검토 화면의 명시적 상태 변경 기능을 사용한다.
        if (existing && shouldSkipSurveyImport(existing.survey_status)) {
          result.skipped++;
          continue;
        }
        result.total++;

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
              // 정리본 탭은 지역이 없으니 원래 수집 배치(지역)를 유지한다.
              ...(sheet.byTabName ? {} : { batch_id: batchId }),
              updated_at: nowIso,
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
            console.error("[importSurveySheet] 물건 생성 실패", { caseNumber: n.caseNumber, insErr });
            failures.push(n.caseNumber ?? n.address ?? "(사건번호 미상)");
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

      if (failures.length > 0) {
        // 실패한 행만 다시 올리면 되도록 사건번호를 그대로 돌려준다.
        result.failed = (result.failed ?? []).concat(failures);
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
