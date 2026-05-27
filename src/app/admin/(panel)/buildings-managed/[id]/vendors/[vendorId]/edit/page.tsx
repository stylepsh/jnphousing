import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { VendorForm } from "../../../../_components/vendor-form";

export const metadata: Metadata = { title: "시설관리 업체 편집" };
export const dynamic = "force-dynamic";

export default async function EditVendorPage({ params }: { params: Promise<{ id: string; vendorId: string }> }) {
  const { id, vendorId } = await params;
  const supabase = await createClient();
  const [{ data: prop }, { data: vendor }] = await Promise.all([
    supabase.from("properties").select("name, short_alias").eq("id", id).maybeSingle(),
    supabase.from("building_vendors").select("*").eq("id", vendorId).maybeSingle(),
  ]);
  if (!prop || !vendor) notFound();

  return (
    <div className="p-6 lg:p-8 max-w-3xl">
      <Link href={`/admin/buildings-managed/${id}`} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-5">
        <ArrowLeft className="h-4 w-4 mr-1" /> {prop.short_alias ?? prop.name} 상세
      </Link>
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">시설관리 업체 편집</h1>
        <p className="mt-1 text-sm text-muted-foreground">{prop.short_alias ?? prop.name} · {vendor.vendor_name}</p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <VendorForm id={vendorId} propertyId={id} initial={vendor} />
        </CardContent>
      </Card>
    </div>
  );
}
