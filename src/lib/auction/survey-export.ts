// 표준 답사표 엑셀 생성 — 수집풀에서 식별칸을 미리 채워 답사자에게 제공.
// admin 전용(route 에서 requireAdmin 후 호출). service_role 조회.
import "server-only";

import ExcelJS from "exceljs";
import { createServiceClient } from "@/lib/supabase/server";

interface PoolRow {
  case_number: string;
  address: string;
  address_short: string | null;
  category: string | null;
  owner_name: string | null;
  creditor: string | null;
}

export async function buildSurveyTemplate(opts: {
  region?: string;
  states?: string[];
}): Promise<{ buffer: Buffer; region: string }> {
  const sb = createServiceClient();
  let q = sb
    .from("auction_property")
    .select("case_number, address, address_short, category, owner_name, creditor, pipeline_state")
    .neq("survey_status", "rejected")
    .order("address");
  if (opts.states?.length) q = q.in("pipeline_state", opts.states);
  const { data } = await q;
  const rows = (data ?? []) as PoolRow[];

  const region = opts.region ?? "답사표";
  const wb = new ExcelJS.Workbook();
  wb.creator = "전국한마음자산관리";
  wb.created = new Date();
  const ws = wb.addWorksheet(region.slice(0, 28));

  ws.columns = [
    { header: "방문순번", key: "no", width: 8 },
    { header: "동", key: "dong", width: 10 },
    { header: "상세 주소", key: "addr", width: 42 },
    { header: "사건번호", key: "case", width: 14 },
    { header: "물건종류", key: "cat", width: 12 },
    { header: "임대인", key: "owner", width: 12 },
    { header: "채권자", key: "creditor", width: 18 },
    { header: "점유 상태", key: "occ", width: 10 },
    { header: "개방가능", key: "open", width: 12 },
    { header: "상품화준비", key: "merch", width: 12 },
    { header: "우편", key: "mail", width: 6 },
    { header: "계량기", key: "meter", width: 7 },
    { header: "현관비번", key: "door", width: 12 },
    { header: "관리실", key: "office", width: 16 },
    { header: "비고", key: "memo", width: 32 },
  ];

  rows.forEach((r, i) => {
    ws.addRow({
      no: i + 1,
      dong: "",
      addr: r.address_short ? `${r.address} [${r.address_short}]` : r.address,
      case: r.case_number,
      cat: r.category ?? "",
      owner: r.owner_name ?? "",
      creditor: r.creditor ?? "",
    });
  });

  const h = ws.getRow(1);
  h.font = { bold: true, color: { argb: "FFFFFFFF" } };
  h.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1C2B4A" } };
  h.alignment = { vertical: "middle", horizontal: "center" };
  h.height = 22;
  ws.views = [{ state: "frozen", ySplit: 1 }];

  // 입력칸 드롭다운 (점유 H / 개방 I / 상품화 J)
  const lastRow = rows.length + 1;
  for (let r = 2; r <= Math.max(lastRow, 2); r++) {
    ws.getCell(`H${r}`).dataValidation = { type: "list", allowBlank: true, formulae: ['"O,X,△"'] };
    ws.getCell(`I${r}`).dataValidation = { type: "list", allowBlank: true, formulae: ['"가능,불가,관리실확인"'] };
    ws.getCell(`J${r}`).dataValidation = { type: "list", allowBlank: true, formulae: ['"가능,보류,불가"'] };
  }

  const out = await wb.xlsx.writeBuffer();
  return { buffer: Buffer.from(out), region };
}
