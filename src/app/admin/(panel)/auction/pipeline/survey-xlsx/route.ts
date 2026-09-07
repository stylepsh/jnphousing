/**
 * 답사지 엑셀 다운로드 — POST { ids: string[] }.
 * survey-pdf 와 같은 선택분으로 같은 번호(property_no)·순서의 .xlsx 를 생성한다.
 * 답사자가 채워서 돌려주면 '답사결과 입력'에 그대로 업로드(사건번호 매칭).
 * 엑셀도 실제 배포 수단이므로 발급 이력(팀·지역·건수)을 남긴다 — 중복 배포 방지.
 * 발급 이력을 쓰는 mutation 경로이므로 보호: requireMutableAdmin.
 */
import { NextResponse, type NextRequest } from "next/server";
import { requireMutableAdmin } from "@/lib/auth-guard";
import { AppError } from "@/lib/errors";
import { computeSurveySheetRows } from "@/lib/auction/survey-rows";
import { buildSurveySheetXlsx } from "@/lib/auction/survey-export";
import { recordSheetIssue, requireSheetTeamName } from "@/lib/auction/issue-sheet";

export async function POST(req: NextRequest) {
  try {
    await requireMutableAdmin();
    const body = (await req.json().catch(() => ({}))) as { ids?: string[]; team?: string };
    const ids = Array.isArray(body.ids) ? body.ids.filter((x) => typeof x === "string") : [];
    if (ids.length === 0) {
      return NextResponse.json({ error: "선택된 물건이 없습니다." }, { status: 400 });
    }
    const teamName = requireSheetTeamName(body.team);

    const { ordered, todoRows, regionLabel } = await computeSurveySheetRows(ids);
    if (todoRows.length === 0) {
      return NextResponse.json({ error: "답사 대상 물건이 없습니다." }, { status: 404 });
    }

    // 파일을 먼저 만들고 성공한 뒤에 발급 이력을 남긴다.
    // (기록이 앞서면 생성 실패한 답사지가 "발급됨"으로 남는다.)
    const today = new Date().toISOString().slice(0, 10);
    const referenceCount = ordered.length - todoRows.length;
    const buf = await buildSurveySheetXlsx(ordered, {
      label: regionLabel,
      teamName,
      printedAt: today,
      todoCount: todoRows.length,
      referenceCount,
    });

    const { sheetId } = await recordSheetIssue({
      propertyIds: todoRows.map((it) => it.id),
      regionLabel,
      teamName: teamName || undefined,
      kind: "xlsx",
    });
    if (!sheetId) {
      return NextResponse.json(
        { error: "발급 기록 실패. 마이그레이션 020·036 적용 여부를 확인하세요." },
        { status: 500 },
      );
    }
    const filename = `survey_${today}_${todoRows.length}.xlsx`;
    return new NextResponse(new Uint8Array(buf) as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "X-JNP-Todo-Count": String(todoRows.length),
        "X-JNP-Reference-Count": String(referenceCount),
        "X-JNP-Total-Count": String(ordered.length),
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
