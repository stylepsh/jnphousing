"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin, requireMutableAdmin } from "@/lib/auth-guard";
import { AppError } from "@/lib/errors";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { dueDateOf, isBillable } from "@/lib/auction/revenue";

export interface RevenueProperty {
  id: string;
  case_number: string;
  address: string;
  owner_name: string;
  tenant_name: string | null;
  monthly_rent: number | null;
  deposit: number | null;
  management_fee_rate: number | null;
  profit_share_rate: number | null;
  lease_start: string | null;
  lease_end: string | null;
  rent_due_day: number | null;
  /** 현장팀이 지급한 투입비 합계 */
  fieldTeamCost: number;
  /** 회사·임대인 부담 지출 합계 (참고) */
  otherCost: number;
  /** 실제 수납 누계 */
  receivedTotal: number;
  /** 수납된 개월수 */
  paidMonths: number;
}

export interface ReceiptRow {
  id: string;
  auction_property_id: string;
  period: string;
  due_date: string | null;
  expected: number;
  received: number;
  received_at: string | null;
  memo: string | null;
}

export interface WorkCostRow {
  id: string;
  category: string;
  amount: number;
  payer: string;
  provider: string | null;
  work_date: string | null;
  memo: string | null;
}

/** 임대중 물건 + 지출·수납 집계 (단독 사용자 기준, 전량 로드) */
export async function listRevenueProperties(): Promise<RevenueProperty[]> {
  try {
    await requireAdmin();
    const supabase = createServiceClient();

    const { data: props, error } = await supabase
      .from("auction_property")
      .select(
        "id, case_number, address, owner_name, tenant_name, monthly_rent, deposit, management_fee_rate, profit_share_rate, lease_start, lease_end, rent_due_day",
      )
      .not("monthly_rent", "is", null)
      .order("lease_end", { ascending: true, nullsFirst: false })
      .limit(2000);
    if (error) return [];
    const rows = (props ?? []) as Omit<
      RevenueProperty,
      "fieldTeamCost" | "otherCost" | "receivedTotal" | "paidMonths"
    >[];
    if (rows.length === 0) return [];

    const ids = rows.map((r) => r.id);
    const [{ data: works }, { data: receipts }] = await Promise.all([
      supabase
        .from("auction_work_item")
        .select("auction_property_id, amount, payer")
        .in("auction_property_id", ids),
      supabase
        .from("auction_rent_receipt")
        .select("auction_property_id, received")
        .in("auction_property_id", ids),
    ]);

    const field = new Map<string, number>();
    const other = new Map<string, number>();
    for (const w of (works ?? []) as {
      auction_property_id: string;
      amount: number | null;
      payer: string | null;
    }[]) {
      const target = (w.payer ?? "field_team") === "field_team" ? field : other;
      target.set(w.auction_property_id, (target.get(w.auction_property_id) ?? 0) + (w.amount ?? 0));
    }

    const recv = new Map<string, number>();
    const months = new Map<string, number>();
    for (const r of (receipts ?? []) as { auction_property_id: string; received: number | null }[]) {
      recv.set(r.auction_property_id, (recv.get(r.auction_property_id) ?? 0) + (r.received ?? 0));
      if ((r.received ?? 0) > 0)
        months.set(r.auction_property_id, (months.get(r.auction_property_id) ?? 0) + 1);
    }

    return rows.map((r) => ({
      ...r,
      fieldTeamCost: field.get(r.id) ?? 0,
      otherCost: other.get(r.id) ?? 0,
      receivedTotal: recv.get(r.id) ?? 0,
      paidMonths: months.get(r.id) ?? 0,
    }));
  } catch {
    return [];
  }
}

/** 특정 월의 수납 현황 */
export async function listReceipts(period: string): Promise<ReceiptRow[]> {
  try {
    await requireAdmin();
    const p = z.string().regex(/^\d{4}-\d{2}$/).safeParse(period);
    if (!p.success) return [];
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("auction_rent_receipt")
      .select("id, auction_property_id, period, due_date, expected, received, received_at, memo")
      .eq("period", p.data)
      .limit(2000);
    if (error) return [];
    return (data ?? []) as ReceiptRow[];
  } catch {
    return [];
  }
}

/**
 * 그 달 청구 생성 — 임대중 물건마다 예정액·수금일을 만들어 둔다.
 * 이미 있는 행은 건드리지 않는다(실수령 기록을 덮어쓰지 않기 위해).
 */
export async function generateReceipts(
  period: string,
): Promise<{ ok: boolean; created?: number; error?: string }> {
  try {
    await requireMutableAdmin();
    const p = z.string().regex(/^\d{4}-\d{2}$/).safeParse(period);
    if (!p.success) return { ok: false, error: "기간 형식이 올바르지 않습니다 (YYYY-MM)" };

    const supabase = createServiceClient();
    // 실제 임대 중인 물건만 청구 대상. 퇴거·회수된 물건은 monthly_rent 값이
    // 남아 있어도 pipeline_state 가 Leased 가 아니므로 여기서 걸러진다.
    const { data: props, error: propErr } = await supabase
      .from("auction_property")
      .select("id, monthly_rent, rent_due_day, lease_start, lease_end, pipeline_state")
      .eq("pipeline_state", "Leased")
      .not("monthly_rent", "is", null)
      .gt("monthly_rent", 0)
      .limit(2000);
    if (propErr) {
      console.error("[generateReceipts] 물건 조회 실패", propErr);
      return { ok: false, error: "물건 목록을 불러오지 못했습니다. 다시 시도해 주세요." };
    }

    const rows = (props ?? []) as {
      id: string;
      monthly_rent: number | null;
      rent_due_day: number | null;
      lease_start: string | null;
      lease_end: string | null;
      pipeline_state: string | null;
    }[];

    // 계약 기간이 해당 월과 겹치는 임대중 물건만 (판정은 lib/auction/revenue 의 순수 함수).
    const target = rows.filter((r) =>
      isBillable(
        {
          pipelineState: r.pipeline_state,
          monthlyRent: r.monthly_rent,
          leaseStart: r.lease_start,
          leaseEnd: r.lease_end,
        },
        p.data,
      ),
    );
    if (target.length === 0) return { ok: true, created: 0 };

    // 같은 달 중복 청구 방지 — DB 에도 unique(auction_property_id, period) 가 있어
    // 동시 실행 시에도 중복 행이 생기지 않는다(038).
    const { data: existing, error: exErr } = await supabase
      .from("auction_rent_receipt")
      .select("auction_property_id")
      .eq("period", p.data)
      .limit(2000);
    if (exErr) {
      console.error("[generateReceipts] 기존 청구 조회 실패", exErr);
      return { ok: false, error: "기존 청구 내역을 확인하지 못했습니다. 다시 시도해 주세요." };
    }
    const have = new Set(
      ((existing ?? []) as { auction_property_id: string }[]).map((r) => r.auction_property_id),
    );

    const toInsert = target
      .filter((r) => !have.has(r.id))
      .map((r) => ({
        auction_property_id: r.id,
        period: p.data,
        due_date: dueDateOf(p.data, r.rent_due_day),
        expected: Math.max(0, Math.round(r.monthly_rent ?? 0)),
        received: 0,
      }));
    if (toInsert.length === 0) return { ok: true, created: 0 };

    for (let i = 0; i < toInsert.length; i += 300) {
      const { error } = await supabase
        .from("auction_rent_receipt")
        .insert(toInsert.slice(i, i + 300));
      if (error) {
        // 23505 = unique 위반. 동시에 두 번 눌린 경우이므로 실패로 보지 않는다.
        if ((error as { code?: string }).code === "23505") continue;
        console.error("[generateReceipts] 청구 생성 실패", error);
        return {
          ok: false,
          error: /relation .* does not exist|schema cache/i.test(error.message)
            ? "수납 테이블이 없습니다. 마이그레이션 038 을 실행해주세요."
            : error.message,
        };
      }
    }

    revalidatePath("/admin/auction/revenue");
    return { ok: true, created: toInsert.length };
  } catch (e) {
    if (e instanceof AppError) return { ok: false, error: e.message };
    return { ok: false, error: "청구 생성 중 오류가 발생했습니다." };
  }
}

/** 수납 기록 (받음/부분수납/취소) */
export async function saveReceipt(input: {
  propertyId: string;
  period: string;
  received: number;
  receivedAt?: string | null;
  memo?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireMutableAdmin();
    const parsed = z
      .object({
        propertyId: z.string().uuid(),
        period: z.string().regex(/^\d{4}-\d{2}$/),
        received: z.number().int().min(0),
        receivedAt: z.string().nullish(),
        memo: z.string().max(300).nullish(),
      })
      .safeParse(input);
    if (!parsed.success) return { ok: false, error: "입력값이 올바르지 않습니다" };

    const supabase = createServiceClient();
    const { error } = await supabase
      .from("auction_rent_receipt")
      .update({
        received: parsed.data.received,
        received_at:
          parsed.data.received > 0
            ? (parsed.data.receivedAt ?? new Date().toISOString().slice(0, 10))
            : null,
        memo: parsed.data.memo ?? null,
      })
      .eq("auction_property_id", parsed.data.propertyId)
      .eq("period", parsed.data.period);
    if (error) return { ok: false, error: error.message };

    revalidatePath("/admin/auction/revenue");
    return { ok: true };
  } catch (e) {
    if (e instanceof AppError) return { ok: false, error: e.message };
    return { ok: false, error: "저장 중 오류가 발생했습니다." };
  }
}

/** 계약 조건·배분율 수정 */
export async function saveLeaseTerms(input: {
  propertyId: string;
  leaseStart?: string | null;
  leaseEnd?: string | null;
  rentDueDay?: number | null;
  profitShareRate?: number | null;
  managementFeeRate?: number | null;
  monthlyRent?: number | null;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireMutableAdmin();
    const parsed = z
      .object({
        propertyId: z.string().uuid(),
        leaseStart: z.string().nullish(),
        leaseEnd: z.string().nullish(),
        rentDueDay: z.number().int().min(1).max(31).nullish(),
        profitShareRate: z.number().min(0).max(100).nullish(),
        managementFeeRate: z.number().min(0).max(100).nullish(),
        monthlyRent: z.number().int().min(0).nullish(),
      })
      .safeParse(input);
    if (!parsed.success) return { ok: false, error: "입력값이 올바르지 않습니다" };
    const d = parsed.data;

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (d.leaseStart !== undefined) patch.lease_start = d.leaseStart || null;
    if (d.leaseEnd !== undefined) patch.lease_end = d.leaseEnd || null;
    if (d.rentDueDay !== undefined) patch.rent_due_day = d.rentDueDay ?? null;
    if (d.profitShareRate !== undefined) patch.profit_share_rate = d.profitShareRate ?? 0;
    if (d.managementFeeRate !== undefined) patch.management_fee_rate = d.managementFeeRate ?? 0;
    if (d.monthlyRent !== undefined) patch.monthly_rent = d.monthlyRent ?? null;

    const supabase = createServiceClient();
    const { error } = await supabase.from("auction_property").update(patch).eq("id", d.propertyId);
    if (error) {
      return {
        ok: false,
        error: /lease_start|profit_share_rate|schema cache/i.test(error.message)
          ? "계약 컬럼이 없습니다. 마이그레이션 038 을 실행해주세요."
          : error.message,
      };
    }

    revalidatePath("/admin/auction/revenue");
    revalidatePath("/admin/auction/leases");
    return { ok: true };
  } catch (e) {
    if (e instanceof AppError) return { ok: false, error: e.message };
    return { ok: false, error: "저장 중 오류가 발생했습니다." };
  }
}

/** 호실 지출 추가 (현장팀 부담 기본) */
export async function addWorkCost(input: {
  propertyId: string;
  category: string;
  amount: number;
  payer?: "field_team" | "company" | "landlord";
  provider?: string | null;
  workDate?: string | null;
  memo?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireMutableAdmin();
    const parsed = z
      .object({
        propertyId: z.string().uuid(),
        category: z.string().min(1).max(40),
        amount: z.number().int().min(0),
        payer: z.enum(["field_team", "company", "landlord"]).default("field_team"),
        provider: z.string().max(100).nullish(),
        workDate: z.string().nullish(),
        memo: z.string().max(300).nullish(),
      })
      .safeParse(input);
    if (!parsed.success) return { ok: false, error: "입력값이 올바르지 않습니다" };
    const d = parsed.data;

    const supabase = createServiceClient();
    const { error } = await supabase.from("auction_work_item").insert({
      auction_property_id: d.propertyId,
      category: d.category,
      amount: d.amount,
      payer: d.payer,
      provider: d.provider ?? null,
      work_date: d.workDate || null,
      memo: d.memo ?? null,
    });
    if (error) {
      return {
        ok: false,
        error: /payer|schema cache/i.test(error.message)
          ? "지출 컬럼이 없습니다. 마이그레이션 038 을 실행해주세요."
          : error.message,
      };
    }

    revalidatePath("/admin/auction/revenue");
    return { ok: true };
  } catch (e) {
    if (e instanceof AppError) return { ok: false, error: e.message };
    return { ok: false, error: "저장 중 오류가 발생했습니다." };
  }
}

/** 호실 지출 내역 */
export async function listWorkCosts(propertyId: string): Promise<WorkCostRow[]> {
  try {
    await requireAdmin();
    const id = z.string().uuid().safeParse(propertyId);
    if (!id.success) return [];
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("auction_work_item")
      .select("id, category, amount, payer, provider, work_date, memo")
      .eq("auction_property_id", id.data)
      .order("work_date", { ascending: false })
      .limit(200);
    if (error) return [];
    return (data ?? []) as WorkCostRow[];
  } catch {
    return [];
  }
}

/** 월별 수입 추이 (최근 12개월) */
export async function monthlyTrend(): Promise<
  { period: string; expected: number; received: number; count: number }[]
> {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("auction_rent_receipt")
      .select("period, expected, received")
      .order("period", { ascending: false })
      .limit(5000);
    if (error) return [];
    const m = new Map<
      string,
      { period: string; expected: number; received: number; count: number }
    >();
    for (const r of (data ?? []) as {
      period: string;
      expected: number | null;
      received: number | null;
    }[]) {
      const g = m.get(r.period) ?? { period: r.period, expected: 0, received: 0, count: 0 };
      g.expected += r.expected ?? 0;
      g.received += r.received ?? 0;
      g.count += 1;
      m.set(r.period, g);
    }
    return Array.from(m.values())
      .sort((a, b) => (a.period < b.period ? 1 : -1))
      .slice(0, 12);
  } catch {
    return [];
  }
}
