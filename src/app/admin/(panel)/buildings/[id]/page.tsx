import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, MapPin, User, DoorOpen, FileSpreadsheet, FileSignature, Wrench } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatWon, formatWonMan } from "@/lib/money";
import { formatKoreanDate, isExpiringSoon } from "@/lib/dates";
import { modeLabel } from "../../owners/constants";

export const metadata: Metadata = { title: "건물 현황" };
export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  villa: "빌라", apartment: "아파트", officetel: "오피스텔", commercial: "상가",
};

interface UnitRow {
  id: string; unit_no: string | null; floor: number | null;
  service_modes: string[] | null; deposit_default: number | null;
  rent_default: number | null; management_fee_default: number | null;
}
interface LeaseRow {
  id: string; unit_id: string; status: string;
  start_date: string; end_date: string;
  rent_amount: number; management_fee: number; deposit: number;
  fee_type: "percent" | "fixed"; fee_percent: number | null; fee_fixed: number | null;
  contract_source_type: string | null; contract_source_name: string | null;
  tenant: { name: string; phone: string } | null;
}

/** 월 위탁수수료(우리 수익) — percent 는 월세 기준, fixed 는 정액. */
function monthlyFee(l: LeaseRow): number {
  if (l.fee_type === "percent") {
    return l.fee_percent != null ? Math.floor((l.rent_amount * l.fee_percent) / 100) : 0;
  }
  return l.fee_fixed ?? 0;
}

function unitStatus(l: LeaseRow | undefined, overdue: boolean): { key: string; l: string; cls: string; dot: string } {
  if (!l) return { key: "vacant", l: "공실", cls: "bg-slate-50 border-slate-200", dot: "bg-slate-400" };
  if (overdue) return { key: "overdue", l: "연체", cls: "bg-rose-50 border-rose-300", dot: "bg-rose-500" };
  if (l.status === "draft") return { key: "draft", l: "준비중", cls: "bg-blue-50 border-blue-200", dot: "bg-blue-500" };
  if ((l.status === "active" || l.status === "expiring") && isExpiringSoon(new Date(l.end_date), 60))
    return { key: "expiring", l: "만료임박", cls: "bg-amber-50 border-amber-300", dot: "bg-amber-500" };
  return { key: "occupied", l: "임차중", cls: "bg-emerald-50 border-emerald-200", dot: "bg-emerald-500" };
}

async function fetchBuilding(id: string) {
  const supabase = await createClient();
  const { data: b } = await supabase
    .from("properties")
    .select("id, name, address, type, service_modes, owner_id, unit_type")
    .eq("id", id).eq("unit_type", "building").maybeSingle();
  if (!b) return null;
  const building = b as {
    id: string; name: string | null; address: string | null; type: string;
    service_modes: string[] | null; owner_id: string | null;
  };

  const [ownerRes, unitsRes, vendorRes] = await Promise.all([
    building.owner_id
      ? supabase.from("owners").select("id, name").eq("id", building.owner_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("properties")
      .select("id, unit_no, floor, service_modes, deposit_default, rent_default, management_fee_default")
      .eq("parent_building_id", id).eq("unit_type", "unit").order("unit_no"),
    supabase.from("building_vendors").select("id").eq("property_id", id),
  ]);

  const units = (unitsRes.data ?? []) as UnitRow[];
  const unitIds = units.map((u) => u.id);

  let leases: LeaseRow[] = [];
  const overdueLeaseIds = new Set<string>();
  if (unitIds.length > 0) {
    const { data: lRows } = await supabase
      .from("leases")
      .select("id, unit_id, status, start_date, end_date, rent_amount, management_fee, deposit, fee_type, fee_percent, fee_fixed, contract_source_type, contract_source_name, tenant:tenants(name, phone)")
      .in("unit_id", unitIds)
      .in("status", ["active", "expiring", "draft"]);
    leases = (lRows ?? []) as unknown as LeaseRow[];

    // 이번 달 연체 청구서 → 해당 계약 연체 표시
    const leaseIds = leases.map((l) => l.id);
    if (leaseIds.length > 0) {
      const { data: ovd } = await supabase
        .from("rent_invoices")
        .select("lease_id")
        .in("lease_id", leaseIds)
        .eq("status", "overdue");
      for (const r of (ovd ?? []) as { lease_id: string }[]) overdueLeaseIds.add(r.lease_id);
    }
  }

  return {
    building,
    owner: (ownerRes.data ?? null) as { id: string; name: string } | null,
    vendorCount: (vendorRes.data ?? []).length,
    units,
    leases,
    overdueLeaseIds,
  };
}

export default async function BuildingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await fetchBuilding(id);
  if (!data) notFound();
  const { building, owner, vendorCount, units, leases, overdueLeaseIds } = data;

  // 활성 계약 매핑 (호실 1개당 1건 — active/expiring 우선)
  const leaseByUnit = new Map<string, LeaseRow>();
  for (const l of leases) {
    const cur = leaseByUnit.get(l.unit_id);
    const rank = (s: string) => (s === "active" || s === "expiring" ? 2 : s === "draft" ? 1 : 0);
    if (!cur || rank(l.status) > rank(cur.status)) leaseByUnit.set(l.unit_id, l);
  }

  // 수익 요약 (활성/만료임박 계약 기준 월 예상)
  const live = leases.filter((l) => l.status === "active" || l.status === "expiring");
  const monthBilling = live.reduce((s, l) => s + l.rent_amount + l.management_fee, 0);
  const monthFee = live.reduce((s, l) => s + monthlyFee(l), 0);   // 우리 수익
  const monthPayout = monthBilling - monthFee;                    // 임대인 지급
  const occupied = units.filter((u) => {
    const l = leaseByUnit.get(u.id);
    return l && (l.status === "active" || l.status === "expiring");
  }).length;
  const vacant = units.length - occupied;
  const expiringSoon = live.filter((l) => isExpiringSoon(new Date(l.end_date), 60)).length;

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      <Link href={owner ? `/admin/owners/${owner.id}` : "/admin/owners"} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> {owner ? `${owner.name} 소유주` : "소유주 목록"}
      </Link>

      {/* 헤더 */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">
              <Building2 className="h-3 w-3" /> {TYPE_LABEL[building.type] ?? building.type}
            </span>
            {(building.service_modes ?? []).map((m) => {
              const ml = modeLabel(m);
              return <span key={m} className={`px-2 py-0.5 rounded-full text-xs font-bold ${ml.color}`}>{ml.label}</span>;
            })}
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight truncate">{building.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground flex items-center gap-3 flex-wrap">
            {building.address && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{building.address}</span>}
            {owner && <Link href={`/admin/owners/${owner.id}`} className="inline-flex items-center gap-1 hover:text-foreground"><User className="h-3.5 w-3.5" />{owner.name}</Link>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/admin/buildings-managed/${building.id}`} className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-bold hover:bg-muted">
            <Wrench className="h-4 w-4" /> 시설관리{vendorCount > 0 ? ` ${vendorCount}` : ""}
          </Link>
          <a href={`/api/admin/export/building/${building.id}`} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold text-white hover:bg-emerald-700">
            <FileSpreadsheet className="h-4 w-4" /> 엑셀 내보내기
          </a>
        </div>
      </div>

      {/* 수익 요약 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
        <SummaryCard label="월 청구 합계" value={`${formatWon(monthBilling)}원`} sub={`임차중 ${occupied}건 기준`} tone="slate" />
        <SummaryCard label="우리 수익 (월 위탁수수료)" value={`${formatWon(monthFee)}원`} sub="활성 계약 합산" tone="emerald" />
        <SummaryCard label="임대인 지급액 (월)" value={`${formatWon(monthPayout)}원`} sub="청구 − 수수료" tone="blue" />
        <SummaryCard label="호실 현황" value={`${occupied} / ${units.length}`} sub={`공실 ${vacant} · 만료임박 ${expiringSoon}`} tone="amber" />
      </div>
      <p className="text-[11px] text-muted-foreground mb-6">
        ※ 수익/지급액은 <strong>활성·만료임박 계약의 월 기준 예상값</strong>입니다. 실제 정산은 입금 기준으로 수수료 정산(/admin/commissions)에서 확정됩니다.
      </p>

      {/* 호실 카드 그리드 */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-black text-muted-foreground">호실 현황 ({units.length})</h2>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <Legend dot="bg-emerald-500" l="임차중" />
          <Legend dot="bg-amber-500" l="만료임박" />
          <Legend dot="bg-rose-500" l="연체" />
          <Legend dot="bg-blue-500" l="준비중" />
          <Legend dot="bg-slate-400" l="공실" />
        </div>
      </div>

      {units.length === 0 ? (
        <div className="rounded-xl border bg-card py-14 text-center text-muted-foreground">
          <DoorOpen className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">등록된 호실이 없습니다.</p>
          {owner && (
            <Link href={`/admin/owners/${owner.id}`} className="text-xs text-blue-600 hover:underline mt-2 inline-block">
              소유주 화면에서 호실 추가하기
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {units.map((u) => {
            const lease = leaseByUnit.get(u.id);
            const overdue = lease ? overdueLeaseIds.has(lease.id) : false;
            const st = unitStatus(lease, overdue);
            const rent = lease ? lease.rent_amount : u.rent_default ?? 0;
            const deposit = lease ? lease.deposit : u.deposit_default ?? 0;
            const card = (
              <div className={`relative rounded-xl border p-3.5 transition hover:shadow-md ${st.cls}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-black text-lg">{u.unit_no ?? "-"}</span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold">
                    <span className={`h-2 w-2 rounded-full ${st.dot}`} /> {st.l}
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground mb-2">
                  {u.floor != null ? `${u.floor}층` : "층 미상"}
                </div>
                {lease ? (
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold truncate flex items-center gap-1">
                      <User className="h-3 w-3 text-muted-foreground shrink-0" />{lease.tenant?.name ?? "임차인"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">보 {formatWonMan(deposit)} / 월 {formatWonMan(rent)}</p>
                    <p className="text-[11px] text-muted-foreground">~ {formatKoreanDate(lease.end_date)}</p>
                    {lease.contract_source_name && (
                      <p className="text-[10px] text-muted-foreground truncate">계약처: {lease.contract_source_name}</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    <p className="text-[11px] text-muted-foreground">기본 보 {formatWonMan(deposit)} / 월 {formatWonMan(rent)}</p>
                    <p className="text-[11px] text-slate-400">계약 없음</p>
                  </div>
                )}
              </div>
            );
            return lease ? (
              <Link key={u.id} href={`/admin/leases/${lease.id}`} className="block" title="계약 상세">{card}</Link>
            ) : (
              <div key={u.id} title="공실">{card}</div>
            );
          })}
        </div>
      )}

      {leases.some((l) => l.status === "draft") && (
        <p className="mt-4 text-[11px] text-muted-foreground inline-flex items-center gap-1">
          <FileSignature className="h-3 w-3" /> 준비중(draft) 계약은 활성화 전이라 수익 합산에서 제외됩니다.
        </p>
      )}
    </div>
  );
}

function SummaryCard({ label, value, sub, tone }: { label: string; value: string; sub: string; tone: "slate" | "emerald" | "blue" | "amber" }) {
  const tones: Record<string, string> = {
    slate: "bg-card border-border",
    emerald: "bg-emerald-50/60 border-emerald-200",
    blue: "bg-blue-50/60 border-blue-200",
    amber: "bg-amber-50/60 border-amber-200",
  };
  return (
    <div className={`rounded-xl border p-4 ${tones[tone]}`}>
      <p className="text-[11px] font-bold text-muted-foreground">{label}</p>
      <p className="text-xl lg:text-2xl font-black mt-1 tracking-tight">{value}</p>
      <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>
    </div>
  );
}

function Legend({ dot, l }: { dot: string; l: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`h-2 w-2 rounded-full ${dot}`} /> {l}
    </span>
  );
}
