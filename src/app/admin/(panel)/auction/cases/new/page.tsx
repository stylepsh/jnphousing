import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CaseForm, type PoolOption } from "../case-form";

export const metadata: Metadata = { title: "경매 사건 등록" };
export const dynamic = "force-dynamic";

async function fetchPool(): Promise<PoolOption[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("auction_property")
      .select("id, case_number, court, address, owner_name, appraisal_value, minimum_bid, dividend_deadline")
      .order("created_at", { ascending: false })
      .limit(300);
    return (data ?? []) as PoolOption[];
  } catch {
    return [];
  }
}

export default async function NewCasePage() {
  const pool = await fetchPool();
  return (
    <div className="space-y-5">
      <div>
        <Link
          href="/admin/auction/cases"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" /> 사건 목록
        </Link>
        <h1 className="text-xl font-black mt-2">경매/법무 사건 등록</h1>
      </div>
      <CaseForm pool={pool} />
    </div>
  );
}
