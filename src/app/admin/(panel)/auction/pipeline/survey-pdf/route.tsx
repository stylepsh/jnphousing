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
import { AuctionSurveyPdf, groupByRegion, type SurveyPdfItem } from "@/lib/pdf/auction-survey-pdf";

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = (await req.json().catch(() => ({}))) as { ids?: string[] };
    const ids = Array.isArray(body.ids) ? body.ids.filter((x) => typeof x === "string") : [];
    if (ids.length === 0) {
      return NextResponse.json({ error: "선택된 물건이 없습니다." }, { status: 400 });
    }

    const COLS = "id, property_no, case_number, court, category, address, owner_name, survey_status";
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("auction_property")
      .select(COLS)
      .in("id", ids);

    const rows = (data ?? []) as (SurveyPdfItem & { id: string })[];
    if (rows.length === 0) {
      return NextResponse.json({ error: "물건을 찾을 수 없습니다." }, { status: 404 });
    }

    // 답사지 인쇄 순서(지역별 그룹·동선) 그대로 평탄화. 번호는 물건 고유번호라
    // 정렬과 무관하게 고정 — 어느 발급에 인쇄돼도 같은 물건은 같은 번호.
    const groups = groupByRegion(rows);
    const ordered = groups.flatMap(([, list]) => list);
    // A안: 주소 앞 3토큰 자동 라벨. 여러 지역이면 "… 외 N곳".
    const regionLabel =
      groups.length === 1 ? groups[0][0] : `${groups[0][0]} 외 ${groups.length - 1}곳`;

    // ─── 같은 지역(주소 앞 3토큰)의 "기존 답사완료" 물건도 회색 줄로 함께 인쇄 ───
    //   → 현장팀이 이미 답사한 집을 두 번 방문하지 않게. 답사 대상(ordered)이 아니라
    //     참고용이므로 발급(sheet) 연결은 하지 않는다.
    const regionPrefix = (addr: string) =>
      (addr || "").trim().split(/\s+/).slice(0, 3).join(" ");
    const prefixes = Array.from(new Set(rows.map((r) => regionPrefix(r.address)).filter(Boolean)));
    const selectedIds = new Set(ids);
    const doneById = new Map<string, SurveyPdfItem & { id: string }>();
    for (const prefix of prefixes) {
      const { data: doneRows } = await supabase
        .from("auction_property")
        .select(COLS)
        .ilike("address", `${prefix}%`)
        .not("survey_status", "in", "(pending,rejected)")
        .limit(2000);
      for (const r of (doneRows ?? []) as (SurveyPdfItem & { id: string })[]) {
        if (!selectedIds.has(r.id)) doneById.set(r.id, r);
      }
    }
    const doneItems = Array.from(doneById.values());

    const printedAtIso = new Date().toISOString();

    // 1) 발급(sheet) 레코드 생성 — "나머지 전부 거주" 범위 산정용
    const { data: sheetRow, error: sheetErr } = await supabase
      .from("auction_survey_sheet")
      .insert({ region_label: regionLabel, printed_at: printedAtIso, total_count: ordered.length })
      .select("id")
      .single();
    if (sheetErr || !sheetRow) {
      return NextResponse.json({ error: "발급 생성 실패. 마이그레이션 020 적용 여부를 확인하세요." }, { status: 500 });
    }
    const sheetId = (sheetRow as { id: string }).id;

    // 2) 각 물건을 이 발급에 연결 (대량 대비 청크 처리). 번호는 property_no 고정이라
    //    덮어쓰지 않는다 — 발급은 "이번에 어느 물건들을 들고 나갔나"의 묶음일 뿐.
    const CHUNK = 40;
    for (let i = 0; i < ordered.length; i += CHUNK) {
      const slice = ordered.slice(i, i + CHUNK);
      await Promise.all(
        slice.map((it) =>
          supabase
            .from("auction_property")
            .update({ sheet_id: sheetId })
            .eq("id", it.id),
        ),
      );
    }

    const today = printedAtIso.slice(0, 10);
    const buf = await renderToBuffer(
      <AuctionSurveyPdf
        data={{
          printedAt: today,
          sheetLabel: regionLabel,
          // 답사 대상(ordered) + 같은 지역 기존완료(doneItems). PDF가 지역별로 재정렬.
          items: [...ordered, ...doneItems],
        }}
      />,
    );

    const u8 = new Uint8Array(buf);
    const filename = `survey_${today}_${ordered.length}.pdf`;
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
