"use server";

/**
 * billing 엔진 — DB 연동 Server Actions.
 *
 * 호출 컨텍스트:
 * - 대부분 관리자 페이지(/admin)에서 직접 호출 → requireAdmin 보호.
 * - 일부는 cron 트리거 (Phase 9). cron 은 별도 라우트 핸들러에서 service_role 직접 사용 + 시크릿 헤더로 보호.
 */

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { requireMutableAdmin } from "@/lib/auth-guard";
import { AppError } from "@/lib/errors";
import { buildSchedules } from "@/lib/billing/schedule-builder";
import { applyPaymentToInvoice } from "@/lib/billing/payment-allocator";
import { computeOverdue } from "@/lib/billing/overdue-calc";
import { computeMonthCommission } from "@/lib/billing/commission-calc";
import { vatOf } from "@/lib/money";
import { toIsoDate, monthRange } from "@/lib/dates";
import type {
  Lease,
  RentInvoice,
  RentSchedule,
  InvoiceStatus,
} from "@/types/lease";

/* =========================================================================
 * 3-1. 계약 활성화 + 스케줄 일괄 생성
 * ========================================================================= */

export async function activateLease(leaseId: string) {
  try {
    await requireMutableAdmin();
    if (!z.string().uuid().safeParse(leaseId).success) {
      return { ok: false as const, error: "잘못된 ID" };
    }
    const supabase = createServiceClient();

    const { data: leaseData, error: leaseErr } = await supabase
      .from("leases")
      .select("*")
      .eq("id", leaseId)
      .maybeSingle();
    const lease = leaseData as Lease | null;
    if (leaseErr || !lease) {
      return { ok: false as const, error: "계약을 찾을 수 없습니다." };
    }
    if (lease.status !== "draft" && lease.status !== "active") {
      return { ok: false as const, error: "draft 또는 active 상태의 계약만 활성화 가능합니다." };
    }

    const rows = buildSchedules(lease);

    // 기존 스케줄 삭제 (active 재생성 케이스 대비).
    await supabase.from("rent_schedules").delete().eq("lease_id", leaseId);
    const { error: insErr } = await supabase.from("rent_schedules").insert(rows);
    if (insErr) {
      console.error("[activateLease] schedules insert", insErr);
      return { ok: false as const, error: "스케줄 생성 실패" };
    }

    // 계약 상태 active 로
    await supabase.from("leases").update({ status: "active" }).eq("id", leaseId);

    // 이벤트 기록
    await supabase.from("lease_events").insert({
      lease_id: leaseId,
      event_type: "schedule_generated",
      payload: { count: rows.length, start: rows[0]?.due_date, end: rows.at(-1)?.due_date },
    });
    await supabase.from("lease_events").insert({
      lease_id: leaseId,
      event_type: "activated",
      payload: {},
    });

    revalidatePath(`/admin/leases/${leaseId}`);
    revalidatePath("/admin/leases");
    revalidatePath("/admin/rent");
    return { ok: true as const, count: rows.length };
  } catch (e) {
    if (e instanceof AppError) return { ok: false as const, error: e.message };
    console.error("[activateLease] unhandled", e);
    return { ok: false as const, error: "처리 중 오류가 발생했습니다." };
  }
}

/* =========================================================================
 * 3-2. invoice 발행 — due_date 임박 schedule 을 invoice 로 issue.
 * 매일 cron + 수동 트리거 둘 다 지원.
 * ========================================================================= */

export async function issueInvoicesForDate(targetDate: string, leadDays = 3) {
  try {
    await requireMutableAdmin();
    if (!z.string().regex(/^\d{4}-\d{2}-\d{2}$/).safeParse(targetDate).success) {
      return { ok: false as const, error: "날짜 형식 오류" };
    }
    const supabase = createServiceClient();

    // 발행 대상: due_date <= targetDate + leadDays, 아직 invoice 없는 schedule
    const cutoff = new Date(targetDate);
    cutoff.setDate(cutoff.getDate() + leadDays);
    const cutoffIso = toIsoDate(cutoff);

    const { data: schedulesData, error: schErr } = await supabase
      .from("rent_schedules")
      .select("*")
      .lte("due_date", cutoffIso)
      .limit(1000);
    if (schErr) return { ok: false as const, error: "스케줄 조회 실패" };
    const schedules = (schedulesData ?? []) as RentSchedule[];

    if (schedules.length === 0) return { ok: true as const, issued: 0 };

    // 이미 발행된 schedule_id 조회
    const ids = schedules.map((s) => s.id);
    const { data: existingData } = await supabase
      .from("rent_invoices")
      .select("schedule_id")
      .in("schedule_id", ids);
    const existing = new Set(((existingData ?? []) as { schedule_id: string }[]).map((r) => r.schedule_id));

    const toInsert = schedules
      .filter((s) => !existing.has(s.id))
      .map((s) => ({
        schedule_id: s.id,
        lease_id: s.lease_id,
        due_date: s.due_date,
        amount_total: s.amount_total,
        paid_total: 0,
        status: "unpaid" as InvoiceStatus,
      }));

    if (toInsert.length === 0) return { ok: true as const, issued: 0 };

    const { error: insErr } = await supabase.from("rent_invoices").insert(toInsert);
    if (insErr) {
      console.error("[issueInvoices]", insErr);
      return { ok: false as const, error: "청구서 발행 실패" };
    }

    // lease_events 기록 (lease 별로 1건씩)
    const leaseIds = Array.from(new Set(toInsert.map((r) => r.lease_id)));
    await supabase.from("lease_events").insert(
      leaseIds.map((id) => ({
        lease_id: id,
        event_type: "invoice_issued" as const,
        payload: { count: toInsert.filter((r) => r.lease_id === id).length, target_date: targetDate },
      })),
    );

    revalidatePath("/admin/rent");
    return { ok: true as const, issued: toInsert.length };
  } catch (e) {
    if (e instanceof AppError) return { ok: false as const, error: e.message };
    console.error("[issueInvoicesForDate] unhandled", e);
    return { ok: false as const, error: "처리 중 오류가 발생했습니다." };
  }
}

/* =========================================================================
 * 3-3. 수기 입금 등록 (apply-payment)
 * ========================================================================= */

const recordPaymentSchema = z.object({
  invoice_id: z.string().uuid(),
  amount: z.coerce.number().int().positive(),
  paid_at: z.string().optional(),                       // ISO datetime 또는 빈값
  memo: z.string().max(500).optional(),
  source: z.enum(["manual", "bank_csv", "virtual_account"]).default("manual"),
  /** 다음 invoice 로 overflow 자동 충당. */
  cascade: z.boolean().default(true),
});

export async function recordPayment(formData: FormData) {
  try {
    const ctx = await requireMutableAdmin();
    const raw = {
      invoice_id: formData.get("invoice_id"),
      amount: formData.get("amount"),
      paid_at: formData.get("paid_at") || undefined,
      memo: formData.get("memo") || undefined,
      source: formData.get("source") || "manual",
      cascade: formData.get("cascade") !== "false",
    };
    const parsed = recordPaymentSchema.safeParse(raw);
    if (!parsed.success) return { ok: false as const, error: "입력값을 확인해 주세요." };

    const supabase = createServiceClient();
    let remaining = parsed.data.amount;
    let invoiceId: string | null = parsed.data.invoice_id;
    const paidAt = parsed.data.paid_at ? new Date(parsed.data.paid_at).toISOString() : new Date().toISOString();

    while (remaining > 0 && invoiceId) {
      const { data: invData } = await supabase
        .from("rent_invoices")
        .select("*")
        .eq("id", invoiceId)
        .maybeSingle();
      const invoice = invData as RentInvoice | null;
      if (!invoice) break;
      if (invoice.status === "paid" || invoice.status === "waived") {
        if (!parsed.data.cascade) break;
        // 다음 invoice 로
        invoiceId = await findNextUnpaidInvoice(supabase, invoice.lease_id, invoice.due_date);
        continue;
      }

      const allocate = Math.min(remaining, invoice.amount_total - invoice.paid_total);
      const result = applyPaymentToInvoice({
        amount_total: invoice.amount_total,
        paid_total: invoice.paid_total,
        payment_amount: allocate,
      });

      // payment row + invoice update
      const { error: payErr } = await supabase.from("rent_payments").insert({
        invoice_id: invoice.id,
        paid_at: paidAt,
        amount: allocate,
        source: parsed.data.source,
        memo: parsed.data.memo ?? null,
        recorded_by: ctx.user.id,
      });
      if (payErr) {
        console.error("[recordPayment] insert payment", payErr);
        return { ok: false as const, error: "입금 등록 실패" };
      }

      await supabase
        .from("rent_invoices")
        .update({
          paid_total: result.new_paid_total,
          status: result.new_status,
        })
        .eq("id", invoice.id);

      await supabase.from("lease_events").insert({
        lease_id: invoice.lease_id,
        event_type: "payment_received",
        payload: { invoice_id: invoice.id, amount: allocate, status: result.new_status },
        created_by: ctx.user.id,
      });

      remaining -= allocate;

      if (parsed.data.cascade && remaining > 0) {
        invoiceId = await findNextUnpaidInvoice(supabase, invoice.lease_id, invoice.due_date);
      } else {
        invoiceId = null;
      }
    }

    revalidatePath("/admin/rent");
    revalidatePath("/admin/rent/invoices");
    return { ok: true as const, leftover: remaining };
  } catch (e) {
    if (e instanceof AppError) return { ok: false as const, error: e.message };
    console.error("[recordPayment] unhandled", e);
    return { ok: false as const, error: "처리 중 오류가 발생했습니다." };
  }
}

async function findNextUnpaidInvoice(
  supabase: ReturnType<typeof createServiceClient>,
  leaseId: string,
  afterDueDate: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("rent_invoices")
    .select("id")
    .eq("lease_id", leaseId)
    .in("status", ["unpaid", "partial", "overdue"])
    .gt("due_date", afterDueDate)
    .order("due_date", { ascending: true })
    .limit(1);
  const row = (data as { id: string }[] | null)?.[0];
  return row?.id ?? null;
}

/* =========================================================================
 * 3-4. 연체 갱신 — 매일 cron
 * ========================================================================= */

export async function refreshOverdueInvoices(now = new Date()) {
  try {
    await requireMutableAdmin();
    const supabase = createServiceClient();
    const today = toIsoDate(now);

    // 대상: due_date < today, status in (unpaid, partial, overdue)
    const { data, error } = await supabase
      .from("rent_invoices")
      .select("*, lease:leases(overdue_annual_rate)")
      .lt("due_date", today)
      .in("status", ["unpaid", "partial", "overdue"])
      .limit(2000);
    if (error) {
      console.error("[refreshOverdue]", error);
      return { ok: false as const, error: "조회 실패" };
    }

    type Row = RentInvoice & { lease: { overdue_annual_rate: number } | null };
    const rows = (data ?? []) as Row[];
    let updated = 0;

    for (const r of rows) {
      const rate = r.lease?.overdue_annual_rate ?? 12;
      const result = computeOverdue({
        due_date: r.due_date,
        amount_total: r.amount_total,
        paid_total: r.paid_total,
        status: r.status,
        annual_rate_percent: rate,
        now,
      });
      const { error: upErr } = await supabase
        .from("rent_invoices")
        .update({
          status: result.new_status,
          overdue_days: result.overdue_days,
          overdue_interest: result.overdue_interest,
        })
        .eq("id", r.id);
      if (!upErr) updated += 1;
    }

    revalidatePath("/admin/rent/overdue");
    return { ok: true as const, updated };
  } catch (e) {
    if (e instanceof AppError) return { ok: false as const, error: e.message };
    console.error("[refreshOverdueInvoices] unhandled", e);
    return { ok: false as const, error: "처리 중 오류가 발생했습니다." };
  }
}

/* =========================================================================
 * 3-5. 월별 위탁수수료 정산 생성
 * ========================================================================= */

export async function generateMonthlyCommissions(year: number, month1Based: number) {
  try {
    await requireMutableAdmin();
    if (!Number.isInteger(year) || !Number.isInteger(month1Based) || month1Based < 1 || month1Based > 12) {
      return { ok: false as const, error: "잘못된 연/월" };
    }
    const supabase = createServiceClient();
    const range = monthRange(new Date(year, month1Based - 1, 15));
    const periodStart = toIsoDate(range.start);
    const periodEnd = toIsoDate(range.end);

    // active 또는 expiring 계약 전부
    const { data: leases } = await supabase
      .from("leases")
      .select("id, fee_type, fee_percent, fee_fixed")
      .in("status", ["active", "expiring"])
      .limit(5000);
    const leaseRows = (leases ?? []) as Pick<Lease, "id" | "fee_type" | "fee_percent" | "fee_fixed">[];

    let inserted = 0;
    for (const lease of leaseRows) {
      // 해당 월에 paid 된 invoice 의 amount_rent 합산
      // (rent_schedules 기준 amount_rent 합 사용 — invoice 자체에는 rent 분리 컬럼이 없음)
      const { data: paidInvData } = await supabase
        .from("rent_invoices")
        .select("schedule_id, paid_total, amount_total")
        .eq("lease_id", lease.id)
        .eq("status", "paid")
        .gte("issued_at", `${periodStart}T00:00:00Z`)
        .lte("issued_at", `${periodEnd}T23:59:59Z`);
      const paidInvs = (paidInvData ?? []) as { schedule_id: string; paid_total: number; amount_total: number }[];

      if (paidInvs.length === 0) continue;

      const scheduleIds = paidInvs.map((i) => i.schedule_id);
      const { data: schData } = await supabase
        .from("rent_schedules")
        .select("id, amount_rent")
        .in("id", scheduleIds);
      const schMap = new Map(((schData ?? []) as { id: string; amount_rent: number }[]).map((s) => [s.id, s.amount_rent]));

      const paidRentTotal = paidInvs.reduce((acc, inv) => acc + (schMap.get(inv.schedule_id) ?? 0), 0);
      const commission = computeMonthCommission({
        fee_type: lease.fee_type,
        fee_percent: lease.fee_percent,
        fee_fixed: lease.fee_fixed,
        paid_rent_total: paidRentTotal,
        fixed_count: lease.fee_type === "fixed" ? paidInvs.length : undefined,
      });

      if (commission.commission_amount === 0) continue;

      const { error: upErr } = await supabase
        .from("agency_commissions")
        .upsert({
          lease_id: lease.id,
          period_start: periodStart,
          period_end: periodEnd,
          base_amount: commission.base_amount,
          commission_amount: commission.commission_amount,
          status: "pending" as const,
        }, { onConflict: "lease_id,period_start,period_end" });
      if (!upErr) inserted += 1;
    }

    revalidatePath("/admin/commissions");
    return { ok: true as const, inserted };
  } catch (e) {
    if (e instanceof AppError) return { ok: false as const, error: e.message };
    console.error("[generateMonthlyCommissions] unhandled", e);
    return { ok: false as const, error: "처리 중 오류가 발생했습니다." };
  }
}

/* =========================================================================
 * 3-6. 계약 해지 (terminate) — 보증금 정산 시뮬레이션
 * ========================================================================= */

const terminateSchema = z.object({
  lease_id: z.string().uuid(),
  termination_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  restore_cost: z.coerce.number().int().min(0).default(0),
  reason: z.string().max(1000).optional(),
});

export async function terminateLease(formData: FormData) {
  try {
    const ctx = await requireMutableAdmin();
    const parsed = terminateSchema.safeParse({
      lease_id: formData.get("lease_id"),
      termination_date: formData.get("termination_date"),
      restore_cost: formData.get("restore_cost") || 0,
      reason: formData.get("reason") || undefined,
    });
    if (!parsed.success) return { ok: false as const, error: "입력값을 확인해 주세요." };

    const supabase = createServiceClient();

    // lease 조회
    const { data: leaseData } = await supabase
      .from("leases")
      .select("*")
      .eq("id", parsed.data.lease_id)
      .maybeSingle();
    const lease = leaseData as Lease | null;
    if (!lease) return { ok: false as const, error: "계약을 찾을 수 없습니다." };
    if (lease.status === "terminated" || lease.status === "expired") {
      return { ok: false as const, error: "이미 종료된 계약입니다." };
    }

    // 미납 invoice 합계
    const { data: outstandingData } = await supabase
      .from("rent_invoices")
      .select("amount_total, paid_total, overdue_interest")
      .eq("lease_id", lease.id)
      .in("status", ["unpaid", "partial", "overdue"]);
    const outstanding = ((outstandingData ?? []) as { amount_total: number; paid_total: number; overdue_interest: number }[])
      .reduce((acc, r) => acc + Math.max(0, r.amount_total - r.paid_total) + r.overdue_interest, 0);

    // 보증금 정산
    const deduction = outstanding + parsed.data.restore_cost;
    const refund = lease.deposit - deduction;

    // 잔여 스케줄 삭제 (termination_date 이후)
    await supabase
      .from("rent_schedules")
      .delete()
      .eq("lease_id", lease.id)
      .gt("due_date", parsed.data.termination_date);

    // 계약 상태
    await supabase
      .from("leases")
      .update({ status: "terminated", end_date: parsed.data.termination_date })
      .eq("id", lease.id);

    // 이벤트
    await supabase.from("lease_events").insert({
      lease_id: lease.id,
      event_type: "terminated",
      payload: {
        termination_date: parsed.data.termination_date,
        deposit: lease.deposit,
        outstanding,
        restore_cost: parsed.data.restore_cost,
        refund,
        reason: parsed.data.reason ?? null,
      },
      created_by: ctx.user.id,
    });

    revalidatePath(`/admin/leases/${lease.id}`);
    revalidatePath("/admin/leases");
    return {
      ok: true as const,
      settlement: { deposit: lease.deposit, outstanding, restore_cost: parsed.data.restore_cost, refund },
    };
  } catch (e) {
    if (e instanceof AppError) return { ok: false as const, error: e.message };
    console.error("[terminateLease] unhandled", e);
    return { ok: false as const, error: "처리 중 오류가 발생했습니다." };
  }
}

/* =========================================================================
 * 3-7. 갱신 (renew) — 새 lease 생성, prev_lease_id 참조
 * ========================================================================= */

const renewSchema = z.object({
  lease_id: z.string().uuid(),
  new_start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  new_end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  new_deposit: z.coerce.number().int().min(0).optional(),
  new_rent_amount: z.coerce.number().int().min(0).optional(),
  new_management_fee: z.coerce.number().int().min(0).optional(),
});

export async function renewLease(formData: FormData) {
  try {
    const ctx = await requireMutableAdmin();
    const parsed = renewSchema.safeParse({
      lease_id: formData.get("lease_id"),
      new_start_date: formData.get("new_start_date"),
      new_end_date: formData.get("new_end_date"),
      new_deposit: formData.get("new_deposit") || undefined,
      new_rent_amount: formData.get("new_rent_amount") || undefined,
      new_management_fee: formData.get("new_management_fee") || undefined,
    });
    if (!parsed.success) return { ok: false as const, error: "입력값을 확인해 주세요." };

    const supabase = createServiceClient();
    const { data: prevData } = await supabase
      .from("leases")
      .select("*")
      .eq("id", parsed.data.lease_id)
      .maybeSingle();
    const prev = prevData as Lease | null;
    if (!prev) return { ok: false as const, error: "원 계약을 찾을 수 없습니다." };
    if (parsed.data.new_end_date < parsed.data.new_start_date) {
      return { ok: false as const, error: "종료일이 시작일보다 빠를 수 없습니다." };
    }

    const newLease = {
      prev_lease_id: prev.id,
      lease_type: prev.lease_type,
      unit_id: prev.unit_id,
      landlord_id: prev.landlord_id,
      tenant_id: prev.tenant_id,
      status: "active" as const,
      start_date: parsed.data.new_start_date,
      end_date: parsed.data.new_end_date,
      deposit: parsed.data.new_deposit ?? prev.deposit,
      rent_amount: parsed.data.new_rent_amount ?? prev.rent_amount,
      rent_cycle: prev.rent_cycle,
      rent_day: prev.rent_day,
      management_fee: parsed.data.new_management_fee ?? prev.management_fee,
      vat_included: prev.vat_included,
      fee_type: prev.fee_type,
      fee_percent: prev.fee_percent,
      fee_fixed: prev.fee_fixed,
      overdue_annual_rate: prev.overdue_annual_rate,
      special_terms: prev.special_terms,
    };

    const { data: insertedData, error: insErr } = await supabase
      .from("leases")
      .insert(newLease)
      .select("id")
      .single();
    if (insErr) {
      console.error("[renewLease]", insErr);
      return { ok: false as const, error: "갱신 계약 생성 실패" };
    }
    const newId = (insertedData as { id: string }).id;

    // prev 상태 renewed
    await supabase.from("leases").update({ status: "renewed" }).eq("id", prev.id);

    // 이벤트
    await supabase.from("lease_events").insert([
      {
        lease_id: prev.id,
        event_type: "renewed",
        payload: { new_lease_id: newId },
        created_by: ctx.user.id,
      },
      {
        lease_id: newId,
        event_type: "created",
        payload: { prev_lease_id: prev.id },
        created_by: ctx.user.id,
      },
    ]);

    // 스케줄 생성
    const newLeaseRow = (await supabase.from("leases").select("*").eq("id", newId).maybeSingle()).data as Lease;
    const schedules = buildSchedules(newLeaseRow);
    await supabase.from("rent_schedules").insert(schedules);
    await supabase.from("lease_events").insert({
      lease_id: newId,
      event_type: "schedule_generated",
      payload: { count: schedules.length },
    });

    revalidatePath("/admin/leases");
    return { ok: true as const, new_lease_id: newId };
  } catch (e) {
    if (e instanceof AppError) return { ok: false as const, error: e.message };
    console.error("[renewLease] unhandled", e);
    return { ok: false as const, error: "처리 중 오류가 발생했습니다." };
  }
}

// VAT 계산 헬퍼 재export
export { vatOf };
