import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { decryptPII } from "@/lib/crypto-pii";
import { maskAccount } from "@/lib/pii";
import { OwnerDetailTabs } from "./owner-detail-tabs";
import type { OwnerDetail, OwnerBuilding, OwnerUnit, SettlementRow, OwnerExpense, OwnerFinance } from "./types";
import type { OwnerPipeline } from "../constants";

export const metadata: Metadata = { title: "소유주(임대인) 상세" };
export const dynamic = "force-dynamic";

interface PropRow {
  id: string;
  unit_type: "building" | "unit";
  name: string | null;
  address: string | null;
  type: string;
  unit_no: string | null;
  dong: string | null;
  ho: string | null;
  floor: number | null;
  service_modes: string[] | null;
  parent_building_id: string | null;
  deposit_default: number | null;
  rent_default: number | null;
  management_fee_default: number | null;
}

export default async function OwnerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: ownerRow } = await supabase.from("owners").select("*").eq("id", id).maybeSingle();
  if (!ownerRow) notFound();
  const o = ownerRow as Record<string, unknown>;

  const [propsRes, pipeRes, tenantsRes] = await Promise.all([
    supabase.from("properties")
      .select("id, unit_type, name, address, type, unit_no, dong, ho, floor, service_modes, parent_building_id, deposit_default, rent_default, management_fee_default")
      .eq("owner_id", id),
    supabase.from("v_owner_pipeline").select("*").eq("owner_id", id).maybeSingle(),
    supabase.from("tenants").select("id, name").order("name"),
  ]);
  const props = (propsRes.data ?? []) as PropRow[];
  const tenants = (tenantsRes.data ?? []) as { id: string; name: string }[];

  // 정산(수수료) — 소유주 계약의 agency_commissions
  const { data: ownerLeases } = await supabase.from("leases").select("id").eq("landlord_id", id);
  const leaseIds = ((ownerLeases ?? []) as { id: string }[]).map((l) => l.id);
  let commissions: SettlementRow[] = [];
  if (leaseIds.length > 0) {
    const { data: cRows } = await supabase
      .from("agency_commissions")
      .select("period_start, period_end, base_amount, commission_amount, status")
      .in("lease_id", leaseIds)
      .order("period_start", { ascending: false });
    commissions = (cRows ?? []) as SettlementRow[];
  }

  // 호실 임차 상태
  const unitIds = props.filter((p) => p.unit_type === "unit").map((p) => p.id);
  const occupied = new Set<string>();
  if (unitIds.length > 0) {
    const { data: leases } = await supabase
      .from("leases").select("unit_id").in("unit_id", unitIds).in("status", ["active", "expiring"]);
    for (const l of (leases ?? []) as { unit_id: string }[]) occupied.add(l.unit_id);
  }

  // 시설관리 업체 수 (위탁관리 건물 통합) — 건물별 building_vendors 카운트
  const buildingIds = props.filter((p) => p.unit_type === "building").map((p) => p.id);
  const vendorCount = new Map<string, number>();
  if (buildingIds.length > 0) {
    const { data: vendors } = await supabase
      .from("building_vendors").select("property_id").in("property_id", buildingIds);
    for (const v of (vendors ?? []) as { property_id: string }[]) {
      vendorCount.set(v.property_id, (vendorCount.get(v.property_id) ?? 0) + 1);
    }
  }

  const toUnit = (p: PropRow): OwnerUnit => ({
    id: p.id,
    label: p.unit_no || [p.dong && `${p.dong}동`, p.ho && `${p.ho}호`].filter(Boolean).join(" ") || "(호실)",
    unit_no: p.unit_no,
    floor: p.floor,
    modes: p.service_modes ?? [],
    occupied: occupied.has(p.id),
    deposit_default: p.deposit_default,
    rent_default: p.rent_default,
  });

  const buildings: OwnerBuilding[] = props
    .filter((p) => p.unit_type === "building")
    .map((b) => ({
      id: b.id,
      name: b.name ?? "(건물)",
      address: b.address,
      type: b.type,
      modes: b.service_modes ?? [],
      deposit_default: b.deposit_default,
      rent_default: b.rent_default,
      management_fee_default: b.management_fee_default,
      vendor_count: vendorCount.get(b.id) ?? 0,
      units: props.filter((u) => u.unit_type === "unit" && u.parent_building_id === b.id).map(toUnit),
    }));

  // 상위 건물 없이 단독 등록된 호실
  const standaloneUnits: OwnerUnit[] = props
    .filter((p) => p.unit_type === "unit" && !buildings.some((b) => b.units.some((u) => u.id === p.id)))
    .map(toUnit);

  // ===== 이번 달 정산 파이프라인 + 호실 지출 =====
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  const monthLabel = monthStart.slice(0, 7);

  let billed = 0, collected = 0;
  if (leaseIds.length > 0) {
    const { data: invRows } = await supabase.from("rent_invoices")
      .select("amount_total, paid_total, due_date")
      .in("lease_id", leaseIds).gte("due_date", monthStart).lte("due_date", monthEnd);
    for (const r of (invRows ?? []) as { amount_total: number; paid_total: number }[]) {
      billed += r.amount_total; collected += r.paid_total;
    }
  }
  const outstanding = Math.max(0, billed - collected);
  const monthCommission = commissions
    .filter((c) => (c.period_start ?? "").slice(0, 7) === monthLabel)
    .reduce((s, c) => s + c.commission_amount, 0);

  // 호실 라벨 맵 + 지출 조회
  const buildingNameById = new Map(props.filter((p) => p.unit_type === "building").map((b) => [b.id, b.name ?? "건물"]));
  const unitLabelById = new Map(props.filter((p) => p.unit_type === "unit").map((u) => {
    const bn = u.parent_building_id ? (buildingNameById.get(u.parent_building_id) ?? "건물") : "단독호실";
    return [u.id, `${bn} · ${u.unit_no ?? ""}호`];
  }));
  const { data: expRows } = await supabase.from("unit_expenses")
    .select("*").eq("owner_id", id).order("incurred_on", { ascending: false });
  const expenses: OwnerExpense[] = ((expRows ?? []) as Record<string, unknown>[]).map((e) => ({
    id: e.id as string,
    unit_id: e.unit_id as string,
    unit_label: unitLabelById.get(e.unit_id as string) ?? "호실",
    category: e.category as string,
    description: (e.description as string) ?? null,
    amount: e.amount as number,
    incurred_on: e.incurred_on as string,
    split_type: e.split_type as string,
    owner_ratio: e.owner_ratio as number,
    company_ratio: e.company_ratio as number,
    owner_amount: e.owner_amount as number,
    company_amount: e.company_amount as number,
    billed_to_owner: e.billed_to_owner as boolean,
    memo: (e.memo as string) ?? null,
  }));
  const monthExpenses = expenses.filter((e) => e.incurred_on >= monthStart && e.incurred_on <= monthEnd);
  const finance: OwnerFinance = {
    monthLabel,
    billed,
    collected,
    outstanding,
    commission: monthCommission,
    expenseTotal: monthExpenses.reduce((s, e) => s + e.amount, 0),
    expenseOwner: monthExpenses.reduce((s, e) => s + e.owner_amount, 0),
    expenseCompany: monthExpenses.reduce((s, e) => s + e.company_amount, 0),
    ownerPayout: collected - monthCommission - monthExpenses.reduce((s, e) => s + e.owner_amount, 0),
  };

  const account = await decryptPII((o.account_number_encrypted as string) ?? "");

  const detail: OwnerDetail = {
    id: o.id as string,
    name: o.name as string,
    phone: (o.phone as string) ?? null,
    email: (o.email as string) ?? null,
    account_bank: (o.account_bank as string) ?? null,
    account_holder: (o.account_holder as string) ?? null,
    account_masked: account ? maskAccount(account) : "-",
    business_name: (o.business_name as string) ?? null,
    business_number: (o.business_number as string) ?? null,
    representative: (o.representative as string) ?? null,
    memo: (o.memo as string) ?? null,
  };

  const pipe = (pipeRes.data ?? null) as OwnerPipeline | null;

  return (
    <div className="p-6 lg:p-8 max-w-5xl">
      <Link href="/admin/owners" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> 소유주(임대인) 목록
      </Link>
      <OwnerDetailTabs detail={detail} buildings={buildings} standaloneUnits={standaloneUnits} pipe={pipe} tenants={tenants} commissions={commissions} finance={finance} expenses={expenses} />
    </div>
  );
}
