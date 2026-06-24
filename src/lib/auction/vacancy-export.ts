// 공실(답사결과 X = survey_status='vacant') 상세 엑셀 — 단일 탭, 지역→임대인 그룹.
// 지역별 밴드 헤더 + 접기(outline) + 임대인 정렬 + 전체 상세. admin 전용.
import "server-only";

import ExcelJS from "exceljs";
import { createServiceClient } from "@/lib/supabase/server";

interface VacRow {
  id: string;
  case_number: string;
  address: string;
  address_short: string | null;
  owner_name: string | null;
  creditor: string | null;
  creditor_type: string | null;
  category: string | null;
  door_code: string | null;
  meter_check: Record<string, string> | null;
  survey_memo: string | null;
  survey_date: string | null;
  pipeline_state: string | null;
  batch_id: string | null;
}

const STATE_LABEL: Record<string, string> = {
  Approved: "승인", WorkPrep: "상품화준비", Merchandising: "상품화진행", Available: "임대가능",
  Reviewing: "검토대기",
};

export async function buildVacancyWorkbook(): Promise<{ buffer: Buffer; count: number }> {
  const sb = createServiceClient();
  const { data } = await sb
    .from("auction_property")
    .select(
      "id, case_number, address, address_short, owner_name, creditor, creditor_type, category, door_code, meter_check, survey_memo, survey_date, pipeline_state, batch_id",
    )
    .eq("survey_status", "vacant");
  const rows = (data ?? []) as VacRow[];

  // 배치 → 지역(area) 매핑
  const batchIds = Array.from(new Set(rows.map((r) => r.batch_id).filter((v): v is string => !!v)));
  const areaById = new Map<string, string>();
  if (batchIds.length > 0) {
    const { data: batches } = await sb.from("auction_survey_batch").select("id, area").in("id", batchIds);
    for (const b of (batches ?? []) as { id: string; area: string | null }[]) {
      if (b.area) areaById.set(b.id, b.area.replace(/\s*단기임대$/, "").trim());
    }
  }
  const regionOf = (r: VacRow) => (r.batch_id ? areaById.get(r.batch_id) ?? "기타" : "기타");
  const meter = (r: VacRow, k: string) => (r.meter_check && r.meter_check[k]) || "";

  // 지역 → 임대인 → 주소 정렬
  rows.sort((a, b) =>
    regionOf(a).localeCompare(regionOf(b), "ko") ||
    (a.owner_name ?? "").localeCompare(b.owner_name ?? "", "ko") ||
    (a.address ?? "").localeCompare(b.address ?? "", "ko"),
  );

  const wb = new ExcelJS.Workbook();
  wb.creator = "전국한마음자산관리";
  wb.created = new Date();
  const ws = wb.addWorksheet("공실 상품화후보");
  ws.properties.outlineLevelRow = 1;
  // 접기 요약(지역 밴드)이 데이터 위에 오도록
  ws.properties.outlineProperties = { summaryBelow: false, summaryRight: false };

  const COLS = [
    { header: "임대인", key: "owner", width: 14 },
    { header: "상세 주소", key: "addr", width: 46 },
    { header: "사건번호", key: "case", width: 13 },
    { header: "물건종류", key: "cat", width: 12 },
    { header: "채권", key: "cred", width: 7 },
    { header: "우편", key: "mail", width: 6 },
    { header: "계량기", key: "meter", width: 7 },
    { header: "현관비번", key: "door", width: 12 },
    { header: "메모(관리실·비고)", key: "memo", width: 40 },
    { header: "단계", key: "stage", width: 10 },
    { header: "답사일", key: "date", width: 12 },
  ];
  ws.columns = COLS.map((c) => ({ key: c.key, width: c.width }));
  const NCOL = COLS.length;

  // 1행: 제목
  ws.mergeCells(1, 1, 1, NCOL);
  const titleCell = ws.getCell(1, 1);
  titleCell.value = `전국한마음자산관리 · 경매 공실 상품화후보 (총 ${rows.length}건)  ·  지역▸임대인 그룹 — 지역 왼쪽 [−]로 접기/펼치기`;
  titleCell.font = { bold: true, size: 12, color: { argb: "FF1C2B4A" } };
  ws.getRow(1).height = 24;

  // 2행: 컬럼 헤더
  const headerRow = ws.getRow(2);
  headerRow.values = COLS.map((c) => c.header);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };
  headerRow.height = 20;
  headerRow.eachCell((c) => (c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1C2B4A" } }));
  ws.views = [{ state: "frozen", ySplit: 2 }];
  ws.autoFilter = { from: { row: 2, column: 1 }, to: { row: 2, column: NCOL } };

  // 지역별 그룹 렌더
  const byRegion = new Map<string, VacRow[]>();
  for (const r of rows) {
    const rg = regionOf(r);
    if (!byRegion.has(rg)) byRegion.set(rg, []);
    byRegion.get(rg)!.push(r);
  }

  let rowIdx = 2; // 헤더가 2행
  for (const [region, list] of byRegion) {
    const owners = new Set(list.map((r) => r.owner_name ?? "(미상)")).size;
    // 지역 밴드 행
    rowIdx += 1;
    ws.mergeCells(rowIdx, 1, rowIdx, NCOL);
    const band = ws.getCell(rowIdx, 1);
    band.value = `📍 ${region}   ·   공실 ${list.length}건   ·   임대인 ${owners}명`;
    band.font = { bold: true, size: 11, color: { argb: "FF0B3D2E" } };
    band.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD1FAE5" } };
    ws.getRow(rowIdx).height = 20;

    let prevOwner: string | null = null;
    for (const r of list) {
      rowIdx += 1;
      const owner = r.owner_name ?? "(미상)";
      const sameOwner = owner === prevOwner;
      prevOwner = owner;
      const row = ws.getRow(rowIdx);
      row.values = {
        owner: sameOwner ? "" : owner, // 같은 임대인 반복은 비워 가독성↑
        addr: r.address_short ? `${r.address} [${r.address_short}]` : r.address,
        case: r.case_number === "(미상)" ? "" : r.case_number,
        cat: r.category ?? "",
        cred: r.creditor_type ?? "",
        mail: meter(r, "mail"),
        meter: meter(r, "meter"),
        door: r.door_code ?? "",
        memo: r.survey_memo ?? "",
        stage: r.pipeline_state ? STATE_LABEL[r.pipeline_state] ?? r.pipeline_state : "",
        date: r.survey_date ?? "",
      } as Record<string, string>;
      row.outlineLevel = 1; // 지역 밴드로 접힘
      row.alignment = { vertical: "top", wrapText: true };
      if (!sameOwner) row.getCell("owner").font = { bold: true };
    }
  }

  ws.getColumn("memo").alignment = { wrapText: true, vertical: "top" };

  const out = await wb.xlsx.writeBuffer();
  return { buffer: Buffer.from(out), count: rows.length };
}
