// 공실(답사결과 X = survey_status='vacant') 상세 엑셀 — 임대인별, 전체 상세 포함.
// admin 전용(route 에서 requireAdmin 후 호출). service_role 조회.
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
    .eq("survey_status", "vacant")
    .order("owner_name", { ascending: true });
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
  const regionOf = (r: VacRow) => (r.batch_id ? areaById.get(r.batch_id) ?? "" : "");
  const meter = (r: VacRow, k: string) => (r.meter_check && r.meter_check[k]) || "";

  const wb = new ExcelJS.Workbook();
  wb.creator = "전국한마음자산관리";
  wb.created = new Date();

  // ── 임대인별 요약 ──
  const byOwner = new Map<string, { n: number; regions: Set<string> }>();
  for (const r of rows) {
    const o = r.owner_name ?? "(미상)";
    if (!byOwner.has(o)) byOwner.set(o, { n: 0, regions: new Set() });
    const e = byOwner.get(o)!;
    e.n++;
    const rg = regionOf(r);
    if (rg) e.regions.add(rg);
  }
  const s0 = wb.addWorksheet("임대인별 요약");
  s0.columns = [
    { header: "임대인", key: "o", width: 16 },
    { header: "공실 건수", key: "n", width: 10 },
    { header: "지역", key: "r", width: 24 },
  ];
  [...byOwner.entries()]
    .sort((a, b) => b[1].n - a[1].n)
    .forEach(([o, e]) => s0.addRow({ o, n: e.n, r: [...e.regions].join(", ") }));
  s0.addRow({ o: "합계", n: rows.length, r: "" });

  // ── 공실 상세 ──
  const s1 = wb.addWorksheet("공실 상세");
  s1.columns = [
    { header: "임대인", key: "owner", width: 14 },
    { header: "지역", key: "region", width: 8 },
    { header: "상세 주소", key: "addr", width: 46 },
    { header: "사건번호", key: "case", width: 13 },
    { header: "물건종류", key: "cat", width: 12 },
    { header: "채권", key: "cred", width: 8 },
    { header: "우편", key: "mail", width: 6 },
    { header: "계량기", key: "meter", width: 7 },
    { header: "현관비번", key: "door", width: 12 },
    { header: "메모(관리실·비고)", key: "memo", width: 40 },
    { header: "단계", key: "stage", width: 10 },
    { header: "답사일", key: "date", width: 12 },
  ];
  for (const r of rows) {
    s1.addRow({
      owner: r.owner_name ?? "(미상)",
      region: regionOf(r),
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
    });
  }

  for (const ws of [s0, s1]) {
    const h = ws.getRow(1);
    h.font = { bold: true, color: { argb: "FFFFFFFF" } };
    h.alignment = { vertical: "middle", horizontal: "center" };
    h.height = 22;
    h.eachCell((c) => (c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1C2B4A" } }));
    ws.views = [{ state: "frozen", ySplit: 1 }];
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: ws.columnCount } };
  }

  const out = await wb.xlsx.writeBuffer();
  return { buffer: Buffer.from(out), count: rows.length };
}
