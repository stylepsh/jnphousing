"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth-guard";
import { AppError } from "@/lib/errors";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// ─── dm_units ───
const unitSchema = z.object({
  property_id: z.string().uuid(),
  landlord_business_id: z.string().uuid().optional().or(z.literal("")).transform(v => v || null),
  alias: z.string().max(100).optional().or(z.literal("")).transform(v => v || null),
  profit_share_ratio: z.enum(["5:5","6:4","7:3","8:2","9:1","6:2:2","7:2:1","custom"]).optional().or(z.literal("")).transform(v => v || null),
  deposit_amount: z.coerce.number().int().min(0).default(0),
  contract_type: z.enum(["weekly","monthly","quarterly","custom"]).default("monthly"),
  monthly_target_revenue: z.coerce.number().int().min(0).optional().or(z.literal("")).transform(v => (typeof v === "number" ? v : null)),
  payment_method: z.enum(["monthly_cash","monthly_transfer","deposit_included","custom"]).optional().or(z.literal("")).transform(v => v || null),
  status: z.enum(["active","vacant","maintenance","terminated"]).default("active"),
  notes: z.string().max(2000).optional().or(z.literal("")).transform(v => v || null),
  started_at: z.string().optional().or(z.literal("")).transform(v => v || null),
  ended_at: z.string().optional().or(z.literal("")).transform(v => v || null),
});

export async function upsertDmUnit(id: string | null, formData: FormData) {
  try {
    await requireAdmin();
    if (id && !z.string().uuid().safeParse(id).success) return { ok: false as const, error: "잘못된 ID" };
    const raw = Object.fromEntries(formData.entries());
    const parsed = unitSchema.safeParse(raw);
    if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "입력값 오류" };
    const supabase = createServiceClient();
    const { error } = id
      ? await supabase.from("dm_units").update(parsed.data).eq("id", id)
      : await supabase.from("dm_units").insert(parsed.data);
    if (error) return { ok: false as const, error: error.message };
    revalidatePath("/admin/dm");
    revalidatePath("/admin/dm/settlement");
    revalidatePath("/admin/landlord-business");
    return { ok: true as const };
  } catch (e) {
    if (e instanceof AppError) return { ok: false as const, error: e.message };
    return { ok: false as const, error: "처리 중 오류가 발생했습니다." };
  }
}

export async function deleteDmUnit(id: string) {
  try {
    await requireAdmin();
    if (!z.string().uuid().safeParse(id).success) return { ok: false as const, error: "잘못된 ID" };
    const supabase = createServiceClient();
    const { error } = await supabase.from("dm_units").delete().eq("id", id);
    if (error) return { ok: false as const, error: error.message };
    revalidatePath("/admin/dm");
    return { ok: true as const };
  } catch (e) {
    if (e instanceof AppError) return { ok: false as const, error: e.message };
    return { ok: false as const, error: "처리 중 오류가 발생했습니다." };
  }
}

// ─── dm_monthly_settlement ───
const settlementSchema = z.object({
  dm_unit_id: z.string().uuid(),
  landlord_business_id: z.string().uuid().optional().or(z.literal("")).transform(v => v || null),
  period_year: z.coerce.number().int().min(2020).max(2100),
  period_month: z.coerce.number().int().min(1).max(12),
  revenue: z.coerce.number().int().min(0).default(0),
  company_share: z.coerce.number().int().min(0).default(0),
  landlord_share: z.coerce.number().int().min(0).default(0),
  third_party_share: z.coerce.number().int().min(0).default(0),
  third_party_name: z.string().max(100).optional().or(z.literal("")).transform(v => v || null),
  previous_balance: z.coerce.number().int().default(0),
  payment_status: z.enum(["pending","partial","paid","withheld","rejected"]).default("pending"),
  payment_method: z.string().max(50).optional().or(z.literal("")).transform(v => v || null),
  paid_amount: z.coerce.number().int().min(0).default(0),
  paid_at: z.string().optional().or(z.literal("")).transform(v => v || null),
  notes: z.string().max(2000).optional().or(z.literal("")).transform(v => v || null),
});

export async function upsertDmSettlement(id: string | null, formData: FormData) {
  try {
    await requireAdmin();
    if (id && !z.string().uuid().safeParse(id).success) return { ok: false as const, error: "잘못된 ID" };
    const raw = Object.fromEntries(formData.entries());
    const parsed = settlementSchema.safeParse(raw);
    if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "입력값 오류" };
    const supabase = createServiceClient();
    const { error } = id
      ? await supabase.from("dm_monthly_settlement").update(parsed.data).eq("id", id)
      : await supabase.from("dm_monthly_settlement").insert(parsed.data);
    if (error) return { ok: false as const, error: error.message };
    revalidatePath("/admin/dm/settlement");
    revalidatePath("/admin/dm");
    return { ok: true as const };
  } catch (e) {
    if (e instanceof AppError) return { ok: false as const, error: e.message };
    return { ok: false as const, error: "처리 중 오류가 발생했습니다." };
  }
}

export async function deleteDmSettlement(id: string) {
  try {
    await requireAdmin();
    if (!z.string().uuid().safeParse(id).success) return { ok: false as const, error: "잘못된 ID" };
    const supabase = createServiceClient();
    const { error } = await supabase.from("dm_monthly_settlement").delete().eq("id", id);
    if (error) return { ok: false as const, error: error.message };
    revalidatePath("/admin/dm/settlement");
    return { ok: true as const };
  } catch (e) {
    if (e instanceof AppError) return { ok: false as const, error: e.message };
    return { ok: false as const, error: "처리 중 오류가 발생했습니다." };
  }
}
