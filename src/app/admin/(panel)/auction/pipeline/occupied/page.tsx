import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PipelineActions } from "../pipeline-actions";

export const metadata: Metadata = { title: "거주중 보관" };
export const dynamic = "force-dynamic";

type Row = {
  id: string;
  case_number: string;
  address: string;
  owner_name: string | null;
};

async function fetchOccupied(): Promise<Row[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("auction_property")
      .select("id, case_number, address, owner_name")
      .eq("pipeline_state", "OccupiedHold")
      .order("pipeline_entered_at", { ascending: false });
    return (data ?? []) as Row[];
  } catch {
    return [];
  }
}

export default async function OccupiedPage() {
  const rows = await fetchOccupied();
  return (
    <div className="space-y-5">
      <div>
        <Link href="/admin/auction/pipeline" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> 파이프라인
        </Link>
        <h1 className="text-xl font-black mt-2">거주중 보관</h1>
        <p className="text-sm text-muted-foreground mt-1">
          답사 결과 점유중으로 확인된 물건. 추후 공실 전환되면 재확인으로 돌리거나, 대상에서 제외합니다. 총{" "}
          <strong className="text-foreground">{rows.length}</strong>건.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed py-16 text-center text-sm text-muted-foreground">
          거주중 보관 물건이 없습니다.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {rows.map((r) => (
            <div key={r.id} className="rounded-xl border bg-card p-3.5 space-y-2.5">
              <div>
                <div className="font-mono text-xs font-semibold text-blue-700">{r.case_number}</div>
                <div className="text-sm line-clamp-1">{r.address}</div>
                <div className="text-xs text-muted-foreground">{r.owner_name ?? "-"}</div>
              </div>
              <PipelineActions
                propertyId={r.id}
                buttons={[
                  { action: "RECHECK", label: "재확인으로" },
                  { action: "REJECT", label: "제외", danger: true, promptReason: true },
                ]}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
