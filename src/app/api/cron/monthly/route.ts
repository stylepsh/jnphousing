/**
 * 매월 cron — 위탁수수료 정산 생성.
 *
 * 호출: GET /api/cron/monthly  Header: x-cron-secret
 * 매월 1일 0시 (이전 월에 대해 정산).
 */

import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { computeMonthCommission } from "@/lib/billing/commission-calc";
import { monthRange, toIsoDate } from "@/lib/dates";
import type { Lease } from "@/types/lease";

function authorize(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const provided = req.headers.get("x-cron-secret");
  const bearer = req.headers.get("authorization");
  return provided === secret || bearer === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!authorize(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  // 어제 일자 기준의 월 = 이전 월
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const range = monthRange(yesterday);
  const periodStart = toIsoDate(range.start);
  const periodEnd = toIsoDate(range.end);

  const { data: leases } = await supabase
    .from("leases")
    .select("id, fee_type, fee_percent, fee_fixed")
    .in("status", ["active", "expiring", "renewed", "terminated", "expired"])
    .limit(5000);
  const leaseRows = (leases ?? []) as Pick<Lease, "id" | "fee_type" | "fee_percent" | "fee_fixed">[];

  let inserted = 0;
  for (const lease of leaseRows) {
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

    const { error } = await supabase.from("agency_commissions").upsert({
      lease_id: lease.id,
      period_start: periodStart,
      period_end: periodEnd,
      base_amount: commission.base_amount,
      commission_amount: commission.commission_amount,
      status: "pending" as const,
    }, { onConflict: "lease_id,period_start,period_end" });
    if (!error) inserted += 1;
  }

  await supabase.from("audit_logs").insert({
    actor_role: "service",
    action: "cron.monthly_commission",
    resource_type: "system",
    after: { period: { start: periodStart, end: periodEnd }, inserted },
    ip: req.headers.get("x-forwarded-for")?.split(",")[0] ?? null,
  });

  return NextResponse.json({ ok: true, period: { start: periodStart, end: periodEnd }, inserted });
}
