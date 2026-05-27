import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { LandlordBusinessForm } from "../../_components/landlord-business-form";

export const metadata: Metadata = { title: "임사자 편집" };
export const dynamic = "force-dynamic";

export default async function EditLandlordBusinessPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("landlord_business").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();

  return (
    <div className="p-6 lg:p-8 max-w-3xl">
      <Link href="/admin/landlord-business" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-5">
        <ArrowLeft className="h-4 w-4 mr-1" /> 임사자 목록
      </Link>
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">임사자 편집 — {data.name}</h1>
      </div>
      <Card>
        <CardContent className="pt-6">
          <LandlordBusinessForm id={id} initial={data} />
        </CardContent>
      </Card>
    </div>
  );
}
