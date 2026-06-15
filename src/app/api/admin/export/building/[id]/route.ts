/**
 * 건물 단위 엑셀 다운로드 — GET /api/admin/export/building/[id]
 * requireAdmin. 해당 건물의 호실·임차·수금·수수료를 한 파일로.
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin, getClientIp } from "@/lib/auth-guard";
import { buildBuildingWorkbook } from "@/lib/building-export";
import { audit } from "@/lib/audit";
import { AppError } from "@/lib/errors";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireAdmin();
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) {
      return NextResponse.json({ error: "잘못된 건물 ID" }, { status: 400 });
    }

    const result = await buildBuildingWorkbook(id);
    if (!result) return NextResponse.json({ error: "건물을 찾을 수 없습니다." }, { status: 404 });
    const { buffer, buildingName } = result;

    const stamp = new Date().toISOString().slice(0, 10);
    const filename = `JNP_${buildingName}_${stamp}.xlsx`;
    const encoded = encodeURIComponent(filename);

    void audit({
      action: "export.building",
      resource_type: "property",
      resource_id: id,
      after: { filename, bytes: buffer.byteLength },
      actor_id: ctx.user.id,
      actor_role: "admin",
      ip: await getClientIp(),
      user_agent: req.headers.get("user-agent"),
    });

    const u8 = new Uint8Array(buffer);
    return new NextResponse(u8 as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="JNP_building.xlsx"; filename*=UTF-8''${encoded}`,
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
        "Content-Length": String(buffer.byteLength),
      },
    });
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error("[export building]", e);
    return NextResponse.json({ error: "건물 엑셀 생성 실패" }, { status: 500 });
  }
}
