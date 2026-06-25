import type { Metadata } from "next";
import { ClipboardList } from "lucide-react";
import { PageHeader } from "../../../_components/page-header";
import { createClient } from "@/lib/supabase/server";
import { SurveyRow } from "./survey-row";
import { BulkEntry } from "./bulk-entry";
import { SurveyUpload } from "./survey-upload";
import { getOpenSheets } from "./survey-actions";
import { SURVEY_STATUS, type SurveyItem } from "./survey-status";
import { BatchStatusControl } from "./batch-status-control";

export const metadata: Metadata = { title: "경매 답사 관리" };
export const dynamic = "force-dynamic";

interface BatchMeta {
  name: string;
  status: "created" | "assigned" | "in_progress" | "completed";
  total_count: number | null;
  closed_at: string | null;
}

interface Row extends SurveyItem {
  batch_id: string | null;
  batch_name: string | null;
  batch_status: "created" | "assigned" | "in_progress" | "completed" | null;
  batch_total_count: number | null;
  batch_closed_at: string | null;
}

async function fetchSurvey(): Promise<Row[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("auction_property")
      .select(
        "id, case_number, court, address, owner_name, category, appraisal_value, minimum_bid, survey_status, survey_date, survey_by, door_code, survey_memo, batch_id",
      )
      .neq("survey_status", "rejected")
      .order("created_at", { ascending: false });

    const props = (data ?? []) as (SurveyItem & { batch_id: string | null })[];
    if (props.length === 0) return [];

    // 배치명+상태는 별도 조회로 매핑 (PostgREST 관계 임베드 의존 제거)
    const batchIds = Array.from(
      new Set(props.map((p) => p.batch_id).filter((v): v is string => !!v)),
    );
    const metaById = new Map<string, BatchMeta>();
    if (batchIds.length > 0) {
      const { data: batches } = await supabase
        .from("auction_survey_batch")
        .select("id, name, status, total_count, closed_at")
        .in("id", batchIds);
      for (const b of (batches ?? []) as {
        id: string;
        name: string;
        status: string;
        total_count: number | null;
        closed_at: string | null;
      }[]) {
        metaById.set(b.id, {
          name: b.name,
          status: (b.status ?? "created") as BatchMeta["status"],
          total_count: b.total_count,
          closed_at: b.closed_at,
        });
      }
    }

    return props.map((p) => {
      const meta = p.batch_id ? metaById.get(p.batch_id) : undefined;
      return {
        ...p,
        batch_name: meta?.name ?? null,
        batch_status: meta?.status ?? null,
        batch_total_count: meta?.total_count ?? null,
        batch_closed_at: meta?.closed_at ?? null,
      };
    });
  } catch {
    return [];
  }
}

export default async function AuctionSurveyPage() {
  const rows = await fetchSurvey();
  const sheets = await getOpenSheets();

  // 상태별 카운트
  const counts: Record<string, number> = {};
  for (const r of rows) counts[r.survey_status] = (counts[r.survey_status] ?? 0) + 1;

  // 배치별 그룹화
  const groups = new Map<
    string,
    {
      label: string;
      batchId: string | null;
      batchStatus: BatchMeta["status"] | null;
      batchTotalCount: number | null;
      items: Row[];
    }
  >();
  for (const r of rows) {
    const key = r.batch_id ?? "(no-batch)";
    const label = r.batch_name ?? "(배치 없음)";
    if (!groups.has(key)) {
      groups.set(key, {
        label,
        batchId: r.batch_id,
        batchStatus: r.batch_status,
        batchTotalCount: r.batch_total_count,
        items: [],
      });
    }
    groups.get(key)!.items.push(r);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={ClipboardList}
        title="답사 결과 입력"
        accent="rose"
        desc="답사자가 채운 엑셀을 올리면 사건번호로 매칭해 공실/거주를 한 번에 반영합니다. 종이로 받았거나 일부만 고칠 땐 ‘번호 일괄입력(백업)’ 또는 아래 목록에서 직접 입력하세요."
      />

      {/* 답사표 엑셀 왕복 업로드 */}
      <SurveyUpload />

      {/* 번호 기반 일괄입력 */}
      <BulkEntry sheets={sheets} />

      {/* 상태별 요약 */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
        {SURVEY_STATUS.map((s) => (
          <div key={s.value} className="rounded-2xl border bg-card p-3.5 shadow-sm">
            <div className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${s.color}`}>
              {s.label}
            </div>
            <div className="text-2xl font-black mt-1 tabular-nums">{counts[s.value] ?? 0}</div>
          </div>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border bg-card px-4 py-12 text-center text-muted-foreground">
          답사 대상 물건이 없습니다. 경매 물건 수집에서 먼저 물건을 수집하세요.
        </div>
      ) : (
        Array.from(groups.values()).map((g) => {
          const surveyed = g.items.filter((it) => it.survey_status !== "pending").length;
          const total = g.batchTotalCount && g.batchTotalCount > 0 ? g.batchTotalCount : g.items.length;
          const pct = total > 0 ? Math.round((surveyed / total) * 100) : 0;

          const STATUS_BADGE: Record<
            string,
            { label: string; color: string }
          > = {
            created:    { label: "발행",    color: "bg-slate-100 text-slate-600" },
            assigned:   { label: "현장배포", color: "bg-blue-100 text-blue-700" },
            in_progress:{ label: "처리중",  color: "bg-amber-100 text-amber-700" },
            completed:  { label: "마감",    color: "bg-emerald-100 text-emerald-700" },
          };
          const badge = g.batchStatus ? STATUS_BADGE[g.batchStatus] : null;

          return (
            <section key={g.label} className="rounded-xl border bg-card overflow-hidden">
              <div className="px-4 py-2.5 bg-muted/40 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm">{g.label}</span>
                  <span className="text-xs text-muted-foreground">{g.items.length}건</span>
                  {badge && (
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${badge.color}`}>
                      {badge.label}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground ml-auto">
                    {surveyed}/{total} ({pct}%)
                  </span>
                  {g.batchId && (
                    <BatchStatusControl
                      batchId={g.batchId}
                      status={g.batchStatus ?? "created"}
                    />
                  )}
                </div>
                {/* 진행률 바 */}
                <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
              <div className="divide-y">
                {g.items.map((it) => (
                  <SurveyRow key={it.id} item={it} />
                ))}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
