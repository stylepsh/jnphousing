// 공실(survey_status='vacant') 상세 엑셀 다운로드 — GET. 보호: requireAdmin.
import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { buildVacancyWorkbook } from "@/lib/auction/vacancy-export";
import { AppError } from "@/lib/errors";

export async function GET(_req: NextRequest) {
  try {
    await requireAdmin();
    const { buffer, count } = await buildVacancyWorkbook();
    const today = new Date().toISOString().slice(0, 10);
    const filename = `전국한마음자산관리_공실_상품화후보_${today}_${count}건.xlsx`;
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    });
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "엑셀 생성 실패" }, { status: 500 });
  }
}
