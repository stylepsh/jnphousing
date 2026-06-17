"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth-guard";
import { AppError } from "@/lib/errors";
import { revalidatePath } from "next/cache";
import { z } from "zod";

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
    await requireAdmin();
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

    revalidatePath("/admin/auction/survey");
    revalidatePath("/admin/auction/collection");
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
  survey_by?: string;
  survey_date?: string;
}): Promise<BulkSurveyResult> {
  try {
    await requireAdmin();
    const parsed = bulkSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값 오류" };
    }
    const vacant = Array.from(new Set(parsed.data.vacant));
    const occupied = Array.from(new Set(parsed.data.occupied));
    if (vacant.length === 0 && occupied.length === 0) {
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

    const allInput = [...vacant, ...occupied];
    const unmatched = allInput.filter((n) => !seqToId.has(n));

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

    revalidatePath("/admin/auction/survey");
    revalidatePath("/admin/auction/collection");
    revalidatePath("/admin/auction/judgment");
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
