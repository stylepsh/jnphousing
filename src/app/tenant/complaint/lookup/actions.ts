"use server";

import { createServiceClient } from "@/lib/supabase/server";
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

export async function lookupComplaint(
  formData: FormData,
): Promise<LookupResult> {
  const phoneRaw = String(formData.get("phone") ?? "").trim();
  const lookupCode = String(formData.get("code") ?? "").trim().toLowerCase();

  if (!phoneRaw || !lookupCode) {
    return { ok: false, error: "연락처와 접수번호를 모두 입력해 주세요." };
  }
  if (lookupCode.length < 4) {
    return { ok: false, error: "접수번호는 8자리입니다." };
  }

  try {
    const supabase = createServiceClient();
    const normalizedPhone = normalizePhone(phoneRaw);

    // 최근 30일 이내, 정규화된 phone 으로 후보 조회
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from("complaints")
      .select(
        "id, title, category, status, admin_memo, building_name, unit_number, created_at, resolved_at, tenant_phone",
      )
      .gte("created_at", since)
      .limit(500);

    if (error) {
      return { ok: false, error: "조회 중 오류가 발생했습니다." };
    }

    type Row = {
      id: string;
      title: string;
      category: string;
      status: ComplaintStatus;
      admin_memo: string | null;
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
        building_name: match.building_name,
        unit_number: match.unit_number,
        created_at: match.created_at,
        resolved_at: match.resolved_at,
      },
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "알 수 없는 오류";
    return { ok: false, error: `조회 실패: ${msg}` };
  }
}
