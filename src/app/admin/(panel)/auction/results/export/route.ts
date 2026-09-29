import ExcelJS from "exceljs";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth-guard";
import {
  ALL, CAN_OPEN, MERCH, OCC_MARK, TABS, fetchMerchLeased, fetchRows, inRegion, latest, parseTab, regionOf,
} from "../data";

// 답사 결과 보기의 현재 탭·지역 목록을 엑셀로 내려받는다.
// 칸 이름이 답사표 업로드 파서와 같아서, 현장팀이 채워 온 파일을 그대로 다시 올릴 수 있다.
// 재방문 탭은 점유·개방·상품화 칸을 비워 둔다(현장팀이 새로 채울 칸).
export async function GET(req: NextRequest) {
  await requireAdmin();
  const sp = req.nextUrl.searchParams;
  const tab = parseTab(sp.get("tab") ?? undefined);
  const region = sp.get("region") || ALL;
  const supabase = await createClient();
  const rows = inRegion(await fetchRows(supabase, tab, (sp.get("q") ?? "").trim()), region);
  const fresh = tab === "revisit";

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(TABS[tab].label);
  const today = new Date().toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" });
  ws.addRow([`JNP 답사 결과 · ${TABS[tab].label} · ${region === ALL ? "전체 지역" : region} · ${rows.length}건 · ${today}`]);
  ws.addRow([
    "번호", "임대인", "상세 주소", "사건번호", "물건종류", "채권자",
    "점유(O거주/X공실/△재방문)", "개방(가능/불가/확인)", "상품화(가능/보류/불가)", "우편(쌓임/깨끗)", "계량기(유/무)",
    "현관비번", "관리실(번호)", "비고", "답사일", "임차인", "보증금", "월세",
  ]).font = { bold: true };

  let prevRegion = "";
  for (const r of rows) {
    const reg = regionOf(r.address);
    if (reg !== prevRegion) {
      ws.addRow([`📍 ${reg}`]).font = { bold: true, color: { argb: "FF0B3D2E" } };
      prevRegion = reg;
    }
    const i = latest(r.auction_inspection);
    ws.addRow([
      r.property_no,
      r.owner_name ?? "",
      r.address_short ? `${r.address} [${r.address_short}]` : r.address,
      r.case_number === "(미상)" ? "" : r.case_number,
      r.category ?? "",
      r.creditor ?? "",
      fresh ? "" : OCC_MARK[r.survey_status ?? ""] ?? "",
      fresh ? "" : CAN_OPEN[i?.can_open ?? ""] ?? "",
      fresh ? "" : MERCH[i?.merchandising_ready ?? ""] ?? "",
      r.meter_check?.mail ?? "",
      r.meter_check?.meter ?? "",
      r.door_code ?? "",
      "", // 관리실은 비고에 합쳐 저장돼 있어, 다시 올릴 때 중복되지 않게 비워 둔다
      r.survey_memo ?? "",
      r.survey_date ?? "",
      r.tenant_name ?? "",
      r.deposit ?? "",
      r.monthly_rent ?? "",
    ]);
  }
  [8, 12, 60, 14, 14, 16, 12, 10, 10, 10, 10, 10, 12, 30, 12, 10, 12, 12].forEach(
    (w, n) => (ws.getColumn(n + 1).width = w),
  );
  ws.views = [{ state: "frozen", ySplit: 2 }];

  // 상품화 탭: 임차가 나가 작업에서 빠진 물건을 별도 시트로
  if (tab === "merch") {
    const leased = (await fetchMerchLeased(supabase)).filter((r) => region === ALL || regionOf(r.address) === region);
    const ls = wb.addWorksheet("임차완료(작업제외)");
    ls.addRow(["번호", "임대인", "주소", "사건번호", "임차인", "보증금", "월세"]).font = { bold: true };
    for (const r of leased)
      ls.addRow([r.property_no, r.owner_name ?? "", r.address, r.case_number, r.tenant_name ?? "", r.deposit ?? "", r.monthly_rent ?? ""]);
    ls.getColumn(3).width = 60;
  }

  const buf = await wb.xlsx.writeBuffer();
  const filename = `답사결과_${TABS[tab].label}_${region === ALL ? "전체" : region}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  return new NextResponse(buf as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}
