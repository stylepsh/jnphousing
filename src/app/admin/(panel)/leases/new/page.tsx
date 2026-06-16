import { Card, CardContent } from "@/components/ui/card";
import { LeaseForm } from "../_components/lease-form";
import { createClient } from "@/lib/supabase/server";
import type { Landlord, Tenant, PropertyUnit } from "@/types/lease";

async function fetchOptions() {
  const supabase = await createClient();
  // 신 통합 모델: 소유주(owners) + 물건(properties unit_type='unit'). 013 적용 후 신규 호실도 계약 가능.
  const [oRes, tRes, uRes, bRes] = await Promise.all([
    supabase.from("owners").select("id, name").order("name"),
    supabase.from("tenants").select("id, name").order("name"),
    supabase.from("properties").select("id, unit_no, parent_building_id, owner_id").eq("unit_type", "unit").order("unit_no"),
    supabase.from("properties").select("id, name").eq("unit_type", "building"),
  ]);
  const bName = new Map(((bRes.data ?? []) as { id: string; name: string | null }[]).map((b) => [b.id, b.name ?? "건물"]));
  const units = ((uRes.data ?? []) as { id: string; unit_no: string | null; parent_building_id: string | null; owner_id: string | null }[]).map((u) => ({
    id: u.id,
    unit_no: u.unit_no ?? "",
    property_id: u.parent_building_id ?? "",
    owner_id: u.owner_id ?? null,
    properties: { name: u.parent_building_id ? (bName.get(u.parent_building_id) ?? "건물") : "단독호실" },
  }));
  return {
    landlords: (oRes.data ?? []) as Pick<Landlord, "id" | "name">[],
    tenants: (tRes.data ?? []) as Pick<Tenant, "id" | "name">[],
    units: units as unknown as (Pick<PropertyUnit, "id" | "unit_no" | "property_id"> & { owner_id: string | null; properties: { name: string } | null })[],
  };
}

export default async function LeaseNewPage() {
  const opts = await fetchOptions();

  return (
    <div className="p-6 lg:p-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">신규 계약 등록</h1>
        <p className="mt-1 text-sm text-muted-foreground">초안으로 저장 후 활성화 버튼을 눌러 스케줄 생성합니다.</p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <LeaseForm mode="create" options={opts} />
        </CardContent>
      </Card>
    </div>
  );
}
