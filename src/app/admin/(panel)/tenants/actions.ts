"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { requireMutableAdmin } from "@/lib/auth-guard";
import { AppError } from "@/lib/errors";
import { encryptPII, PiiKeyMissingError } from "@/lib/crypto-pii";

const schema = z.object({
  name: z.string().min(1).max(80),
  phone: z.string().min(7).max(20).regex(/^[0-9\-+\s]+$/),
  emergency_contact: z.string().max(40).optional().or(z.literal("")).transform((v) => v || null),
  id_number: z.string().max(20).optional().or(z.literal("")).transform((v) => v || null),
  move_in_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")).transform((v) => v || null),
  move_out_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")).transform((v) => v || null),
  memo: z.string().max(2000).optional().or(z.literal("")).transform((v) => v || null),
});

export async function upsertTenant(id: string | null, formData: FormData) {
  try {
    await requireMutableAdmin();
    if (id && !z.string().uuid().safeParse(id).success) {
      return { ok: false as const, error: "잘못된 ID" };
    }
    const raw = Object.fromEntries(formData.entries());
    const parsed = schema.safeParse(raw);
    if (!parsed.success) return { ok: false as const, error: "입력값을 확인해 주세요." };

    // 주민번호는 AES-256-GCM 암호화 후 저장 (lib/crypto-pii).
    // 값이 입력됐을 때만 갱신 — edit 시 빈칸이면 기존 암호화값 유지(실수로 지워짐 방지).
    const data: Record<string, unknown> = {
      name: parsed.data.name,
      phone: parsed.data.phone,
      emergency_contact: parsed.data.emergency_contact,
      move_in_date: parsed.data.move_in_date,
      move_out_date: parsed.data.move_out_date,
      memo: parsed.data.memo,
    };
    if (parsed.data.id_number !== null) {
      data.id_number_encrypted = await encryptPII(parsed.data.id_number);
    } else if (!id) {
      data.id_number_encrypted = null;
    }

    const supabase = createServiceClient();
    const { error } = id
      ? await supabase.from("tenants").update(data).eq("id", id)
      : await supabase.from("tenants").insert(data);
    if (error) {
      console.error("[upsertTenant]", error);
      return { ok: false as const, error: "저장 실패" };
    }
    revalidatePath("/admin/tenants");
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

export async function deleteTenant(id: string) {
  try {
    await requireMutableAdmin();
    if (!z.string().uuid().safeParse(id).success) return { ok: false as const, error: "잘못된 ID" };
    const supabase = createServiceClient();
    const { error } = await supabase.from("tenants").delete().eq("id", id);
    if (error) {
      console.error("[deleteTenant]", error);
      return { ok: false as const, error: "삭제 실패 — 연결된 계약이 있을 수 있습니다." };
    }
    revalidatePath("/admin/tenants");
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
