/**
 * 건물 단위 엑셀 — 특정 건물 하나의 호실·임차·수금·수수료를 한 파일로.
 * 시트: 건물요약 / 호실현황
 * admin 전용 (route 에서 requireAdmin 후 호출). service_role 로 조회.
 */

import "server-only";

import ExcelJS from "exceljs";
import { createServiceClient } from "@/lib/supabase/server";

const MODE_LABEL: Record<string, string> = {
  housing_mgmt: "주택관리", rental_consigned: "위탁임대관리", rental: "위탁임대관리", dm: "JNP 단기임대",
};
const SOURCE_LABEL: Record<string, string> = {
  direct: "자체", broker: "중개업소", referral: "소개", other: "기타",
};
const won = "#,##0";
const modesText = (m: string[] | null) => (m ?? []).map((x) => MODE_LABEL[x] ?? x).join(", ");

function applyHeaderStyle(ws: ExcelJS.Worksheet) {
  const header = ws.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1C2B4A" } };
  header.alignment = { vertical: "middle", horizontal: "center" };
  header.height = 22;
  ws.views = [{ state: "frozen", ySplit: 1 }];
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: header.cellCount } };
}

interface UnitRow {
  id: string; unit_no: string | null; floor: number | null;
  service_modes: string[] | null; deposit_default: number | null; rent_default: number | null; management_fee_default: number | null;
}
interface LeaseRow {
  id: string; unit_id: string; status: string; start_date: string; end_date: string;
  deposit: number; rent_amount: number; management_fee: number;
  fee_type: string; fee_percent: number | null; fee_fixed: number | null;
  contract_source_type: string | null; contract_source_name: string | null;
  tenant: { name: string; phone: string } | null;
}

function monthlyFee(l: LeaseRow): number {
  if (l.fee_type === "percent") return l.fee_percent != null ? Math.floor((l.rent_amount * l.fee_percent) / 100) : 0;
  return l.fee_fixed ?? 0;
}

/** 특정 건물 1개의 엑셀 워크북. 건물이 없으면 null. */
export async function buildBuildingWorkbook(
  buildingId: string,
): Promise<{ buffer: Buffer; buildingName: string } | null> {
  const sb = createServiceClient();

  const { data: b } = await sb
    .from("properties")
    .select("id, name, address, type, service_modes, owner_id, unit_type")
    .eq("id", buildingId).eq("unit_type", "building").maybeSingle();
  if (!b) return null;
  const building = b as { id: string; name: string | null; address: string | null; type: string; service_modes: string[] | null; owner_id: string | null };

  const [ownerRes, unitsRes] = await Promise.all([
    building.owner_id
      ? sb.from("owners").select("name, phone").eq("id", building.owner_id).maybeSingle()
      : Promise.resolve({ data: null }),
    sb.from("properties")
      .select("id, unit_no, floor, service_modes, deposit_default, rent_default, management_fee_default")
      .eq("parent_building_id", buildingId).eq("unit_type", "unit").order("unit_no"),
  ]);
  const owner = (ownerRes.data ?? null) as { name: string; phone: string | null } | null;
  const units = (unitsRes.data ?? []) as UnitRow[];
  const unitIds = units.map((u) => u.id);

  let leases: LeaseRow[] = [];
  if (unitIds.length > 0) {
    const { data: lRows } = await sb
      .from("leases")
      .select("id, unit_id, status, start_date, end_date, deposit, rent_amount, management_fee, fee_type, fee_percent, fee_fixed, contract_source_type, contract_source_name, tenant:tenants(name, phone)")
      .in("unit_id", unitIds)
      .in("status", ["active", "expiring", "draft"]);
    leases = (lRows ?? []) as unknown as LeaseRow[];
  }
  const leaseByUnit = new Map<string, LeaseRow>();
  for (const l of leases) {
    const cur = leaseByUnit.get(l.unit_id);
    const rank = (s: string) => (s === "active" || s === "expiring" ? 2 : s === "draft" ? 1 : 0);
    if (!cur || rank(l.status) > rank(cur.status)) leaseByUnit.set(l.unit_id, l);
  }

  const live = leases.filter((l) => l.status === "active" || l.status === "expiring");
  const monthBilling = live.reduce((s, l) => s + l.rent_amount + (l.management_fee ?? 0), 0);
  const monthFee = live.reduce((s, l) => s + monthlyFee(l), 0);
  const occupied = units.filter((u) => {
    const l = leaseByUnit.get(u.id);
    return l && (l.status === "active" || l.status === "expiring");
  }).length;

  const wb = new ExcelJS.Workbook();
  wb.creator = "JNP주택관리 시스템";
  wb.created = new Date();

  // ── 건물 요약 ──
  const ws1 = wb.addWorksheet("건물요약");
  ws1.columns = [{ header: "항목", key: "k", width: 24 }, { header: "값", key: "v", width: 36 }];
  ws1.addRow({ k: "건물명", v: building.name ?? "" });
  ws1.addRow({ k: "주소", v: building.address ?? "" });
  ws1.addRow({ k: "소유주", v: owner ? `${owner.name}${owner.phone ? ` (${owner.phone})` : ""}` : "-" });
  ws1.addRow({ k: "관리유형", v: modesText(building.service_modes) || "-" });
  ws1.addRow({ k: "총 호실", v: units.length });
  ws1.addRow({ k: "임차중", v: occupied });
  ws1.addRow({ k: "공실", v: units.length - occupied });
  ws1.addRow({ k: "월 청구 합계", v: monthBilling });
  ws1.addRow({ k: "우리 수익(월 위탁수수료)", v: monthFee });
  ws1.addRow({ k: "임대인 지급액(월)", v: monthBilling - monthFee });
  ws1.addRow({ k: "기준 일시", v: new Date().toISOString().replace("T", " ").slice(0, 16) });
  applyHeaderStyle(ws1);

  // ── 호실 현황 ──
  const ws2 = wb.addWorksheet("호실현황");
  ws2.columns = [
    { header: "호수", key: "unit", width: 10 },
    { header: "층", key: "floor", width: 6 },
    { header: "상태", key: "state", width: 10 },
    { header: "임차인", key: "tenant", width: 14 },
    { header: "연락처", key: "phone", width: 16 },
    { header: "보증금", key: "deposit", width: 12 },
    { header: "월세", key: "rent", width: 10 },
    { header: "관리비", key: "mgmt", width: 10 },
    { header: "우리수익(월)", key: "fee", width: 12 },
    { header: "계약경로", key: "source", width: 10 },
    { header: "계약처", key: "sourcename", width: 16 },
    { header: "시작", key: "start", width: 12 },
    { header: "종료", key: "end", width: 12 },
  ];
  for (const u of units) {
    const l = leaseByUnit.get(u.id);
    const live2 = l && (l.status === "active" || l.status === "expiring");
    ws2.addRow({
      unit: u.unit_no ?? "", floor: u.floor ?? "",
      state: !l ? "공실" : l.status === "draft" ? "준비중" : "임차중",
      tenant: l?.tenant?.name ?? "", phone: l?.tenant?.phone ?? "",
      deposit: l ? l.deposit : u.deposit_default ?? 0,
      rent: l ? l.rent_amount : u.rent_default ?? 0,
      mgmt: l ? l.management_fee ?? 0 : u.management_fee_default ?? 0,
      fee: live2 ? monthlyFee(l) : 0,
      source: l ? SOURCE_LABEL[l.contract_source_type ?? "direct"] ?? "자체" : "",
      sourcename: l?.contract_source_name ?? "",
      start: l ? (l.start_date ?? "").slice(0, 10) : "",
      end: l ? (l.end_date ?? "").slice(0, 10) : "",
    });
  }
  applyHeaderStyle(ws2);
  for (const k of ["deposit", "rent", "mgmt", "fee"]) ws2.getColumn(k).numFmt = won;

  const out = await wb.xlsx.writeBuffer();
  return { buffer: Buffer.from(out), buildingName: building.name ?? "건물" };
}
