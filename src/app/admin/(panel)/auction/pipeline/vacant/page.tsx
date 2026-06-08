import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { STATE_LABELS, type PipelineState } from "@/lib/auction/pipeline/state-machine";
import { VacantCard, type VacantItem } from "./vacant-card";

export const metadata: Metadata = { title: "공실 · 상품화" };
export const dynamic = "force-dynamic";

const COLS: PipelineState[] = ["Approved", "WorkPrep", "Merchandising", "Available"];

async function fetchVacant(): Promise<VacantItem[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("auction_property")
      .select("id, case_number, address, owner_name, pipeline_state, total_work_cost")
      .in("pipeline_state", COLS)
      .order("pipeline_entered_at", { ascending: true });
    return (data ?? []) as VacantItem[];
  } catch {
    return [];
  }
}

export default async function VacantPage() {
  const items = await fetchVacant();

  return (
    <div className="space-y-5">
      <div>
        <Link href="/admin/auction/pipeline" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> 파이프라인
        </Link>
        <div className="flex items-center justify-between gap-3 flex-wrap mt-2">
          <h1 className="text-xl font-black">⑤ 공실 · 상품화</h1>
          <a
            href="/admin/auction/pipeline/vacant-pdf"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border text-sm font-semibold hover:bg-muted"
          >
            B팀 공실 인계 PDF
          </a>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          승인된 공실 물건을 상품화 준비→진행→임대가능으로 진행합니다. 단계별 작업비를 기록하면 정산에 반영됩니다.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {COLS.map((col) => {
          const list = items.filter((i) => i.pipeline_state === col);
          return (
            <div key={col} className="space-y-2.5">
              <h2 className="text-sm font-black flex items-center justify-between">
                {STATE_LABELS[col]}
                <span className="text-xs font-normal text-muted-foreground">{list.length}</span>
              </h2>
              {list.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center rounded-lg border border-dashed">없음</p>
              ) : (
                list.map((it) => <VacantCard key={it.id} it={it} />)
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
