"use server";

import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth-guard";
import { AppError } from "@/lib/errors";
import { revalidatePath } from "next/cache";

const patchSchema = z.object({
  status: z.enum(["new", "contacted", "closed"]).optional(),
  admin_memo: z.string().max(2000).optional(),
});

export async function updateInquiry(
  id: string,
  patch: { status?: string; admin_memo?: string },
) {
  try {
    await requireAdmin();
    if (!z.string().uuid().safeParse(id).success) {
      return { ok: false as const, error: "잘못된 ID 입니다." };
    }
    const parsed = patchSchema.safeParse(patch);
    if (!parsed.success) return { ok: false as const, error: "입력값 오류" };

    const supabase = createServiceClient();
    const { error } = await supabase.from("inquiries").update(parsed.data).eq("id", id);
    if (error) {
      console.error("[updateInquiry]", error);
      return { ok: false as const, error: "저장 실패" };
    }
    revalidatePath("/admin/inquiries");
    revalidatePath("/admin/dashboard");
    return { ok: true as const };
  } catch (e) {
    if (e instanceof AppError) return { ok: false as const, error: e.message };
    console.error("[updateInquiry] unhandled", e);
    return { ok: false as const, error: "처리 중 오류가 발생했습니다." };
  }
}
