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
      .select("id, case_number, address, owner_name, pipeline_state, total_work_cost, pipeline_entered_at")
      .in("pipeline_state", COLS)
      .order("pipeline_entered_at", { ascending: true });
    return (data ?? []) as VacantItem[];
  } catch {
    return [];
  }
}

export default async function VacantPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q: rawQ } = await searchParams;
  const q = (rawQ ?? "").trim();
  const all = await fetchVacant();
  const items = q
    ? all.filter((i) => {
        const needle = q.toLowerCase();
        return (
          (i.case_number ?? "").toLowerCase().includes(needle) ||
          (i.address ?? "").toLowerCase().includes(needle) ||
          (i.owner_name ?? "").toLowerCase().includes(needle)
        );
      })
    : all;

  return (
    <div className="space-y-5">
      <div>
        <Link href="/admin/auction/pipeline" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> 파이프라인
        </Link>
        <div className="flex items-center justify-between gap-3 flex-wrap mt-2">
          <h1 className="text-xl font-black">⑤ 공실 · 상품화</h1>
          <div className="flex items-center gap-2 flex-wrap">
            <a
              href="/admin/auction/pipeline/vacant-export"
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border text-sm font-semibold text-emerald-700 border-emerald-200 hover:bg-emerald-50"
            >
              공실 상세 엑셀
            </a>
            <a
              href="/admin/auction/pipeline/vacant-detail-pdf"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border text-sm font-semibold text-sky-700 border-sky-200 hover:bg-sky-50"
            >
              공실 상세 PDF
            </a>
            <a
              href="/admin/auction/pipeline/vacant-pdf"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border text-sm font-semibold hover:bg-muted"
            >
              B팀 인계 PDF
            </a>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          승인된 공실 물건을 상품화 준비→진행→임대가능으로 진행합니다. 단계별 작업비를 기록하면 정산에 반영됩니다.
        </p>
        <form method="get" className="mt-3 flex items-center gap-2">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="사건번호·상세주소·임대인 검색"
            className="h-9 w-full max-w-sm rounded-lg border bg-background px-3 text-sm"
          />
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border text-sm font-semibold hover:bg-muted"
          >
            검색
          </button>
        </form>
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
