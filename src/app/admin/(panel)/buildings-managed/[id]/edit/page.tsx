import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { BuildingForm } from "../../_components/building-form";

export const metadata: Metadata = { title: "건물 편집" };
export const dynamic = "force-dynamic";

export default async function EditBuildingManagedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: prop }, { data: landlords }] = await Promise.all([
    supabase.from("properties").select("*").eq("id", id).maybeSingle(),
    supabase.from("landlord_business").select("id, name, business_name").eq("is_active", true).order("name"),
  ]);
  if (!prop) notFound();

  return (
    <div className="p-6 lg:p-8 max-w-3xl">
      <Link href={`/admin/buildings-managed/${id}`} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-5">
        <ArrowLeft className="h-4 w-4 mr-1" /> 건물 상세
      </Link>
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">건물 편집 — {prop.short_alias ?? prop.name}</h1>
      </div>
      <Card>
        <CardContent className="pt-6">
          <BuildingForm id={id} initial={prop} landlords={landlords ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}
