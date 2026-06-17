import type { Metadata } from "next";
import { UserCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { JudgmentClient, type OwnerVerdict, type TargetRow, type Verdict } from "./judgment-client";

export const metadata: Metadata = { title: "임대인 판정·전수" };
export const dynamic = "force-dynamic";

interface PropRow {
  id: string;
  owner_name: string;
  address: string;
  case_number: string;
  survey_status: string;
  survey_seq: number | null;
}

function computeVerdict(c: { vacant: number; occupied: number; revisit: number }): Verdict {
  if (c.occupied >= 1) return "occupied_exists"; // 거주중물건있음 → 제외
  if (c.vacant >= 2) return "full_survey"; // 전수조사필수
  if (c.vacant === 1) return "sample_thin"; // 공실 1건(표본부족)
  if (c.revisit >= 1) return "revisit"; // 재방문 필요
  return "none";
}

// 판정 화면 정렬 우선순위
const VERDICT_ORDER: Record<Verdict, number> = {
  full_survey: 0,
  sample_thin: 1,
  revisit: 2,
  occupied_exists: 3,
  none: 4,
};

async function fetchData(): Promise<{ owners: OwnerVerdict[]; targets: TargetRow[] }> {
  try {
    const supabase = await createClient();

    const { data: propData } = await supabase
      .from("auction_property")
      .select("id, owner_name, address, case_number, survey_status, survey_seq")
      .neq("survey_status", "rejected")
      .order("owner_name", { ascending: true });

    const { data: targetData } = await supabase
      .from("auction_full_survey_target")
      .select("id, owner_name, status, reason, sample_total, sample_vacant, note, updated_at")
      .order("updated_at", { ascending: false });

    const targets = (targetData ?? []) as TargetRow[];
    const targetStatusByOwner = new Map<string, string>();
    for (const t of targets) targetStatusByOwner.set(t.owner_name, t.status);

    const rows = (propData ?? []) as PropRow[];
    const byOwner = new Map<string, PropRow[]>();
    for (const r of rows) {
      const k = r.owner_name || "(소유자 미상)";
      if (!byOwner.has(k)) byOwner.set(k, []);
      byOwner.get(k)!.push(r);
    }

    const owners: OwnerVerdict[] = [];
    for (const [owner, list] of byOwner) {
      const counts = { vacant: 0, occupied: 0, revisit: 0, pending: 0, skip: 0 };
      for (const p of list) {
        if (p.survey_status === "vacant") counts.vacant++;
        else if (p.survey_status === "occupied") counts.occupied++;
        else if (p.survey_status === "revisit") counts.revisit++;
        else if (p.survey_status === "pending") counts.pending++;
        else counts.skip++;
      }
      const surveyed = counts.vacant + counts.occupied + counts.revisit;
      if (surveyed === 0) continue; // 아직 답사 결과 없는 임대인은 판정 대상 아님
      owners.push({
        owner_name: owner,
        total: list.length,
        ...counts,
        surveyed,
        verdict: computeVerdict(counts),
        targetStatus: targetStatusByOwner.get(owner) ?? null,
        items: list
          .map((p) => ({
            seq: p.survey_seq,
            address: p.address,
            case_number: p.case_number,
            survey_status: p.survey_status,
          }))
          .sort((a, b) => (a.seq ?? 9999) - (b.seq ?? 9999)),
      });
    }

    owners.sort(
      (a, b) =>
        VERDICT_ORDER[a.verdict] - VERDICT_ORDER[b.verdict] ||
        b.vacant - a.vacant ||
        b.total - a.total,
    );

    return { owners, targets };
  } catch {
    return { owners: [], targets: [] };
  }
}

export default async function AuctionJudgmentPage() {
  const { owners, targets } = await fetchData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-black flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-emerald-600" />
          임대인 판정 · 전수조사
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          1차 표본 답사 결과를 임대인별로 자동 집계합니다. 표본 중 하나라도 거주면 제외,
          2건 이상 전부 공실이면 <strong className="text-emerald-700">전수조사필수</strong> —
          그 임대인을 별도 명단(2차)으로 지정해 보유 물건 전체를 재수집합니다.
        </p>
      </div>

      <JudgmentClient owners={owners} targets={targets} />
    </div>
  );
}
