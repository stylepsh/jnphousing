// 이름 일괄 검색 결과 엑셀 다운로드 — POST(명단·부분일치 여부). 보호: bulkNameSearch 안의 requireAdmin.
import { NextResponse, type NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { AppError } from "@/lib/errors";
import { bulkNameSearch } from "../actions";

const COLUMNS: { header: string; width: number }[] = [
  { header: "검색이름", width: 12 },
  { header: "매칭칸", width: 8 },
  { header: "소유주", width: 16 },
  { header: "임차인", width: 14 },
  { header: "주소", width: 46 },
  { header: "분류", width: 10 },
  { header: "보증금", width: 12 },
  { header: "월세", width: 10 },
  { header: "입주일", width: 12 },
  { header: "만기일", width: 12 },
  { header: "사건번호", width: 16 },
];

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { names?: unknown; partial?: unknown };
    const names = Array.isArray(body.names) ? body.names.map(String) : [];
    const res = await bulkNameSearch(names, { partial: body.partial === true });
    if (!res.ok || !res.groups) {
      return NextResponse.json({ error: res.error ?? "검색 실패" }, { status: 400 });
    }

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("이름 일괄 검색");
    ws.columns = COLUMNS.map((c) => ({ header: c.header, width: c.width }));
    ws.getRow(1).font = { bold: true };

    let count = 0;
    for (const g of res.groups) {
      for (const r of g.rows) {
        ws.addRow([
          g.name,
          r.field === "owner" ? "소유주" : "임차인",
          r.owner_name,
          r.tenant_name,
          r.address,
          r.category,
          r.deposit ?? "",
          r.monthly_rent ?? "",
          r.move_in_date ?? "",
          r.lease_end ?? "",
          r.case_number,
        ]);
        count++;
      }
    }
    if (res.notFound?.length) {
      ws.addRow([]);
      ws.addRow(["못 찾은 이름", ...res.notFound.map((n) => n.name)]);
    }

    const buffer = Buffer.from(await wb.xlsx.writeBuffer());
    const today = new Date().toISOString().slice(0, 10);
    const filename = `이름일괄검색_${today}_${count}건.xlsx`;
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
