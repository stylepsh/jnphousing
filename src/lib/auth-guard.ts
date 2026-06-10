/**
 * Server Action 인증/권한 가드.
 *
 * 사용 패턴:
 *   "use server";
 *   import { requireAdmin } from "@/lib/auth-guard";
 *
 *   export async function someAction(...) {
 *     const ctx = await requireAdmin();
 *     // ctx.user.id 등 사용
 *     ...
 *   }
 *
 * 가드 함수는 권한 없으면 AppError throw.
 * Server Action 호출부는 try/catch 또는 errResult 로 변환.
 */

import { createClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/errors";

export interface AdminContext {
  user: { id: string; email: string | null };
  admin: { id: string; name: string; role: "super" | "staff" };
}

export interface ApprovedAgencyContext {
  user: { id: string; email: string | null };
  agency: { id: string; company_name: string; status: "approved" };
}

export interface LandlordContext {
  user: { id: string; email: string | null };
  landlord: { id: string; name: string };
}

/** 관리자(admin_users) 권한 강제. 없으면 throw. */
export async function requireAdmin(): Promise<AdminContext> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new AppError("UNAUTHORIZED", "로그인이 필요합니다.");
  }

  const { data: adminRows } = await supabase
    .from("admin_users")
    .select("id, name, role")
    .eq("user_id", user.id)
    .limit(1);
  const admin = (adminRows as { id: string; name: string; role: "super" | "staff" }[] | null)?.[0];
  if (!admin) {
    throw new AppError("FORBIDDEN", "관리자 권한이 필요합니다.");
  }

  return {
    user: { id: user.id, email: user.email ?? null },
    admin,
  };
}

/** Super admin 권한 강제 (관리자 추가/삭제 등 민감 작업). */
export async function requireSuperAdmin(): Promise<AdminContext> {
  const ctx = await requireAdmin();
  if (ctx.admin.role !== "super") {
    throw new AppError("FORBIDDEN", "최고 관리자만 가능한 작업입니다.");
  }
  return ctx;
}

/** 승인된 부동산 회원 강제. */
export async function requireApprovedAgency(): Promise<ApprovedAgencyContext> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new AppError("UNAUTHORIZED", "로그인이 필요합니다.");
  }

  const { data: agencyRows } = await supabase
    .from("agencies")
    .select("id, company_name, status")
    .eq("user_id", user.id)
    .limit(1);
  const agency = (agencyRows as { id: string; company_name: string; status: string }[] | null)?.[0];
  if (!agency) {
    throw new AppError("FORBIDDEN", "부동산 회원 정보가 없습니다.");
  }
  if (agency.status !== "approved") {
    throw new AppError("FORBIDDEN", "승인되지 않은 부동산 계정입니다.");
  }

  return {
    user: { id: user.id, email: user.email ?? null },
    agency: { id: agency.id, company_name: agency.company_name, status: "approved" },
  };
}

/** 임대인 (landlord_users 매핑된 사용자) 강제. */
export async function requireLandlord(): Promise<LandlordContext> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new AppError("UNAUTHORIZED", "로그인이 필요합니다.");
  }

  // 016: landlord_users.landlord_id → owners(id) 재배선 (owners 가 landlords id 재사용)
  const { data } = await supabase
    .from("landlord_users")
    .select("landlord_id, landlord:owners(id, name)")
    .eq("user_id", user.id)
    .maybeSingle();
  const row = data as unknown as { landlord_id: string; landlord: { id: string; name: string } | null } | null;
  if (!row || !row.landlord) {
    throw new AppError("FORBIDDEN", "임대인 계정이 아닙니다. 관리자에게 문의 주세요.");
  }

  return {
    user: { id: user.id, email: user.email ?? null },
    landlord: { id: row.landlord.id, name: row.landlord.name },
  };
}

/* =========================================================================
 * 간이 IP rate limiter — Server runtime 메모리 기반.
 * 단일 서버 가정 (Vercel serverless: 인스턴스마다 별개). MVP 수준.
 * Phase 9 이후 Upstash Redis 등으로 교체.
 * ========================================================================= */

interface Bucket {
  count: number;
  resetAt: number;
}
const buckets = new Map<string, Bucket>();

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { ok: true } | { ok: false; retryAfterSeconds: number } {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }
  if (bucket.count >= limit) {
    return { ok: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  bucket.count += 1;
  return { ok: true };
}

/** Server Action 내부에서 호출. headers() 로 IP 추출. */
export async function getClientIp(): Promise<string> {
  const { headers } = await import("next/headers");
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0].trim()
    || h.get("x-real-ip")
    || "unknown"
  );
}
