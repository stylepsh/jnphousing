/**
 * 답사자 배정 PDF — GET. 현재 '배정(assigned)' 상태 답사를 물건별 1페이지로 출력.
 * 각 페이지 QR → /admin/auction/inspect/[id] 모바일 입력 폼.
 * 보호: requireAdmin.
 */

import { NextResponse, type NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import QRCode from "qrcode";
import { requireAdmin } from "@/lib/auth-guard";
import { createServiceClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/errors";
import { AuctionInspectorPdf, type InspectorPdfUnit } from "@/lib/pdf/auction-inspector-pdf";

type Row = {
  id: string;
  inspector_name: string;
  requested_by_name: string | null;
  auction_property: {
    case_number: string;
    court: string | null;
    category: string | null;
    address: string;
    owner_name: string | null;
    appraisal_value: number | null;
    minimum_bid: number | null;
    auction_date: string | null;
  } | null;
};

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireAdmin();
    const supabase = createServiceClient();
    const inspectorFilter = req.nextUrl.searchParams.get("inspector");

    let q = supabase
      .from("auction_inspection")
      .select(
        "id, inspector_name, requested_by_name, auction_property:auction_property_id(case_number, court, category, address, owner_name, appraisal_value, minimum_bid, auction_date)",
      )
      .eq("status", "assigned")
      .order("assigned_at", { ascending: true });
    if (inspectorFilter) q = q.eq("inspector_name", inspectorFilter);

    const { data } = await q;
    const rows = (data ?? []) as Row[];
    if (rows.length === 0) {
      return NextResponse.json({ error: "배정된 답사가 없습니다." }, { status: 404 });
    }

    const origin = req.nextUrl.origin;
    const units: InspectorPdfUnit[] = [];
    for (const r of rows) {
      const url = `${origin}/admin/auction/inspect/${r.id}`;
      let qr: string | null = null;
      try {
        qr = await QRCode.toDataURL(url, { margin: 1, width: 180 });
      } catch {
        qr = null;
      }
      const p = r.auction_property;
      units.push({
        inspectionId: r.id,
        caseNumber: p?.case_number ?? "",
        court: p?.court ?? null,
        category: p?.category ?? null,
        address: p?.address ?? "",
        ownerName: p?.owner_name ?? null,
        appraisalValue: p?.appraisal_value ?? null,
        minimumBid: p?.minimum_bid ?? null,
        auctionDate: p?.auction_date ?? null,
        managerNote: r.requested_by_name ? `배정: ${r.requested_by_name}` : null,
        qrDataUrl: qr,
      });
    }

    const today = new Date().toISOString().slice(0, 10);
    const buf = await renderToBuffer(
      <AuctionInspectorPdf
        data={{ inspectorName: inspectorFilter || ctx.admin.name, printedAt: today, units }}
      />,
    );
    const u8 = new Uint8Array(buf);
    return new NextResponse(u8 as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="inspector_${today}_${units.length}.pdf"`,
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    });
  } catch (e) {
    if (e instanceof AppError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("[auction inspector PDF]", e);
    return NextResponse.json({ error: "PDF 생성 실패" }, { status: 500 });
  }
}
