import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { decryptPII } from "@/lib/crypto-pii";
import { maskAccount } from "@/lib/pii";
import { OwnerDetailTabs } from "./owner-detail-tabs";
import type { OwnerDetail, OwnerBuilding, OwnerUnit, SettlementRow } from "./types";
import type { OwnerPipeline } from "../constants";

export const metadata: Metadata = { title: "소유주 상세" };
export const dynamic = "force-dynamic";

interface PropRow {
  id: string;
  unit_type: "building" | "unit";
  name: string | null;
  address: string | null;
  unit_no: string | null;
  dong: string | null;
  ho: string | null;
  floor: number | null;
  service_modes: string[] | null;
  parent_building_id: string | null;
}

export default async function OwnerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: ownerRow } = await supabase.from("owners").select("*").eq("id", id).maybeSingle();
  if (!ownerRow) notFound();
  const o = ownerRow as Record<string, unknown>;

  const [propsRes, pipeRes, tenantsRes] = await Promise.all([
    supabase.from("properties")
      .select("id, unit_type, name, address, unit_no, dong, ho, floor, service_modes, parent_building_id")
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

  const toUnit = (p: PropRow): OwnerUnit => ({
    id: p.id,
    label: p.unit_no || [p.dong && `${p.dong}동`, p.ho && `${p.ho}호`].filter(Boolean).join(" ") || "(호실)",
    floor: p.floor,
    modes: p.service_modes ?? [],
    occupied: occupied.has(p.id),
  });

  const buildings: OwnerBuilding[] = props
    .filter((p) => p.unit_type === "building")
    .map((b) => ({
      id: b.id,
      name: b.name ?? "(건물)",
      address: b.address,
      modes: b.service_modes ?? [],
      units: props.filter((u) => u.unit_type === "unit" && u.parent_building_id === b.id).map(toUnit),
    }));

  // 상위 건물 없이 단독 등록된 호실
  const standaloneUnits: OwnerUnit[] = props
    .filter((p) => p.unit_type === "unit" && !buildings.some((b) => b.units.some((u) => u.id === p.id)))
    .map(toUnit);

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
        <ArrowLeft className="h-4 w-4" /> 소유주 목록
      </Link>
      <OwnerDetailTabs detail={detail} buildings={buildings} standaloneUnits={standaloneUnits} pipe={pipe} tenants={tenants} commissions={commissions} />
    </div>
  );
}
