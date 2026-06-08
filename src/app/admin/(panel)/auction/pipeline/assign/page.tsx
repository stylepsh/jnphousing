import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AssignBoard, type AssignItem } from "./assign-board";

export const metadata: Metadata = { title: "답사 배정" };
export const dynamic = "force-dynamic";

async function fetchAssignable(): Promise<AssignItem[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("auction_property")
      .select("id, case_number, address, owner_name, creditor_type, pipeline_state")
      .in("pipeline_state", ["Selected", "Recheck"])
      .order("pipeline_entered_at", { ascending: true });
    return (data ?? []) as AssignItem[];
  } catch {
    return [];
  }
}

export default async function AssignPage() {
  const items = await fetchAssignable();
  return (
    <div className="space-y-5">
      <div>
        <Link href="/admin/auction/pipeline" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> 파이프라인
        </Link>
        <h1 className="text-xl font-black mt-2">② 답사 배정</h1>
        <p className="text-sm text-muted-foreground mt-1">
          답사 선정된 물건을 답사자에게 배정합니다. 배정하면 답사자 입력 화면에 나타납니다.
        </p>
      </div>
      <AssignBoard items={items} />
    </div>
  );
}
