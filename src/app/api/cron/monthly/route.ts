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

  // 계약별 루프 안에서 청구·스케줄을 매번 조회하던 N+1(최악 ~1.5만 호출)을 제거.
  // 기간 전체를 일괄 조회한 뒤 메모리에서 계약별로 집계한다. IN 목록이 너무
  // 길어지지 않게 청크로 나눠 호출.
  const chunk = <T,>(arr: T[], size: number): T[][] => {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  };

  const leaseIds = leaseRows.map((l) => l.id);

  // 1) 기간 내 paid 청구 일괄 조회 → 계약별로 묶고, 등장한 schedule_id 수집
  const invsByLease = new Map<string, { schedule_id: string }[]>();
  const scheduleIdSet = new Set<string>();
  for (const ids of chunk(leaseIds, 400)) {
    const { data } = await supabase
      .from("rent_invoices")
      .select("lease_id, schedule_id")
      .in("lease_id", ids)
      .eq("status", "paid")
      .gte("issued_at", `${periodStart}T00:00:00Z`)
      .lte("issued_at", `${periodEnd}T23:59:59Z`);
    for (const r of (data ?? []) as { lease_id: string; schedule_id: string }[]) {
      if (!invsByLease.has(r.lease_id)) invsByLease.set(r.lease_id, []);
      invsByLease.get(r.lease_id)!.push({ schedule_id: r.schedule_id });
      if (r.schedule_id) scheduleIdSet.add(r.schedule_id);
    }
  }

  // 2) 스케줄 임대료 일괄 조회
  const schMap = new Map<string, number>();
  for (const ids of chunk([...scheduleIdSet], 400)) {
    const { data } = await supabase.from("rent_schedules").select("id, amount_rent").in("id", ids);
    for (const s of (data ?? []) as { id: string; amount_rent: number }[]) schMap.set(s.id, s.amount_rent);
  }

  // 3) 계약별 커미션 계산 (계산 로직은 종전과 동일)
  const upsertRows: {
    lease_id: string;
    period_start: string;
    period_end: string;
    base_amount: number;
    commission_amount: number;
    status: "pending";
  }[] = [];
  for (const lease of leaseRows) {
    const paidInvs = invsByLease.get(lease.id) ?? [];
    if (paidInvs.length === 0) continue;
    const paidRentTotal = paidInvs.reduce((acc, inv) => acc + (schMap.get(inv.schedule_id) ?? 0), 0);

    const commission = computeMonthCommission({
      fee_type: lease.fee_type,
      fee_percent: lease.fee_percent,
      fee_fixed: lease.fee_fixed,
      paid_rent_total: paidRentTotal,
      fixed_count: lease.fee_type === "fixed" ? paidInvs.length : undefined,
    });
    if (commission.commission_amount === 0) continue;

    upsertRows.push({
      lease_id: lease.id,
      period_start: periodStart,
      period_end: periodEnd,
      base_amount: commission.base_amount,
      commission_amount: commission.commission_amount,
      status: "pending",
    });
  }

  // 4) 일괄 upsert (청크)
  let inserted = 0;
  for (const batch of chunk(upsertRows, 500)) {
    const { error } = await supabase
      .from("agency_commissions")
      .upsert(batch, { onConflict: "lease_id,period_start,period_end" });
    if (!error) inserted += batch.length;
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
