import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { BuildingForm } from "../_components/building-form";

export const metadata: Metadata = { title: "위탁관리 건물 추가" };
export const dynamic = "force-dynamic";

export default async function NewBuildingManagedPage() {
  const supabase = await createClient();
  const { data: landlords } = await supabase
    .from("landlord_business")
    .select("id, name, business_name")
    .eq("is_active", true)
    .order("name");

  return (
    <div className="p-6 lg:p-8 max-w-3xl">
      <Link href="/admin/buildings-managed" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-5">
        <ArrowLeft className="h-4 w-4 mr-1" /> 위탁관리 건물 목록
      </Link>
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">위탁관리 건물 추가</h1>
        <p className="mt-1 text-sm text-muted-foreground">JNP주택관리가 위탁받은 건물 마스터 등록</p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <BuildingForm landlords={landlords ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}
