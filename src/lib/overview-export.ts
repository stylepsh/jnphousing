/**
 * 현황 통합 엑셀 — "누구나 보고 현재 상황을 파악" 용.
 *
 * 원시 백업(excel-backup.ts)과 달리, 임대인(소유주) 중심으로 가공한 읽기 쉬운 현황표.
 * 시트: 요약 / 임대인별 현황 / 물건 현황 / 계약·수금
 *
 * 신 통합 모델(owners, properties unit_type, v_owner_pipeline) 기반.
 * admin 전용 (route 에서 requireAdmin 후 호출). service_role 로 조회(RLS 우회).
 */

import "server-only";

import ExcelJS from "exceljs";
import { createServiceClient } from "@/lib/supabase/server";

const MODE_LABEL: Record<string, string> = {
  housing_mgmt: "주택관리",
  rental_consigned: "위탁임대관리",
  rental: "위탁임대관리",
  dm: "JNP 단기임대",
};
const LEASE_STATUS: Record<string, string> = {
  draft: "작성중", active: "진행중", expiring: "만료임박", renewed: "갱신", terminated: "해지", expired: "만료",
};
const SOURCE_LABEL: Record<string, string> = {
  direct: "자체", broker: "중개업소", referral: "소개", other: "기타",
};
const modesText = (modes: string[] | null) =>
  (modes ?? []).map((m) => MODE_LABEL[m] ?? m).join(", ");

/** 월 위탁수수료(우리 수익) — percent 는 월세 기준, fixed 는 정액. */
function monthlyFee(l: { fee_type: string; fee_percent: number | null; fee_fixed: number | null; rent_amount: number }): number {
  if (l.fee_type === "percent") return l.fee_percent != null ? Math.floor((l.rent_amount * l.fee_percent) / 100) : 0;
  return l.fee_fixed ?? 0;
}

function applyHeaderStyle(ws: ExcelJS.Worksheet) {
  const header = ws.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1C2B4A" } };
  header.alignment = { vertical: "middle", horizontal: "center" };
  header.height = 22;
  ws.views = [{ state: "frozen", ySplit: 1 }];
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: header.cellCount } };
}

const won = "#,##0";

interface PipeRow {
  owner_id: string; owner_name: string;
  building_count: number; unit_count: number; vacant_count: number; occupied_count: number;
  month_invoice_count: number; month_paid_count: number; month_overdue_count: number;
}
interface PropRow {
  id: string; owner_id: string | null; unit_type: string; name: string | null;
  address: string | null; unit_no: string | null; floor: number | null;
  service_modes: string[] | null; parent_building_id: string | null;
  deposit_default: number | null; rent_default: number | null;
}
interface LeaseRow {
  id: string; unit_id: string; landlord_id: string; tenant_id: string;
  status: string; lease_type: string; deposit: number; rent_amount: number;
  management_fee: number;
  fee_type: string; fee_percent: number | null; fee_fixed: number | null;
  contract_source_type: string | null; contract_source_name: string | null;
  start_date: string; end_date: string;
}

export async function buildOverviewWorkbook(): Promise<Buffer> {
  const sb = createServiceClient();
  const ym = new Date().toISOString().slice(0, 7); // YYYY-MM

  const [ownersR, pipeR, propsR, leasesR, tenantsR, invR] = await Promise.all([
    sb.from("owners").select("id, name, phone").order("name"),
    sb.from("v_owner_pipeline").select("*"),
    sb.from("properties").select("id, owner_id, unit_type, name, address, unit_no, floor, service_modes, parent_building_id, deposit_default, rent_default").limit(10000),
    sb.from("leases").select("id, unit_id, landlord_id, tenant_id, status, lease_type, deposit, rent_amount, management_fee, fee_type, fee_percent, fee_fixed, contract_source_type, contract_source_name, start_date, end_date").limit(10000),
    sb.from("tenants").select("id, name, phone").limit(10000),
    sb.from("rent_invoices").select("lease_id, amount_total, paid_total, due_date").limit(10000),
  ]);

  const owners = (ownersR.data ?? []) as { id: string; name: string; phone: string | null }[];
  const pipes = (pipeR.data ?? []) as PipeRow[];
  const props = (propsR.data ?? []) as PropRow[];
  const leases = (leasesR.data ?? []) as LeaseRow[];
  const tenants = (tenantsR.data ?? []) as { id: string; name: string; phone: string | null }[];
  const invoices = (invR.data ?? []) as { lease_id: string; amount_total: number; paid_total: number; due_date: string }[];

  const ownerName = new Map(owners.map((o) => [o.id, o.name]));
  const tenantById = new Map(tenants.map((t) => [t.id, t]));
  const propById = new Map(props.map((p) => [p.id, p]));
  const activeLeaseByUnit = new Set(leases.filter((l) => ["active", "expiring"].includes(l.status)).map((l) => l.unit_id));

  const wb = new ExcelJS.Workbook();
  wb.creator = "JNP주택관리 시스템";
  wb.created = new Date();

  // ── 1. 요약 ───────────────────────────────────────────────
  const sum = wb.addWorksheet("요약");
  sum.columns = [{ header: "항목", key: "k", width: 28 }, { header: "값", key: "v", width: 24 }];
  const t = {
    buildings: pipes.reduce((s, p) => s + (p.building_count || 0), 0),
    units: pipes.reduce((s, p) => s + (p.unit_count || 0), 0),
    vacant: pipes.reduce((s, p) => s + (p.vacant_count || 0), 0),
    occupied: pipes.reduce((s, p) => s + (p.occupied_count || 0), 0),
  };
  const monthInv = invoices.filter((i) => (i.due_date ?? "").slice(0, 7) === ym);
  const billed = monthInv.reduce((s, i) => s + i.amount_total, 0);
  const paid = monthInv.reduce((s, i) => s + i.paid_total, 0);
  const overdueCnt = monthInv.filter((i) => i.paid_total < i.amount_total).length;
  sum.addRow({ k: "기준 일시", v: new Date().toISOString().replace("T", " ").slice(0, 16) });
  sum.addRow({ k: "회사", v: "JNP주택관리 (제이앤피 주택관리)" });
  sum.addRow({ k: "소유주 수", v: owners.length });
  sum.addRow({ k: "건물 수", v: t.buildings });
  sum.addRow({ k: "호실 수", v: t.units });
  sum.addRow({ k: "공실", v: t.vacant });
  sum.addRow({ k: "임차중", v: t.occupied });
  sum.addRow({ k: `이번달(${ym}) 청구액`, v: billed });
  sum.addRow({ k: "이번달 수금액", v: paid });
  sum.addRow({ k: "이번달 수금률", v: billed > 0 ? Math.round((paid * 100) / billed) + "%" : "-" });
  sum.addRow({ k: "이번달 연체/미납", v: overdueCnt });
  applyHeaderStyle(sum);
  sum.getColumn("v").numFmt = won;

  // ── 2. 임대인별 현황 ──────────────────────────────────────
  const wsO = wb.addWorksheet("임대인별 현황");
  wsO.columns = [
    { header: "소유주", key: "name", width: 16 },
    { header: "연락처", key: "phone", width: 16 },
    { header: "건물", key: "buildings", width: 8 },
    { header: "호실", key: "units", width: 8 },
    { header: "공실", key: "vacant", width: 8 },
    { header: "임차중", key: "occupied", width: 8 },
    { header: "이번달 청구건", key: "inv", width: 12 },
    { header: "완납", key: "paid", width: 8 },
    { header: "연체", key: "overdue", width: 8 },
  ];
  const pipeByOwner = new Map(pipes.map((p) => [p.owner_id, p]));
  for (const o of owners) {
    const p = pipeByOwner.get(o.id);
    wsO.addRow({
      name: o.name, phone: o.phone ?? "",
      buildings: p?.building_count ?? 0, units: p?.unit_count ?? 0,
      vacant: p?.vacant_count ?? 0, occupied: p?.occupied_count ?? 0,
      inv: p?.month_invoice_count ?? 0, paid: p?.month_paid_count ?? 0, overdue: p?.month_overdue_count ?? 0,
    });
  }
  applyHeaderStyle(wsO);

  // ── 3. 물건 현황 (건물·호실 평탄화) ───────────────────────
  const wsP = wb.addWorksheet("물건 현황");
  wsP.columns = [
    { header: "소유주", key: "owner", width: 16 },
    { header: "구분", key: "kind", width: 8 },
    { header: "건물", key: "building", width: 18 },
    { header: "호수", key: "unit", width: 10 },
    { header: "층", key: "floor", width: 6 },
    { header: "관리유형", key: "modes", width: 22 },
    { header: "상태", key: "state", width: 8 },
    { header: "주소", key: "address", width: 36 },
    { header: "보증금", key: "deposit", width: 12 },
    { header: "월세", key: "rent", width: 10 },
  ];
  const buildings = props.filter((p) => p.unit_type === "building").sort((a, b) => (ownerName.get(a.owner_id ?? "") ?? "").localeCompare(ownerName.get(b.owner_id ?? "") ?? ""));
  for (const b of buildings) {
    wsP.addRow({
      owner: ownerName.get(b.owner_id ?? "") ?? "-", kind: "건물", building: b.name ?? "",
      unit: "", floor: "", modes: modesText(b.service_modes), state: "",
      address: b.address ?? "", deposit: b.deposit_default ?? 0, rent: b.rent_default ?? 0,
    });
    for (const u of props.filter((p) => p.unit_type === "unit" && p.parent_building_id === b.id)) {
      wsP.addRow({
        owner: ownerName.get(u.owner_id ?? "") ?? "-", kind: "호실", building: b.name ?? "",
        unit: u.unit_no ?? "", floor: u.floor ?? "", modes: modesText(u.service_modes),
        state: activeLeaseByUnit.has(u.id) ? "임차중" : "공실",
        address: u.address ?? "", deposit: u.deposit_default ?? 0, rent: u.rent_default ?? 0,
      });
    }
  }
  // 단독 호실
  for (const u of props.filter((p) => p.unit_type === "unit" && !buildings.some((b) => b.id === p.parent_building_id))) {
    wsP.addRow({
      owner: ownerName.get(u.owner_id ?? "") ?? "-", kind: "단독호실", building: "(단독)",
      unit: u.unit_no ?? "", floor: u.floor ?? "", modes: modesText(u.service_modes),
      state: activeLeaseByUnit.has(u.id) ? "임차중" : "공실",
      address: u.address ?? "", deposit: u.deposit_default ?? 0, rent: u.rent_default ?? 0,
    });
  }
  applyHeaderStyle(wsP);
  wsP.getColumn("deposit").numFmt = won;
  wsP.getColumn("rent").numFmt = won;

  // ── 4. 계약·수금 ──────────────────────────────────────────
  const wsL = wb.addWorksheet("계약·수금");
  wsL.columns = [
    { header: "소유주", key: "owner", width: 16 },
    { header: "물건", key: "unit", width: 24 },
    { header: "임차인", key: "tenant", width: 14 },
    { header: "연락처", key: "phone", width: 16 },
    { header: "유형", key: "type", width: 8 },
    { header: "상태", key: "status", width: 10 },
    { header: "보증금", key: "deposit", width: 12 },
    { header: "월세", key: "rent", width: 10 },
    { header: "관리비", key: "mgmt", width: 10 },
    { header: "수수료방식", key: "feetype", width: 12 },
    { header: "우리수익(월)", key: "fee", width: 12 },
    { header: "임대인지급(월)", key: "payout", width: 13 },
    { header: "계약경로", key: "source", width: 10 },
    { header: "계약처", key: "sourcename", width: 16 },
    { header: "시작", key: "start", width: 12 },
    { header: "종료", key: "end", width: 12 },
    { header: "이번달 납부", key: "thismonth", width: 12 },
  ];
  for (const l of leases) {
    const u = propById.get(l.unit_id);
    const tn = tenantById.get(l.tenant_id);
    const mInv = monthInv.filter((i) => i.lease_id === l.id);
    const mBilled = mInv.reduce((s, i) => s + i.amount_total, 0);
    const mPaid = mInv.reduce((s, i) => s + i.paid_total, 0);
    const thismonth = mInv.length === 0 ? "미발행" : mPaid >= mBilled ? "완납" : mPaid > 0 ? "부분납" : "미납";
    const ourFee = monthlyFee(l);
    const billMonthly = l.rent_amount + (l.management_fee ?? 0);
    wsL.addRow({
      owner: ownerName.get(l.landlord_id) ?? "-",
      unit: u ? `${u.name ?? ""}${u.unit_no ? ` ${u.unit_no}` : ""}`.trim() : "(미상)",
      tenant: tn?.name ?? "-", phone: tn?.phone ?? "",
      type: l.lease_type === "long_term" ? "장기" : "단기",
      status: LEASE_STATUS[l.status] ?? l.status,
      deposit: l.deposit, rent: l.rent_amount, mgmt: l.management_fee ?? 0,
      feetype: l.fee_type === "percent" ? `${l.fee_percent ?? 0}%` : "정액",
      fee: ourFee, payout: billMonthly - ourFee,
      source: SOURCE_LABEL[l.contract_source_type ?? "direct"] ?? "자체",
      sourcename: l.contract_source_name ?? "",
      start: (l.start_date ?? "").slice(0, 10), end: (l.end_date ?? "").slice(0, 10),
      thismonth,
    });
  }
  applyHeaderStyle(wsL);
  for (const k of ["deposit", "rent", "mgmt", "fee", "payout"]) wsL.getColumn(k).numFmt = won;

  const out = await wb.xlsx.writeBuffer();
  return Buffer.from(out);
}
