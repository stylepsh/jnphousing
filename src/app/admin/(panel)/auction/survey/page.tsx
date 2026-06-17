import type { Metadata } from "next";
import { ClipboardList } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { SurveyRow } from "./survey-row";
import { BulkEntry } from "./bulk-entry";
import { getOpenSheets } from "./survey-actions";
import { SURVEY_STATUS, type SurveyItem } from "./survey-status";

export const metadata: Metadata = { title: "경매 답사 관리" };
export const dynamic = "force-dynamic";

interface Row extends SurveyItem {
  batch_id: string | null;
  batch_name: string | null;
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

    // 배치명은 별도 조회로 매핑 (PostgREST 관계 임베드 의존 제거)
    const batchIds = Array.from(
      new Set(props.map((p) => p.batch_id).filter((v): v is string => !!v)),
    );
    const nameById = new Map<string, string>();
    if (batchIds.length > 0) {
      const { data: batches } = await supabase
        .from("auction_survey_batch")
        .select("id, name")
        .in("id", batchIds);
      for (const b of (batches ?? []) as { id: string; name: string }[]) {
        nameById.set(b.id, b.name);
      }
    }

    return props.map((p) => ({
      ...p,
      batch_name: p.batch_id ? nameById.get(p.batch_id) ?? null : null,
    }));
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
  const groups = new Map<string, { label: string; items: Row[] }>();
  for (const r of rows) {
    const key = r.batch_id ?? "(no-batch)";
    const label = r.batch_name ?? "(배치 없음)";
    if (!groups.has(key)) groups.set(key, { label, items: [] });
    groups.get(key)!.items.push(r);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-black flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-rose-600" />
          경매 답사 관리
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          수집된 물건의 현장 답사 결과(공실/점유/재방문)를 기록합니다. 현관 비밀번호·답사자·메모 저장 가능.
        </p>
      </div>

      {/* 번호 기반 일괄입력 */}
      <BulkEntry sheets={sheets} />

      {/* 상태별 요약 */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        {SURVEY_STATUS.map((s) => (
          <div key={s.value} className="rounded-lg border bg-card p-3">
            <div className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${s.color}`}>
              {s.label}
            </div>
            <div className="text-2xl font-black mt-1">{counts[s.value] ?? 0}</div>
          </div>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border bg-card px-4 py-12 text-center text-muted-foreground">
          답사 대상 물건이 없습니다. 경매 물건 수집에서 먼저 물건을 수집하세요.
        </div>
      ) : (
        Array.from(groups.values()).map((g) => (
          <section key={g.label} className="rounded-xl border bg-card overflow-hidden">
            <div className="px-4 py-2.5 bg-muted/40 flex items-center gap-2">
              <span className="font-bold text-sm">{g.label}</span>
              <span className="text-xs text-muted-foreground">{g.items.length}건</span>
            </div>
            <div className="divide-y">
              {g.items.map((it) => (
                <SurveyRow key={it.id} item={it} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
