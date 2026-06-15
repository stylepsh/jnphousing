"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { rateLimit, getClientIp } from "@/lib/auth-guard";
import { z } from "zod";

const schema = z.object({
  role: z.enum(["landlord", "staff"]),
  email: z.string().email("이메일 형식이 올바르지 않습니다.").max(200),
  password: z.string().min(8, "비밀번호는 8자 이상이어야 합니다.").max(72),
  name: z.string().min(2, "성함을 입력해 주세요.").max(40),
  phone: z.string().min(9).max(20).regex(/^[0-9\-+\s]+$/, "숫자, -, +, 공백만 사용 가능합니다."),
  property_info: z.string().max(300).optional().or(z.literal("")).transform((v) => v || null),
  memo: z.string().max(1000).optional().or(z.literal("")).transform((v) => v || null),
});

export interface MemberSignupInput {
  role: "landlord" | "staff";
  email: string;
  password: string;
  name: string;
  phone: string;
  property_info?: string;
  memo?: string;
}

/**
 * 임대인·직원 가입 신청 — 서버에서 계정 생성(이메일 인증 완료) + 신청 접수.
 *
 * 클라이언트 signUp + RLS insert 방식은 ① 이메일 인증 ON 시 세션이 없어 insert RLS 차단
 * ② 승인 후에도 미인증이라 로그인 불가 — 두 문제가 있어 서버 admin API 로 일원화.
 */
export async function submitMemberSignup(input: MemberSignupInput) {
  try {
    const ip = await getClientIp();
    const limited = rateLimit(`member-signup:${ip}`, 5, 10 * 60 * 1000);
    if (!limited.ok) {
      return { ok: false as const, error: `요청이 너무 많습니다. ${limited.retryAfterSeconds}초 후 다시 시도해 주세요.` };
    }

    const parsed = schema.safeParse(input);
    if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "입력값 오류" };
    const d = parsed.data;

    const supabase = createServiceClient();

    // 관리자 API로 즉시 사용 가능한 계정 생성 (email_confirm: true → 인증 메일 불필요).
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email: d.email,
      password: d.password,
      email_confirm: true,
      user_metadata: { name: d.name, signup_role: d.role },
    });
    if (createErr || !created?.user) {
      const msg = createErr?.message ?? "";
      if (/already|exist|regist/i.test(msg)) {
        return { ok: false as const, error: "이미 가입된 이메일입니다. 로그인하거나 다른 이메일을 사용해 주세요." };
      }
      return { ok: false as const, error: "계정 생성에 실패했습니다. 잠시 후 다시 시도해 주세요." };
    }

    const { error: insErr } = await supabase.from("member_applications").insert({
      role: d.role,
      user_id: created.user.id,
      name: d.name,
      phone: d.phone,
      email: d.email,
      property_info: d.property_info,
      memo: d.memo,
    });
    if (insErr) {
      // 신청 접수 실패 시 방금 만든 계정 롤백(orphan 방지)
      await supabase.auth.admin.deleteUser(created.user.id);
      return { ok: false as const, error: "신청 접수에 실패했습니다. 잠시 후 다시 시도해 주세요." };
    }

    return { ok: true as const };
  } catch {
    return { ok: false as const, error: "처리 중 오류가 발생했습니다." };
  }
}
