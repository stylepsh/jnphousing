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
      .select("id, region_label, printed_at, total_count, team_name, kind")
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
