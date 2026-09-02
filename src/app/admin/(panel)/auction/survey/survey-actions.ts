"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin, requireMutableAdmin, type AdminContext } from "@/lib/auth-guard";
import { AppError } from "@/lib/errors";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { type PipelineState, stateLabel } from "@/lib/auction/pipeline/state-machine";

// 간이 답사 결과 → 파이프라인 단계 매핑.
//   공실 = 바로 상품화 트랙(상품화준비), 거주 = 거주중보관(분기), 재방문 = 재확인필요.
//   pending/skip 은 파이프라인을 건드리지 않는다(아직 미정/수동 제외 영역).
const SURVEY_TO_PIPELINE: Partial<Record<string, PipelineState>> = {
  vacant: "WorkPrep",
  occupied: "OccupiedHold",
  revisit: "Recheck",
};
const SURVEY_LABEL: Record<string, string> = { vacant: "공실", occupied: "거주", revisit: "재방문" };

// 간이 답사가 파이프라인을 자동 이동시켜도 되는 "초기" 단계.
//   이미 상품화/임대로 진행됐거나 제외된 물건은 답사 상태를 고쳐도 후퇴시키지 않는다.
const SYNCABLE_STATES: string[] = [
  "Collected",
  "Selected",
  "Inspecting",
  "Reviewing",
  "Approved",
  "Recheck",
  "OccupiedHold",
];

/**
 * 답사결과 저장에 맞춰 파이프라인 단계를 자동 동기화.
 *   공실 저장 → 상품화준비(WorkPrep)로 올려 "⑤ 공실·상품화" 보드에 바로 등장.
 *   단, 이미 상품화/임대로 진행됐거나 제외된 물건은 후퇴시키지 않는다(초기 단계만 이동).
 *   각 이동은 auction_pipeline_event 에 감사로그로 남긴다.
 */
async function syncPipelineForStatus(
  supabase: ReturnType<typeof createServiceClient>,
  ctx: AdminContext,
  ids: string[],
  surveyStatus: string,
): Promise<void> {
  const target = SURVEY_TO_PIPELINE[surveyStatus];
  if (!target || ids.length === 0) return;

  const { data: rows } = await supabase
    .from("auction_property")
    .select("id, pipeline_state")
    .in("id", ids);
  const movable = ((rows ?? []) as { id: string; pipeline_state: string | null }[]).filter((r) => {
    const cur = r.pipeline_state ?? "Collected";
    return SYNCABLE_STATES.includes(cur) && cur !== target;
  });
  if (movable.length === 0) return;

  const ts = new Date().toISOString();
  await supabase
    .from("auction_property")
    .update({ pipeline_state: target, pipeline_entered_at: ts })
    .in("id", movable.map((r) => r.id));

  await supabase.from("auction_pipeline_event").insert(
    movable.map((r) => ({
      auction_property_id: r.id,
      from_state: r.pipeline_state ?? "Collected",
      to_state: target,
      action: "SURVEY_SYNC",
      performed_by_id: ctx.user.id,
      performed_by: ctx.admin.name,
      detail: `답사결과(${SURVEY_LABEL[surveyStatus] ?? surveyStatus}) → ${stateLabel(target)} 자동 이동`,
    })),
  );
}

const surveySchema = z.object({
  id: z.string().uuid(),
  survey_status: z.enum(["pending", "vacant", "occupied", "revisit", "skip"]),
  survey_date: z.string().optional().or(z.literal("")).transform((v) => v || null),
  survey_by: z.string().max(100).optional().or(z.literal("")).transform((v) => v || null),
  door_code: z.string().max(100).optional().or(z.literal("")).transform((v) => v || null),
  survey_memo: z.string().max(2000).optional().or(z.literal("")).transform((v) => v || null),
});

/** 답사 결과 저장 (상태/답사자/현관비번/메모). */
export async function updateSurveyResult(input: {
  id: string;
  survey_status: string;
  survey_date?: string;
  survey_by?: string;
  door_code?: string;
  survey_memo?: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const ctx = await requireMutableAdmin();
    const parsed = surveySchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값 오류" };
    }
    const { id, ...rest } = parsed.data;

    const supabase = createServiceClient();
    const { error } = await supabase
      .from("auction_property")
      .update({ ...rest, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return { ok: false, error: error.message };

    // 공실 → 상품화준비 등 파이프라인 자동 동기화 (①)
    await syncPipelineForStatus(supabase, ctx, [id], parsed.data.survey_status);

    revalidatePath("/admin/auction/survey");
    revalidatePath("/admin/auction/collection");
    revalidatePath("/admin/auction/pipeline");
    revalidatePath("/admin/auction/pipeline/vacant");
    revalidatePath("/admin/auction/pipeline/occupied");
    return { ok: true };
  } catch (e) {
    if (e instanceof AppError) return { ok: false, error: e.message };
    return { ok: false, error: "처리 중 오류가 발생했습니다." };
  }
}

// ─── 물건번호(property_no) 기반 일괄 입력 ──────────────────────────────
// 종이 답사지가 돌아오면 사진/OCR 없이 "공실 번호·거주 번호"만 입력.
// 번호는 물건 전역 고유번호라 발급을 고를 필요 없이 번호만으로 전역 매칭한다.
// "나머지 전부 거주(fill_rest)"만은 "나머지"의 범위가 필요하므로 발급(sheet)을 고른다.

const bulkSchema = z.object({
  // 일반 입력은 발급 불필요. fill_rest 일 때만 "나머지" 범위로 발급을 고른다.
  sheet_id: z.string().uuid().optional().or(z.literal("")).transform((v) => v || null),
  vacant: z.array(z.number().int().positive()).default([]),
  occupied: z.array(z.number().int().positive()).default([]),
  fill_rest: z.boolean().default(false), // 공실로 지정 안 된 나머지를 전부 거주로 처리
  survey_by: z.string().max(100).optional().or(z.literal("")).transform((v) => v || null),
  survey_date: z.string().optional().or(z.literal("")).transform((v) => v || null),
});

export interface BulkSurveyResult {
  ok: boolean;
  error?: string;
  vacantUpdated?: number;
  occupiedUpdated?: number;
  unmatched?: number[]; // 존재하지 않는(또는 발급에 없는) 물건번호
  conflicts?: number[]; // 공실·거주 양쪽에 동시 입력된 번호
}

export async function bulkSurveyByNumber(input: {
  sheet_id?: string | null;
  vacant: number[];
  occupied: number[];
  fill_rest?: boolean;
  survey_by?: string;
  survey_date?: string;
}): Promise<BulkSurveyResult> {
  try {
    const ctx = await requireMutableAdmin();
    const parsed = bulkSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값 오류" };
    }
    const fillRest = parsed.data.fill_rest;
    const vacant = Array.from(new Set(parsed.data.vacant));
    let occupied = Array.from(new Set(parsed.data.occupied));
    if (vacant.length === 0 && occupied.length === 0 && !fillRest) {
      return { ok: false, error: "입력된 번호가 없습니다." };
    }
    const conflicts = vacant.filter((n) => occupied.includes(n));
    if (conflicts.length > 0) {
      return { ok: false, error: `공실·거주에 같은 번호가 있습니다: ${conflicts.join(", ")}`, conflicts };
    }

    const supabase = createServiceClient();

    // 물건번호(property_no) → id 매핑
    const noToId = new Map<number, string>();
    let unmatched: number[];

    if (fillRest) {
      // "나머지 전부 거주" — 범위가 필요하므로 발급(sheet) 단위로 한정.
      if (!parsed.data.sheet_id) {
        return { ok: false, error: "나머지 자동 거주는 어느 답사지(발급)인지 골라야 합니다." };
      }
      const { data: setRows } = await supabase
        .from("auction_property")
        .select("id, property_no")
        .eq("sheet_id", parsed.data.sheet_id);
      for (const r of (setRows ?? []) as { id: string; property_no: number | null }[]) {
        if (typeof r.property_no === "number") noToId.set(r.property_no, r.id);
      }
      if (noToId.size === 0) {
        return { ok: false, error: "선택한 발급의 물건을 찾을 수 없습니다." };
      }
      // 공실로 지정 안 된 이 발급의 모든 번호를 거주로
      const vacantSet = new Set(vacant);
      occupied = Array.from(noToId.keys()).filter((n) => !vacantSet.has(n));
      unmatched = vacant.filter((n) => !noToId.has(n)); // 이 발급에 없는 공실번호
    } else {
      // 일반 입력 — 입력한 번호만 전역 매칭 (발급 무관)
      const typed = Array.from(new Set([...vacant, ...occupied]));
      const { data: rows } = await supabase
        .from("auction_property")
        .select("id, property_no")
        .in("property_no", typed);
      for (const r of (rows ?? []) as { id: string; property_no: number | null }[]) {
        if (typeof r.property_no === "number") noToId.set(r.property_no, r.id);
      }
      unmatched = typed.filter((n) => !noToId.has(n)); // 존재하지 않는 물건번호
    }

    const surveyDate = parsed.data.survey_date ?? new Date().toISOString().slice(0, 10);
    const surveyBy = parsed.data.survey_by;

    async function applyStatus(nos: number[], status: "vacant" | "occupied"): Promise<number> {
      const ids = nos.map((n) => noToId.get(n)).filter((v): v is string => !!v);
      if (ids.length === 0) return 0;
      const patch: Record<string, unknown> = {
        survey_status: status,
        survey_date: surveyDate,
        updated_at: new Date().toISOString(),
      };
      if (surveyBy) patch.survey_by = surveyBy;
      const { error } = await supabase.from("auction_property").update(patch).in("id", ids);
      if (error) throw new AppError("INTERNAL", error.message, { status: 500 });
      return ids.length;
    }

    const vacantUpdated = await applyStatus(vacant, "vacant");
    const occupiedUpdated = await applyStatus(occupied, "occupied");

    // 공실 → 상품화준비, 거주 → 거주중보관 파이프라인 자동 동기화 (①)
    const vacantIds = vacant.map((n) => noToId.get(n)).filter((v): v is string => !!v);
    const occupiedIds = occupied.map((n) => noToId.get(n)).filter((v): v is string => !!v);
    await syncPipelineForStatus(supabase, ctx, vacantIds, "vacant");
    await syncPipelineForStatus(supabase, ctx, occupiedIds, "occupied");

    revalidatePath("/admin/auction/survey");
    revalidatePath("/admin/auction/collection");
    revalidatePath("/admin/auction/judgment");
    revalidatePath("/admin/auction/pipeline");
    revalidatePath("/admin/auction/pipeline/vacant");
    revalidatePath("/admin/auction/pipeline/occupied");
    return { ok: true, vacantUpdated, occupiedUpdated, unmatched };
  } catch (e) {
    if (e instanceof AppError) return { ok: false, error: e.message };
    return { ok: false, error: "처리 중 오류가 발생했습니다." };
  }
}

// ─── 배치 상태 수동 변경 ─────────────────────────────────────────────────────

const batchStatusSchema = z.object({
  batchId: z.string().uuid(),
  status: z.enum(["created", "assigned", "in_progress", "completed"]),
});

/** 배치 상태를 수동으로 변경한다. completed 로 바꾸면 closed_at 을 세팅하고, 되돌리면 null 로 초기화한다. */
export async function setBatchStatus(
  batchId: string,
  status: "created" | "assigned" | "in_progress" | "completed",
): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireMutableAdmin();
    const parsed = batchStatusSchema.safeParse({ batchId, status });
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값 오류" };
    }

    const supabase = createServiceClient();
    const patch: Record<string, unknown> = {
      status: parsed.data.status,
      updated_at: new Date().toISOString(),
    };
    if (parsed.data.status === "completed") {
      patch.closed_at = new Date().toISOString();
    } else {
      patch.closed_at = null;
    }

    const { error } = await supabase
      .from("auction_survey_batch")
      .update(patch)
      .eq("id", parsed.data.batchId);
    if (error) return { ok: false, error: error.message };

    revalidatePath("/admin/auction/survey");
    return { ok: true };
  } catch (e) {
    if (e instanceof AppError) return { ok: false, error: e.message };
    return { ok: false, error: "처리 중 오류가 발생했습니다." };
  }
}

export interface OpenSheet {
  id: string;
  region_label: string;
  printed_at: string;
  total_count: number;
  entered_count: number; // 그 발급분 중 이미 답사 결과가 입력된 건수
}

/** 최근 발급된 답사지 목록 (일괄입력 드롭다운용). */
export async function getOpenSheets(): Promise<OpenSheet[]> {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const { data: sheets } = await supabase
      .from("auction_survey_sheet")
      .select("id, region_label, printed_at, total_count")
      .order("printed_at", { ascending: false })
      .limit(30);
    const list = (sheets ?? []) as Omit<OpenSheet, "entered_count">[];
    if (list.length === 0) return [];

    // 발급별 입력완료(미답사 아님) 건수 — 발급당 조회(N+1) 대신 한 번에 집계.
    const sheetIds = list.map((s) => s.id);
    const { data: enteredRows } = await supabase
      .from("auction_property")
      .select("sheet_id")
      .in("sheet_id", sheetIds)
      .neq("survey_status", "pending");
    const enteredBySheet = new Map<string, number>();
    for (const r of (enteredRows ?? []) as { sheet_id: string | null }[]) {
      if (r.sheet_id) enteredBySheet.set(r.sheet_id, (enteredBySheet.get(r.sheet_id) ?? 0) + 1);
    }
    return list.map((s) => ({ ...s, entered_count: enteredBySheet.get(s.id) ?? 0 }));
  } catch {
    return [];
  }
}
