import { Card, CardContent } from "@/components/ui/card";
import { LeaseForm } from "../_components/lease-form";
import { createClient } from "@/lib/supabase/server";
import type { Landlord, Tenant, PropertyUnit } from "@/types/lease";

async function fetchOptions() {
  const supabase = await createClient();
  const [llRes, tRes, uRes] = await Promise.all([
    supabase.from("landlords").select("id, name").order("name"),
    supabase.from("tenants").select("id, name").order("name"),
    supabase.from("properties_units").select("id, unit_no, property_id, properties:property_id(name)").order("unit_no"),
  ]);
  return {
    landlords: (llRes.data ?? []) as Pick<Landlord, "id" | "name">[],
    tenants: (tRes.data ?? []) as Pick<Tenant, "id" | "name">[],
    units: (uRes.data ?? []) as unknown as (Pick<PropertyUnit, "id" | "unit_no" | "property_id"> & { properties: { name: string } | null })[],
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
