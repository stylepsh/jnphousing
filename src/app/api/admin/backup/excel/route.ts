/**
 * 종합 엑셀 백업 다운로드.
 *
 * GET /api/admin/backup/excel
 * - requireAdmin
 * - 모든 운영 테이블을 단일 .xlsx 로 stream
 * - audit_logs 에 backup.download 기록 (수시 백업 추적)
 */

import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin, getClientIp } from "@/lib/auth-guard";
import { buildBackupWorkbook } from "@/lib/excel-backup";
import { audit } from "@/lib/audit";
import { AppError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireAdmin();

    const buf = await buildBackupWorkbook();

    const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
    const filename = `JNP_백업_${stamp}.xlsx`;
    const encoded = encodeURIComponent(filename);

    // 감사 로그 (fire-and-forget — 다운로드 자체는 진행)
    void audit({
      action: "backup.download",
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
        "Content-Disposition": `attachment; filename="JNP_backup.xlsx"; filename*=UTF-8''${encoded}`,
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
        "Content-Length": String(buf.byteLength),
      },
    });
  } catch (e) {
    if (e instanceof AppError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("[backup excel]", e);
    return NextResponse.json({ error: "백업 생성 실패" }, { status: 500 });
  }
}
