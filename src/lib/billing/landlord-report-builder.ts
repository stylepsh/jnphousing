/**
 * 임대인 보고서 데이터 빌더 — DB 조회 → LandlordReportData 변환.
 */

import "server-only";
import { createServiceClient } from "@/lib/supabase/server";
import { monthRange, toIsoDate } from "@/lib/dates";
import type { Lease, RentInvoice, AgencyCommission, Tenant, PropertyUnit } from "@/types/lease";
import type { Property } from "@/types/database";
import type { LandlordReportData } from "@/lib/pdf/landlord-report";

export async function buildLandlordReportData(
  landlordId: string,
  landlordName: string,
  options: { periodStart?: Date; periodEnd?: Date; periodLabel?: string } = {},
): Promise<LandlordReportData> {
  const supabase = createServiceClient();
  const now = new Date();
  const { start, end } = options.periodStart && options.periodEnd
    ? { start: options.periodStart, end: options.periodEnd }
    : monthRange(now);
  const startIso = toIsoDate(start);
  const endIso = toIsoDate(end);
  const label = options.periodLabel ?? `${start.getFullYear()}년 ${start.getMonth() + 1}월`;

  // 본인 leases
  const { data: leasesData } = await supabase
    .from("leases")
    .select("id, rent_amount, fee_type, fee_percent, fee_fixed, tenant:tenants(name), unit:properties_units(unit_no, property:property_id(name))")
    .eq("landlord_id", landlordId);
  const leases = (leasesData ?? []) as unknown as (Pick<Lease, "id" | "rent_amount" | "fee_type" | "fee_percent" | "fee_fixed"> & {
    tenant: Pick<Tenant, "name"> | null;
    unit: (Pick<PropertyUnit, "unit_no"> & { property: Pick<Property, "name"> | null }) | null;
  })[];
  const leaseIds = leases.map((l) => l.id);
  const leaseMeta = new Map(leases.map((l) => [l.id, l]));

  let invoices: RentInvoice[] = [];
  let commissions: AgencyCommission[] = [];
  if (leaseIds.length > 0) {
    const [invRes, comRes] = await Promise.all([
      supabase
        .from("rent_invoices")
        .select("*")
        .in("lease_id", leaseIds)
        .gte("due_date", startIso)
        .lte("due_date", endIso),
      supabase
        .from("agency_commissions")
        .select("*")
        .in("lease_id", leaseIds)
        .gte("period_end", startIso)
        .lte("period_end", endIso),
    ]);
    invoices = (invRes.data ?? []) as RentInvoice[];
    commissions = (comRes.data ?? []) as AgencyCommission[];
  }

  const totalBilling = invoices.reduce((s, i) => s + i.amount_total, 0);
  const totalPaid = invoices.reduce((s, i) => s + i.paid_total, 0);
  const totalOutstanding = invoices
    .filter((i) => i.status !== "paid" && i.status !== "waived")
    .reduce((s, i) => s + Math.max(0, i.amount_total - i.paid_total), 0);
  const totalCommission = commissions.reduce((s, c) => s + c.commission_amount, 0);
  const netPayout = totalPaid - totalCommission;

  // 호실별 합계
  const breakdown = new Map<string, {
    unit_label: string;
    tenant_name: string;
    billing: number;
    paid: number;
    status: string;
    overdue_days: number;
  }>();

  for (const inv of invoices) {
    const meta = leaseMeta.get(inv.lease_id);
    if (!meta) continue;
    const key = inv.lease_id;
    const existing = breakdown.get(key);
    if (existing) {
      existing.billing += inv.amount_total;
      existing.paid += inv.paid_total;
      if (inv.status === "overdue" || (existing.status !== "overdue" && inv.status !== "paid")) {
        existing.status = inv.status;
      }
      existing.overdue_days = Math.max(existing.overdue_days, inv.overdue_days);
    } else {
      breakdown.set(key, {
        unit_label: `${meta.unit?.property?.name ?? "—"} · ${meta.unit?.unit_no ?? "—"}호`,
        tenant_name: meta.tenant?.name ?? "—",
        billing: inv.amount_total,
        paid: inv.paid_total,
        status: inv.status,
        overdue_days: inv.overdue_days,
      });
    }
  }

  return {
    landlord_name: landlordName,
    period_label: label,
    period_start: startIso,
    period_end: endIso,
    total_billing: totalBilling,
    total_paid: totalPaid,
    total_outstanding: totalOutstanding,
    total_commission: totalCommission,
    net_payout: netPayout,
    unit_breakdown: Array.from(breakdown.values()),
    generated_at: new Date().toISOString(),
  };
}
