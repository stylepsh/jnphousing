"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { rateLimit, getClientIp } from "@/lib/auth-guard";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2, "성함을 입력해 주세요.").max(40),
  phone: z.string().min(9, "연락처를 입력해 주세요.").max(20).regex(/^[0-9\-+\s]+$/, "숫자, -, +, 공백만 사용 가능합니다."),
  property_info: z.string().min(2, "거주 중인 건물·호실을 입력해 주세요.").max(300),
  memo: z.string().max(1000).optional().or(z.literal("")).transform((v) => v || null),
});

/** 임차인 가입 신청 — 계정 생성 없이 신청만 접수 (승인 후 임차인존 안내) */
export async function submitTenantApplication(formData: FormData) {
  try {
    const ip = await getClientIp();
    const limited = rateLimit(`tenant-signup:${ip}`, 5, 10 * 60 * 1000);
    if (!limited.ok) {
      return { ok: false as const, error: `요청이 너무 많습니다. ${limited.retryAfterSeconds}초 후 다시 시도해 주세요.` };
    }

    const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "입력값 오류" };

    const supabase = createServiceClient();
    const { error } = await supabase.from("member_applications").insert({
      role: "tenant",
      ...parsed.data,
    });
    if (error) return { ok: false as const, error: "접수 중 오류가 발생했습니다." };

    return { ok: true as const };
  } catch {
    return { ok: false as const, error: "처리 중 오류가 발생했습니다." };
  }
}
