// 이름 일괄 검색 결과 엑셀 다운로드 — POST(명단·부분일치 여부). 보호: bulkNameSearch 안의 requireAdmin.
import { NextResponse, type NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { AppError } from "@/lib/errors";
import { bulkNameSearch } from "../actions";

const COLUMNS: { header: string; width: number }[] = [
  { header: "검색어", width: 16 },
  { header: "매칭칸", width: 8 },
  { header: "소유주", width: 16 },
  { header: "임차인", width: 14 },
  { header: "주소", width: 46 },
  { header: "분류", width: 10 },
  { header: "채권자", width: 10 },
  { header: "감정가", width: 14 },
  { header: "최저가", width: 14 },
  { header: "매각기일", width: 12 },
  { header: "보증금", width: 12 },
  { header: "월세", width: 10 },
  { header: "사건번호", width: 16 },
  { header: "답사상태", width: 10 },
  { header: "발급이력", width: 18 },
];

const SURVEY_LABEL: Record<string, string> = {
  pending: "미답사",
  vacant: "공실",
  occupied: "거주중",
  revisit: "재방문",
  skip: "제외",
  rejected: "거부",
  blocked: "차단",
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      names?: unknown;
      partial?: unknown;
      mode?: unknown;
      includeSurveyed?: unknown;
      pendingOnly?: unknown;
      excludeSimilar?: unknown;
    };
    const names = Array.isArray(body.names) ? body.names.map(String) : [];
    const mode = body.mode === "address" ? "address" : "name";
    const res = await bulkNameSearch(names, {
      partial: body.partial === true,
      mode,
      includeSurveyed: body.includeSurveyed === true,
    });
    if (!res.ok || !res.groups) {
      return NextResponse.json({ error: res.error ?? "검색 실패" }, { status: 400 });
    }

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("이름 일괄 검색");
    ws.columns = COLUMNS.map((c) => ({ header: c.header, width: c.width }));
    ws.getRow(1).font = { bold: true };

    // 화면에서 켜 둔 제외 토글은 엑셀에도 그대로 적용한다.
    const pendingOnly = body.pendingOnly === true;
    const excludeSimilar = body.excludeSimilar === true;
    let count = 0;
    for (const g of res.groups) {
      for (const r of g.rows) {
        if (pendingOnly && r.survey_status !== "pending") continue;
        if (excludeSimilar && r.similar) continue;
        ws.addRow([
          g.name,
          (r.field === "owner" ? "소유주" : r.field === "tenant" ? "임차인" : "주소") +
            (r.similar ? " (유사)" : ""),
          r.owner_name,
          r.tenant_name,
          r.address,
          r.category,
          r.creditor_type || r.creditor,
          r.appraisal_value ?? "",
          r.minimum_bid ?? "",
          r.auction_date,
          r.deposit ?? "",
          r.monthly_rent ?? "",
          r.case_number,
          SURVEY_LABEL[r.survey_status] ?? r.survey_status,
          // 답사지가 이미 나간 기록 — 상태가 미답사여도 헛걸음일 수 있다는 경고.
          r.last_issued_at
            ? `⚠ 발급됨 ${r.last_issued_at.slice(0, 10)}${r.last_issued_team ? ` (${r.last_issued_team})` : ""}`
            : "",
        ]);
        count++;
      }
    }
    if (res.notFound?.length) {
      ws.addRow([]);
      ws.addRow([mode === "address" ? "못 찾은 주소" : "못 찾은 이름", ...res.notFound.map((n) => n.name)]);
    }

    const buffer = Buffer.from(await wb.xlsx.writeBuffer());
    const today = new Date().toISOString().slice(0, 10);
    const filename = `${mode === "address" ? "주소" : "이름"}일괄검색_${today}_${count}건.xlsx`;
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
