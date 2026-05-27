"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth-guard";
import { AppError } from "@/lib/errors";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1, "이름 필수").max(100),
  business_name: z.string().max(200).optional().or(z.literal("")).transform(v => v || null),
  business_number: z.string().max(50).optional().or(z.literal("")).transform(v => v || null),
  corporate_number: z.string().max(50).optional().or(z.literal("")).transform(v => v || null),
  representative: z.string().max(50).optional().or(z.literal("")).transform(v => v || null),
  phone: z.string().max(50).optional().or(z.literal("")).transform(v => v || null),
  email: z.string().max(200).optional().or(z.literal("")).transform(v => v || null),
  account_bank: z.string().max(50).optional().or(z.literal("")).transform(v => v || null),
  account_holder: z.string().max(50).optional().or(z.literal("")).transform(v => v || null),
  memo: z.string().max(2000).optional().or(z.literal("")).transform(v => v || null),
  is_active: z.coerce.boolean().default(true),
});

export async function upsertLandlordBusiness(id: string | null, formData: FormData) {
  try {
    await requireAdmin();
    if (id && !z.string().uuid().safeParse(id).success) return { ok: false as const, error: "잘못된 ID" };
    const raw = Object.fromEntries(formData.entries());
    const parsed = schema.safeParse({
      ...raw,
      is_active: raw.is_active === "on" || raw.is_active === "true",
    });
    if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "입력값 오류" };
    const supabase = createServiceClient();
    const { error } = id
      ? await supabase.from("landlord_business").update(parsed.data).eq("id", id)
      : await supabase.from("landlord_business").insert(parsed.data);
    if (error) return { ok: false as const, error: error.message };
    revalidatePath("/admin/landlord-business");
    revalidatePath("/admin/dm");
    return { ok: true as const };
  } catch (e) {
    if (e instanceof AppError) return { ok: false as const, error: e.message };
    return { ok: false as const, error: "처리 중 오류가 발생했습니다." };
  }
}

export async function deleteLandlordBusiness(id: string) {
  try {
    await requireAdmin();
    if (!z.string().uuid().safeParse(id).success) return { ok: false as const, error: "잘못된 ID" };
    const supabase = createServiceClient();
    const { error } = await supabase.from("landlord_business").delete().eq("id", id);
    if (error) return { ok: false as const, error: error.message };
    revalidatePath("/admin/landlord-business");
    return { ok: true as const };
  } catch (e) {
    if (e instanceof AppError) return { ok: false as const, error: e.message };
    return { ok: false as const, error: "처리 중 오류가 발생했습니다." };
  }
}
