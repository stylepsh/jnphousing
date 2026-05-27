import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { LedgerForm } from "../_components/ledger-form";

export const metadata: Metadata = { title: "손익 항목 추가" };
export const dynamic = "force-dynamic";

export default async function NewLedgerPage() {
  const supabase = await createClient();
  const { data: properties } = await supabase.from("properties").select("id, name, short_alias").order("name");

  return (
    <div className="p-6 lg:p-8 max-w-3xl">
      <Link href="/admin/ledger" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-5">
        <ArrowLeft className="h-4 w-4 mr-1" /> 월별 손익
      </Link>
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">손익 항목 추가</h1>
        <p className="mt-1 text-sm text-muted-foreground">월별 수입·지출 1건 등록</p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <LedgerForm properties={properties ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}
