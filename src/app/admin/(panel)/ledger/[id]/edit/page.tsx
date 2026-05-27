import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { LedgerForm } from "../../_components/ledger-form";

export const metadata: Metadata = { title: "손익 항목 편집" };
export const dynamic = "force-dynamic";

export default async function EditLedgerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: item }, { data: properties }] = await Promise.all([
    supabase.from("monthly_ledger").select("*").eq("id", id).maybeSingle(),
    supabase.from("properties").select("id, name, short_alias").order("name"),
  ]);
  if (!item) notFound();

  return (
    <div className="p-6 lg:p-8 max-w-3xl">
      <Link href="/admin/ledger" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-5">
        <ArrowLeft className="h-4 w-4 mr-1" /> 월별 손익
      </Link>
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">손익 항목 편집</h1>
      </div>
      <Card>
        <CardContent className="pt-6">
          <LedgerForm id={id} initial={item} properties={properties ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}
