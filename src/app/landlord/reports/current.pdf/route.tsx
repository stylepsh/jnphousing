/**
 * 임대인 즉시 발급 월간 보고서 PDF.
 *
 * GET /landlord/reports/current.pdf — 본인 정보 기준 이번달 즉시 발급.
 * 보호: requireLandlord
 */

import { NextResponse, type NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { requireLandlord } from "@/lib/auth-guard";
import { LandlordReportPdf } from "@/lib/pdf/landlord-report";
import { buildLandlordReportData } from "@/lib/billing/landlord-report-builder";
import { audit } from "@/lib/audit";
import { AppError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireLandlord();

    const data = await buildLandlordReportData(ctx.landlord.id, ctx.landlord.name);
    const buf = await renderToBuffer(<LandlordReportPdf data={data} />);

    void audit({
      action: "landlord.report.download",
      resource_type: "landlord",
      resource_id: ctx.landlord.id,
      after: { period: data.period_label },
      actor_id: ctx.user.id,
      actor_role: "landlord",
      ip: req.headers.get("x-forwarded-for")?.split(",")[0] ?? null,
      user_agent: req.headers.get("user-agent"),
    });

    const u8 = new Uint8Array(buf);
    const filename = `JNP_보고서_${ctx.landlord.name}_${data.period_label}.pdf`;
    return new NextResponse(u8 as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "Cache-Control": "private, no-cache",
      },
    });
  } catch (e) {
    if (e instanceof AppError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("[landlord report PDF]", e);
    return NextResponse.json({ error: "PDF 생성 실패" }, { status: 500 });
  }
}
