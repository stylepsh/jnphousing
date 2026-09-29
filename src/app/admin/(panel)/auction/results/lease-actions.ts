"use server";
import "server-only";

import ExcelJS from "exceljs";
import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { requireMutableAdmin } from "@/lib/auth-guard";
import { AppError } from "@/lib/errors";
import { parseLeaseMatrix, type LeaseRow } from "@/lib/auction/lease-sheet";

export interface LeaseImportResult {
  ok: boolean;
  error?: string;
  total: number;
  updated: number;
  newlyLeased: number;
  unmatched: string[];
}
const EMPTY: LeaseImportResult = { ok: false, total: 0, updated: 0, newlyLeased: 0, unmatched: [] };

// 현장팀이 상품화 엑셀에 임차 정보(임차인·보증금·월세·기간·중개사…)를 채워 오면
// 물건번호(없으면 사건번호)로 찾아 반영하고, 아직 임차중이 아니면 "임대중"으로 옮긴다.
// 빈 칸은 기존 값을 지우지 않는다.
export async function importLeaseSheet(formData: FormData): Promise<LeaseImportResult> {
  try {
    const ctx = await requireMutableAdmin();
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) return { ...EMPTY, error: "파일이 없습니다." };
    if (file.size > 5_000_000) return { ...EMPTY, error: "파일이 너무 큽니다(5MB 초과)." };

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await file.arrayBuffer());
    const rows: LeaseRow[] = [];
    for (const ws of wb.worksheets) {
      const matrix: unknown[][] = [];
      ws.eachRow({ includeEmpty: true }, (row) => {
        const cells: unknown[] = [];
        row.eachCell({ includeEmpty: true }, (cell) => cells.push(cell.value));
        matrix.push(cells);
      });
      rows.push(...parseLeaseMatrix(matrix));
    }
    if (rows.length === 0) {
      return { ...EMPTY, error: "임차 정보(임차인·보증금·월세)가 적힌 줄을 찾지 못했습니다. 번호·임차인·월세 칸 이름을 확인하세요." };
    }

    const supabase = createServiceClient();
    type Hit = { id: string; property_no: number | null; case_number: string; pipeline_state: string | null };
    const byNo = new Map<number, Hit>();
    const byCase = new Map<string, Hit>();
    const nos = [...new Set(rows.map((r) => r.propertyNo).filter((n): n is number => n != null))];
    const cases = [...new Set(rows.filter((r) => r.propertyNo == null && r.caseNumber).map((r) => r.caseNumber!))];
    for (let i = 0; i < nos.length; i += 200) {
      const { data } = await supabase
        .from("auction_property")
        .select("id, property_no, case_number, pipeline_state")
        .in("property_no", nos.slice(i, i + 200));
      for (const h of (data ?? []) as Hit[]) if (h.property_no != null) byNo.set(h.property_no, h);
    }
    for (let i = 0; i < cases.length; i += 200) {
      const { data } = await supabase
        .from("auction_property")
        .select("id, property_no, case_number, pipeline_state")
        .in("case_number", cases.slice(i, i + 200))
        .not("survey_status", "in", "(rejected,blocked)");
      for (const h of (data ?? []) as Hit[]) byCase.set(h.case_number, h);
    }

    const res: LeaseImportResult = { ...EMPTY, ok: true, total: rows.length, unmatched: [] };
    const nowIso = new Date().toISOString();
    for (const r of rows) {
      const hit = (r.propertyNo != null ? byNo.get(r.propertyNo) : undefined) ?? (r.caseNumber ? byCase.get(r.caseNumber) : undefined);
      if (!hit) {
        res.unmatched.push(String(r.propertyNo ?? r.caseNumber ?? r.tenantName ?? "?"));
        continue;
      }
      const patch: Record<string, unknown> = { updated_at: nowIso };
      const set = (k: string, v: unknown) => {
        if (v != null && v !== "") patch[k] = v;
      };
      set("tenant_name", r.tenantName);
      set("tenant_phone", r.tenantPhone);
      set("deposit", r.deposit);
      set("monthly_rent", r.monthlyRent);
      set("lease_start", r.leaseStart);
      set("lease_end", r.leaseEnd);
      set("rent_due_day", r.dueDay);
      set("management_fee_rate", r.feeRate);
      set("broker_name", r.brokerName);
      set("broker_phone", r.brokerPhone);
      const becomesLeased = hit.pipeline_state !== "Leased";
      if (becomesLeased) {
        patch.pipeline_state = "Leased";
        patch.pipeline_entered_at = nowIso;
      }
      const { error } = await supabase.from("auction_property").update(patch).eq("id", hit.id);
      if (error?.code === "42703") {
        return { ...res, ok: false, error: "DB에 044 마이그레이션(임차 연락처·중개사 칸)을 먼저 적용해야 합니다." };
      }
      if (error) {
        console.error("[importLeaseSheet] 반영 실패", { id: hit.id, error });
        res.unmatched.push(`${hit.property_no ?? hit.case_number}(저장 실패)`);
        continue;
      }
      res.updated++;
      if (becomesLeased) {
        res.newlyLeased++;
        await supabase.from("auction_pipeline_event").insert({
          auction_property_id: hit.id,
          from_state: hit.pipeline_state ?? "Collected",
          to_state: "Leased",
          action: "IMPORT_LEASE",
          performed_by_id: ctx.user.id,
          performed_by: ctx.admin.name,
          detail: `임차현황 엑셀 업로드 · ${r.tenantName ?? ""} ${r.monthlyRent ? `월세 ${r.monthlyRent.toLocaleString("ko-KR")}원` : ""}`.trim(),
        });
      }
    }

    revalidatePath("/admin/auction/results");
    revalidatePath("/admin/auction/leases");
    revalidatePath("/admin/auction/revenue");
    return res;
  } catch (e) {
    if (e instanceof AppError) return { ...EMPTY, error: e.message };
    console.error("[importLeaseSheet]", e);
    return { ...EMPTY, error: "업로드 처리 중 오류가 발생했습니다." };
  }
}
