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
