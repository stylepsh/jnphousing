/**
 * 매일 cron — 청구서 발행 + 연체 갱신.
 *
 * 호출:
 *   GET /api/cron/daily
 *   Header: x-cron-secret: $CRON_SECRET
 *
 * Vercel Cron 또는 외부 cron-job.org 에서 호출.
 *
 * 보호:
 * - CRON_SECRET 환경변수 일치 검증
 * - service_role 만 작업 (RLS 우회 OK)
 */

import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { buildSchedules } from "@/lib/billing/schedule-builder";
import { computeOverdue } from "@/lib/billing/overdue-calc";
import { toIsoDate } from "@/lib/dates";
import type { RentInvoice, RentSchedule, Lease, InvoiceStatus } from "@/types/lease";

function authorize(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const provided = req.headers.get("x-cron-secret");
  // Vercel Cron 은 Authorization: Bearer 형식. 둘 다 허용.
  const bearer = req.headers.get("authorization");
  return provided === secret || bearer === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!authorize(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const supabase = createServiceClient();
  const now = new Date();
  const today = toIsoDate(now);
  const lead = new Date(now);
  lead.setDate(lead.getDate() + 3);
  const leadIso = toIsoDate(lead);

  // 1) issueInvoices (lead 3일)
  let issued = 0;
  try {
    const { data: schedulesData } = await supabase
      .from("rent_schedules")
      .select("*")
      .lte("due_date", leadIso)
      .limit(2000);
    const schedules = (schedulesData ?? []) as RentSchedule[];
    if (schedules.length > 0) {
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
      if (toInsert.length > 0) {
        await supabase.from("rent_invoices").insert(toInsert);
        issued = toInsert.length;
      }
    }
  } catch (e) {
    console.error("[cron/daily issue]", e);
  }

  // 2) refreshOverdue
  let overdueUpdated = 0;
  try {
    const { data } = await supabase
      .from("rent_invoices")
      .select("*, lease:leases(overdue_annual_rate)")
      .lt("due_date", today)
      .in("status", ["unpaid", "partial", "overdue"])
      .limit(2000);
    type Row = RentInvoice & { lease: { overdue_annual_rate: number } | null };
    const rows = (data ?? []) as Row[];
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
      await supabase.from("rent_invoices").update({
        status: result.new_status,
        overdue_days: result.overdue_days,
        overdue_interest: result.overdue_interest,
      }).eq("id", r.id);
      overdueUpdated += 1;
    }
  } catch (e) {
    console.error("[cron/daily overdue]", e);
  }

  // 3) 만료 임박 lease → status='expiring' (60일 이내)
  let expiringMarked = 0;
  try {
    const target = new Date(now);
    target.setDate(target.getDate() + 60);
    const { data } = await supabase
      .from("leases")
      .select("id")
      .eq("status", "active")
      .lte("end_date", toIsoDate(target));
    const ids = ((data ?? []) as { id: string }[]).map((r) => r.id);
    if (ids.length > 0) {
      await supabase.from("leases").update({ status: "expiring" }).in("id", ids);
      expiringMarked = ids.length;
    }
  } catch (e) {
    console.error("[cron/daily expiring]", e);
  }

  // 4) 만료 lease → status='expired'
  let expired = 0;
  try {
    const { data } = await supabase
      .from("leases")
      .select("id")
      .in("status", ["active", "expiring"])
      .lt("end_date", today);
    const ids = ((data ?? []) as { id: string }[]).map((r) => r.id);
    if (ids.length > 0) {
      await supabase.from("leases").update({ status: "expired" }).in("id", ids);
      expired = ids.length;
    }
  } catch (e) {
    console.error("[cron/daily expired]", e);
  }

  // 감사 로그
  await supabase.from("audit_logs").insert({
    actor_role: "service",
    action: "cron.daily",
    resource_type: "system",
    resource_id: null,
    after: { issued, overdueUpdated, expiringMarked, expired },
    ip: req.headers.get("x-forwarded-for")?.split(",")[0] ?? null,
    user_agent: req.headers.get("user-agent"),
  });

  return NextResponse.json({ ok: true, issued, overdueUpdated, expiringMarked, expired });
}

// schedule-builder 미사용 import 방지
void buildSchedules;
