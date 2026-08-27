import type { Metadata } from "next";
import { ClipboardList } from "lucide-react";
import { PageHeader } from "../../../_components/page-header";
import { listSheets } from "./actions";
import { SheetCard } from "./sheet-card";

export const metadata: Metadata = { title: "답사지 발급 이력" };
export const dynamic = "force-dynamic";

export default async function AuctionSheetsPage() {
  const sheets = await listSheets();

  // 팀별 요약 — "이 팀에 최근 언제 몇 건 줬나"
  const byTeam = new Map<string, { count: number; sheets: number; last: string }>();
  for (const s of sheets) {
    const k = s.team_name || "팀 미기재";
    const cur = byTeam.get(k) ?? { count: 0, sheets: 0, last: s.printed_at };
    cur.count += s.total_count ?? 0;
    cur.sheets += 1;
    if (s.printed_at > cur.last) cur.last = s.printed_at;
    byTeam.set(k, cur);
  }
  const teams = Array.from(byTeam.entries()).sort((a, b) => (a[1].last < b[1].last ? 1 : -1));
  const open = sheets.filter((s) => !s.returned_at);
  const overdue = open.filter(
    (s) => Date.now() - new Date(s.printed_at).getTime() >= 14 * 86_400_000,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        icon={ClipboardList}
        title="답사지 발급 이력"
        accent="blue"
        desc={
          <>
            어느 팀에게 <strong>언제·어느 지역·몇 건</strong>을 줬는지 기록입니다. 같은 지역을 다른 팀에
            또 주기 전에 여기서 먼저 확인하세요. 수집 화면 목록에도 배포된 물건은{" "}
            <span className="text-amber-800 bg-amber-100 px-1 rounded text-xs font-bold">7/12 A팀</span>{" "}
            배지로 표시됩니다.
          </>
        }
      />

      {open.length > 0 && (
        <div
          className={`rounded-xl border p-4 ${
            overdue.length > 0 ? "border-rose-300 bg-rose-50" : "bg-card"
          }`}
        >
          <p className="text-sm font-bold">
            미회수 {open.length}건
            {overdue.length > 0 && (
              <span className="text-rose-700"> · 2주 초과 {overdue.length}건</span>
            )}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            답사지를 돌려받으면 각 발급 줄의 <strong>회수완료</strong> 를 눌러주세요. 미회수 목록이
            줄어들고, 어느 팀이 뭘 들고 있는지 한눈에 남습니다.
          </p>
        </div>
      )}

      {teams.length > 0 && (
        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm font-bold mb-2">팀별 배포 요약</p>
          <div className="flex flex-wrap gap-2">
            {teams.map(([name, v]) => (
              <span
                key={name}
                className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs"
              >
                <strong className="text-sm">{name}</strong>
                <span className="text-muted-foreground">
                  발급 {v.sheets}회 · {v.count}건 · 최근 {v.last.slice(0, 10)}
                  {(() => {
                    const o = open.filter((s) => (s.team_name || "팀 미기재") === name).length;
                    return o > 0 ? ` · 미회수 ${o}건` : "";
                  })()}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {sheets.length === 0 ? (
        <div className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">
          발급 이력이 없습니다. 수집 화면에서 물건을 선택하고 &quot;받는 답사팀&quot;을 적은 뒤 답사지
          인쇄·엑셀을 누르면 여기에 기록됩니다.
        </div>
      ) : (
        <div className="space-y-2">
          {sheets.map((s) => (
            <SheetCard key={s.id} sheet={s} />
          ))}
        </div>
      )}
    </div>
  );
}
