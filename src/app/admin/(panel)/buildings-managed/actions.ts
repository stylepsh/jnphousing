"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth-guard";
import { AppError } from "@/lib/errors";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// ─── building_vendors ───
const vendorSchema = z.object({
  property_id: z.string().uuid(),
  category: z.enum(["internet","cleaning","electric","water","fire","elevator","etc"]),
  vendor_name: z.string().min(1, "업체명 필수").max(200),
  contact_person: z.string().max(100).optional().or(z.literal("")).transform(v => v || null),
  contact_phone: z.string().max(50).optional().or(z.literal("")).transform(v => v || null),
  contact_email: z.string().max(200).optional().or(z.literal("")).transform(v => v || null),
  customer_number: z.string().max(100).optional().or(z.literal("")).transform(v => v || null),
  account_bank: z.string().max(50).optional().or(z.literal("")).transform(v => v || null),
  account_holder: z.string().max(100).optional().or(z.literal("")).transform(v => v || null),
  monthly_fee: z.coerce.number().int().min(0).optional().or(z.literal("")).transform(v => (typeof v === "number" ? v : null)),
  billing_cycle: z.string().max(100).optional().or(z.literal("")).transform(v => v || null),
  customer_center_phone: z.string().max(50).optional().or(z.literal("")).transform(v => v || null),
  contract_url: z.string().max(500).optional().or(z.literal("")).transform(v => v || null),
  notes: z.string().max(2000).optional().or(z.literal("")).transform(v => v || null),
  is_active: z.coerce.boolean().default(true),
});

export async function upsertBuildingVendor(id: string | null, formData: FormData) {
  try {
    await requireAdmin();
    if (id && !z.string().uuid().safeParse(id).success) return { ok: false as const, error: "잘못된 ID" };
    const raw = Object.fromEntries(formData.entries());
    const parsed = vendorSchema.safeParse({
      ...raw,
      is_active: raw.is_active === "on" || raw.is_active === "true",
    });
    if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "입력값 오류" };
    const supabase = createServiceClient();
    const { error } = id
      ? await supabase.from("building_vendors").update(parsed.data).eq("id", id)
      : await supabase.from("building_vendors").insert(parsed.data);
    if (error) return { ok: false as const, error: error.message };
    revalidatePath(`/admin/buildings-managed/${parsed.data.property_id}`);
    revalidatePath("/admin/buildings-managed");
    return { ok: true as const };
  } catch (e) {
    if (e instanceof AppError) return { ok: false as const, error: e.message };
    return { ok: false as const, error: "처리 중 오류가 발생했습니다." };
  }
}

export async function deleteBuildingVendor(id: string, propertyId: string) {
  try {
    await requireAdmin();
    if (!z.string().uuid().safeParse(id).success) return { ok: false as const, error: "잘못된 ID" };
    const supabase = createServiceClient();
    const { error } = await supabase.from("building_vendors").delete().eq("id", id);
    if (error) return { ok: false as const, error: error.message };
    revalidatePath(`/admin/buildings-managed/${propertyId}`);
    return { ok: true as const };
  } catch (e) {
    if (e instanceof AppError) return { ok: false as const, error: e.message };
    return { ok: false as const, error: "처리 중 오류가 발생했습니다." };
  }
}

// ─── auto_debit_accounts ───
const autoDebitSchema = z.object({
  property_id: z.string().uuid(),
  purpose: z.string().min(1, "용도 필수").max(100),
  bank_name: z.string().max(50).optional().or(z.literal("")).transform(v => v || null),
  account_holder: z.string().max(100).optional().or(z.literal("")).transform(v => v || null),
  monthly_amount: z.coerce.number().int().min(0).optional().or(z.literal("")).transform(v => (typeof v === "number" ? v : null)),
  withdrawal_day: z.coerce.number().int().min(1).max(31).optional().or(z.literal("")).transform(v => (typeof v === "number" ? v : null)),
  notes: z.string().max(1000).optional().or(z.literal("")).transform(v => v || null),
  status: z.enum(["active","paused","cancelled"]).default("active"),
});

export async function upsertAutoDebit(id: string | null, formData: FormData) {
  try {
    await requireAdmin();
    if (id && !z.string().uuid().safeParse(id).success) return { ok: false as const, error: "잘못된 ID" };
    const raw = Object.fromEntries(formData.entries());
    const parsed = autoDebitSchema.safeParse(raw);
    if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "입력값 오류" };
    const supabase = createServiceClient();
    const { error } = id
      ? await supabase.from("auto_debit_accounts").update(parsed.data).eq("id", id)
      : await supabase.from("auto_debit_accounts").insert(parsed.data);
    if (error) return { ok: false as const, error: error.message };
    revalidatePath(`/admin/buildings-managed/${parsed.data.property_id}`);
    return { ok: true as const };
  } catch (e) {
    if (e instanceof AppError) return { ok: false as const, error: e.message };
    return { ok: false as const, error: "처리 중 오류가 발생했습니다." };
  }
}

export async function deleteAutoDebit(id: string, propertyId: string) {
  try {
    await requireAdmin();
    if (!z.string().uuid().safeParse(id).success) return { ok: false as const, error: "잘못된 ID" };
    const supabase = createServiceClient();
    const { error } = await supabase.from("auto_debit_accounts").delete().eq("id", id);
    if (error) return { ok: false as const, error: error.message };
    revalidatePath(`/admin/buildings-managed/${propertyId}`);
    return { ok: true as const };
  } catch (e) {
    if (e instanceof AppError) return { ok: false as const, error: e.message };
    return { ok: false as const, error: "처리 중 오류가 발생했습니다." };
  }
}

// ─── properties 확장 필드 편집 ───
const propertyExtSchema = z.object({
  name: z.string().min(1).max(200),
  short_alias: z.string().max(100).optional().or(z.literal("")).transform(v => v || null),
  address: z.string().max(500).optional().or(z.literal("")).transform(v => v || null),
  business_name: z.string().max(200).optional().or(z.literal("")).transform(v => v || null),
  business_number: z.string().max(50).optional().or(z.literal("")).transform(v => v || null),
  corporate_number: z.string().max(50).optional().or(z.literal("")).transform(v => v || null),
  entrance_password: z.string().max(50).optional().or(z.literal("")).transform(v => v || null),
  management_account: z.string().max(100).optional().or(z.literal("")).transform(v => v || null),
  landlord_business_id: z.string().uuid().optional().or(z.literal("")).transform(v => v || null),
  service_modes: z.array(z.string()).default([]),
  total_units: z.coerce.number().int().min(0).default(0),
});

export async function upsertBuildingManaged(id: string | null, formData: FormData) {
  try {
    await requireAdmin();
    if (id && !z.string().uuid().safeParse(id).success) return { ok: false as const, error: "잘못된 ID" };
    const raw = Object.fromEntries(formData.entries());
    const modes = formData.getAll("service_modes").map(v => String(v)).filter(Boolean);
    const parsed = propertyExtSchema.safeParse({
      ...raw,
      service_modes: modes,
    });
    if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "입력값 오류" };
    const supabase = createServiceClient();
    const payload = { ...parsed.data, type: "officetel" as const, is_published: true };
    const { error, data } = id
      ? await supabase.from("properties").update(parsed.data).eq("id", id).select("id").maybeSingle()
      : await supabase.from("properties").insert(payload).select("id").maybeSingle();
    if (error) return { ok: false as const, error: error.message };
    revalidatePath("/admin/buildings-managed");
    if (id || data?.id) revalidatePath(`/admin/buildings-managed/${id ?? data?.id}`);
    return { ok: true as const, id: data?.id };
  } catch (e) {
    if (e instanceof AppError) return { ok: false as const, error: e.message };
    return { ok: false as const, error: "처리 중 오류가 발생했습니다." };
  }
}
