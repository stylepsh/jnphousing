"use server";

import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { rateLimit, getClientIp } from "@/lib/auth-guard";
import { signTenantSession, setTenantSessionCookie } from "@/lib/tenant-session";

const schema = z.object({
  phone_last4: z.string().regex(/^\d{4}$/, "휴대폰 끝 4자리를 입력해 주세요."),
  unit_id: z.string().uuid("호실을 선택해 주세요."),
});

export type LoginResult =
  | { ok: true; redirect: string }
  | { ok: false; error: string };

export async function tenantLogin(formData: FormData): Promise<LoginResult> {
  // 1) IP rate limit — 5회/10분
  const ip = await getClientIp();
  const rl = rateLimit(`tenant-login:${ip}`, 5, 10 * 60 * 1000);
  if (!rl.ok) {
    return { ok: false, error: `너무 많은 시도입니다. ${rl.retryAfterSeconds}초 후 다시 시도해 주세요.` };
  }

  // 2) 입력 검증
  const parsed = schema.safeParse({
    phone_last4: String(formData.get("phone_last4") ?? "").trim(),
    unit_id: String(formData.get("unit_id") ?? "").trim(),
  });
  if (!parsed.success) {
    return { ok: false, error: "입력값을 확인해 주세요." };
  }

  // 3) SECURITY DEFINER 함수로 매칭 시도
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase.rpc("find_lease_by_phone_unit", {
      p_phone_last4: parsed.data.phone_last4,
      p_unit_id: parsed.data.unit_id,
    });
    if (error) {
      console.error("[tenantLogin] rpc", error);
      return { ok: false, error: "조회 중 오류가 발생했습니다." };
    }
    const rows = (data ?? []) as Array<{ lease_id: string; tenant_name: string; start_date: string; end_date: string; rent_amount: number }>;
    const match = rows[0];
    if (!match) {
      // 실패만 추가 카운트
      rateLimit(`tenant-login-fail:${ip}`, 3, 10 * 60 * 1000);
      return { ok: false, error: "일치하는 계약을 찾을 수 없습니다. 휴대폰 끝 4자리와 호실을 확인해 주세요." };
    }

    // 4) tenant_id 도 함께 조회 (RPC 반환에 없으므로 lease → tenant_id 매핑)
    const { data: leaseRow } = await supabase
      .from("leases")
      .select("tenant_id, unit_id")
      .eq("id", match.lease_id)
      .maybeSingle();
    const leaseInfo = leaseRow as { tenant_id: string; unit_id: string } | null;
    if (!leaseInfo) return { ok: false, error: "계약을 찾을 수 없습니다." };

    // 5) JWT 발급 + cookie
    const token = await signTenantSession({
      tenant_id: leaseInfo.tenant_id,
      lease_id: match.lease_id,
      unit_id: leaseInfo.unit_id,
    });
    await setTenantSessionCookie(token);

    return { ok: true, redirect: "/tenant/my-lease" };
  } catch (e) {
    console.error("[tenantLogin] unhandled", e);
    return { ok: false, error: "처리 중 오류가 발생했습니다." };
  }
}
