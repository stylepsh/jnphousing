import { Card, CardContent } from "@/components/ui/card";
import { LeaseForm } from "../_components/lease-form";
import { createClient } from "@/lib/supabase/server";
import type { Landlord, Tenant, PropertyUnit } from "@/types/lease";

async function fetchOptions() {
  const supabase = await createClient();
  // 신 통합 모델: 소유주(owners) + 물건(properties unit_type='unit'). 013 적용 후 신규 호실도 계약 가능.
  const [oRes, tRes, uRes, bRes, userRes] = await Promise.all([
    supabase.from("owners").select("id, name").order("name"),
    supabase.from("tenants").select("id, name").order("name"),
    supabase.from("properties").select("id, unit_no, parent_building_id, owner_id").eq("unit_type", "unit").order("unit_no"),
    supabase.from("properties").select("id, name, owner_id").eq("unit_type", "building"),
    supabase.auth.getUser(),
  ]);
  const buildingsRaw = (bRes.data ?? []) as { id: string; name: string | null; owner_id: string | null }[];
  const bName = new Map(buildingsRaw.map((b) => [b.id, b.name ?? "건물"]));
  const units = ((uRes.data ?? []) as { id: string; unit_no: string | null; parent_building_id: string | null; owner_id: string | null }[]).map((u) => ({
    id: u.id,
    unit_no: u.unit_no ?? "",
    property_id: u.parent_building_id ?? "",
    owner_id: u.owner_id ?? null,
    properties: { name: u.parent_building_id ? (bName.get(u.parent_building_id) ?? "건물") : "단독호실" },
  }));

  // 입력자 기본값 = 현재 로그인 관리자 이름
  let adminName = "";
  const uid = userRes.data.user?.id;
  if (uid) {
    const { data: a } = await supabase.from("admin_users").select("name").eq("user_id", uid).maybeSingle();
    adminName = (a as { name: string } | null)?.name ?? "";
  }

  return {
    landlords: (oRes.data ?? []) as Pick<Landlord, "id" | "name">[],
    tenants: (tRes.data ?? []) as Pick<Tenant, "id" | "name">[],
    units: units as unknown as (Pick<PropertyUnit, "id" | "unit_no" | "property_id"> & { owner_id: string | null; properties: { name: string } | null })[],
    buildings: buildingsRaw.map((b) => ({ id: b.id, name: b.name ?? "건물", owner_id: b.owner_id })),
    adminName,
  };
}

export default async function LeaseNewPage() {
  const opts = await fetchOptions();

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">신규 계약 등록</h1>
        <p className="mt-1 text-sm text-muted-foreground">임대인 → 건물 → 호실 → 임차인 순으로 입력하고, 하단에서 카카오톡용 계약정보를 복사할 수 있습니다.</p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <LeaseForm mode="create" options={opts} adminName={opts.adminName} />
        </CardContent>
      </Card>
    </div>
  );
}
