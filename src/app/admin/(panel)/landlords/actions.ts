"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth-guard";
import { AppError } from "@/lib/errors";

const schema = z.object({
  name: z.string().min(1).max(80),
  phone: z.string().min(7).max(20).regex(/^[0-9\-+\s]+$/),
  email: z.string().email().or(z.literal("")).transform((v) => v || null),
  account_holder: z.string().max(40).optional().or(z.literal("")).transform((v) => v || null),
  account_bank: z.string().max(40).optional().or(z.literal("")).transform((v) => v || null),
  account_number: z.string().max(40).optional().or(z.literal("")).transform((v) => v || null),
  business_number: z.string().max(20).optional().or(z.literal("")).transform((v) => v || null),
  memo: z.string().max(2000).optional().or(z.literal("")).transform((v) => v || null),
});

export async function upsertLandlord(id: string | null, formData: FormData) {
  try {
    await requireAdmin();
    if (id && !z.string().uuid().safeParse(id).success) {
      return { ok: false as const, error: "잘못된 ID" };
    }
    const raw = Object.fromEntries(formData.entries());
    const parsed = schema.safeParse(raw);
    if (!parsed.success) return { ok: false as const, error: "입력값을 확인해 주세요." };

    // TODO(성혁): 계좌/사업자번호 application-layer 암호화. 현재는 plain 저장 후 _encrypted 컬럼에 동일 값.
    const data = {
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: parsed.data.email,
      account_holder: parsed.data.account_holder,
      account_bank: parsed.data.account_bank,
      account_number_encrypted: parsed.data.account_number,
      business_number_encrypted: parsed.data.business_number,
      memo: parsed.data.memo,
    };

    const supabase = createServiceClient();
    const { error } = id
      ? await supabase.from("landlords").update(data).eq("id", id)
      : await supabase.from("landlords").insert(data);
    if (error) {
      console.error("[upsertLandlord]", error);
      return { ok: false as const, error: "저장 실패" };
    }
    revalidatePath("/admin/landlords");
    return { ok: true as const };
  } catch (e) {
    if (e instanceof AppError) return { ok: false as const, error: e.message };
    return { ok: false as const, error: "처리 중 오류가 발생했습니다." };
  }
}

export async function deleteLandlord(id: string) {
  try {
    await requireAdmin();
    if (!z.string().uuid().safeParse(id).success) return { ok: false as const, error: "잘못된 ID" };
    const supabase = createServiceClient();
    const { error } = await supabase.from("landlords").delete().eq("id", id);
    if (error) {
      console.error("[deleteLandlord]", error);
      return { ok: false as const, error: "삭제 실패 — 연결된 계약이 있을 수 있습니다." };
    }
    revalidatePath("/admin/landlords");
    return { ok: true as const };
  } catch (e) {
    if (e instanceof AppError) return { ok: false as const, error: e.message };
    return { ok: false as const, error: "처리 중 오류가 발생했습니다." };
  }
}
