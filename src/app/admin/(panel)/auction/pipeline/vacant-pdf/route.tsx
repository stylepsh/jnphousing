/**
 * 공실 인계 리스트 PDF — GET. 상품화 단계(승인/준비/진행/임대가능) 물건을 B팀 작업 의뢰서로 출력.
 * 보호: requireAdmin.
 */

import { NextResponse, type NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { requireAdmin } from "@/lib/auth-guard";
import { createServiceClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/errors";
import { AuctionVacantPdf, type VacantPdfItem } from "@/lib/pdf/auction-vacant-pdf";

const STAGES = ["Approved", "WorkPrep", "Merchandising", "Available"];

export async function GET(_req: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();

    const { data: props } = await supabase
      .from("auction_property")
      .select("id, case_number, address, owner_name, pipeline_state")
      .in("pipeline_state", STAGES)
      .order("pipeline_entered_at", { ascending: true });

    const properties = (props ?? []) as {
      id: string;
      case_number: string;
      address: string;
      owner_name: string | null;
      pipeline_state: string;
    }[];

    // 답사자/메모 매핑 (공실 답사 우선, 최신순)
    const ids = properties.map((p) => p.id);
    const inspByProp = new Map<string, { inspector_name: string; comment: string | null }>();
    if (ids.length > 0) {
      const { data: insps } = await supabase
        .from("auction_inspection")
        .select("auction_property_id, inspector_name, comment, occupancy, submitted_at")
        .in("auction_property_id", ids)
        .order("submitted_at", { ascending: false });
      for (const r of (insps ?? []) as {
        auction_property_id: string;
        inspector_name: string;
        comment: string | null;
        occupancy: string | null;
      }[]) {
        if (!inspByProp.has(r.auction_property_id)) {
          inspByProp.set(r.auction_property_id, { inspector_name: r.inspector_name, comment: r.comment });
        }
      }
    }

    const items: VacantPdfItem[] = properties.map((p) => ({
      case_number: p.case_number,
      address: p.address,
      owner_name: p.owner_name,
      pipeline_state: p.pipeline_state,
      inspector_name: inspByProp.get(p.id)?.inspector_name ?? null,
      inspector_comment: inspByProp.get(p.id)?.comment ?? null,
    }));

    const today = new Date().toISOString().slice(0, 10);
    const buf = await renderToBuffer(<AuctionVacantPdf data={{ printedAt: today, items }} />);
    const u8 = new Uint8Array(buf);
    return new NextResponse(u8 as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="vacant_${today}_${items.length}.pdf"`,
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    });
  } catch (e) {
    if (e instanceof AppError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("[auction vacant PDF]", e);
    return NextResponse.json({ error: "PDF 생성 실패" }, { status: 500 });
  }
}
