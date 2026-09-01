"use server";

import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { requireMutableAdmin } from "@/lib/auth-guard";
import { AppError } from "@/lib/errors";
import { revalidatePath } from "next/cache";

const patchSchema = z.object({
  status: z.enum(["received", "in_progress", "resolved", "closed"]).optional(),
  admin_memo: z.string().max(2000).optional(),
  internal_memo: z.string().max(2000).optional(),
  assigned_to: z.string().max(40).optional(),
  // "YYYY-MM-DD" 또는 "" (비우면 null 처리)
  visit_scheduled_at: z
    .string()
    .regex(/^(\d{4}-\d{2}-\d{2})?$/, "날짜 형식 오류")
    .max(10)
    .optional(),
});

export async function updateComplaint(
  id: string,
  patch: {
    status?: string;
    admin_memo?: string;
    internal_memo?: string;
    assigned_to?: string;
    visit_scheduled_at?: string;
  },
) {
  try {
    await requireMutableAdmin();
    if (!z.string().uuid().safeParse(id).success) {
      return { ok: false as const, error: "잘못된 ID 입니다." };
    }
    const parsed = patchSchema.safeParse(patch);
    if (!parsed.success) {
      return { ok: false as const, error: "입력값 오류" };
    }

    const supabase = createServiceClient();
    const update: Record<string, unknown> = { ...parsed.data };
    // 빈 날짜 문자열은 null 로 저장 (예정일 해제)
    if (parsed.data.visit_scheduled_at !== undefined) {
      update.visit_scheduled_at = parsed.data.visit_scheduled_at.trim() || null;
    }
    if (parsed.data.status === "resolved") {
      update.resolved_at = new Date().toISOString();
    }
    const { error } = await supabase.from("complaints").update(update).eq("id", id);
    if (error) {
      console.error("[updateComplaint]", error);
      return { ok: false as const, error: "저장 실패" };
    }
    revalidatePath("/admin/complaints");
    revalidatePath("/admin/dashboard");
    return { ok: true as const };
  } catch (e) {
    if (e instanceof AppError) return { ok: false as const, error: e.message };
    console.error("[updateComplaint] unhandled", e);
    return { ok: false as const, error: "처리 중 오류가 발생했습니다." };
  }
}
