import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { PropertyFilter } from "@/components/admin/PropertyFilter";

export const metadata: Metadata = { title: "호실 현황판" };
export const dynamic = "force-dynamic";

interface UnitWithLease {
  id: string;
  unit_no: string;
  floor: number | null;
  property_id: string;
  property_name: string;
  status: "occupied" | "vacant" | "expiring" | "overdue";
  tenant_name: string | null;
  end_date: string | null;
  rent_amount: number | null;
}

async function fetchData(propertyId?: string) {
  try {
    const supabase = await createClient();
    // 신 통합 모델: 건물=properties(unit_type='building'), 호실=properties(unit_type='unit')
    const { data: props } = await supabase.from("properties").select("id, name").eq("unit_type", "building").order("name");
    const properties = (props ?? []) as { id: string; name: string }[];
    const buildingName = new Map(properties.map((b) => [b.id, b.name]));

    let unitsQuery = supabase
      .from("properties")
      .select("id, unit_no, floor, parent_building_id")
      .eq("unit_type", "unit")
      .order("parent_building_id")
      .order("unit_no");
    if (propertyId && propertyId !== "all") unitsQuery = unitsQuery.eq("parent_building_id", propertyId);
    const { data: units } = await unitsQuery;

    // 활성 계약 매칭
    const { data: leases } = await supabase
      .from("leases")
      .select("unit_id, status, end_date, rent_amount, tenants(name)")
      .in("status", ["active", "expiring"]);

    const today = new Date().toISOString().slice(0, 10);
    const expiryBoundary = new Date();
    expiryBoundary.setDate(expiryBoundary.getDate() + 60);
    const expiryIso = expiryBoundary.toISOString().slice(0, 10);

    // 연체 invoice 매핑
    const { data: overdueInv } = await supabase
      .from("rent_invoices")
      .select("unit_id")
      .in("status", ["unpaid", "overdue"])
      .lt("due_date", today);
    const overdueUnitIds = new Set(((overdueInv ?? []) as { unit_id: string }[]).map(i => i.unit_id));

    const leaseMap = new Map();
    for (const l of (leases ?? []) as { unit_id: string; status: string; end_date: string; rent_amount: number; tenants: { name: string } | null }[]) {
      leaseMap.set(l.unit_id, l);
    }

    const result: UnitWithLease[] = ((units ?? []) as { id: string; unit_no: string; floor: number | null; parent_building_id: string | null }[]).map(u => {
      const lease = leaseMap.get(u.id);
      let status: UnitWithLease["status"] = "vacant";
      if (lease) {
        if (overdueUnitIds.has(u.id)) status = "overdue";
        else if (lease.end_date <= expiryIso && lease.end_date >= today) status = "expiring";
        else status = "occupied";
      }
      return {
        id: u.id,
        unit_no: u.unit_no,
        floor: u.floor,
        property_id: u.parent_building_id ?? "",
        property_name: u.parent_building_id ? (buildingName.get(u.parent_building_id) ?? "—") : "단독호실",
        status,
        tenant_name: lease?.tenants?.name ?? null,
        end_date: lease?.end_date ?? null,
        rent_amount: lease?.rent_amount ?? null,
      };
    });

    return { properties, units: result };
  } catch {
    return { properties: [], units: [] };
  }
}

const STATUS_STYLE: Record<UnitWithLease["status"], { bg: string; text: string; label: string }> = {
  occupied: { bg: "bg-emerald-500/15 border-emerald-500/40 hover:bg-emerald-500/25", text: "text-emerald-700",       label: "점유" },
  vacant:   { bg: "bg-slate-200/40 border-slate-300/60 hover:bg-slate-300/40",       text: "text-slate-600",        label: "공실" },
  expiring: { bg: "bg-amber-400/20 border-amber-500/50 hover:bg-amber-400/30",       text: "text-amber-700",        label: "만료임박" },
  overdue:  { bg: "bg-red-500/15 border-red-500/50 hover:bg-red-500/25",             text: "text-red-700",          label: "연체" },
};

export default async function UnitBoardPage({ searchParams }: { searchParams: Promise<{ propertyId?: string }> }) {
  const params = await searchParams;
  const { properties, units } = await fetchData(params.propertyId);

  const counts = {
    occupied: units.filter(u => u.status === "occupied").length,
    vacant:   units.filter(u => u.status === "vacant").length,
    expiring: units.filter(u => u.status === "expiring").length,
    overdue:  units.filter(u => u.status === "overdue").length,
  };

  // property 별 그룹핑
  const byProperty = units.reduce<Record<string, UnitWithLease[]>>((acc, u) => {
    (acc[u.property_name] ||= []).push(u);
    return acc;
  }, {});

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">호실 현황판</h1>
          <p className="mt-1 text-sm text-muted-foreground">총 {units.length}호 · 점유 {counts.occupied} / 공실 {counts.vacant} / 만료임박 {counts.expiring} / 연체 {counts.overdue}</p>
        </div>
        <div className="w-[220px]"><PropertyFilter properties={properties} /></div>
      </div>

      {/* 범례 */}
      <div className="flex flex-wrap gap-3 mb-6 text-xs">
        {(Object.keys(STATUS_STYLE) as UnitWithLease["status"][]).map(s => (
          <div key={s} className="flex items-center gap-1.5">
            <div className={`h-3 w-3 rounded ${STATUS_STYLE[s].bg}`} />
            <span>{STATUS_STYLE[s].label} ({counts[s]})</span>
          </div>
        ))}
      </div>

      {units.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            호실 데이터가 없습니다. 마이그레이션 + 호실 등록 후 표시됩니다.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(byProperty).map(([propName, propUnits]) => (
            <section key={propName}>
              <h2 className="text-sm font-bold mb-2 text-foreground/85">{propName} <span className="text-muted-foreground font-normal text-xs">({propUnits.length}호)</span></h2>
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-1.5">
                {propUnits.map(u => {
                  const style = STATUS_STYLE[u.status];
                  return (
                    <Link
                      key={u.id}
                      href={`/admin/leases?unit=${u.id}`}
                      className={`aspect-square rounded-md border-2 ${style.bg} ${style.text} flex flex-col items-center justify-center text-[10px] font-bold transition-all hover:scale-105`}
                      title={`${u.unit_no} · ${style.label}${u.tenant_name ? ` · ${u.tenant_name}` : ""}${u.end_date ? ` · 만료 ${u.end_date}` : ""}`}
                    >
                      <div className="text-xs">{u.unit_no}</div>
                      {u.floor && <div className="text-[9px] opacity-70">{u.floor}F</div>}
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      <div className="mt-8 rounded-lg bg-slate-50 border border-border/60 p-4 text-xs text-muted-foreground">
        <p className="font-semibold text-foreground mb-1">📌 사용 안내</p>
        <ul className="space-y-0.5 ml-4 list-disc">
          <li>호실 클릭 → 해당 호실의 계약 목록으로 이동</li>
          <li>호버 시 임차인·만료일 툴팁 표시</li>
          <li>상단 PropertyFilter 로 건물 단위 보기</li>
        </ul>
      </div>
    </div>
  );
}
