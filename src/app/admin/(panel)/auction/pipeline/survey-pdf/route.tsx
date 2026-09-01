/**
 * 답사지 PDF 생성 — POST { ids: string[] }.
 * 선택한 auction_property 들을 지역별로 묶은 현장 체크리스트.
 * 답사 대상(미답사/재방문)만 발급(sheet)에 귀속시키고, 같은 임대인의 이미 답사한
 * 물건은 회색 줄(기존 답사완료)로 함께 인쇄해 재방문을 막는다.
 * 보호: requireAdmin.
 */

import { NextResponse, type NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { requireAdmin } from "@/lib/auth-guard";
import { AppError } from "@/lib/errors";
import { AuctionSurveyPdf } from "@/lib/pdf/auction-survey-pdf";
import { computeSurveySheetRows } from "@/lib/auction/survey-rows";
import { recordSheetIssue } from "@/lib/auction/issue-sheet";

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = (await req.json().catch(() => ({}))) as { ids?: string[]; team?: string };
    const ids = Array.isArray(body.ids) ? body.ids.filter((x) => typeof x === "string") : [];
    if (ids.length === 0) {
      return NextResponse.json({ error: "선택된 물건이 없습니다." }, { status: 400 });
    }

    // 선택분 + 같은 임대인의 기존 답사완료(회색) 합쳐 지역▸임대인 정렬. 엑셀과 동일 함수.
    const { ordered, todoRows, regionLabel } = await computeSurveySheetRows(ids);
    if (ordered.length === 0) {
      return NextResponse.json({ error: "물건을 찾을 수 없습니다." }, { status: 404 });
    }

    const printedAtIso = new Date().toISOString();
    const today = printedAtIso.slice(0, 10);

    // 파일을 먼저 만든다. 렌더가 실패하면 발급 이력이 남지 않아야 한다
    // (기록이 앞서면 실제로 못 받은 답사지가 "발급됨"으로 쌓여 중복 배포 방지가 무너진다).
    const buf = await renderToBuffer(
      <AuctionSurveyPdf
        data={{
          printedAt: today,
          sheetLabel: regionLabel,
          items: ordered, // 답사 대상 + 기존 답사완료(회색). PDF 가 지역별로 정렬·표시.
        }}
      />,
    );

    const { sheetId } = await recordSheetIssue({
      propertyIds: todoRows.map((it) => it.id),
      regionLabel,
      teamName: typeof body.team === "string" ? body.team : undefined,
      kind: "pdf",
      printedAtIso,
    });
    if (!sheetId) {
      return NextResponse.json(
        { error: "발급 기록 실패. 마이그레이션 020·036 적용 여부를 확인하세요." },
        { status: 500 },
      );
    }

    const u8 = new Uint8Array(buf);
    const filename = `survey_${today}_${todoRows.length}.pdf`;
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
