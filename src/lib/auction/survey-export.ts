// 표준 답사표 엑셀 — 단일 탭, 지역▸임대인 그룹(공실 엑셀과 동일 톤).
// 식별칸은 미리 채우고, 답사자 입력칸(점유/개방/상품화 등)은 빈칸+드롭다운.
// admin 전용(route 에서 requireAdmin 후 호출). service_role 조회.
import "server-only";

import ExcelJS from "exceljs";
import { createServiceClient } from "@/lib/supabase/server";
import { groupByRegion } from "@/lib/pdf/auction-survey-pdf";
import type { SurveyRow } from "@/lib/auction/survey-rows";

interface PoolRow {
  case_number: string;
  address: string;
  address_short: string | null;
  category: string | null;
  owner_name: string | null;
  creditor: string | null;
  batch_id: string | null;
}

export async function buildSurveyTemplate(opts: {
  region?: string;
  states?: string[];
}): Promise<{ buffer: Buffer; region: string }> {
  const sb = createServiceClient();
  let q = sb
    .from("auction_property")
    .select("case_number, address, address_short, category, owner_name, creditor, batch_id, pipeline_state")
    .neq("survey_status", "rejected");
  if (opts.states?.length) q = q.in("pipeline_state", opts.states);
  const { data } = await q;
  const rows = (data ?? []) as PoolRow[];

  // 배치 → 지역(area)
  const batchIds = Array.from(new Set(rows.map((r) => r.batch_id).filter((v): v is string => !!v)));
  const areaById = new Map<string, string>();
  if (batchIds.length > 0) {
    const { data: batches } = await sb.from("auction_survey_batch").select("id, area").in("id", batchIds);
    for (const b of (batches ?? []) as { id: string; area: string | null }[]) {
      if (b.area) areaById.set(b.id, b.area.replace(/\s*단기임대$/, "").trim());
    }
  }
  const regionOf = (r: PoolRow) => (r.batch_id ? areaById.get(r.batch_id) ?? "기타" : "기타");

  rows.sort((a, b) =>
    regionOf(a).localeCompare(regionOf(b), "ko") ||
    (a.owner_name ?? "").localeCompare(b.owner_name ?? "", "ko") ||
    (a.address ?? "").localeCompare(b.address ?? "", "ko"),
  );

  const region = opts.region ?? "전지역";
  const wb = new ExcelJS.Workbook();
  wb.creator = "전국한마음자산관리";
  wb.created = new Date();
  const ws = wb.addWorksheet("답사용지");
  ws.properties.outlineLevelRow = 1;
  ws.properties.outlineProperties = { summaryBelow: false, summaryRight: false };

  const COLS = [
    { header: "방문순번", key: "no", width: 8, fill: true },
    { header: "임대인", key: "owner", width: 13, fill: true },
    { header: "상세 주소", key: "addr", width: 44, fill: true },
    { header: "사건번호", key: "case", width: 13, fill: true },
    { header: "물건종류", key: "cat", width: 11, fill: true },
    { header: "채권자", key: "creditor", width: 16, fill: true },
    { header: "점유(O거주/X공실/△재방문)", key: "occ", width: 20 },
    { header: "개방(가능/불가/확인)", key: "open", width: 16 },
    { header: "상품화(가능/보류/불가)", key: "merch", width: 16 },
    { header: "우편(쌓임/깨끗)", key: "mail", width: 12 },
    { header: "계량기(정지/정상)", key: "meter", width: 12 },
    { header: "현관비번", key: "door", width: 11 },
    { header: "관리실(번호)", key: "office", width: 15 },
    { header: "비고", key: "memo", width: 30 },
  ];
  ws.columns = COLS.map((c) => ({ key: c.key, width: c.width }));
  const NCOL = COLS.length;
  const OCC_COL = 7, OPEN_COL = 8, MERCH_COL = 9; // 드롭다운 칼럼 번호

  // 1행 안내
  ws.mergeCells(1, 1, 1, NCOL);
  const title = ws.getCell(1, 1);
  title.value = `전국한마음자산관리 · 경매 단기임대 답사 용지 (${rows.length}건)  ·  회색칸=그대로 / 흰칸만 입력  ·  점유: O=점유 X=공실 △=재방문  ·  지역 [−]로 접기`;
  title.font = { bold: true, size: 11, color: { argb: "FF1C2B4A" } };
  ws.getRow(1).height = 24;

  // 2행 헤더
  const hr = ws.getRow(2);
  hr.values = COLS.map((c) => c.header);
  hr.font = { bold: true, color: { argb: "FFFFFFFF" } };
  hr.alignment = { vertical: "middle", horizontal: "center" };
  hr.height = 20;
  hr.eachCell((cell, n) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLS[n - 1].fill ? "FF64748B" : "FF1C2B4A" } };
  });
  ws.views = [{ state: "frozen", ySplit: 2 }];
  ws.autoFilter = { from: { row: 2, column: 1 }, to: { row: 2, column: NCOL } };

  // 지역 그룹
  const byRegion = new Map<string, PoolRow[]>();
  for (const r of rows) {
    const rg = regionOf(r);
    if (!byRegion.has(rg)) byRegion.set(rg, []);
    byRegion.get(rg)!.push(r);
  }

  let rowIdx = 2;
  let seq = 0;
  for (const [rg, list] of byRegion) {
    const owners = new Set(list.map((r) => r.owner_name ?? "(미상)")).size;
    rowIdx += 1;
    ws.mergeCells(rowIdx, 1, rowIdx, NCOL);
    const band = ws.getCell(rowIdx, 1);
    band.value = `📍 ${rg}   ·   ${list.length}건   ·   임대인 ${owners}명`;
    band.font = { bold: true, size: 11, color: { argb: "FF0B3D2E" } };
    band.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD1FAE5" } };
    ws.getRow(rowIdx).height = 20;

    let prevOwner: string | null = null;
    for (const r of list) {
      rowIdx += 1;
      seq += 1;
      const owner = r.owner_name ?? "(미상)";
      const sameOwner = owner === prevOwner;
      prevOwner = owner;
      const row = ws.getRow(rowIdx);
      row.values = {
        no: seq,
        owner: sameOwner ? "" : owner,
        addr: r.address_short ? `${r.address} [${r.address_short}]` : r.address,
        case: r.case_number === "(미상)" ? "" : r.case_number,
        cat: r.category ?? "",
        creditor: r.creditor ?? "",
      } as Record<string, string | number>;
      row.outlineLevel = 1;
      row.alignment = { vertical: "top", wrapText: true };
      if (!sameOwner) row.getCell("owner").font = { bold: true };
      // 식별칸(회색) 살짝 음영
      for (let c = 1; c <= 6; c++) row.getCell(c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
      // 입력칸 드롭다운
      ws.getCell(rowIdx, OCC_COL).dataValidation = { type: "list", allowBlank: true, formulae: ['"O,X,△"'] };
      ws.getCell(rowIdx, OPEN_COL).dataValidation = { type: "list", allowBlank: true, formulae: ['"가능,불가,확인"'] };
      ws.getCell(rowIdx, MERCH_COL).dataValidation = { type: "list", allowBlank: true, formulae: ['"가능,보류,불가"'] };
    }
  }

  const out = await wb.xlsx.writeBuffer();
  return { buffer: Buffer.from(out), region };
}

/**
 * 선택분 답사지 엑셀 — PDF(survey-pdf)와 동일 번호(property_no)·순서로, 답사자가 채워서
 * 돌려주면 '답사결과 입력'에 그대로 업로드되도록 매칭 헤더(사건번호 등)를 맞춘다.
 * 부작용 없음: rows = computeSurveySheetRows().todoRows.
 */
export async function buildSurveySheetXlsx(rows: SurveyRow[], label: string): Promise<Buffer> {
  const groups = groupByRegion(rows);

  const wb = new ExcelJS.Workbook();
  wb.creator = "전국한마음자산관리";
  const ws = wb.addWorksheet("답사용지");
  ws.properties.outlineLevelRow = 1;
  ws.properties.outlineProperties = { summaryBelow: false, summaryRight: false };

  const COLS = [
    { header: "번호", key: "no", width: 7, fill: true },
    { header: "임대인", key: "owner", width: 13, fill: true },
    { header: "상세 주소", key: "addr", width: 44, fill: true },
    { header: "사건번호", key: "case", width: 14, fill: true },
    { header: "물건종류", key: "cat", width: 11, fill: true },
    { header: "채권자", key: "creditor", width: 16, fill: true },
    { header: "점유(O거주/X공실/△재방문)", key: "occ", width: 20 },
    { header: "개방(가능/불가/확인)", key: "open", width: 16 },
    { header: "상품화(가능/보류/불가)", key: "merch", width: 16 },
    { header: "우편(쌓임/깨끗)", key: "mail", width: 12 },
    { header: "계량기(정지/정상)", key: "meter", width: 12 },
    { header: "현관비번", key: "door", width: 11 },
    { header: "관리실(번호)", key: "office", width: 15 },
    { header: "비고", key: "memo", width: 30 },
  ];
  ws.columns = COLS.map((c) => ({ key: c.key, width: c.width }));
  const NCOL = COLS.length;
  const OCC_COL = 7, OPEN_COL = 8, MERCH_COL = 9;

  const total = rows.length;
  ws.mergeCells(1, 1, 1, NCOL);
  const title = ws.getCell(1, 1);
  title.value = `전국한마음자산관리 · 경매 답사 용지${label ? ` (${label})` : ""} · ${total}건  ·  회색칸=그대로 두기 / 흰칸만 입력  ·  점유: O=거주 X=공실 △=재방문  ·  번호=답사지(PDF)와 동일`;
  title.font = { bold: true, size: 11, color: { argb: "FF1C2B4A" } };
  ws.getRow(1).height = 24;

  const hr = ws.getRow(2);
  hr.values = COLS.map((c) => c.header);
  hr.font = { bold: true, color: { argb: "FFFFFFFF" } };
  hr.alignment = { vertical: "middle", horizontal: "center" };
  hr.height = 20;
  hr.eachCell((cell, n) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLS[n - 1].fill ? "FF64748B" : "FF1C2B4A" } };
  });
  ws.views = [{ state: "frozen", ySplit: 2 }];
  ws.autoFilter = { from: { row: 2, column: 1 }, to: { row: 2, column: NCOL } };

  let rowIdx = 2;
  for (const [region, list] of groups) {
    const owners = new Set(list.map((r) => r.owner_name ?? "(미상)")).size;
    rowIdx += 1;
    ws.mergeCells(rowIdx, 1, rowIdx, NCOL);
    const band = ws.getCell(rowIdx, 1);
    band.value = `📍 ${region}   ·   ${list.length}건   ·   임대인 ${owners}명`;
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
        no: r.property_no,
        owner: sameOwner ? "" : owner,
        addr: r.address_short ? `${r.address} [${r.address_short}]` : r.address,
        case: r.case_number === "(미상)" ? "" : r.case_number,
        cat: r.category ?? "",
        creditor: r.creditor ?? "",
      } as Record<string, string | number>;
      row.outlineLevel = 1;
      row.alignment = { vertical: "top", wrapText: true };
      if (!sameOwner) row.getCell("owner").font = { bold: true };
      for (let c = 1; c <= 6; c++) row.getCell(c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
      ws.getCell(rowIdx, OCC_COL).dataValidation = { type: "list", allowBlank: true, formulae: ['"O,X,△"'] };
      ws.getCell(rowIdx, OPEN_COL).dataValidation = { type: "list", allowBlank: true, formulae: ['"가능,불가,확인"'] };
      ws.getCell(rowIdx, MERCH_COL).dataValidation = { type: "list", allowBlank: true, formulae: ['"가능,보류,불가"'] };
    }
  }

  const out = await wb.xlsx.writeBuffer();
  return Buffer.from(out);
}
