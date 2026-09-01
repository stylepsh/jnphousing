"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { requireMutableAdmin } from "@/lib/auth-guard";
import { AppError } from "@/lib/errors";
import { encryptPII, PiiKeyMissingError } from "@/lib/crypto-pii";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const ownerSchema = z.object({
  name: z.string().min(1, "이름 필수").max(100),
  phone: z.string().max(50).optional().or(z.literal("")).transform((v) => v || null),
  email: z.string().max(200).optional().or(z.literal("")).transform((v) => v || null),
  account_bank: z.string().max(50).optional().or(z.literal("")).transform((v) => v || null),
  account_holder: z.string().max(100).optional().or(z.literal("")).transform((v) => v || null),
  account_number: z.string().max(100).optional().or(z.literal("")), // 평문 → 암호화
  business_name: z.string().max(200).optional().or(z.literal("")).transform((v) => v || null),
  business_number: z.string().max(50).optional().or(z.literal("")).transform((v) => v || null),
  representative: z.string().max(100).optional().or(z.literal("")).transform((v) => v || null),
  memo: z.string().max(2000).optional().or(z.literal("")).transform((v) => v || null),
});

export async function upsertOwner(id: string | null, formData: FormData) {
  try {
    await requireMutableAdmin();
    if (id && !z.string().uuid().safeParse(id).success) return { ok: false as const, error: "잘못된 ID" };

    const parsed = ownerSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "입력값 오류" };
    const { account_number, ...rest } = parsed.data;

    const row: Record<string, unknown> = { ...rest };
    // 계좌번호는 입력값이 있을 때만 갱신(암호화). 빈 값이면 건드리지 않음.
    if (account_number && account_number.trim()) {
      row.account_number_encrypted = await encryptPII(account_number.trim());
    }

    const supabase = createServiceClient();
    const { data, error } = id
      ? await supabase.from("owners").update(row).eq("id", id).select("id").single()
      : await supabase.from("owners").insert(row).select("id").single();
    if (error) return { ok: false as const, error: error.message };

    revalidatePath("/admin/owners");
    if (id) revalidatePath(`/admin/owners/${id}`);
    return { ok: true as const, id: (data as { id: string } | null)?.id ?? id };
  } catch (e) {
    if (e instanceof PiiKeyMissingError) {
      // 평문 저장을 막고 실패로 끝낸다. 원인은 서버 로그(crypto-pii)에 남는다.
      console.error("[PII]", e.message);
      return { ok: false as const, error: e.message };
    }
    if (e instanceof AppError) return { ok: false as const, error: e.message };
    return { ok: false as const, error: "처리 중 오류가 발생했습니다." };
  }
}

export async function deleteOwner(id: string) {
  try {
    await requireMutableAdmin();
    if (!z.string().uuid().safeParse(id).success) return { ok: false as const, error: "잘못된 ID" };
    const supabase = createServiceClient();
    // 물건의 owner_id 는 on delete set null 로 정리됨
    const { error } = await supabase.from("owners").delete().eq("id", id);
    if (error) return { ok: false as const, error: error.message };
    revalidatePath("/admin/owners");
    return { ok: true as const };
  } catch (e) {
    if (e instanceof PiiKeyMissingError) {
      // 평문 저장을 막고 실패로 끝낸다. 원인은 서버 로그(crypto-pii)에 남는다.
      console.error("[PII]", e.message);
      return { ok: false as const, error: e.message };
    }
    if (e instanceof AppError) return { ok: false as const, error: e.message };
    return { ok: false as const, error: "처리 중 오류가 발생했습니다." };
  }
}
