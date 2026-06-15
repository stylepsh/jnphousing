"use server";

import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { rateLimit, getClientIp } from "@/lib/auth-guard";
import type { ComplaintStatus } from "@/types/database";

export type LookupResult =
  | {
      ok: true;
      complaint: {
        id: string;
        title: string;
        category: string;
        status: ComplaintStatus;
        admin_memo: string | null;
        visit_scheduled_at: string | null;
        building_name: string | null;
        unit_number: string | null;
        created_at: string;
        resolved_at: string | null;
      };
    }
  | { ok: false; error: string };

function normalizePhone(v: string): string {
  return v.replace(/[^0-9]/g, "");
}

const inputSchema = z.object({
  phone: z.string().min(7).max(20).regex(/^[0-9\-+\s]+$/),
  code: z.string().min(4).max(8).regex(/^[0-9a-fA-F]+$/),
});

export async function lookupComplaint(formData: FormData): Promise<LookupResult> {
  // 1) IP rate limit — 동일 IP 10회 / 10분
  const ip = await getClientIp();
  const rl = rateLimit(`complaint-lookup:${ip}`, 10, 10 * 60 * 1000);
  if (!rl.ok) {
    return {
      ok: false,
      error: `너무 많은 조회 요청입니다. ${rl.retryAfterSeconds}초 후 다시 시도해 주세요.`,
    };
  }

  // 2) zod 검증
  const parsed = inputSchema.safeParse({
    phone: String(formData.get("phone") ?? "").trim(),
    code: String(formData.get("code") ?? "").trim(),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: "연락처와 접수번호 형식을 확인해 주세요.",
    };
  }

  const normalizedPhone = normalizePhone(parsed.data.phone);
  const lookupCode = parsed.data.code.toLowerCase();

  try {
    const supabase = createServiceClient();
    // 최근 30일 이내 후보 조회
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from("complaints")
      .select(
        "id, title, category, status, admin_memo, visit_scheduled_at, building_name, unit_number, created_at, resolved_at, tenant_phone",
      )
      .gte("created_at", since)
      .limit(500);

    if (error) {
      console.error("[lookupComplaint] db", error);
      return { ok: false, error: "조회 중 오류가 발생했습니다." };
    }

    type Row = {
      id: string;
      title: string;
      category: string;
      status: ComplaintStatus;
      admin_memo: string | null;
      visit_scheduled_at: string | null;
      building_name: string | null;
      unit_number: string | null;
      created_at: string;
      resolved_at: string | null;
      tenant_phone: string;
    };
    const rows = (data ?? []) as Row[];

    const match = rows.find(
      (r) =>
        normalizePhone(r.tenant_phone) === normalizedPhone
        && r.id.toLowerCase().startsWith(lookupCode),
    );

    if (!match) {
      // 실패 시 추가 rate-limit 가속 (실패만 카운트)
      rateLimit(`complaint-lookup-fail:${ip}`, 5, 10 * 60 * 1000);
      return {
        ok: false,
        error: "일치하는 민원이 없습니다. 연락처와 접수번호를 다시 확인해 주세요.",
      };
    }

    return {
      ok: true,
      complaint: {
        id: match.id,
        title: match.title,
        category: match.category,
        status: match.status,
        admin_memo: match.admin_memo,
        visit_scheduled_at: match.visit_scheduled_at,
        building_name: match.building_name,
        unit_number: match.unit_number,
        created_at: match.created_at,
        resolved_at: match.resolved_at,
      },
    };
  } catch (e) {
    console.error("[lookupComplaint] unhandled", e);
    return { ok: false, error: "조회 중 오류가 발생했습니다." };
  }
}
