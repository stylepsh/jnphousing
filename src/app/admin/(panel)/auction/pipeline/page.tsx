import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  PIPELINE_ORDER,
  BRANCH_STATES,
  STATE_LABELS,
  STATE_COLORS,
  type PipelineState,
} from "@/lib/auction/pipeline/state-machine";
import { cn } from "@/lib/utils";
import { Workflow } from "lucide-react";
import { PageHeader } from "../../../_components/page-header";

export const metadata: Metadata = { title: "경매 파이프라인" };
export const dynamic = "force-dynamic";

// 단계 → 운영 페이지 매핑
const STAGE_LINK: Partial<Record<PipelineState, string>> = {
  Selected: "/admin/auction/pipeline/assign",
  Recheck: "/admin/auction/pipeline/assign",
  Inspecting: "/admin/auction/inspect",
  Reviewing: "/admin/auction/pipeline/review",
  Approved: "/admin/auction/pipeline/vacant",
  WorkPrep: "/admin/auction/pipeline/vacant",
  Merchandising: "/admin/auction/pipeline/vacant",
  Available: "/admin/auction/pipeline/lease-ready",
  Leased: "/admin/auction/pipeline/leased",
  OccupiedHold: "/admin/auction/pipeline/occupied",
};

async function fetchCounts(): Promise<Record<string, number>> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("auction_property").select("pipeline_state");
    const counts: Record<string, number> = {};
    for (const r of (data ?? []) as { pipeline_state: string }[]) {
      const s = r.pipeline_state ?? "Collected";
      counts[s] = (counts[s] ?? 0) + 1;
    }
    return counts;
  } catch {
    return {};
  }
}

function StateCard({ state, count }: { state: PipelineState; count: number }) {
  const href = STAGE_LINK[state];
  const inner = (
    <div className={cn("rounded-2xl border p-4 h-full transition shadow-sm", STATE_COLORS[state], href && "hover:shadow-md hover:-translate-y-0.5 cursor-pointer")}>
      <div className="text-xs font-bold opacity-80">{STATE_LABELS[state]}</div>
      <div className="text-2xl font-black mt-1 tabular-nums">{count}</div>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

export default async function PipelineDashboard() {
  const counts = await fetchCounts();
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Workflow}
        title="경매 파이프라인"
        accent="violet"
        desc={
          <>
            수집된 경매물건의 답사→검토→상품화→임대 전 과정. 전체{" "}
            <strong className="text-foreground">{total}</strong>건. 단계 카드를 누르면 해당 작업 화면으로 이동합니다.
          </>
        }
      />

      <section>
        <h2 className="text-xs font-black text-muted-foreground uppercase tracking-wide mb-2">메인 흐름</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-2.5">
          {PIPELINE_ORDER.map((s) => (
            <StateCard key={s} state={s} count={counts[s] ?? 0} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xs font-black text-muted-foreground uppercase tracking-wide mb-2">분기</h2>
        <div className="grid grid-cols-3 gap-2.5 max-w-md">
          {BRANCH_STATES.map((s) => (
            <StateCard key={s} state={s} count={counts[s] ?? 0} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xs font-black text-muted-foreground uppercase tracking-wide mb-2">바로가기</h2>
        <div className="flex flex-wrap gap-2 text-sm">
          {[
            ["/admin/auction/collection", "① 수집 풀"],
            ["/admin/auction/pipeline/assign", "② 답사 배정"],
            ["/admin/auction/inspect", "③ 답사자 입력"],
            ["/admin/auction/pipeline/review", "④ 검토"],
            ["/admin/auction/pipeline/vacant", "⑤ 공실·상품화"],
            ["/admin/auction/pipeline/lease-ready", "⑥ 임대 계약"],
            ["/admin/auction/pipeline/leased", "⑦ 임대중·정산"],
          ].map(([href, label]) => (
            <Link key={href} href={href} className="rounded-full border bg-card px-3.5 py-2 font-medium hover:border-violet-300 hover:bg-violet-50/50 transition">
              {label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
