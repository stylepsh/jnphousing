"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { requireMutableAdmin } from "@/lib/auth-guard";
import { AppError } from "@/lib/errors";

export async function markCommissionPaid(id: string) {
  try {
    await requireMutableAdmin();
    if (!z.string().uuid().safeParse(id).success) return { ok: false as const, error: "잘못된 ID" };
    const supabase = createServiceClient();
    const { error } = await supabase
      .from("agency_commissions")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      console.error("[markCommissionPaid]", error);
      return { ok: false as const, error: "처리 실패" };
    }
    revalidatePath("/admin/commissions");
    return { ok: true as const };
  } catch (e) {
    if (e instanceof AppError) return { ok: false as const, error: e.message };
    return { ok: false as const, error: "처리 중 오류가 발생했습니다." };
  }
}
