import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { DmUnitForm } from "../../_components/dm-unit-form";

export const metadata: Metadata = { title: "DM 호실 추가" };
export const dynamic = "force-dynamic";

export default async function NewDmUnitPage() {
  const supabase = await createClient();
  const [{ data: properties }, { data: landlords }] = await Promise.all([
    supabase.from("properties").select("id, name, short_alias").order("name"),
    supabase.from("landlord_business").select("id, name, business_name").eq("is_active", true).order("name"),
  ]);

  return (
    <div className="p-6 lg:p-8 max-w-3xl">
      <Link href="/admin/dm" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-5">
        <ArrowLeft className="h-4 w-4 mr-1" /> DM 대시보드
      </Link>
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">DM 호실 추가</h1>
        <p className="mt-1 text-sm text-muted-foreground">단기임대 운영 호실 + 수익 분배 비율 등록</p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <DmUnitForm properties={properties ?? []} landlords={landlords ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}
