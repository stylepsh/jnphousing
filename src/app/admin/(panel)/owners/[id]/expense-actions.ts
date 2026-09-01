"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { requireMutableAdmin } from "@/lib/auth-guard";
import { AppError } from "@/lib/errors";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { EXPENSE_CATEGORY_VALUES, computeExpenseSplit } from "./expense-shared";

const expenseSchema = z.object({
  unit_id: z.string().uuid(),
  category: z.enum(EXPENSE_CATEGORY_VALUES).default("repair"),
  description: z.string().max(300).optional().or(z.literal("")).transform((v) => v || null),
  amount: z.coerce.number().int().min(0),
  incurred_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  split_type: z.enum(["shared", "owner_all", "company_all"]).default("shared"),
  owner_ratio: z.coerce.number().int().min(0).max(100).default(50),
  memo: z.string().max(500).optional().or(z.literal("")).transform((v) => v || null),
});

/** 호실 지출 등록 (+ 임대인/회사 분배 자동계산) */
export async function createUnitExpense(ownerId: string, fd: FormData) {
  try {
    await requireMutableAdmin();
    const parsed = expenseSchema.safeParse({
      unit_id: fd.get("unit_id"),
      category: fd.get("category") || "repair",
      description: fd.get("description") || "",
      amount: fd.get("amount") || 0,
      incurred_on: fd.get("incurred_on"),
      split_type: fd.get("split_type") || "shared",
      owner_ratio: fd.get("owner_ratio") || 50,
      memo: fd.get("memo") || "",
    });
    if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "입력값 오류" };
    const d = parsed.data;
    const split = computeExpenseSplit(d.amount, d.split_type, d.owner_ratio);

    const supabase = createServiceClient();
    const { error } = await supabase.from("unit_expenses").insert({
      unit_id: d.unit_id,
      owner_id: ownerId,
      category: d.category,
      description: d.description,
      amount: d.amount,
      incurred_on: d.incurred_on,
      split_type: d.split_type,
      owner_ratio: split.owner_ratio,
      company_ratio: split.company_ratio,
      owner_amount: split.owner_amount,
      company_amount: split.company_amount,
      memo: d.memo,
    });
    if (error) return { ok: false as const, error: error.message };
    revalidatePath(`/admin/owners/${ownerId}`);
    return { ok: true as const };
  } catch (e) {
    if (e instanceof AppError) return { ok: false as const, error: e.message };
    return { ok: false as const, error: "처리 중 오류가 발생했습니다." };
  }
}

/** 지출 삭제 */
export async function deleteUnitExpense(ownerId: string, id: string) {
  try {
    await requireMutableAdmin();
    if (!z.string().uuid().safeParse(id).success) return { ok: false as const, error: "잘못된 ID" };
    const supabase = createServiceClient();
    const { error } = await supabase.from("unit_expenses").delete().eq("id", id);
    if (error) return { ok: false as const, error: error.message };
    revalidatePath(`/admin/owners/${ownerId}`);
    return { ok: true as const };
  } catch (e) {
    if (e instanceof AppError) return { ok: false as const, error: e.message };
    return { ok: false as const, error: "처리 중 오류가 발생했습니다." };
  }
}

/** 임대인 청구 처리 표시(토글) */
export async function toggleExpenseBilled(ownerId: string, id: string, billed: boolean) {
  try {
    await requireMutableAdmin();
    if (!z.string().uuid().safeParse(id).success) return { ok: false as const, error: "잘못된 ID" };
    const supabase = createServiceClient();
    const { error } = await supabase.from("unit_expenses")
      .update({ billed_to_owner: billed, billed_at: billed ? new Date().toISOString().slice(0, 10) : null })
      .eq("id", id);
    if (error) return { ok: false as const, error: error.message };
    revalidatePath(`/admin/owners/${ownerId}`);
    return { ok: true as const };
  } catch (e) {
    if (e instanceof AppError) return { ok: false as const, error: e.message };
    return { ok: false as const, error: "처리 중 오류가 발생했습니다." };
  }
}
