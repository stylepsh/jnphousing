"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin, type AdminContext } from "@/lib/auth-guard";
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
    const ctx = await requireAdmin();
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

// ─── 번호 기반 일괄 입력 (발급 sheet 단위) ────────────────────────────
// 종이 답사지가 돌아오면 사진/OCR 없이 "공실 번호·거주 번호"만 입력.
// 여러 지역 발급분이 동시에 미회수 상태로 존재하므로, 어느 발급(sheet)인지
// 골라서 그 sheet의 survey_seq로만 매칭한다(번호 충돌 차단).

const bulkSchema = z.object({
  sheet_id: z.string().uuid(),
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
  unmatched?: number[]; // 이 발급에 없는 번호
  conflicts?: number[]; // 공실·거주 양쪽에 동시 입력된 번호
}

export async function bulkSurveyByNumber(input: {
  sheet_id: string;
  vacant: number[];
  occupied: number[];
  fill_rest?: boolean;
  survey_by?: string;
  survey_date?: string;
}): Promise<BulkSurveyResult> {
  try {
    const ctx = await requireAdmin();
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

    // 선택한 발급(sheet)의 번호→id 매핑
    const { data: setRows } = await supabase
      .from("auction_property")
      .select("id, survey_seq")
      .eq("sheet_id", parsed.data.sheet_id);
    const seqToId = new Map<number, string>();
    for (const r of (setRows ?? []) as { id: string; survey_seq: number | null }[]) {
      if (typeof r.survey_seq === "number") seqToId.set(r.survey_seq, r.id);
    }
    if (seqToId.size === 0) {
      return { ok: false, error: "선택한 발급의 물건을 찾을 수 없습니다." };
    }

    // 미일치 번호는 입력한 것 기준으로 판정 (fill_rest 면 거주는 자동이라 공실만 검사)
    const typed = fillRest ? vacant : [...vacant, ...occupied];
    const unmatched = typed.filter((n) => !seqToId.has(n));

    // "나머지 전부 거주" — 이 발급에서 공실로 지정되지 않은 모든 번호를 거주로
    if (fillRest) {
      const vacantSet = new Set(vacant);
      occupied = Array.from(seqToId.keys()).filter((n) => !vacantSet.has(n));
    }

    const surveyDate = parsed.data.survey_date ?? new Date().toISOString().slice(0, 10);
    const surveyBy = parsed.data.survey_by;

    async function applyStatus(seqs: number[], status: "vacant" | "occupied"): Promise<number> {
      const ids = seqs.map((n) => seqToId.get(n)).filter((v): v is string => !!v);
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
    const vacantIds = vacant.map((n) => seqToId.get(n)).filter((v): v is string => !!v);
    const occupiedIds = occupied.map((n) => seqToId.get(n)).filter((v): v is string => !!v);
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

    // 발급별 입력완료(미답사 아님) 건수
    const out: OpenSheet[] = [];
    for (const s of list) {
      const { count } = await supabase
        .from("auction_property")
        .select("id", { count: "exact", head: true })
        .eq("sheet_id", s.id)
        .neq("survey_status", "pending");
      out.push({ ...s, entered_count: count ?? 0 });
    }
    return out;
  } catch {
    return [];
  }
}
