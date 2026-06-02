import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, ArrowRight, Plus, Wrench, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { MANAGED_BUILDINGS_SEED } from "@/lib/data/buildings-managed";
import { LANDLORD_BUSINESS_SEED } from "@/lib/data/landlord-business";

export const metadata: Metadata = { title: "위탁관리 건물" };
export const dynamic = "force-dynamic";

interface PropRow {
  id: string;
  name: string;
  short_alias: string | null;
  business_name: string | null;
  business_number: string | null;
  service_modes: string[] | null;
  address: string | null;
  total_units: number;
  landlord_business_id: string | null;
  vendor_count?: number;
}

interface LandlordBiz {
  id: string;
  name: string;
  business_name: string | null;
}

async function fetchData() {
  try {
    const supabase = await createClient();
    const [pRes, lbRes, vSummary] = await Promise.all([
      supabase.from("properties")
        .select("id, name, short_alias, business_name, business_number, service_modes, address, total_units, landlord_business_id")
        .order("name"),
      supabase.from("landlord_business").select("id, name, business_name"),
      supabase.from("v_property_vendors_summary").select("property_id, vendor_count, total_monthly_fee"),
    ]);
    return {
      properties: (pRes.data ?? []) as PropRow[],
      landlords: (lbRes.data ?? []) as LandlordBiz[],
      vendorSummary: (vSummary.data ?? []) as { property_id: string; vendor_count: number; total_monthly_fee: number }[],
    };
  } catch {
    return { properties: [], landlords: [], vendorSummary: [] };
  }
}

const MODE_LABEL: Record<string, { label: string; color: string }> = {
  dm:                { label: "JNP 단기임대", color: "bg-purple-100 text-purple-700 border-purple-200" },
  housing_mgmt:      { label: "건물 위탁관리", color: "bg-blue-100 text-blue-700 border-blue-200" },
  rental_consigned:  { label: "임대 위탁",    color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
};

export default async function BuildingsManagedPage() {
  const { properties, landlords, vendorSummary } = await fetchData();
  const lbMap = new Map(landlords.map(l => [l.id, l]));
  const vMap = new Map(vendorSummary.map(v => [v.property_id, v]));

  // DB 비어있으면 seed 데이터 표시
  const showSeed = properties.length === 0;
  const seedRows = showSeed
    ? MANAGED_BUILDINGS_SEED.map((b, idx) => ({ ...b, _seedIdx: idx }))
    : [];

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            위탁관리 건물
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            JNP주택관리가 위탁받은 건물 마스터 ·
            {showSeed
              ? ` 엑셀 시드 ${MANAGED_BUILDINGS_SEED.length}개 (DB 등록 전)`
              : ` 등록 ${properties.length}개`}
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/buildings-managed/new"><Plus className="h-4 w-4 mr-1.5" /> 건물 추가</Link>
        </Button>
      </div>

      {showSeed && (
        <div className="mb-6 rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900">
          <p className="font-semibold mb-1">📦 DB 데이터 비어있음</p>
          <p className="text-xs">
            아래는 박성혁님 엑셀 (JNP-건물위탁관리.xlsx) 에서 추출한 시드 데이터입니다.
            마이그레이션 008 실행 후 실 데이터로 교체됩니다.
          </p>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
        {(showSeed ? seedRows : properties).map((b, idx) => {
          const isSeed = '_seedIdx' in b;
          const rowId = isSeed ? `seed-${b._seedIdx}` : b.id;
          const landlord = !isSeed && b.landlord_business_id ? lbMap.get(b.landlord_business_id) : null;
          const summary = !isSeed ? vMap.get(b.id) : null;
          const modes: string[] = isSeed ? (b as typeof seedRows[0]).serviceModes : (b.service_modes ?? []);
          const alias = isSeed ? b.shortAlias : (b.short_alias ?? b.name);
          const bizName = isSeed ? b.businessName : b.business_name;
          const addr = isSeed ? b.address : b.address;
          const landlordName = isSeed ? b.landlordBusinessName : landlord?.name;

          return (
            <Link
              key={rowId}
              href={isSeed ? "/admin/properties" : `/admin/buildings-managed/${b.id}`}
              className="block animate-fade-in"
            >
              <Card interactive className="h-full">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-base line-clamp-1">{alias}</h3>
                      {bizName && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                          {bizName}
                        </p>
                      )}
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </div>

                  <div className="flex flex-wrap gap-1 mb-3">
                    {modes.map(m => {
                      const meta = MODE_LABEL[m];
                      if (!meta) return null;
                      return (
                        <Badge key={m} variant="outline" className={`text-[10px] ${meta.color}`}>
                          {meta.label}
                        </Badge>
                      );
                    })}
                  </div>

                  {addr && (
                    <p className="text-[11px] text-muted-foreground flex items-start gap-1 mb-2">
                      <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                      <span className="line-clamp-1">{addr}</span>
                    </p>
                  )}

                  <div className="grid grid-cols-3 gap-1 pt-3 border-t border-border/60 text-[11px]">
                    <div>
                      <div className="text-muted-foreground">임사자</div>
                      <div className="font-semibold truncate">{landlordName ?? "-"}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">시설관리</div>
                      <div className="font-semibold flex items-center gap-0.5">
                        <Wrench className="h-2.5 w-2.5" />
                        {summary?.vendor_count ?? 0}개
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-muted-foreground">월 비용</div>
                      <div className="font-semibold tabular-nums">
                        {summary?.total_monthly_fee
                          ? `${Math.floor(summary.total_monthly_fee / 10000)}만`
                          : "-"}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="mt-8 grid sm:grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4 text-sm">
            <p className="font-semibold mb-2">📋 사용 안내</p>
            <ul className="text-xs space-y-1 ml-4 list-disc text-muted-foreground">
              <li>건물 클릭 → 6종 시설관리 업체 정보 + 계좌 + 청구</li>
              <li>임사자별 그룹핑은 임사자 페이지에서</li>
              <li>JNP 단기임대는 별도 메뉴에서 분배 비율 관리</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-sm">
            <p className="font-semibold mb-2">📊 시드 임사자 ({LANDLORD_BUSINESS_SEED.length}명)</p>
            <div className="flex flex-wrap gap-1 mt-2">
              {LANDLORD_BUSINESS_SEED.slice(0, 9).map(l => (
                <span key={l.id} className="text-[10px] px-1.5 py-0.5 rounded bg-muted">{l.name}</span>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
