"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth-guard";
import { AppError } from "@/lib/errors";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export interface SheetLog {
  id: string;
  region_label: string;
  printed_at: string;
  total_count: number;
  team_name: string | null;
  kind: string | null;
  returned_at: string | null;
}

export interface SheetItemRow {
  id: string;
  case_number: string;
  address: string;
  owner_name: string;
  survey_status: string;
}

/** 답사지 발급 이력 — 최신순. */
export async function listSheets(limit = 100): Promise<SheetLog[]> {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("auction_survey_sheet")
      .select("id, region_label, printed_at, total_count, team_name, kind, returned_at")
      .order("printed_at", { ascending: false })
      .limit(limit);
    if (error) return [];
    return (data ?? []) as SheetLog[];
  } catch {
    return [];
  }
}

/** 한 발급에 들어 있던 물건 명단 (그때 준 목록). */
export async function listSheetItems(sheetId: string): Promise<SheetItemRow[]> {
  try {
    await requireAdmin();
    const id = z.string().uuid().safeParse(sheetId);
    if (!id.success) return [];
    const supabase = createServiceClient();

    const { data: links } = await supabase
      .from("auction_sheet_item")
      .select("property_id")
      .eq("sheet_id", id.data)
      .limit(5000);
    const ids = ((links ?? []) as { property_id: string }[]).map((r) => r.property_id);

    // 036 이전에 발급된 건은 매핑이 없으므로 sheet_id 로 폴백
    const query = supabase
      .from("auction_property")
      .select("id, case_number, address, owner_name, survey_status")
      .order("address", { ascending: true })
      .limit(5000);
    const { data } = ids.length
      ? await query.in("id", ids)
      : await query.eq("sheet_id", id.data);
    return (data ?? []) as SheetItemRow[];
  } catch {
    return [];
  }
}

/** 발급 이력 삭제 (기록만 지움 — 물건은 그대로). */
export async function deleteSheetLog(sheetId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireAdmin();
    const id = z.string().uuid().safeParse(sheetId);
    if (!id.success) return { ok: false, error: "잘못된 요청입니다" };
    const supabase = createServiceClient();
    const { error } = await supabase.from("auction_survey_sheet").delete().eq("id", id.data);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/admin/auction/sheets");
    return { ok: true };
  } catch (e) {
    if (e instanceof AppError) return { ok: false, error: e.message };
    return { ok: false, error: "처리 중 오류가 발생했습니다." };
  }
}

/** 회수 처리 토글 — 답사지를 돌려받았는지. */
export async function setSheetReturned(
  sheetId: string,
  returned: boolean,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireAdmin();
    const id = z.string().uuid().safeParse(sheetId);
    if (!id.success) return { ok: false, error: "잘못된 요청입니다" };
    const supabase = createServiceClient();
    const { error } = await supabase
      .from("auction_survey_sheet")
      .update({ returned_at: returned ? new Date().toISOString() : null })
      .eq("id", id.data);
    if (error) {
      return {
        ok: false,
        error: /returned_at|schema cache/i.test(error.message)
          ? "회수 컬럼이 없습니다. 마이그레이션 037 을 실행해주세요."
          : error.message,
      };
    }
    revalidatePath("/admin/auction/sheets");
    return { ok: true };
  } catch (e) {
    if (e instanceof AppError) return { ok: false, error: e.message };
    return { ok: false, error: "처리 중 오류가 발생했습니다." };
  }
}

/** 지역 라벨 -> 최근 발급 정보 (지역 카드 "배포 중" 배지용). */
export async function recentIssuesByRegion(): Promise<
  Record<string, { team: string; at: string; returned: boolean }>
> {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const since = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from("auction_survey_sheet")
      .select("region_label, printed_at, team_name, returned_at")
      .gte("printed_at", since)
      .order("printed_at", { ascending: false })
      .limit(300);
    if (error) return {};
    const map: Record<string, { team: string; at: string; returned: boolean }> = {};
    for (const r of (data ?? []) as {
      region_label: string;
      printed_at: string;
      team_name: string | null;
      returned_at: string | null;
    }[]) {
      const key = (r.region_label ?? "").split(" 외 ")[0].trim();
      if (!key || map[key]) continue;
      map[key] = {
        team: r.team_name || "팀미기재",
        at: r.printed_at.slice(0, 10),
        returned: !!r.returned_at,
      };
    }
    return map;
  } catch {
    return {};
  }
}

