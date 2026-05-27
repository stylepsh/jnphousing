import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { DmUnitForm } from "../../../_components/dm-unit-form";

export const metadata: Metadata = { title: "DM 호실 편집" };
export const dynamic = "force-dynamic";

export default async function EditDmUnitPage({ params }: { params: Promise<{ unitId: string }> }) {
  const { unitId } = await params;
  const supabase = await createClient();
  const [{ data: unit }, { data: properties }, { data: landlords }] = await Promise.all([
    supabase.from("dm_units").select("*").eq("id", unitId).maybeSingle(),
    supabase.from("properties").select("id, name, short_alias").order("name"),
    supabase.from("landlord_business").select("id, name, business_name").eq("is_active", true).order("name"),
  ]);
  if (!unit) notFound();

  return (
    <div className="p-6 lg:p-8 max-w-3xl">
      <Link href="/admin/dm" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-5">
        <ArrowLeft className="h-4 w-4 mr-1" /> DM 대시보드
      </Link>
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">DM 호실 편집 — {unit.alias ?? "(별칭 없음)"}</h1>
      </div>
      <Card>
        <CardContent className="pt-6">
          <DmUnitForm id={unitId} initial={unit} properties={properties ?? []} landlords={landlords ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}
