"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { requireMutableAdmin } from "@/lib/auth-guard";
import { AppError } from "@/lib/errors";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const schema = z.object({
  property_id: z.string().uuid().optional().or(z.literal("")).transform(v => v || null),
  period_year: z.coerce.number().int().min(2020).max(2100),
  period_month: z.coerce.number().int().min(1).max(12),
  category: z.enum(["management_fee","vendor_payment","revenue_other","expense_other","maintenance","salary","office_rent","tax"]),
  subcategory: z.string().max(100).optional().or(z.literal("")).transform(v => v || null),
  revenue: z.coerce.number().int().min(0).default(0),
  expense: z.coerce.number().int().min(0).default(0),
  description: z.string().max(500).optional().or(z.literal("")).transform(v => v || null),
  paid_at: z.string().optional().or(z.literal("")).transform(v => v || null),
  payment_status: z.enum(["planned","pending","paid","overdue"]).default("paid"),
  notes: z.string().max(2000).optional().or(z.literal("")).transform(v => v || null),
});

export async function upsertLedgerItem(id: string | null, formData: FormData) {
  try {
    await requireMutableAdmin();
    if (id && !z.string().uuid().safeParse(id).success) return { ok: false as const, error: "잘못된 ID" };
    const raw = Object.fromEntries(formData.entries());
    const parsed = schema.safeParse(raw);
    if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "입력값 오류" };
    const supabase = createServiceClient();
    const { error } = id
      ? await supabase.from("monthly_ledger").update(parsed.data).eq("id", id)
      : await supabase.from("monthly_ledger").insert(parsed.data);
    if (error) return { ok: false as const, error: error.message };
    revalidatePath("/admin/ledger");
    return { ok: true as const };
  } catch (e) {
    if (e instanceof AppError) return { ok: false as const, error: e.message };
    return { ok: false as const, error: "처리 중 오류가 발생했습니다." };
  }
}

export async function deleteLedgerItem(id: string) {
  try {
    await requireMutableAdmin();
    if (!z.string().uuid().safeParse(id).success) return { ok: false as const, error: "잘못된 ID" };
    const supabase = createServiceClient();
    const { error } = await supabase.from("monthly_ledger").delete().eq("id", id);
    if (error) return { ok: false as const, error: error.message };
    revalidatePath("/admin/ledger");
    return { ok: true as const };
  } catch (e) {
    if (e instanceof AppError) return { ok: false as const, error: e.message };
    return { ok: false as const, error: "처리 중 오류가 발생했습니다." };
  }
}
