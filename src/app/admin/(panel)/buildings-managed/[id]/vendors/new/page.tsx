import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { VendorForm } from "../../../_components/vendor-form";

export const metadata: Metadata = { title: "시설관리 업체 추가" };
export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ category?: string }>;
}

export default async function NewVendorPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { category } = await searchParams;
  const supabase = await createClient();
  const { data: prop } = await supabase.from("properties").select("name, short_alias").eq("id", id).maybeSingle();
  if (!prop) notFound();

  return (
    <div className="p-6 lg:p-8 max-w-3xl">
      <Link href={`/admin/buildings-managed/${id}`} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-5">
        <ArrowLeft className="h-4 w-4 mr-1" /> {prop.short_alias ?? prop.name} 상세
      </Link>
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">시설관리 업체 추가</h1>
        <p className="mt-1 text-sm text-muted-foreground">{prop.short_alias ?? prop.name} · 인터넷·청소·전기·수도·소방·승강기 등</p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <VendorForm propertyId={id} defaultCategory={category} />
        </CardContent>
      </Card>
    </div>
  );
}
