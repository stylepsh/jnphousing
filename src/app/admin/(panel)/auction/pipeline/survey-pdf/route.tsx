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
import { createServiceClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/errors";
import { AuctionSurveyPdf, groupByRegion, type SurveyPdfItem } from "@/lib/pdf/auction-survey-pdf";
import { normalizeOwnerName, ownerNameAnchor } from "@/lib/auction/court-auction";

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = (await req.json().catch(() => ({}))) as { ids?: string[] };
    const ids = Array.isArray(body.ids) ? body.ids.filter((x) => typeof x === "string") : [];
    if (ids.length === 0) {
      return NextResponse.json({ error: "선택된 물건이 없습니다." }, { status: 400 });
    }

    const SEL = "id, property_no, case_number, court, category, address, owner_name, survey_status, survey_date";
    const supabase = createServiceClient();
    const { data } = await supabase.from("auction_property").select(SEL).in("id", ids);

    const selRows = (data ?? []) as (SurveyPdfItem & { id: string })[];
    if (selRows.length === 0) {
      return NextResponse.json({ error: "물건을 찾을 수 없습니다." }, { status: 404 });
    }

    // 전수조사 답사지: 선택한 임대인의 "이미 답사한" 물건(공실/거주/제외)을 회색 패스 줄로
    // 자동 합친다. 답사자가 같은 집을 두 번 가는 낭비를 막는 핵심. (재방문 요망=revisit 은
    // 아직 답사 대상이라 자동포함 안 함 — 빈칸으로 직접 선택해야 나옴)
    const selectedIds = new Set(selRows.map((r) => r.id));
    // 선택분 임대인을 "정규화 키"로 묶는다 — "대성하우징(주)"·"(주)대성하우징"·"대성 하우징"을 한 임대인으로
    const ownerKeys = new Set(
      selRows.map((r) => normalizeOwnerName(r.owner_name)).filter(Boolean),
    );
    const anchors = Array.from(
      new Set(selRows.map((r) => ownerNameAnchor(r.owner_name)).filter((a) => a.length >= 2)),
    );
    let surveyedExtra: (SurveyPdfItem & { id: string })[] = [];
    if (ownerKeys.size > 0 && anchors.length > 0) {
      // ilike 앵커로 후보를 넓게 가져온 뒤, 정규화 키 동일성으로 정밀 매칭
      const orFilter = anchors.map((a) => `owner_name.ilike.%${a}%`).join(",");
      const { data: extra } = await supabase
        .from("auction_property")
        .select(SEL)
        .in("survey_status", ["vacant", "occupied", "skip"])
        .or(orFilter);
      surveyedExtra = ((extra ?? []) as (SurveyPdfItem & { id: string })[]).filter(
        (r) => !selectedIds.has(r.id) && ownerKeys.has(normalizeOwnerName(r.owner_name)),
      );
    }

    // id 기준 합치기 (중복 방지)
    const byId = new Map<string, SurveyPdfItem & { id: string }>();
    for (const r of [...selRows, ...surveyedExtra]) byId.set(r.id, r);
    const rows = Array.from(byId.values());

    // 답사지 인쇄 순서(지역별 그룹·동선) 그대로 평탄화. 번호는 물건 고유번호(property_no)라
    // 정렬과 무관하게 고정 — 어느 발급에 인쇄돼도 같은 물건은 같은 번호.
    const groups = groupByRegion(rows);
    const ordered = groups.flatMap(([, list]) => list);
    // A안: 주소 앞 3토큰 자동 라벨. 여러 지역이면 "… 외 N곳".
    const regionLabel =
      groups.length === 1 ? groups[0][0] : `${groups[0][0]} 외 ${groups.length - 1}곳`;

    const printedAtIso = new Date().toISOString();

    // 회색 패스 줄(이미 답사 완료)은 입력 매칭 대상이 아니므로 발급에 귀속시키지 않는다.
    // 실제 답사 대상(미답사/재방문)만 sheet 에 연결해 완료율·"나머지 거주"가 어긋나지 않게 한다.
    const isDone = (s: string | null | undefined) =>
      s === "vacant" || s === "occupied" || s === "skip";
    const todoRows = ordered.filter((it) => !isDone(it.survey_status));

    // 1) 발급(sheet) 레코드 생성 — total_count 는 실제 답사 대상 수
    const { data: sheetRow, error: sheetErr } = await supabase
      .from("auction_survey_sheet")
      .insert({ region_label: regionLabel, printed_at: printedAtIso, total_count: todoRows.length })
      .select("id")
      .single();
    if (sheetErr || !sheetRow) {
      return NextResponse.json({ error: "발급 생성 실패. 마이그레이션 020 적용 여부를 확인하세요." }, { status: 500 });
    }
    const sheetId = (sheetRow as { id: string }).id;

    // 2) 답사 대상 물건만 이 발급에 연결 (대량 대비 청크). 번호는 property_no 고정이라
    //    덮어쓰지 않는다 — 발급은 "이번에 어느 물건을 들고 나갔나"의 묶음일 뿐.
    const CHUNK = 40;
    for (let i = 0; i < todoRows.length; i += CHUNK) {
      const slice = todoRows.slice(i, i + CHUNK);
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
          items: ordered, // 답사 대상 + 기존 답사완료(회색). PDF 가 지역별로 정렬·표시.
        }}
      />,
    );

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
