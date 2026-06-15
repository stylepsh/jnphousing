/**
 * 답사지 PDF 생성 — POST { ids: string[] }.
 * 선택한 auction_property 들을 지역별로 묶은 현장 체크리스트. DB 부작용 없음.
 * 보호: requireAdmin.
 */

import { NextResponse, type NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { requireAdmin } from "@/lib/auth-guard";
import { createServiceClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/errors";
import { AuctionSurveyPdf, type SurveyPdfItem } from "@/lib/pdf/auction-survey-pdf";

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = (await req.json().catch(() => ({}))) as { ids?: string[] };
    const ids = Array.isArray(body.ids) ? body.ids.filter((x) => typeof x === "string") : [];
    if (ids.length === 0) {
      return NextResponse.json({ error: "선택된 물건이 없습니다." }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data } = await supabase
      .from("auction_property")
      .select("case_number, court, category, address, owner_name, creditor, appraisal_value, minimum_bid, auction_date, dividend_deadline")
      .in("id", ids);

    const items = (data ?? []) as SurveyPdfItem[];
    if (items.length === 0) {
      return NextResponse.json({ error: "물건을 찾을 수 없습니다." }, { status: 404 });
    }

    const today = new Date().toISOString().slice(0, 10);
    const buf = await renderToBuffer(
      <AuctionSurveyPdf
        data={{
          printedAt: today,
          items,
        }}
      />,
    );

    const u8 = new Uint8Array(buf);
    const filename = `survey_${today}_${items.length}.pdf`;
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
    console.error("[auction survey PDF]", e);
    return NextResponse.json({ error: "PDF 생성 실패" }, { status: 500 });
  }
}
