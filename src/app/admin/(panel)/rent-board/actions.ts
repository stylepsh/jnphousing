"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin, requireMutableAdmin } from "@/lib/auth-guard";
import { AppError } from "@/lib/errors";
import { SHEET_TAG } from "@/lib/sheet/source";

const logSchema = z.object({
  unit_key: z.string().min(1).max(300),
  building: z.string().max(200).optional(),
  unit: z.string().max(50).optional(),
  tenant_name: z.string().max(200).optional(),
  outcome: z.enum(["called", "no_answer", "promised", "moving_out", "other"]),
  promise_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")).transform((v) => v || null),
  memo: z.string().max(2000).optional().or(z.literal("")).transform((v) => v || null),
});

const fail = (e: unknown) => ({
  ok: false as const,
  error: e instanceof AppError ? e.message : "처리 중 오류가 발생했습니다.",
});

export async function addCallLog(formData: FormData) {
  try {
    const ctx = await requireMutableAdmin();
    const parsed = logSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "입력값 오류" };
    if (parsed.data.outcome === "promised" && !parsed.data.promise_date) {
      return { ok: false as const, error: "입금 약속이면 약속일을 넣어 주세요." };
    }
    const { error } = await createServiceClient().from("rent_call_logs").insert({
      ...parsed.data,
      created_by: ctx.user.id,
      author_name: ctx.admin.name,
    });
    if (error) return { ok: false as const, error: error.code === "42P01" ? "045 마이그레이션을 먼저 실행하세요." : error.message };
    revalidatePath("/admin/rent-board");
    return { ok: true as const };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteCallLog(id: string) {
  try {
    await requireMutableAdmin();
    const { error } = await createServiceClient().from("rent_call_logs").delete().eq("id", z.string().uuid().parse(id));
    if (error) return { ok: false as const, error: error.message };
    revalidatePath("/admin/rent-board");
    return { ok: true as const };
  } catch (e) {
    return fail(e);
  }
}

/** 시트를 5분 기다리지 않고 지금 다시 읽는다. */
export async function refreshSheet() {
  try {
    await requireAdmin();
    revalidateTag(SHEET_TAG);
    revalidatePath("/admin/rent-board");
    return { ok: true as const };
  } catch (e) {
    return fail(e);
  }
}
