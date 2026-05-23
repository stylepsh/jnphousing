/**
 * 관리자 영수증 PDF 다운로드 — 즉시 stream.
 *
 * 보호: requireAdmin
 */

import { NextResponse, type NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { requireAdmin } from "@/lib/auth-guard";
import { createServiceClient } from "@/lib/supabase/server";
import { ReceiptPdf } from "@/lib/pdf/receipt";
import { formatKoreanDate } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import type { RentInvoice, RentSchedule, Lease, Tenant, PropertyUnit } from "@/types/lease";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await ctx.params;

    const supabase = createServiceClient();
    const { data: invData } = await supabase
      .from("rent_invoices")
      .select(`
        *,
        schedule:rent_schedules(amount_rent, amount_management, amount_vat),
        lease:leases(
          *,
          tenant:tenants(name),
          unit:properties_units(unit_no, properties(name))
        )
      `)
      .eq("id", id)
      .maybeSingle();
    const invoice = invData as unknown as (RentInvoice & {
      schedule: Pick<RentSchedule, "amount_rent" | "amount_management" | "amount_vat"> | null;
      lease: (Lease & {
        tenant: Pick<Tenant, "name"> | null;
        unit: (Pick<PropertyUnit, "unit_no"> & { properties: { name: string } | null }) | null;
      }) | null;
    }) | null;

    if (!invoice) {
      return NextResponse.json({ error: "찾을 수 없음" }, { status: 404 });
    }
    if (invoice.paid_total <= 0) {
      return NextResponse.json({ error: "입금 내역이 없는 청구서는 영수증을 발행할 수 없습니다." }, { status: 400 });
    }

    const unitLabel = `${invoice.lease?.unit?.properties?.name ?? "—"} · ${invoice.lease?.unit?.unit_no ?? "—"}호`;
    const monthIdx = Number(invoice.due_date.slice(5, 7));
    const yearStr = invoice.due_date.slice(0, 4);
    const periodLabel = `${yearStr}년 ${monthIdx}월`;

    const buf = await renderToBuffer(
      <ReceiptPdf
        data={{
          invoice_id: invoice.id,
          issued_at: invoice.issued_at,
          paid_at: new Date().toISOString(),
          tenant_name: invoice.lease?.tenant?.name ?? "—",
          unit_label: unitLabel,
          amount_rent: invoice.schedule?.amount_rent ?? 0,
          amount_management: invoice.schedule?.amount_management ?? 0,
          amount_vat: invoice.schedule?.amount_vat ?? 0,
          amount_total: invoice.amount_total,
          paid_amount: invoice.paid_total,
          period_label: periodLabel,
        }}
      />,
    );

    const u8 = new Uint8Array(buf);
    const filename = `receipt_${invoice.id.slice(0, 8)}_${invoice.due_date}.pdf`;
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
    console.error("[receipt PDF]", e);
    return NextResponse.json({ error: "PDF 생성 실패" }, { status: 500 });
  }
}
