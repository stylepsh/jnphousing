"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { requireMutableAdmin } from "@/lib/auth-guard";
import { AppError } from "@/lib/errors";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const designateSchema = z.object({
  owner_name: z.string().min(1).max(200),
  reason: z.string().max(300).optional().or(z.literal("")).transform((v) => v || null),
  sample_total: z.number().int().nonnegative().default(0),
  sample_vacant: z.number().int().nonnegative().default(0),
});

/** 전수조사 대상으로 지정 (owner_name 유니크 → upsert). */
export async function designateFullSurveyTarget(input: {
  owner_name: string;
  reason?: string;
  sample_total?: number;
  sample_vacant?: number;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireMutableAdmin();
    const parsed = designateSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값 오류" };
    }
    const supabase = createServiceClient();
    const { error } = await supabase
      .from("auction_full_survey_target")
      .upsert(
        {
          owner_name: parsed.data.owner_name,
          reason: parsed.data.reason,
          sample_total: parsed.data.sample_total,
          sample_vacant: parsed.data.sample_vacant,
          status: "pending",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "owner_name" },
      );
    if (error) return { ok: false, error: error.message };
    revalidatePath("/admin/auction/judgment");
    return { ok: true };
  } catch (e) {
    if (e instanceof AppError) return { ok: false, error: e.message };
    return { ok: false, error: "처리 중 오류가 발생했습니다." };
  }
}

const statusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["pending", "collecting", "done", "dropped"]),
  note: z.string().max(500).optional().or(z.literal("")).transform((v) => v || null),
});

/** 전수조사 대상 진행상태 변경. */
export async function updateFullSurveyTarget(input: {
  id: string;
  status: string;
  note?: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireMutableAdmin();
    const parsed = statusSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값 오류" };
    }
    const { id, status, note } = parsed.data;
    const supabase = createServiceClient();
    const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
    if (note !== null) patch.note = note;
    const { error } = await supabase.from("auction_full_survey_target").update(patch).eq("id", id);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/admin/auction/judgment");
    return { ok: true };
  } catch (e) {
    if (e instanceof AppError) return { ok: false, error: e.message };
    return { ok: false, error: "처리 중 오류가 발생했습니다." };
  }
}

/** 전수조사 대상 명단에서 제거. */
export async function removeFullSurveyTarget(id: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireMutableAdmin();
    if (!z.string().uuid().safeParse(id).success) return { ok: false, error: "잘못된 대상" };
    const supabase = createServiceClient();
    const { error } = await supabase.from("auction_full_survey_target").delete().eq("id", id);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/admin/auction/judgment");
    return { ok: true };
  } catch (e) {
    if (e instanceof AppError) return { ok: false, error: e.message };
    return { ok: false, error: "처리 중 오류가 발생했습니다." };
  }
}
