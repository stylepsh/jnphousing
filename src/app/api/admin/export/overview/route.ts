/**
 * 현황 통합 엑셀 다운로드 — "누구나 보고 현재 상황 파악".
 * GET /api/admin/export/overview
 * requireAdmin. 임대인 중심 현황표(요약/임대인별/물건/계약·수금).
 */

import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin, getClientIp } from "@/lib/auth-guard";
import { buildOverviewWorkbook } from "@/lib/overview-export";
import { audit } from "@/lib/audit";
import { AppError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireAdmin();
    const buf = await buildOverviewWorkbook();

    const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
    const filename = `JNP_현황_${stamp}.xlsx`;
    const encoded = encodeURIComponent(filename);

    void audit({
      action: "export.overview",
      resource_type: "system",
      after: { filename, bytes: buf.byteLength },
      actor_id: ctx.user.id,
      actor_role: "admin",
      ip: await getClientIp(),
      user_agent: req.headers.get("user-agent"),
    });

    const u8 = new Uint8Array(buf);
    return new NextResponse(u8 as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="JNP_overview.xlsx"; filename*=UTF-8''${encoded}`,
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
        "Content-Length": String(buf.byteLength),
      },
    });
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error("[export overview]", e);
    return NextResponse.json({ error: "현황 엑셀 생성 실패" }, { status: 500 });
  }
}
