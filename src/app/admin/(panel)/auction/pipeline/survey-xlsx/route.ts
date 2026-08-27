/**
 * 답사지 엑셀 다운로드 — POST { ids: string[] }.
 * survey-pdf 와 같은 선택분으로 같은 번호(property_no)·순서의 .xlsx 를 생성한다.
 * 답사자가 채워서 돌려주면 '답사결과 입력'에 그대로 업로드(사건번호 매칭).
 * 엑셀도 실제 배포 수단이므로 발급 이력(팀·지역·건수)을 남긴다 — 중복 배포 방지.
 * 보호: requireAdmin.
 */
import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { AppError } from "@/lib/errors";
import { computeSurveySheetRows } from "@/lib/auction/survey-rows";
import { buildSurveySheetXlsx } from "@/lib/auction/survey-export";
import { recordSheetIssue } from "@/lib/auction/issue-sheet";

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = (await req.json().catch(() => ({}))) as { ids?: string[]; team?: string };
    const ids = Array.isArray(body.ids) ? body.ids.filter((x) => typeof x === "string") : [];
    if (ids.length === 0) {
      return NextResponse.json({ error: "선택된 물건이 없습니다." }, { status: 400 });
    }

    const { todoRows, regionLabel } = await computeSurveySheetRows(ids);
    if (todoRows.length === 0) {
      return NextResponse.json({ error: "답사 대상 물건이 없습니다." }, { status: 404 });
    }

    await recordSheetIssue({
      propertyIds: todoRows.map((it) => it.id),
      regionLabel,
      teamName: typeof body.team === "string" ? body.team : undefined,
      kind: "xlsx",
    });

    const today = new Date().toISOString().slice(0, 10);
    const buf = await buildSurveySheetXlsx(todoRows, regionLabel);
    const filename = `survey_${today}_${todoRows.length}.xlsx`;
    return new NextResponse(new Uint8Array(buf) as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    });
  } catch (e) {
    if (e instanceof AppError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("[auction survey xlsx]", e);
    return NextResponse.json({ error: "엑셀 생성 실패" }, { status: 500 });
  }
}
