"use server";

import { z } from "zod";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { rateLimit, getClientIp } from "@/lib/auth-guard";

export type FindEmailResult =
  | { ok: true; found: true; email: string }
  | { ok: true; found: false }
  | { ok: false; error: string };

/** 이메일 마스킹: ab****@gmail.com */
function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  const head = local.slice(0, Math.min(2, local.length));
  const stars = "*".repeat(Math.max(local.length - head.length, 2));
  return `${head}${stars}@${domain}`;
}

/** 서비스 롤 admin 클라이언트 — auth.admin + RLS 우회 테이블 조회 모두 가능. env 없으면 null. */
function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createSupabaseClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

const agencySchema = z.object({
  role: z.literal("agency"),
  business_number: z.string().trim().min(5).max(20),
  representative: z.string().trim().min(1).max(40),
});
const landlordSchema = z.object({
  role: z.literal("landlord"),
  name: z.string().trim().min(1).max(40),
  phone: z.string().trim().min(7).max(20),
});

export async function findLoginEmail(formData: FormData): Promise<FindEmailResult> {
  // 무차별 조회 방지 — IP당 10분 5회
  const ip = await getClientIp();
  const rl = rateLimit(`find-email:${ip}`, 5, 10 * 60 * 1000);
  if (!rl.ok) {
    return { ok: false, error: `너무 많은 시도입니다. ${rl.retryAfterSeconds}초 후 다시 시도해 주세요.` };
  }

  const admin = adminClient();
  if (!admin) {
    return { ok: false, error: "현재 조회를 사용할 수 없습니다. 잠시 후 다시 시도해 주세요." };
  }

  const role = String(formData.get("role") ?? "");
  let userId: string | null = null;

  try {
    if (role === "agency") {
      const parsed = agencySchema.safeParse({
        role,
        business_number: formData.get("business_number"),
        representative: formData.get("representative"),
      });
      if (!parsed.success) return { ok: false, error: "입력값을 확인해 주세요." };
      // 사업자번호는 하이픈 유무 차이를 흡수
      const bn = parsed.data.business_number.replace(/[^0-9]/g, "");
      const { data } = await admin
        .from("agencies")
        .select("user_id, business_number, representative")
        .eq("representative", parsed.data.representative);
      const match = (data as { user_id: string; business_number: string }[] | null)?.find(
        (r) => r.business_number.replace(/[^0-9]/g, "") === bn,
      );
      userId = match?.user_id ?? null;
    } else if (role === "landlord") {
      const parsed = landlordSchema.safeParse({
        role,
        name: formData.get("name"),
        phone: formData.get("phone"),
      });
      if (!parsed.success) return { ok: false, error: "입력값을 확인해 주세요." };
      const phone = parsed.data.phone.replace(/[^0-9]/g, "");
      const { data: landlords } = await admin
        .from("landlords")
        .select("id, phone")
        .eq("name", parsed.data.name);
      const l = (landlords as { id: string; phone: string }[] | null)?.find(
        (r) => r.phone.replace(/[^0-9]/g, "") === phone,
      );
      if (l) {
        const { data: lu } = await admin
          .from("landlord_users")
          .select("user_id")
          .eq("landlord_id", l.id)
          .maybeSingle();
        userId = (lu as { user_id: string } | null)?.user_id ?? null;
      }
    } else {
      return { ok: false, error: "잘못된 요청입니다." };
    }

    if (!userId) return { ok: true, found: false };

    const { data: userData, error } = await admin.auth.admin.getUserById(userId);
    const email = userData?.user?.email;
    if (error || !email) return { ok: true, found: false };

    return { ok: true, found: true, email: maskEmail(email) };
  } catch (e) {
    console.error("[findLoginEmail]", e);
    return { ok: false, error: "조회 중 오류가 발생했습니다." };
  }
}
