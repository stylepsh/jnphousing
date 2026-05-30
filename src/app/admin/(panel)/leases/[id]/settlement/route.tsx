/**
 * 관리자 해지 정산서 PDF 다운로드 — 즉시 stream.
 *
 * 해지(terminated) 처리 시 lease_events 에 기록된 정산 payload 를 읽어 발행.
 * 보호: requireAdmin
 */

import { NextResponse, type NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { requireAdmin } from "@/lib/auth-guard";
import { createServiceClient } from "@/lib/supabase/server";
import { SettlementPdf } from "@/lib/pdf/settlement";
import { AppError } from "@/lib/errors";
import type { Lease, Tenant, PropertyUnit } from "@/types/lease";

interface SettlementPayload {
  termination_date: string;
  deposit: number;
  outstanding: number;
  restore_cost: number;
  refund: number;
  reason: string | null;
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await ctx.params;

    const supabase = createServiceClient();
    const { data: leaseData } = await supabase
      .from("leases")
      .select(`
        *,
        tenant:tenants(name),
        unit:properties_units(unit_no, properties(name))
      `)
      .eq("id", id)
      .maybeSingle();
    const lease = leaseData as unknown as (Lease & {
      tenant: Pick<Tenant, "name"> | null;
      unit: (Pick<PropertyUnit, "unit_no"> & { properties: { name: string } | null }) | null;
    }) | null;

    if (!lease) {
      return NextResponse.json({ error: "찾을 수 없음" }, { status: 404 });
    }

    // 가장 최근 해지 이벤트의 정산 payload
    const { data: evData } = await supabase
      .from("lease_events")
      .select("payload, event_date")
      .eq("lease_id", id)
      .eq("event_type", "terminated")
      .order("event_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    const payload = (evData?.payload ?? null) as SettlementPayload | null;
    if (!payload) {
      return NextResponse.json({ error: "해지 정산 기록이 없는 계약입니다. 먼저 해지 처리를 진행하세요." }, { status: 400 });
    }

    const unitLabel = `${lease.unit?.properties?.name ?? "—"} · ${lease.unit?.unit_no ?? "—"}호`;

    const buf = await renderToBuffer(
      <SettlementPdf
        data={{
          lease_id: lease.id,
          tenant_name: lease.tenant?.name ?? "—",
          unit_label: unitLabel,
          start_date: lease.start_date,
          termination_date: payload.termination_date,
          deposit: payload.deposit,
          outstanding: payload.outstanding,
          restore_cost: payload.restore_cost,
          refund: payload.refund,
          reason: payload.reason,
        }}
      />,
    );

    const u8 = new Uint8Array(buf);
    const filename = `settlement_${lease.id.slice(0, 8)}_${payload.termination_date}.pdf`;
    return new NextResponse(u8 as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    });
  } catch (e) {
    if (e instanceof AppError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("[settlement PDF]", e);
    return NextResponse.json({ error: "PDF 생성 실패" }, { status: 500 });
  }
}
